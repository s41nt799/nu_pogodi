import { gameConfig } from './config';
import type { Egg, GameModel, InputState, Wolf } from './types';

type EggStepResult = {
  eggs: Egg[];
  caught: number;
  missed: number;
};

type RandomSource = () => number;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeHighScore(highScore: number): number {
  if (!Number.isFinite(highScore)) return 0;
  return Math.max(0, Math.floor(highScore));
}

function createWolf(): Wolf {
  return {
    x: gameConfig.width / 2 - gameConfig.wolfWidth / 2,
    y: gameConfig.height - gameConfig.groundHeight - gameConfig.wolfHeight,
  };
}

function createBaseState(phase: GameModel['phase'], highScore: number): GameModel {
  const normalizedHighScore = normalizeHighScore(highScore);

  return {
    phase,
    score: 0,
    lives: gameConfig.initialLives,
    highScore: normalizedHighScore,
    isNewRecord: false,
    wolf: createWolf(),
    eggs: [],
    elapsedMs: 0,
    spawnCooldownMs: gameConfig.initialSpawnDelayMs,
    nextEggId: 1,
  };
}

export function createInitialState(highScore = 0): GameModel {
  return createBaseState('start', highScore);
}

export function startGame(highScore = 0): GameModel {
  return createBaseState('playing', highScore);
}

export function resetGame(highScore = 0): GameModel {
  return startGame(highScore);
}

export function togglePause(state: GameModel): GameModel {
  if (state.phase === 'playing') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'playing' };
  return state;
}

export function getDifficultyLevel(elapsedMs: number): number {
  const level = Math.floor(Math.max(0, elapsedMs) / gameConfig.difficultyRampMs);
  return Math.min(level, gameConfig.maxDifficultyLevel);
}

export function getFallSpeed(level: number): number {
  const speed = gameConfig.baseFallSpeed + level * gameConfig.fallSpeedIncrease;
  return Math.min(speed, gameConfig.maxFallSpeed);
}

export function getSpawnInterval(level: number): number {
  const interval = gameConfig.spawnIntervalMs - level * gameConfig.spawnIntervalDecrease;
  return Math.max(interval, gameConfig.minSpawnIntervalMs);
}

export function spawnEgg(state: GameModel, random: RandomSource = Math.random): GameModel {
  if (state.phase !== 'playing') return state;

  const level = getDifficultyLevel(state.elapsedMs);
  const availableWidth = Math.max(0, gameConfig.width - gameConfig.eggWidth - gameConfig.eggSidePadding * 2);
  const id = state.nextEggId;
  const egg: Egg = {
    id,
    x: gameConfig.eggSidePadding + random() * availableWidth,
    y: -gameConfig.eggHeight,
    vy: getFallSpeed(level),
    rotation: ((id * 37) % 25) - 12,
  };

  return {
    ...state,
    eggs: [...state.eggs, egg],
    nextEggId: id + 1,
    spawnCooldownMs: getSpawnInterval(level),
  };
}

function moveWolf(wolf: Wolf, deltaSeconds: number, input: InputState): Wolf {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxX = gameConfig.width - gameConfig.wolfWidth;
  const x = clamp(wolf.x + direction * gameConfig.wolfSpeed * deltaSeconds, 0, maxX);

  if (x === wolf.x) return wolf;
  return { ...wolf, x };
}

function isEggCaught(egg: Egg, wolf: Wolf): boolean {
  const wolfLeft = wolf.x + gameConfig.wolfCatchInsetX;
  const wolfRight = wolf.x + gameConfig.wolfWidth - gameConfig.wolfCatchInsetX;
  const catchTop = wolf.y + gameConfig.wolfCatchInsetTop;
  const catchBottom = wolf.y + gameConfig.wolfHeight - gameConfig.wolfCatchInsetBottom;
  const hasHorizontalOverlap = egg.x + gameConfig.eggWidth >= wolfLeft && egg.x <= wolfRight;
  const hasVerticalOverlap = egg.y + gameConfig.eggHeight >= catchTop && egg.y <= catchBottom;

  return hasHorizontalOverlap && hasVerticalOverlap;
}

function advanceEggs(eggs: Egg[], deltaSeconds: number, wolf: Wolf): EggStepResult {
  const survivors: Egg[] = [];
  const groundY = gameConfig.height - gameConfig.groundHeight;
  let caught = 0;
  let missed = 0;

  eggs.forEach((egg) => {
    const movedEgg: Egg = { ...egg, y: egg.y + egg.vy * deltaSeconds };

    if (isEggCaught(movedEgg, wolf)) {
      caught += 1;
      return;
    }

    if (movedEgg.y + gameConfig.eggHeight >= groundY) {
      missed += 1;
      return;
    }

    survivors.push(movedEgg);
  });

  return { eggs: survivors, caught, missed };
}

export function updateState(state: GameModel, deltaSeconds: number, input: InputState): GameModel {
  if (state.phase !== 'playing') return state;

  const delta = clamp(deltaSeconds, 0, gameConfig.maxFrameDeltaSec);
  if (delta === 0) return state;

  const wolf = moveWolf(state.wolf, delta, input);
  const eggStep = advanceEggs(state.eggs, delta, wolf);
  const score = state.score + eggStep.caught;
  const lives = Math.max(0, state.lives - eggStep.missed);
  const elapsedMs = state.elapsedMs + delta * 1000;

  if (lives === 0) {
    return {
      ...state,
      phase: 'gameover',
      score,
      lives: 0,
      highScore: Math.max(state.highScore, score),
      isNewRecord: score > state.highScore,
      wolf,
      eggs: [],
      elapsedMs,
      spawnCooldownMs: gameConfig.initialSpawnDelayMs,
    };
  }

  const spawnCooldownMs = state.spawnCooldownMs - delta * 1000;
  const nextState: GameModel = {
    ...state,
    score,
    lives,
    wolf,
    eggs: eggStep.eggs,
    elapsedMs,
    spawnCooldownMs,
  };

  if (spawnCooldownMs <= 0) return spawnEgg(nextState);
  return nextState;
}
