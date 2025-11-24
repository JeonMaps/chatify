import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.js";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

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
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while fetching messages.");
    } finally {
      set({ isMessagesLoading: false });
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
      set({ messages: currentMessages.filter(msg => msg._id !== messageId) });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeletedForEveryone");
  },

  deleteMessageForEveryone: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete-for-everyone/${messageId}`);
      // Remove message from UI immediately
      const currentMessages = get().messages;
      set({ messages: currentMessages.filter(msg => msg._id !== messageId) });
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
      set({ messages: currentMessages.filter(msg => msg._id !== messageId) });
      toast.success("Message deleted for you");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error occurred while deleting message.");
    }
  }
}));
