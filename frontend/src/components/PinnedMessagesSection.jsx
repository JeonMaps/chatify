import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Pin, ChevronDown, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { formatTimestamp } from "../lib/utils.js";

function PinnedMessagesSection({ onMessageClick }) {
  const { pinnedMessages, unpinMessage, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const latestPinnedMessage = pinnedMessages[0];
  const hasMultiplePinned = pinnedMessages.length > 1;

  const renderMessageContent = (message, isLatest = false, inModal = false) => {
    const isOwnMessage = message.senderId === authUser._id;
    const senderName = isOwnMessage ? "You" : selectedUser.fullName;

    const handleMessageClick = () => {
      if (inModal) {
        setIsModalOpen(false);
      }
      onMessageClick(message._id);
    };

    return (
      <div
        className={`group relative flex items-start gap-3 ${
          isLatest && !inModal ? "" : "hover:bg-slate-700/30"
        } ${inModal ? "p-3" : "p-2"} rounded-lg transition-colors cursor-pointer`}
        onClick={handleMessageClick}
      >
        {/* Pin Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Pin size={14} className="text-cyan-400" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-300">{senderName}</span>
            <span className="text-xs text-slate-500">
              {formatTimestamp(message.pinnedAt)}
            </span>
          </div>
          
          {message.image && (
            <div className="mb-2">
              <img
                src={message.image}
                alt="Pinned"
                className="h-16 w-auto rounded object-cover"
              />
            </div>
          )}
          
          {message.text && (
            <p className={`text-sm text-slate-400 ${inModal ? "" : "truncate"}`}>{message.text}</p>
          )}
        </div>

        {/* Unpin Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            unpinMessage(message._id);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-slate-600/50 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Unpin message"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm flex-shrink-0">
        {/* Latest Pinned Message - Always Visible */}
        <div className="px-4 py-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {renderMessageContent(latestPinnedMessage, true)}
            </div>

            {/* Arrow Button - Only show if multiple pinned messages */}
            {hasMultiplePinned && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-shrink-0 ml-2 p-2 rounded hover:bg-slate-700/50 transition-colors"
                aria-label="Show all pinned messages"
              >
                <ChevronDown size={20} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal - All Pinned Messages */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Pin size={20} className="text-cyan-400" />
                  <h2 className="text-lg font-semibold text-slate-200">
                    Pinned Messages ({pinnedMessages.length})
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded hover:bg-slate-700/50 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {pinnedMessages.map((message) => (
                  <div key={message._id}>
                    {renderMessageContent(message, false, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default PinnedMessagesSection;
