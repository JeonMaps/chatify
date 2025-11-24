import React from "react";
import { XIcon } from "lucide-react";

function DeleteMessageModal({ isOpen, onClose, onDeleteForEveryone, onDeleteForMe, isOwnMessage }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Delete Message</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 mb-6">
            Choose how you want to delete this message:
          </p>

          <div className="space-y-3">
            {isOwnMessage && (
              <button
                onClick={onDeleteForEveryone}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete for Everyone
              </button>
            )}
            
            <button
              onClick={onDeleteForMe}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Delete for Me
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors font-medium border border-slate-700"
            >
              Cancel
            </button>
          </div>

          {isOwnMessage && (
            <p className="text-xs text-slate-400 mt-4">
              "Delete for Everyone" will remove the message for both you and the recipient.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeleteMessageModal;
