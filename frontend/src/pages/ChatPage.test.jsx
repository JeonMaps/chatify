import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ChatPage from './ChatPage';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';

// Mock the stores
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../store/useChatStore.js', () => ({
  useChatStore: vi.fn(),
}));

// Mock child components
vi.mock('../components/BorderAnimatedContainer.jsx', () => ({
  default: ({ children }) => <div data-testid="border-animated-container">{children}</div>,
}));

vi.mock('../components/ProfileHeader.jsx', () => ({
  default: () => <div data-testid="profile-header">Profile Header</div>,
}));

vi.mock('../components/ActiveTabSwitch.jsx', () => ({
  default: () => <div data-testid="active-tab-switch">Tab Switch</div>,
}));

vi.mock('../components/ChatsList.jsx', () => ({
  default: () => <div data-testid="chats-list">Chats List</div>,
}));

vi.mock('../components/ContactsList.jsx', () => ({
  default: () => <div data-testid="contacts-list">Contacts List</div>,
}));

vi.mock('../components/ChatContainer.jsx', () => ({
  default: () => <div data-testid="chat-container">Chat Container</div>,
}));

vi.mock('../components/NoConversationPlaceholder.jsx', () => ({
  default: () => <div data-testid="no-conversation-placeholder">No Conversation</div>,
}));

describe('ChatPage', () => {
  let mockSocket;
  let mockUpdateUnreadCount;

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      off: vi.fn(),
    };

    mockUpdateUnreadCount = vi.fn();

    useAuthStore.mockReturnValue({
      socket: mockSocket,
    });

    useChatStore.mockReturnValue({
      activeTab: 'chats',
      selectedUser: null,
      updateUnreadCount: mockUpdateUnreadCount,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderChatPage = () => {
    return render(
      <MemoryRouter>
        <ChatPage />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render main layout components', () => {
      renderChatPage();

      expect(screen.getByTestId('border-animated-container')).toBeInTheDocument();
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('active-tab-switch')).toBeInTheDocument();
    });

    it('should show NoConversationPlaceholder when no user is selected', () => {
      renderChatPage();

      expect(screen.getByTestId('no-conversation-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('chat-container')).not.toBeInTheDocument();
    });

    it('should show ChatContainer when a user is selected', () => {
      useChatStore.mockReturnValue({
        activeTab: 'chats',
        selectedUser: { _id: '123', fullName: 'John Doe' },
        updateUnreadCount: mockUpdateUnreadCount,
      });

      renderChatPage();

      expect(screen.getByTestId('chat-container')).toBeInTheDocument();
      expect(screen.queryByTestId('no-conversation-placeholder')).not.toBeInTheDocument();
    });

    it('should show ChatsList when activeTab is "chats"', () => {
      renderChatPage();

      expect(screen.getByTestId('chats-list')).toBeInTheDocument();
      expect(screen.queryByTestId('contacts-list')).not.toBeInTheDocument();
    });

    it('should show ContactsList when activeTab is "contacts"', () => {
      useChatStore.mockReturnValue({
        activeTab: 'contacts',
        selectedUser: null,
        updateUnreadCount: mockUpdateUnreadCount,
      });

      renderChatPage();

      expect(screen.getByTestId('contacts-list')).toBeInTheDocument();
      expect(screen.queryByTestId('chats-list')).not.toBeInTheDocument();
    });
  });

  describe('Socket Event Listeners', () => {
    it('should set up unreadCountUpdate listener on mount', () => {
      renderChatPage();

      expect(mockSocket.on).toHaveBeenCalledWith('unreadCountUpdate', expect.any(Function));
    });

    it('should clean up socket listeners on unmount', () => {
      const { unmount } = renderChatPage();

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('unreadCountUpdate', expect.any(Function));
    });

    it('should not set up listeners if socket is not available', () => {
      useAuthStore.mockReturnValue({
        socket: null,
      });

      renderChatPage();

      expect(mockSocket.on).not.toHaveBeenCalled();
    });

    it('should update unread count when message is received from different user', () => {
      renderChatPage();

      // Get the handler function that was registered
      const handleUnreadUpdate = mockSocket.on.mock.calls[0][1];

      // Simulate receiving a message from a different user
      handleUnreadUpdate({ senderId: 'user123' });

      expect(mockUpdateUnreadCount).toHaveBeenCalledWith('user123', true);
    });

    it('should not update unread count when message is from currently selected user', () => {
      useChatStore.mockReturnValue({
        activeTab: 'chats',
        selectedUser: { _id: 'user123', fullName: 'John Doe' },
        updateUnreadCount: mockUpdateUnreadCount,
      });

      renderChatPage();

      // Get the handler function that was registered
      const handleUnreadUpdate = mockSocket.on.mock.calls[0][1];

      // Simulate receiving a message from the currently selected user
      handleUnreadUpdate({ senderId: 'user123' });

      expect(mockUpdateUnreadCount).not.toHaveBeenCalled();
    });

    it('should handle unreadCountUpdate with missing data gracefully', () => {
      renderChatPage();

      // Get the handler function
      const handleUnreadUpdate = mockSocket.on.mock.calls[0][1];

      // Should not crash with undefined data
      expect(() => handleUnreadUpdate(undefined)).not.toThrow();
      expect(() => handleUnreadUpdate(null)).not.toThrow();
      expect(() => handleUnreadUpdate({})).not.toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should render both left sidebar and right content area', () => {
      renderChatPage();

      // Left sidebar components
      expect(screen.getByTestId('profile-header')).toBeInTheDocument();
      expect(screen.getByTestId('active-tab-switch')).toBeInTheDocument();
      expect(screen.getByTestId('chats-list')).toBeInTheDocument();

      // Right content area
      expect(screen.getByTestId('no-conversation-placeholder')).toBeInTheDocument();
    });

    it('should dynamically switch between chats and contacts views', () => {
      const { rerender } = renderChatPage();

      // Initially showing chats
      expect(screen.getByTestId('chats-list')).toBeInTheDocument();

      // Switch to contacts
      useChatStore.mockReturnValue({
        activeTab: 'contacts',
        selectedUser: null,
        updateUnreadCount: mockUpdateUnreadCount,
      });

      rerender(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('contacts-list')).toBeInTheDocument();
      expect(screen.queryByTestId('chats-list')).not.toBeInTheDocument();
    });

    it('should update right panel when user is selected', () => {
      const { rerender } = renderChatPage();

      // Initially no conversation
      expect(screen.getByTestId('no-conversation-placeholder')).toBeInTheDocument();

      // Select a user
      useChatStore.mockReturnValue({
        activeTab: 'chats',
        selectedUser: { _id: '123', fullName: 'John Doe' },
        updateUnreadCount: mockUpdateUnreadCount,
      });

      rerender(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('chat-container')).toBeInTheDocument();
      expect(screen.queryByTestId('no-conversation-placeholder')).not.toBeInTheDocument();
    });
  });
});
