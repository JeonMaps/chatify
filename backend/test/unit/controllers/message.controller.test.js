import { expect } from "chai";
import mongoose from "mongoose";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  deleteMessageForEveryone,
  deleteMessageForMe,
  markMessagesAsRead,
} from "../../../src/controllers/message.controller.js";
import { ENV } from "../../../src/lib/env.js";
import User from "../../../src/models/User.js";
import Message from "../../../src/models/Message.js";
import bcrypt from "bcryptjs";

describe("Message Controller Tests", () => {
  let req, res, statusCode, jsonResponse;
  let testUser1, testUser2, testUser3;

  // Connect to database before all tests
  before(async function () {
    this.timeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGO_URI);
      console.log("✓ Test database connected");
    }

    // Create test users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("testpassword123", salt);

    testUser1 = await User.create({
      fullName: "Test User 1",
      email: `test-msg-user1-${Date.now()}@example.com`,
      password: hashedPassword,
    });

    testUser2 = await User.create({
      fullName: "Test User 2",
      email: `test-msg-user2-${Date.now()}@example.com`,
      password: hashedPassword,
    });

    testUser3 = await User.create({
      fullName: "Test User 3",
      email: `test-msg-user3-${Date.now()}@example.com`,
      password: hashedPassword,
    });

    console.log("✓ Test users created for message tests");
  });

  // Cleanup after all tests
  after(async function () {
    this.timeout(10000);
    await Message.deleteMany({
      $or: [
        { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
      ],
    });
    await User.deleteMany({ _id: { $in: [testUser1._id, testUser2._id, testUser3._id] } });
    await mongoose.connection.close();
    console.log("✓ Test cleanup completed and database disconnected");
  });

  beforeEach(() => {
    statusCode = null;
    jsonResponse = null;

    req = {
      user: { _id: testUser1._id },
      params: {},
      body: {},
    };

    res = {
      status: function (code) {
        statusCode = code;
        return this;
      },
      json: function (data) {
        jsonResponse = data;
        return this;
      },
    };
  });

  describe("getAllContacts", () => {
    it("should return all users except the logged in user", async () => {
      await getAllContacts(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.be.an("array");
      expect(jsonResponse.length).to.be.at.least(2);
      expect(jsonResponse.some((u) => u._id.toString() === testUser1._id.toString())).to.be.false;
      expect(jsonResponse.some((u) => u._id.toString() === testUser2._id.toString())).to.be.true;
    });

    it("should not return password field in user objects", async () => {
      await getAllContacts(req, res);

      expect(statusCode).to.equal(200);
      jsonResponse.forEach((user) => {
        // Check if password exists and is undefined (mongoose select excludes it)
        expect(user.password).to.be.undefined;
      });
    });
  });

  describe("getChatPartners", () => {
    beforeEach(async () => {
      // Clean up messages before each test
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });
    });

    it("should return empty array when no chat history exists", async () => {
      await getChatPartners(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.be.an("array");
      expect(jsonResponse.length).to.equal(0);
    });

    it("should return chat partners with unread count", async () => {
      // Create some messages
      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Hello from user 2",
        read: false,
      });

      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Hello from user 1",
      });

      await getChatPartners(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.be.an("array");
      expect(jsonResponse.length).to.equal(1);
      expect(jsonResponse[0]).to.have.property("unreadCount");
      expect(jsonResponse[0].unreadCount).to.equal(1);
      expect(jsonResponse[0]._id.toString()).to.equal(testUser2._id.toString());
    });

    it("should not count deleted messages in unread count", async () => {
      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Deleted message",
        read: false,
        deletedForEveryone: true,
      });

      await getChatPartners(req, res);

      expect(statusCode).to.equal(200);
      if (jsonResponse.length > 0) {
        expect(jsonResponse[0].unreadCount).to.equal(0);
      }
    });
  });

  describe("getMessagesByUserId", () => {
    beforeEach(async () => {
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });
    });

    it("should return messages between two users", async () => {
      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Message 1",
      });

      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Message 2",
      });

      req.params.id = testUser2._id.toString();
      await getMessagesByUserId(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.be.an("array");
      expect(jsonResponse.length).to.equal(2);
    });

    it("should not return messages deleted for everyone", async () => {
      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Normal message",
      });

      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Deleted message",
        deletedForEveryone: true,
      });

      req.params.id = testUser2._id.toString();
      await getMessagesByUserId(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse.length).to.equal(1);
      expect(jsonResponse[0].text).to.equal("Normal message");
    });

    it("should not return messages deleted for current user", async () => {
      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Normal message",
      });

      await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Deleted for me",
        deletedFor: [testUser1._id],
      });

      req.params.id = testUser2._id.toString();
      await getMessagesByUserId(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse.length).to.equal(1);
      expect(jsonResponse[0].text).to.equal("Normal message");
    });

    it("should return empty array when no messages exist", async () => {
      req.params.id = testUser2._id.toString();
      await getMessagesByUserId(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.be.an("array");
      expect(jsonResponse.length).to.equal(0);
    });
  });

  describe("sendMessage", () => {
    beforeEach(async () => {
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });
    });

    it("should return 400 if neither text nor image is provided", async () => {
      req.params.id = testUser2._id.toString();
      req.body = {};

      await sendMessage(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Message text or image is required" });
    });

    it("should return 400 if trying to send message to yourself", async () => {
      req.params.id = testUser1._id.toString();
      req.body = { text: "Hello" };

      await sendMessage(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "You cannot send message to yourself" });
    });

    it("should return 404 if receiver does not exist", async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();
      req.body = { text: "Hello" };

      await sendMessage(req, res);

      expect(statusCode).to.equal(404);
      expect(jsonResponse).to.deep.equal({ message: "Receiver user not found" });
    });

    it("should successfully send a text message", async () => {
      req.params.id = testUser2._id.toString();
      req.body = { text: "Hello, this is a test message" };

      await sendMessage(req, res);

      expect(statusCode).to.equal(201);
      expect(jsonResponse).to.have.property("_id");
      expect(jsonResponse).to.have.property("text", "Hello, this is a test message");
      expect(jsonResponse.senderId.toString()).to.equal(testUser1._id.toString());
      expect(jsonResponse.receiverId.toString()).to.equal(testUser2._id.toString());
    });

    it("should create message with text only", async () => {
      req.params.id = testUser2._id.toString();
      req.body = { text: "Text only message" };

      await sendMessage(req, res);

      expect(statusCode).to.equal(201);
      expect(jsonResponse.text).to.equal("Text only message");
      expect(jsonResponse.image).to.be.undefined;
    });
  });

  describe("deleteMessageForEveryone", () => {
    let testMessage;

    beforeEach(async () => {
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });

      testMessage = await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Test message",
      });
    });

    it("should return 404 if message does not exist", async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteMessageForEveryone(req, res);

      expect(statusCode).to.equal(404);
      expect(jsonResponse).to.deep.equal({ message: "Message not found" });
    });

    it("should return 403 if user is not the sender", async () => {
      req.user._id = testUser2._id;
      req.params.id = testMessage._id.toString();

      await deleteMessageForEveryone(req, res);

      expect(statusCode).to.equal(403);
      expect(jsonResponse).to.deep.equal({
        message: "You can only delete your own messages for everyone",
      });
    });

    it("should successfully delete message for everyone", async () => {
      req.params.id = testMessage._id.toString();

      await deleteMessageForEveryone(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Message deleted for everyone" });

      const deletedMessage = await Message.findById(testMessage._id);
      expect(deletedMessage.deletedForEveryone).to.be.true;
    });
  });

  describe("deleteMessageForMe", () => {
    let testMessage;

    beforeEach(async () => {
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });

      testMessage = await Message.create({
        senderId: testUser1._id,
        receiverId: testUser2._id,
        text: "Test message",
      });
    });

    it("should return 404 if message does not exist", async () => {
      req.params.id = new mongoose.Types.ObjectId().toString();

      await deleteMessageForMe(req, res);

      expect(statusCode).to.equal(404);
      expect(jsonResponse).to.deep.equal({ message: "Message not found" });
    });

    it("should return 403 if user is not part of conversation", async () => {
      req.user._id = testUser3._id;
      req.params.id = testMessage._id.toString();

      await deleteMessageForMe(req, res);

      expect(statusCode).to.equal(403);
      expect(jsonResponse).to.deep.equal({ message: "You are not part of this conversation" });
    });

    it("should return 400 if message already deleted for user", async () => {
      testMessage.deletedFor.push(testUser1._id);
      await testMessage.save();

      req.params.id = testMessage._id.toString();

      await deleteMessageForMe(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Message already deleted for you" });
    });

    it("should successfully delete message for current user", async () => {
      req.params.id = testMessage._id.toString();

      await deleteMessageForMe(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Message deleted for you" });

      const updatedMessage = await Message.findById(testMessage._id);
      expect(updatedMessage.deletedFor).to.have.lengthOf(1);
      expect(updatedMessage.deletedFor[0].toString()).to.equal(testUser1._id.toString());
    });

    it("should allow receiver to delete message for themselves", async () => {
      req.user._id = testUser2._id;
      req.params.id = testMessage._id.toString();

      await deleteMessageForMe(req, res);

      expect(statusCode).to.equal(200);
      const updatedMessage = await Message.findById(testMessage._id);
      expect(updatedMessage.deletedFor).to.have.lengthOf(1);
      expect(updatedMessage.deletedFor[0].toString()).to.equal(testUser2._id.toString());
    });
  });

  describe("markMessagesAsRead", () => {
    beforeEach(async () => {
      await Message.deleteMany({
        $or: [
          { senderId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
          { receiverId: { $in: [testUser1._id, testUser2._id, testUser3._id] } },
        ],
      });
    });

    it("should mark all unread messages as read", async () => {
      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Unread message 1",
        read: false,
      });

      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Unread message 2",
        read: false,
      });

      req.params.id = testUser2._id.toString();
      await markMessagesAsRead(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Messages marked as read" });

      const messages = await Message.find({
        senderId: testUser2._id,
        receiverId: testUser1._id,
      });

      messages.forEach((msg) => {
        expect(msg.read).to.be.true;
      });
    });

    it("should not mark messages from other conversations", async () => {
      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Message from user 2",
        read: false,
      });

      await Message.create({
        senderId: testUser3._id,
        receiverId: testUser1._id,
        text: "Message from user 3",
        read: false,
      });

      req.params.id = testUser2._id.toString();
      await markMessagesAsRead(req, res);

      expect(statusCode).to.equal(200);

      const messageFromUser2 = await Message.findOne({
        senderId: testUser2._id,
        receiverId: testUser1._id,
      });
      expect(messageFromUser2.read).to.be.true;

      const messageFromUser3 = await Message.findOne({
        senderId: testUser3._id,
        receiverId: testUser1._id,
      });
      expect(messageFromUser3.read).to.be.false;
    });

    it("should handle when no messages need to be marked as read", async () => {
      req.params.id = testUser2._id.toString();
      await markMessagesAsRead(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Messages marked as read" });
    });

    it("should not mark already read messages", async () => {
      await Message.create({
        senderId: testUser2._id,
        receiverId: testUser1._id,
        text: "Already read message",
        read: true,
      });

      req.params.id = testUser2._id.toString();
      await markMessagesAsRead(req, res);

      expect(statusCode).to.equal(200);
    });
  });
});
