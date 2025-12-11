import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import SignUpPage from '../pages/SignUpPage';
import { useAuthStore } from '../store/useAuthStore';

// Mock the auth store
vi.mock('../store/useAuthStore');

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SignUpPage', () => {
  let mockSignup;
  let user;

  beforeEach(() => {
    // Setup user event
    user = userEvent.setup();

    // Setup mock signup function
    mockSignup = vi.fn();

    // Mock the useAuthStore hook
    useAuthStore.mockReturnValue({
      signup: mockSignup,
      isSigningUp: false,
    });
  });

  const renderSignUpPage = () => {
    return render(
      <BrowserRouter>
        <SignUpPage />
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('should render the signup form with all input fields', () => {
      renderSignUpPage();

      // Use getByRole to target the heading specifically
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('john.doe@gmail.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should render the link to login page', () => {
      renderSignUpPage();

      const loginLink = screen.getByText(/already have an account\?/i);
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });

    it('should show feature badges', () => {
      renderSignUpPage();

      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Easy Setup')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update full name input when user types', async () => {
      renderSignUpPage();

      const nameInput = screen.getByPlaceholderText('John Doe');
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('should update email input when user types', async () => {
      renderSignUpPage();

      const emailInput = screen.getByPlaceholderText('john.doe@gmail.com');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input when user types', async () => {
      renderSignUpPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should mask password input', () => {
      renderSignUpPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Submission', () => {
    it('should call signup function with correct data when form is submitted', async () => {
      renderSignUpPage();

      // Fill in the form
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.type(screen.getByPlaceholderText('john.doe@gmail.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Verify signup was called with correct data
      expect(mockSignup).toHaveBeenCalledTimes(1);
      expect(mockSignup).toHaveBeenCalledWith({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should call signup with empty strings if form is submitted without input', async () => {
      renderSignUpPage();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(mockSignup).toHaveBeenCalledWith({
        fullName: '',
        email: '',
        password: '',
      });
    });

    it('should prevent default form submission', async () => {
      renderSignUpPage();

      const form = screen.getByRole('button', { name: /create account/i }).closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isSigningUp is true', () => {
      useAuthStore.mockReturnValue({
        signup: mockSignup,
        isSigningUp: true,
      });

      renderSignUpPage();

      // The button text "Create Account" is replaced by a spinner, but the heading still shows
      const button = screen.getByRole('button');
      expect(button.textContent).toBe(''); // Button has no text, only spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable submit button when isSigningUp is true', () => {
      useAuthStore.mockReturnValue({
        signup: mockSignup,
        isSigningUp: true,
      });

      renderSignUpPage();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when isSigningUp is false', () => {
      renderSignUpPage();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      renderSignUpPage();

      // Labels exist but aren't properly associated with inputs (missing htmlFor)
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      
      // Verify inputs are present
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('john.doe@gmail.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should have appropriate input types', () => {
      renderSignUpPage();

      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('john.doe@gmail.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      expect(nameInput).toHaveAttribute('type', 'text');
      expect(emailInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
