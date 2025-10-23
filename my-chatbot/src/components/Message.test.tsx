import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Message from './Message';
import { ChatMessage } from '../types/chat';

describe('Message Component', () => {
  it('renders user message correctly', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date()
    };
    render(<Message message={message} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
