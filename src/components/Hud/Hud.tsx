import React from 'react';

import { gameConfig } from '../../game/config';
import { HeartIcon, PauseIcon, PlayIcon } from '../Icons';
import { SoundToggle } from '../SoundToggle';

import styles from './Hud.module.less';

type Props = {
  score: number;
  lives: number;
  highScore: number;
  paused: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
};

export const Hud: React.FC<Props> = ({ score, lives, highScore, paused, muted, onToggleMute, onTogglePause }) => (
  <header className={styles.hud}>
    <div className={styles.scoreBadge} aria-live="polite">
      <span className={styles.label}>Счёт</span>
      <strong className={styles.score}>{score}</strong>
    </div>

    <div className={styles.lives} aria-label={`Жизни: ${lives}`}>
      <span className={styles.label}>Жизни</span>
      <span className={styles.hearts}>
        {Array.from({ length: gameConfig.initialLives }, (_, index) => (
          <span key={index} className={`${styles.heart} ${index < lives ? '' : styles.heartEmpty}`}>
            <HeartIcon />
          </span>
        ))}
      </span>
    </div>

    <div className={styles.best}>
      <span className={styles.label}>Рекорд</span>
      <strong className={styles.bestValue}>{highScore}</strong>
    </div>

    <div className={styles.actions}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={onTogglePause}
        aria-label={paused ? 'Продолжить' : 'Пауза'}
        title={paused ? 'Продолжить' : 'Пауза'}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <SoundToggle muted={muted} onToggle={onToggleMute} />
    </div>
  </header>
);
