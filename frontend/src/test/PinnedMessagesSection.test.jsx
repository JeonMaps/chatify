import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinnedMessagesSection from '../components/PinnedMessagesSection.jsx';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';

// Mock the stores
vi.mock('../store/useChatStore.js', () => ({
  useChatStore: vi.fn(),
}));

vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: vi.fn(),
}));

// Mock formatTimestamp utility
vi.mock('../lib/utils.js', () => ({
  formatTimestamp: vi.fn((date) => 'Jan 1, 2025'),
}));

describe('PinnedMessagesSection', () => {
  let mockUnpinMessage;
  let mockOnMessageClick;

  const mockAuthUser = {
    _id: 'user123',
    fullName: 'Current User',
  };

  const mockSelectedUser = {
    _id: 'user456',
    fullName: 'John Doe',
  };

  const createMockMessage = (id, text, senderId, image = null) => ({
    _id: id,
    text,
    image,
    senderId,
    pinnedAt: new Date('2025-01-01'),
  });

  beforeEach(() => {
    mockUnpinMessage = vi.fn();
    mockOnMessageClick = vi.fn();

    useAuthStore.mockReturnValue({
      authUser: mockAuthUser,
    });

    useChatStore.mockReturnValue({
      pinnedMessages: [],
      unpinMessage: mockUnpinMessage,
      selectedUser: mockSelectedUser,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when there are no pinned messages', () => {
      const { container } = render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when pinnedMessages is null', () => {
      useChatStore.mockReturnValue({
        pinnedMessages: null,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      const { container } = render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render single pinned message', () => {
      const pinnedMessage = createMockMessage('msg1', 'Important message', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [pinnedMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.getByText('Important message')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    });

    it('should render multiple pinned messages with chevron button', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Should show latest pinned message
      expect(screen.getByText('First message')).toBeInTheDocument();

      // Should show chevron button for multiple messages
      expect(screen.getByLabelText('Show all pinned messages')).toBeInTheDocument();
    });

    it('should not show chevron button when only one pinned message', () => {
      const pinnedMessage = createMockMessage('msg1', 'Single message', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [pinnedMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.queryByLabelText('Show all pinned messages')).not.toBeInTheDocument();
    });

    it('should display "You" for own messages', () => {
      const ownMessage = createMockMessage('msg1', 'My message', 'user123');

      useChatStore.mockReturnValue({
        pinnedMessages: [ownMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should display sender name for other user messages', () => {
      const otherMessage = createMockMessage('msg1', 'Their message', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [otherMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render message with image', () => {
      const messageWithImage = createMockMessage(
        'msg1',
        'Image message',
        'user456',
        'https://example.com/image.jpg'
      );

      useChatStore.mockReturnValue({
        pinnedMessages: [messageWithImage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      const image = screen.getByAltText('Pinned');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  describe('Interactions', () => {
    it('should call onMessageClick when message is clicked', () => {
      const pinnedMessage = createMockMessage('msg1', 'Click me', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [pinnedMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      const message = screen.getByText('Click me');
      fireEvent.click(message);

      expect(mockOnMessageClick).toHaveBeenCalledWith('msg1');
    });

    it('should call unpinMessage when unpin button is clicked', () => {
      const pinnedMessage = createMockMessage('msg1', 'Unpin me', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [pinnedMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      const unpinButton = screen.getByLabelText('Unpin message');
      fireEvent.click(unpinButton);

      expect(mockUnpinMessage).toHaveBeenCalledWith('msg1');
      expect(mockOnMessageClick).not.toHaveBeenCalled();
    });
  });

  describe('Modal functionality', () => {
    it('should open modal when chevron button is clicked', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      expect(screen.getByText('Pinned Messages (2)')).toBeInTheDocument();
    });

    it('should display all pinned messages in modal', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
        createMockMessage('msg3', 'Third message', 'user456'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      expect(screen.getAllByText('First message').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Second message').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Third message').length).toBeGreaterThan(0);
    });

    it('should close modal when close button is clicked', async () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      expect(screen.getByText('Pinned Messages (2)')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Pinned Messages (2)')).not.toBeInTheDocument();
      });
    });

    it('should close modal when backdrop is clicked', async () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // Click backdrop
      const backdrop = screen.getByText('Pinned Messages (2)').closest('.fixed');
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByText('Pinned Messages (2)')).not.toBeInTheDocument();
      });
    });

    it('should not close modal when modal content is clicked', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // Click on modal content
      const modalContent = screen.getByText('Pinned Messages (2)').closest('.bg-slate-800');
      fireEvent.click(modalContent);

      // Modal should still be open
      expect(screen.getByText('Pinned Messages (2)')).toBeInTheDocument();
    });

    it('should call onMessageClick and close modal when message in modal is clicked', async () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // Click on a message in modal
      const messages = screen.getAllByText('Second message');
      // The message in the modal should be the second occurrence (first is in the collapsed view)
      fireEvent.click(messages[0]);

      expect(mockOnMessageClick).toHaveBeenCalledWith('msg2');

      await waitFor(() => {
        expect(screen.queryByText('Pinned Messages (2)')).not.toBeInTheDocument();
      });
    });

    it('should call unpinMessage when unpin button in modal is clicked', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First message', 'user456'),
        createMockMessage('msg2', 'Second message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // Click unpin button (should be multiple, one for each message)
      const unpinButtons = screen.getAllByLabelText('Unpin message');
      fireEvent.click(unpinButtons[2]); // Unpin second message (index 2 because index 0 is collapsed view, 1-2 are modal)

      expect(mockUnpinMessage).toHaveBeenCalledWith('msg2');
      expect(mockOnMessageClick).not.toHaveBeenCalled();
    });
  });

  describe('Message content display', () => {
    it('should truncate text in collapsed view', () => {
      const longMessage = createMockMessage('msg1', 'A'.repeat(200), 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [longMessage],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      const { container } = render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Check for truncate class in collapsed view
      const textElement = container.querySelector('.truncate');
      expect(textElement).toBeInTheDocument();
    });

    it('should not truncate text in modal view', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'A'.repeat(200), 'user456'),
        createMockMessage('msg2', 'Short message', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      const { container } = render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // In modal, text should not have truncate class
      const modalContainer = screen.getByText('Pinned Messages (2)').closest('.bg-slate-800');
      const truncatedElements = modalContainer.querySelectorAll('.truncate');
      
      // Should not find truncate class for message text in modal
      expect(truncatedElements.length).toBe(0);
    });

    it('should display pin icon for all pinned messages', () => {
      const pinnedMessages = [
        createMockMessage('msg1', 'First', 'user456'),
        createMockMessage('msg2', 'Second', 'user123'),
      ];

      useChatStore.mockReturnValue({
        pinnedMessages,
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      const { container } = render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Open modal to see all messages
      const chevronButton = screen.getByLabelText('Show all pinned messages');
      fireEvent.click(chevronButton);

      // Should have pin icons (lucide-react renders as svg)
      const pinIcons = container.querySelectorAll('svg');
      // At least one pin icon should be present (there are also chevron and X icons)
      expect(pinIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle message with both text and image', () => {
      const message = createMockMessage(
        'msg1',
        'Message with image',
        'user456',
        'https://example.com/image.jpg'
      );

      useChatStore.mockReturnValue({
        pinnedMessages: [message],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.getByText('Message with image')).toBeInTheDocument();
      expect(screen.getByAltText('Pinned')).toBeInTheDocument();
    });

    it('should handle message with only image (no text)', () => {
      const message = createMockMessage(
        'msg1',
        null,
        'user456',
        'https://example.com/image.jpg'
      );

      useChatStore.mockReturnValue({
        pinnedMessages: [message],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      expect(screen.getByAltText('Pinned')).toBeInTheDocument();
      expect(screen.queryByText(/Message/)).not.toBeInTheDocument();
    });

    it('should handle empty text message', () => {
      const message = createMockMessage('msg1', '', 'user456');

      useChatStore.mockReturnValue({
        pinnedMessages: [message],
        unpinMessage: mockUnpinMessage,
        selectedUser: mockSelectedUser,
      });

      render(<PinnedMessagesSection onMessageClick={mockOnMessageClick} />);

      // Should still render with sender name and timestamp
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    });
  });
});
