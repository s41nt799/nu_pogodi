import { describe, expect, it } from 'vitest';

import { gameConfig } from './config';
import {
  createInitialState,
  getDifficultyLevel,
  getFallSpeed,
  getSpawnInterval,
  resetGame,
  spawnEgg,
  startGame,
  togglePause,
  updateState,
} from './logic';
import type { Egg, GameModel, InputState } from './types';

const idleInput: InputState = { left: false, right: false };

function makePlayingState(overrides: Partial<GameModel> = {}): GameModel {
  return {
    ...startGame(0),
    spawnCooldownMs: 60_000,
    ...overrides,
  };
}

function makeEgg(overrides: Partial<Egg> = {}): Egg {
  return {
    id: 1,
    x: gameConfig.width / 2 - gameConfig.eggWidth / 2,
    y: 0,
    vy: gameConfig.baseFallSpeed,
    rotation: 0,
    ...overrides,
  };
}

describe('game logic', () => {
  it('creates an initial start state from config', () => {
    const state = createInitialState(11);

    expect(state.phase).toBe('start');
    expect(state.lives).toBe(gameConfig.initialLives);
    expect(state.score).toBe(0);
    expect(state.highScore).toBe(11);
    expect(state.eggs).toHaveLength(0);
  });

  it('creates a fresh playing state for a new round', () => {
    const state = startGame(7);

    expect(state.phase).toBe('playing');
    expect(state.score).toBe(0);
    expect(state.lives).toBe(gameConfig.initialLives);
    expect(state.eggs).toHaveLength(0);
    expect(state.highScore).toBe(7);
  });

  it('catching an egg increases score and removes the egg', () => {
    const state = makePlayingState();
    const egg = makeEgg({
      x: state.wolf.x + 20,
      y: state.wolf.y + gameConfig.wolfCatchInsetTop,
    });

    const result = updateState({ ...state, eggs: [egg] }, 1 / 60, idleInput);

    expect(result.score).toBe(1);
    expect(result.lives).toBe(gameConfig.initialLives);
    expect(result.eggs.some((item) => item.id === egg.id)).toBe(false);
  });

  it('missing an egg decreases lives', () => {
    const state = makePlayingState();
    const groundY = gameConfig.height - gameConfig.groundHeight;
    const egg = makeEgg({
      x: 2,
      y: groundY - gameConfig.eggHeight - 1,
    });

    const result = updateState({ ...state, eggs: [egg] }, 1 / 60, idleInput);

    expect(result.lives).toBe(gameConfig.initialLives - 1);
    expect(result.score).toBe(0);
    expect(result.eggs).toHaveLength(0);
  });

  it('transitions to gameover when the last life is lost and keeps the score', () => {
    const state = makePlayingState({ lives: 1, score: 3, highScore: 0 });
    const groundY = gameConfig.height - gameConfig.groundHeight;
    const egg = makeEgg({
      x: 2,
      y: groundY - gameConfig.eggHeight - 1,
    });

    const result = updateState({ ...state, eggs: [egg] }, 1 / 60, idleInput);

    expect(result.phase).toBe('gameover');
    expect(result.lives).toBe(0);
    expect(result.score).toBe(3);
    expect(result.highScore).toBe(3);
    expect(result.isNewRecord).toBe(true);
    expect(result.eggs).toHaveLength(0);
  });

  it('does not overwrite a higher saved record on gameover', () => {
    const state = makePlayingState({ lives: 1, score: 3, highScore: 10 });
    const groundY = gameConfig.height - gameConfig.groundHeight;
    const egg = makeEgg({
      x: 2,
      y: groundY - gameConfig.eggHeight - 1,
    });

    const result = updateState({ ...state, eggs: [egg] }, 1 / 60, idleInput);

    expect(result.phase).toBe('gameover');
    expect(result.highScore).toBe(10);
    expect(result.isNewRecord).toBe(false);
  });

  it('does not move the wolf beyond the left edge', () => {
    const state = makePlayingState({ wolf: { x: 1, y: createInitialState().wolf.y } });

    const result = updateState(state, 0.05, { left: true, right: false });

    expect(result.wolf.x).toBe(0);
  });

  it('does not move the wolf beyond the right edge', () => {
    const maxX = gameConfig.width - gameConfig.wolfWidth;
    const state = makePlayingState({ wolf: { x: maxX - 1, y: createInitialState().wolf.y } });

    const result = updateState(state, 0.05, { left: false, right: true });

    expect(result.wolf.x).toBe(maxX);
  });

  it('resetGame returns a fresh playing state and keeps the high score', () => {
    const result = resetGame(42);

    expect(result.phase).toBe('playing');
    expect(result.score).toBe(0);
    expect(result.lives).toBe(gameConfig.initialLives);
    expect(result.eggs).toHaveLength(0);
    expect(result.highScore).toBe(42);
    expect(result.wolf.x).toBe(gameConfig.width / 2 - gameConfig.wolfWidth / 2);
  });

  it('pausing freezes the simulation and resuming continues it', () => {
    const state = makePlayingState();
    const paused = togglePause(state);

    expect(paused.phase).toBe('paused');
    expect(updateState(paused, 1 / 60, { left: true, right: false })).toBe(paused);
    expect(togglePause(paused).phase).toBe('playing');
  });

  it('spawns eggs inside the field with config-driven speed', () => {
    const state = makePlayingState({ elapsedMs: 0 });
    const leftEgg = spawnEgg(state, () => 0);
    const rightEgg = spawnEgg(state, () => 1);

    expect(leftEgg.eggs[0].x).toBe(gameConfig.eggSidePadding);
    expect(rightEgg.eggs[0].x).toBe(gameConfig.width - gameConfig.eggWidth - gameConfig.eggSidePadding);
    expect(leftEgg.eggs[0].vy).toBe(gameConfig.baseFallSpeed);
    expect(leftEgg.nextEggId).toBe(2);
    expect(leftEgg.spawnCooldownMs).toBe(gameConfig.spawnIntervalMs);
  });

  it('increases fall speed and spawn frequency over time', () => {
    expect(getFallSpeed(0)).toBe(gameConfig.baseFallSpeed);
    expect(getFallSpeed(3)).toBeGreaterThan(getFallSpeed(0));
    expect(getSpawnInterval(3)).toBeLessThan(getSpawnInterval(0));
    expect(getSpawnInterval(100)).toBe(gameConfig.minSpawnIntervalMs);
    expect(getDifficultyLevel(gameConfig.difficultyRampMs * 2)).toBe(2);
  });

  it('spawns a new egg when the cooldown expires during play', () => {
    const state = makePlayingState({ spawnCooldownMs: 1 });

    const result = updateState(state, 0.05, idleInput);

    expect(result.eggs).toHaveLength(1);
    expect(result.spawnCooldownMs).toBe(gameConfig.spawnIntervalMs);
  });
});
