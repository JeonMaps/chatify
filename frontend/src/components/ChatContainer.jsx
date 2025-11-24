import React, { useRef, useEffect, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import ChatHeader from "./ChatHeader.jsx";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder.jsx";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton.jsx";
import MessageInput from "./MessageInput.jsx";
import MessageOptionsMenu from "./MessageOptionsMenu.jsx";
import DeleteMessageModal from "./DeleteMessageModal.jsx";
import ImageViewerModal from "./ImageViewerModal.jsx";

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
    }

    //cleanup
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg._id} className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"} group flex items-center gap-2 ${
                msg.senderId === authUser._id ? "flex-row-reverse" : "flex-row"
              }`}>
                <div
                  className={`chat-bubble relative ${
                    msg.senderId === authUser._id ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"
                  }`}>
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Shared" 
                      className="rounded-lg h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => handleImageClick(msg.image)}
                    />
                  )}
                  {msg.text && <p className="mt-2">{msg.text}</p>}
                  <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                
                {/* Three-dot menu outside bubble */}
                <MessageOptionsMenu 
                  onDelete={() => handleDeleteClick(msg._id, msg.senderId === authUser._id)}
                />
              </div>
            ))}
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
    </>
  );
}

export default ChatContainer;
