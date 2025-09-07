import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Solana Coin Flipper header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Solana Coin Flipper/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders Connect Wallet button', () => {
  render(<App />);
  const connectButton = screen.getByText(/Connect Wallet/i);
  expect(connectButton).toBeInTheDocument();
});

test('renders main heading', () => {
  render(<App />);
  const mainHeading = screen.getByText(/Flip, Bet, Win/i);
  expect(mainHeading).toBeInTheDocument();
});

test('renders action buttons', () => {
  render(<App />);
  const createRoomButton = screen.getByRole('button', { name: /Create Room/i });
  const joinRoomButton = screen.getByRole('button', { name: /Join Room/i });
  expect(createRoomButton).toBeInTheDocument();
  expect(joinRoomButton).toBeInTheDocument();
});
