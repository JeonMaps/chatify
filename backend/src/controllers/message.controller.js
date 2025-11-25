import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    //find all the messages where the logged in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString() ? msg.receiverId.toString() : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    // Calculate unread message count for each chat partner
    const chatPartnersWithUnread = await Promise.all(
      chatPartners.map(async (partner) => {
        const unreadCount = await Message.countDocuments({
          senderId: partner._id,
          receiverId: loggedInUserId,
          read: false,
          deletedForEveryone: { $ne: true },
          deletedFor: { $ne: loggedInUserId },
        });
        return {
          ...partner.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json(chatPartnersWithUnread);
  } catch (error) {
    console.log("Error in getChatPartners controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
          ]
        },
        {
          $or: [
            { deletedForEveryone: { $ne: true } },
            { deletedForEveryone: { $exists: false } }
          ]
        },
        {
          $or: [
            { deletedFor: { $ne: myId } },
            { deletedFor: { $exists: false } }
          ]
        }
      ]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessagesByUserId controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Message text or image is required" });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "You cannot send message to yourself" });
    }

    const receiverExists = await User.findById({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver user not found" });
    }

    let imageUrl;

    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    //send message in realtime if user is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      // Notify receiver to update unread counts with sender info
      io.to(receiverSocketId).emit("unreadCountUpdate", { senderId: senderId.toString() });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    //only the sender can delete for everyone
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages for everyone" });
    }

    //mark as deleted for everyone
    message.deletedForEveryone = true;
    await message.save();

    //notify both users via socket
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    const senderSocketId = getReceiverSocketId(message.senderId.toString());

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeletedForEveryone", messageId);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageDeletedForEveryone", messageId);
    }

    res.status(200).json({ message: "Message deleted for everyone" });
  } catch (error) {
    console.log("Error in deleteMessageForEveryone controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMessageForMe = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    //check if user is part of this conversation
    if (
      message.senderId.toString() !== userId.toString() &&
      message.receiverId.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "You are not part of this conversation" });
    }

    //check if already deleted for this user
    if (message.deletedFor.includes(userId)) {
      return res.status(400).json({ message: "Message already deleted for you" });
    }

    //add user to deletedFor array
    message.deletedFor.push(userId);
    await message.save();

    res.status(200).json({ message: "Message deleted for you" });
  } catch (error) {
    console.log("Error in deleteMessageForMe controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Mark all unread messages from the other user as read
    const result = await Message.updateMany(
      {
        senderId: userToChatId,
        receiverId: myId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    // If messages were marked as read, notify the sender to update their UI
    if (result.modifiedCount > 0) {
      const senderSocketId = getReceiverSocketId(userToChatId);
      if (senderSocketId) {
        // Notify sender that their messages have been read
        io.to(senderSocketId).emit("messagesRead", { 
          readBy: myId.toString(),
          readAt: new Date().toISOString() 
        });
        // Also update unread count
        io.to(senderSocketId).emit("unreadCountUpdate");
      }
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};;
