import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

function MessageOptionsMenu({ onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDeleteClick = () => {
    setIsOpen(false);
    onDelete();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Message options"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-lg py-1 min-w-[150px] z-50">
          <button
            onClick={handleDeleteClick}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors text-red-400 hover:text-red-300"
          >
            Delete Message
          </button>
        </div>
      )}
    </div>
  );
}

export default MessageOptionsMenu;
