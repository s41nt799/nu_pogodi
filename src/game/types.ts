export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover';

export type InputState = {
  left: boolean;
  right: boolean;
};

export type Wolf = {
  x: number;
  y: number;
};

export type Egg = {
  id: number;
  x: number;
  y: number;
  vy: number;
  rotation: number;
};

export type GameModel = {
  phase: GamePhase;
  score: number;
  lives: number;
  highScore: number;
  isNewRecord: boolean;
  wolf: Wolf;
  eggs: Egg[];
  elapsedMs: number;
  spawnCooldownMs: number;
  nextEggId: number;
};

export type GameConfig = {
  width: number;
  height: number;
  groundHeight: number;
  wolfWidth: number;
  wolfHeight: number;
  wolfSpeed: number;
  wolfCatchInsetX: number;
  wolfCatchInsetTop: number;
  wolfCatchInsetBottom: number;
  eggWidth: number;
  eggHeight: number;
  eggSidePadding: number;
  initialLives: number;
  baseFallSpeed: number;
  fallSpeedIncrease: number;
  maxFallSpeed: number;
  difficultyRampMs: number;
  maxDifficultyLevel: number;
  spawnIntervalMs: number;
  spawnIntervalDecrease: number;
  minSpawnIntervalMs: number;
  initialSpawnDelayMs: number;
  maxFrameDeltaSec: number;
  highScoreStorageKey: string;
};
