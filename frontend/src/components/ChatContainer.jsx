import React, { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import ChatHeader from "./ChatHeader.jsx";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder.jsx";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageOptionsMenu from "./MessageOptionsMenu.jsx";
import DeleteMessageModal from "./DeleteMessageModal.jsx";
import ImageViewerModal from "./ImageViewerModal.jsx";
import { getTimeAgo, formatTimestamp } from "../lib/utils.js";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessageForEveryone,
    deleteMessageForMe,
    markMessagesAsRead,
    updateUnreadCount,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    messageId: null,
    isOwnMessage: false,
  });
  const [imageViewerState, setImageViewerState] = useState({
    isOpen: false,
    initialIndex: 0,
  });
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Get all images from messages for the image viewer
  const messageImages = useMemo(() => {
    return messages
      .filter((msg) => msg.image)
      .map((msg) => ({
        url: msg.image,
        messageId: msg._id,
      }));
  }, [messages]);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessagesByUserId(selectedUser._id);
      subscribeToMessages();
      // Mark messages as read when opening conversation
      markMessagesAsRead(selectedUser._id);
      // Clear unread count in UI immediately
      updateUnreadCount(selectedUser._id, false);
    }

    //cleanup
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleChatContainerClick = () => {
    if (selectedUser?._id) {
      markMessagesAsRead(selectedUser._id);
      updateUnreadCount(selectedUser._id, false);
    }
  };

  const handleDeleteClick = (messageId, isOwnMessage) => {
    setDeleteModalState({
      isOpen: true,
      messageId,
      isOwnMessage,
    });
  };

  const handleCloseModal = () => {
    setDeleteModalState({
      isOpen: false,
      messageId: null,
      isOwnMessage: false,
    });
  };

  const handleDeleteForEveryone = async () => {
    if (deleteModalState.messageId) {
      await deleteMessageForEveryone(deleteModalState.messageId);
      handleCloseModal();
    }
  };

  const handleDeleteForMe = async () => {
    if (deleteModalState.messageId) {
      await deleteMessageForMe(deleteModalState.messageId);
      handleCloseModal();
    }
  };

  const handleImageClick = (imageUrl) => {
    const imageIndex = messageImages.findIndex((img) => img.url === imageUrl);
    setImageViewerState({
      isOpen: true,
      initialIndex: imageIndex >= 0 ? imageIndex : 0,
    });
  };

  const handleCloseImageViewer = () => {
    setImageViewerState({
      isOpen: false,
      initialIndex: 0,
    });
  };

  const handleMouseEnter = (event, messageId) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 35, // Position above the bubble
      left: rect.left + rect.width / 2, // Center horizontally
    });
    setHoveredMessageId(messageId);
  };

  const handleMouseLeave = () => {
    setHoveredMessageId(null);
  };

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto overflow-x-hidden py-8" onClick={handleChatContainerClick}>
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, index) => {
              const isLastMessage = index === messages.length - 1;
              const isOwnMessage = msg.senderId === authUser._id;
              
              return (
              <div key={msg._id} className="flex flex-col gap-1 w-full">
                <div className={`chat ${isOwnMessage ? "chat-end" : "chat-start"} group flex items-center gap-2 ${
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                }`}>
                  <div
                    className={`chat-bubble relative ${
                      isOwnMessage ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"
                    }`}
                    onMouseEnter={(e) => handleMouseEnter(e, msg._id)}
                    onMouseLeave={handleMouseLeave}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Shared" 
                        className="rounded-lg h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => handleImageClick(msg.image)}
                      />
                    )}
                    {msg.text && <p className="mt-2">{msg.text}</p>}
                  </div>
                  
                  {/* Three-dot menu outside bubble */}
                  <MessageOptionsMenu 
                    onDelete={() => handleDeleteClick(msg._id, isOwnMessage)}
                  />
                </div>
                
                {/* Status text below message - only for sender's last message */}
                {isLastMessage && isOwnMessage && (
                  <div className="text-xs opacity-60 px-4 max-w-full truncate text-right">
                    {msg.read 
                      ? `Seen ${getTimeAgo(msg.updatedAt)}` 
                      : `Sent ${getTimeAgo(msg.createdAt)}`
                    }
                  </div>
                )}
              </div>
            );
            })}
            {/* scroll target */}
            <div ref={messageEndRef}></div>
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />

      {/* Delete Message Modal */}
      <DeleteMessageModal
        isOpen={deleteModalState.isOpen}
        onClose={handleCloseModal}
        onDeleteForEveryone={handleDeleteForEveryone}
        onDeleteForMe={handleDeleteForMe}
        isOwnMessage={deleteModalState.isOwnMessage}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerState.isOpen}
        onClose={handleCloseImageViewer}
        images={messageImages}
        initialIndex={imageViewerState.initialIndex}
      />

      {/* Tooltip Portal - renders outside overflow constraints */}
      {hoveredMessageId &&
        createPortal(
          <div
            className="fixed px-2 py-1 bg-slate-950 text-white text-xs rounded whitespace-nowrap pointer-events-none transition-opacity"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: "translateX(-50%)",
              zIndex: 9999,
            }}>
            {formatTimestamp(
              messages.find((m) => m._id === hoveredMessageId)?.createdAt
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export default ChatContainer;
