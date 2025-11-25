import React from "react";
import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound.js";
import { useChatStore } from "../store/useChatStore.js";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";

const MAX_MESSAGE_LENGTH = 2000;

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled, selectedUser, markMessagesAsRead, updateUnreadCount } = useChatStore();

  const handleTextChange = (e) => {
    setText(e.target.value);
    isSoundEnabled && playRandomKeyStrokeSound();
    
    // Mark messages as read when user starts typing
    if (selectedUser?._id && e.target.value.length === 1) {
      markMessagesAsRead(selectedUser._id);
      updateUnreadCount(selectedUser._id, false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;
    
    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
      return;
    }

    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  return (
    <div className="p-4 border-t border-slate-700/50">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3">
          <div className="relative inline-block max-w-xs">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 max-w-full object-contain rounded-lg border-2 border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-colors"
              type="button">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-4">
        <div className="flex-1 relative">
          {/* TEXT INPUT */}
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Type your message..."
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 pr-16"
          />
          {/* CHARACTER COUNTER */}
          {text.length > 0 && (
            <span 
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
                text.length > MAX_MESSAGE_LENGTH * 0.9 
                  ? 'text-red-400' 
                  : 'text-slate-500'
              }`}
            >
              {text.length}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />

        {/* FILE UPLOAD BUTTON */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-4 transition-colors ${
            imagePreview ? "text-cyan-500" : ""
          }`}>
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
