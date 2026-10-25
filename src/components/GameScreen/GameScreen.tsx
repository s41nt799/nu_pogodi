import React from 'react';

import { gameConfig } from '../../game/config';
import type { Egg, GameModel } from '../../game/types';
import buttons from '../../styles/buttons.module.less';
import stage from '../../styles/stage.module.less';
import { FarmBackground } from '../FarmBackground';
import { Hud } from '../Hud';
import { WolfSprite } from '../Sprites';
import { TouchControls } from '../TouchControls';

import styles from './GameScreen.module.less';

type Props = {
  model: GameModel;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onExit: () => void;
  onLeftDown: () => void;
  onLeftUp: () => void;
  onRightDown: () => void;
  onRightUp: () => void;
};

function toPercentX(value: number): string {
  return `${(value / gameConfig.width) * 100}%`;
}

function toPercentY(value: number): string {
  return `${(value / gameConfig.height) * 100}%`;
}

const wolfStyle: React.CSSProperties = {
  width: `${(gameConfig.wolfWidth / gameConfig.width) * 100}%`,
  height: `${(gameConfig.wolfHeight / gameConfig.height) * 100}%`,
};

function getEggStyle(egg: Egg): React.CSSProperties {
  return {
    left: toPercentX(egg.x),
    top: toPercentY(egg.y),
    width: `${(gameConfig.eggWidth / gameConfig.width) * 100}%`,
    height: `${(gameConfig.eggHeight / gameConfig.height) * 100}%`,
    transform: `rotate(${egg.rotation}deg)`,
  };
}

export const GameScreen: React.FC<Props> = ({
  model,
  muted,
  onToggleMute,
  onTogglePause,
  onRestart,
  onExit,
  onLeftDown,
  onLeftUp,
  onRightDown,
  onRightUp,
}) => {
  const paused = model.phase === 'paused';

  return (
    <section className={`${stage.stage} ${styles.arena}`} aria-label="Игровое поле">
      <FarmBackground />

      <Hud
        score={model.score}
        lives={model.lives}
        highScore={Math.max(model.score, model.highScore)}
        paused={paused}
        muted={muted}
        onToggleMute={onToggleMute}
        onTogglePause={onTogglePause}
      />

      <div
        className={styles.wolf}
        data-testid="wolf"
        style={{
          ...wolfStyle,
          left: toPercentX(model.wolf.x),
          top: toPercentY(model.wolf.y),
        }}
      >
        <WolfSprite />
      </div>

      {model.eggs.map((egg) => (
        <div key={egg.id} className={styles.egg} style={getEggStyle(egg)} />
      ))}

      <TouchControls onLeftDown={onLeftDown} onLeftUp={onLeftUp} onRightDown={onRightDown} onRightUp={onRightUp} />

      {paused && (
        <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className={styles.pauseCard}>
            <span className={styles.pauseKicker}>Пауза</span>
            <h2 id="pause-title" className={styles.pauseTitle}>
              Передышка
            </h2>
            <p className={styles.pauseText}>Волк замер. Яйца подождут.</p>
            <div className={styles.pauseActions}>
              <button type="button" className={`${buttons.base} ${buttons.primary}`} onClick={onTogglePause}>
                Продолжить
              </button>
              <button type="button" className={`${buttons.base} ${buttons.secondary}`} onClick={onRestart}>
                Заново
              </button>
              <button type="button" className={`${buttons.base} ${buttons.ghost}`} onClick={onExit}>
                В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
