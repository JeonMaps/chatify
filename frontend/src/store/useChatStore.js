import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useChatStore = create((set,get) => ({
  allContacts: [],
  chats: [],
  message: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: localStorage.getItem("isSoundEnabled") === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled)
    set({ isSoundEnable: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab}),
  setSelectedUser: (selectedUser) => set({ selectedUser }), 

  getAllContacts: async () => {
    set({ isUsersLoading: true})
    try {
        const res = await axiosInstance.get("/messages/contacts")
        set({ allContacts: res.data })
    } catch (error) {
        toast.error(error.response?.data?.message || "Error occurred while fetching contacts.");
    } finally {
        set({ isUsersLoading: false})
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true})
    try {
        const res = await axiosInstance.get(`/messages/chats`)
        set({ chatPar: res.data })
    } catch (error) {
        toast.error(error.response?.data?.message || "Error occurred while fetching chat partners.");
    } finally {
        set({ isUsersLoading: false})
    }
  }
}));
