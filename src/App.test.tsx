import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './components/App';
import { gameConfig } from './game/config';

const mockFlags = vi.hoisted(() => ({ forceGameOver: false }));

vi.mock('./game/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game/logic')>();

  return {
    ...actual,
    startGame: (highScore = 0) => {
      if (!mockFlags.forceGameOver) return actual.startGame(highScore);

      return {
        ...actual.createInitialState(highScore),
        phase: 'gameover' as const,
        score: 9,
        highScore: Math.max(highScore, 12),
        isNewRecord: true,
      };
    },
  };
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFlags.forceGameOver = false;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 0),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the start screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Ну, погоди!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Играть' })).toBeInTheDocument();
  });

  it('shows the saved record on the start screen', () => {
    localStorage.setItem(gameConfig.highScoreStorageKey, '42');
    render(<App />);

    expect(screen.getByText(/Рекорд:/)).toHaveTextContent('Рекорд: 42');
  });

  it('clicking play switches to the game screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Играть' }));

    expect(screen.getByText('Счёт')).toBeInTheDocument();
    expect(screen.getByText('Жизни')).toBeInTheDocument();
    expect(screen.getByTestId('wolf')).toBeInTheDocument();
  });

  it('shows the final score and high score when the game is over', async () => {
    mockFlags.forceGameOver = true;
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Играть' }));

    expect(screen.getByText('Финальный счёт')).toBeInTheDocument();
    expect(screen.getByTestId('final-score')).toHaveTextContent('9');
    expect(screen.getByTestId('high-score')).toHaveTextContent('12');
    expect(screen.getByText('Новый рекорд!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Заново' })).toBeInTheDocument();
    expect(localStorage.getItem(gameConfig.highScoreStorageKey)).toBe('12');
  });

  it('can pause and resume the game', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Играть' }));
    await user.click(screen.getByRole('button', { name: 'Пауза' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Пауза')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Продолжить' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
