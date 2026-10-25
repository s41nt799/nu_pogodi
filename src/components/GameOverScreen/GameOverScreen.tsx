import React from 'react';

import buttons from '../../styles/buttons.module.less';
import stage from '../../styles/stage.module.less';
import { FarmBackground } from '../FarmBackground';
import { SoundToggle } from '../SoundToggle';

import styles from './GameOverScreen.module.less';

type Props = {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  muted: boolean;
  onRestart: () => void;
  onMenu: () => void;
  onToggleMute: () => void;
};

export const GameOverScreen: React.FC<Props> = ({
  score,
  highScore,
  isNewRecord,
  muted,
  onRestart,
  onMenu,
  onToggleMute,
}) => (
  <section className={`${stage.stage} ${styles.screen}`} aria-labelledby="gameover-title">
    <FarmBackground />
    <div className={styles.dim} aria-hidden="true" />

    <div className={styles.soundCorner}>
      <SoundToggle muted={muted} onToggle={onToggleMute} />
    </div>

    <main className={styles.panel}>
      <span className={styles.kicker}>Игра окончена</span>
      <h1 id="gameover-title" className={styles.title}>
        Ну, погоди...
      </h1>
      <p className={styles.text}>Яйца победили волка. Но реванш всегда возможен.</p>

      <div className={styles.scoreBox}>
        <span className={styles.scoreLabel}>Финальный счёт</span>
        <strong className={styles.scoreValue} data-testid="final-score">
          {score}
        </strong>
      </div>

      <div className={styles.recordRow}>
        <span className={styles.recordLabel}>Рекорд</span>
        <strong className={styles.recordValue} data-testid="high-score">
          {highScore}
        </strong>
        {isNewRecord && <span className={styles.recordBadge}>Новый рекорд!</span>}
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${buttons.base} ${buttons.primary}`} onClick={onRestart}>
          Заново
        </button>
        <button type="button" className={`${buttons.base} ${buttons.secondary}`} onClick={onMenu}>
          В меню
        </button>
      </div>
    </main>
  </section>
);
