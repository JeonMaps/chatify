import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Pin, PinOff } from "lucide-react";

function MessageOptionsMenu({ onDelete, onPin, onUnpin, isPinned }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
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

  const handleButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Calculate position with some offset to ensure visibility
      setPosition({
        top: rect.bottom + 4,
        left: rect.left - 75, // Offset to the left to prevent clipping
      });
    }
    setIsOpen(!isOpen);
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    onDelete();
  };

  const handlePinClick = () => {
    setIsOpen(false);
    if (isPinned) {
      onUnpin();
    } else {
      onPin();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="p-1 rounded hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Message options"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 min-w-[150px]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              zIndex: 99999,
            }}
          >
            <button
              onClick={handlePinClick}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
            >
              {isPinned ? (
                <>
                  <PinOff size={16} />
                  Unpin Message
                </>
              ) : (
                <>
                  <Pin size={16} />
                  Pin Message
                </>
              )}
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors text-red-400 hover:text-red-300"
            >
              Delete Message
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export default MessageOptionsMenu;
