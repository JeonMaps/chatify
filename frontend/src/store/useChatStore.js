import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  pinnedMessages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isPinnedMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  updateUnreadCount: (userId, increment = true) => {
    const { isSoundEnabled } = get();
    const currentChats = get().chats;
    const updatedChats = currentChats.map((chat) => {
      if (chat._id === userId) {
        return {
          ...chat,
          unreadCount: increment ? (chat.unreadCount || 0) + 1 : 0,
          
        };
      }
      return chat;
    });
    set({ chats: updatedChats });

    // Play notification sound when unread count increases
    if (increment && isSoundEnabled) {
      const notificationSound = new Audio("/sounds/notification.mp3");
      notificationSound.currentTime = 0;
      notificationSound.play().catch((e) => console.log("Audio play failed:", e));
    }
  },

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while fetching contacts.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/chats`);
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while fetching chat partners.");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true, messages: [] });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while fetching messages.");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getPinnedMessages: async (userId) => {
    set({ isPinnedMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/pinned/${userId}`);
      set({ pinnedMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while fetching pinned messages.");
    } finally {
      set({ isPinnedMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true, //flag to identify optimistic messages
    };

    // immediately update the ui by adding the message
    set({ messages: [...messages, optimisticMessage] });
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: messages.concat(res.data) });
    } catch (error) {
      //remove optimistic message on failure
      set({ messages: messages });
      toast.error(error.response?.data?.message || "Error occurred while sending message.");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    //listen to newMessage event from server
    socket.on("newMessage", (newMessage) => {
      //check first if selected user is the sender of the new message
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, newMessage] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0; //reset to start
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    //listen to messageDeletedForEveryone event
    socket.on("messageDeletedForEveryone", (messageId) => {
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      set({ 
        messages: currentMessages.filter((msg) => msg._id !== messageId),
        pinnedMessages: currentPinnedMessages.filter((msg) => msg._id !== messageId)
      });
    });

    //listen to messagesRead event (when receiver reads your messages)
    socket.on("messagesRead", (data) => {
      const { readBy, readAt } = data;
      //check if the messages that were read are from the current conversation
      if (readBy === selectedUser._id) {
        const currentMessages = get().messages;
        const updatedMessages = currentMessages.map((msg) => {
          //mark all messages sent to readBy user as read
          if (msg.receiverId === readBy && !msg.read) {
            return { ...msg, read: true, updatedAt: readAt };
          }
          return msg;
        });
        set({ messages: updatedMessages });
      }
    });

    //listen to messagePinned event
    socket.on("messagePinned", (pinnedMessage) => {
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      
      // Update the message in the messages array
      const updatedMessages = currentMessages.map((msg) => 
        msg._id === pinnedMessage._id ? pinnedMessage : msg
      );
      
      // Add to pinned messages array at the beginning (most recent first)
      set({ 
        messages: updatedMessages,
        pinnedMessages: [pinnedMessage, ...currentPinnedMessages]
      });
    });

    //listen to messageUnpinned event
    socket.on("messageUnpinned", (messageId) => {
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      
      // Update the message in the messages array
      const updatedMessages = currentMessages.map((msg) => 
        msg._id === messageId ? { ...msg, isPinned: false, pinnedAt: null, pinnedBy: null } : msg
      );
      
      // Remove from pinned messages array
      set({ 
        messages: updatedMessages,
        pinnedMessages: currentPinnedMessages.filter((msg) => msg._id !== messageId)
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeletedForEveryone");
    socket.off("messagesRead");
    socket.off("messagePinned");
    socket.off("messageUnpinned");
  },

  deleteMessageForEveryone: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete-for-everyone/${messageId}`);
      // Remove message from UI immediately
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      set({ 
        messages: currentMessages.filter((msg) => msg._id !== messageId),
        pinnedMessages: currentPinnedMessages.filter((msg) => msg._id !== messageId)
      });
      toast.success("Message deleted for everyone");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while deleting message.");
    }
  },

  deleteMessageForMe: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete-for-me/${messageId}`);
      // Remove message from UI immediately
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      set({ 
        messages: currentMessages.filter((msg) => msg._id !== messageId),
        pinnedMessages: currentPinnedMessages.filter((msg) => msg._id !== messageId)
      });
      toast.success("Message deleted for you");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while deleting message.");
    }
  },

  pinMessage: async (messageId) => {
    try {
      const res = await axiosInstance.patch(`/messages/pin/${messageId}`);
      const pinnedMessage = res.data;
      
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      
      // Update the message in the messages array
      const updatedMessages = currentMessages.map((msg) => 
        msg._id === messageId ? pinnedMessage : msg
      );
      
      // Add to pinned messages array at the beginning (most recent first)
      set({ 
        messages: updatedMessages,
        pinnedMessages: [pinnedMessage, ...currentPinnedMessages]
      });
      
      toast.success("Message pinned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while pinning message.");
    }
  },

  unpinMessage: async (messageId) => {
    try {
      const res = await axiosInstance.patch(`/messages/unpin/${messageId}`);
      const unpinnedMessage = res.data;
      
      const currentMessages = get().messages;
      const currentPinnedMessages = get().pinnedMessages;
      
      // Update the message in the messages array
      const updatedMessages = currentMessages.map((msg) => 
        msg._id === messageId ? unpinnedMessage : msg
      );
      
      // Remove from pinned messages array
      set({ 
        messages: updatedMessages,
        pinnedMessages: currentPinnedMessages.filter((msg) => msg._id !== messageId)
      });
      
      toast.success("Message unpinned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while unpinning message.");
    }
  },

  markMessagesAsRead: async (userId) => {
    try {
      await axiosInstance.patch(`/messages/mark-read/${userId}`);
      // Update messages in state to mark them as read
      const currentMessages = get().messages;
      const updatedMessages = currentMessages.map((msg) => {
        if (msg.senderId === userId && !msg.read) {
          return { ...msg, read: true, updatedAt: new Date().toISOString() };
        }
        return msg;
      });
      set({ messages: updatedMessages });
      // Refresh chat list to update unread counts
      get().getMyChatPartners();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },
}));
