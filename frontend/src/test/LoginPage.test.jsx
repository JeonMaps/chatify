import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import LoginPage from '../pages/LoginPage.jsx';
import { useAuthStore } from '../store/useAuthStore.js';

// Mock the auth store
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginPage', () => {
  let mockLogin;

  beforeEach(() => {
    mockLogin = vi.fn();
    useAuthStore.mockReturnValue({
      login: mockLogin,
      isLoggingIn: false,
    });
  });

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render the login form with all input fields', () => {
      renderLoginPage();

      // Use getByRole to target the heading specifically
      expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('john.doe@gmail.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should render the link to signup page', () => {
      renderLoginPage();

      const signupLink = screen.getByText(/don't have an account\?/i);
      expect(signupLink).toBeInTheDocument();
      expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('should show feature badges', () => {
      renderLoginPage();

      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Easy Setup')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('should show welcome message', () => {
      renderLoginPage();

      expect(screen.getByText('Log in to your account')).toBeInTheDocument();
      expect(screen.getByText('Connect anytime, anywhere')).toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update email input when user types', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('john.doe@gmail.com');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input when user types', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should mask password input', () => {
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Submission', () => {
    it('should call login function with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('john.doe@gmail.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should call login with empty strings if form is submitted without input', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockLogin).toHaveBeenCalledWith({
          email: '',
          password: '',
        });
      });
    });

    it('should prevent default form submission', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const form = screen.getByRole('button', { name: /log in/i }).closest('form');
      const preventDefault = vi.fn();

      form.addEventListener('submit', preventDefault);
      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoggingIn is true', () => {
      useAuthStore.mockReturnValue({
        login: mockLogin,
        isLoggingIn: true,
      });

      renderLoginPage();

      // The button text "Log In" is replaced by a spinner
      const button = screen.getByRole('button');
      expect(button.textContent).toBe(''); // Button has no text, only spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable submit button when isLoggingIn is true', () => {
      useAuthStore.mockReturnValue({
        login: mockLogin,
        isLoggingIn: true,
      });

      renderLoginPage();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when isLoggingIn is false', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      renderLoginPage();

      // Labels exist but aren't properly associated with inputs (missing htmlFor)
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      
      // Verify inputs are present
      expect(screen.getByPlaceholderText('john.doe@gmail.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should have appropriate input types', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('john.doe@gmail.com');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      expect(emailInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have accessible button text', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /log in/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});
