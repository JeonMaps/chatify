import React, { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer.jsx";
import ProfileHeader from "../components/ProfileHeader.jsx";
import ActiveTabSwitch from "../components/ActiveTabSwitch.jsx";
import ChatsList from "../components/ChatsList.jsx";
import ContactsList from "../components/ContactsList.jsx";
import ChatContainer from "../components/ChatContainer.jsx";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder.jsx";

function ChatPage() {
  const { socket } = useAuthStore();
  const { activeTab, selectedUser, updateUnreadCount } = useChatStore();

  useEffect(() => {
    if (!socket) return;

    // Listen for unread count updates globally
    const handleUnreadUpdate = (data) => {
      const { senderId } = data || {};
      
      // Only update unread count if the conversation is NOT currently open
      if (!selectedUser || selectedUser._id !== senderId) {
        if (senderId) {
          updateUnreadCount(senderId, true); // increment
        }
      }
      // If conversation is open, messages are already marked as read
    };

    socket.on("unreadCountUpdate", handleUnreadUpdate);

    return () => {
      socket.off("unreadCountUpdate", handleUnreadUpdate);
    };
  }, [socket, selectedUser, updateUnreadCount]);

  return (
    <div className="relative w-full max-w-6xl h-[calc(100vh-8rem)]">
      <BorderAnimatedContainer>
        {/* LEFT SIDE */}
        <div className="w-80 big-slate-800/50 backdrop-blur-sm flex flex-col">
          <ProfileHeader />
          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeTab === "chats" ? <ChatsList /> : <ContactsList />}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;
