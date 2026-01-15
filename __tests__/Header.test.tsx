import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../components/Header';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    user: { daily_streak: 5, total_xp: 100, learning_language: 'MANDARIN', role: 'user' },
    logout: vi.fn(),
  }),
}));

describe('Header', () => {
  it('renders the logo', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('Bahasa Buddy')).toBeInTheDocument();
  });

  it('renders user stats when logged in', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('5')).toBeInTheDocument(); // streak
    expect(screen.getByText('100 XP')).toBeInTheDocument(); // xp
  });
});
