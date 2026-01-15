import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { describe, it, expect } from 'vitest';

describe('HomePage', () => {
  it('renders the welcome message', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Belajar Bahasa Inggris dan Mandarin dengan Cara Seru!')).toBeInTheDocument();
  });

  it('renders the start button', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Mulai Belajar')).toBeInTheDocument();
  });
});
