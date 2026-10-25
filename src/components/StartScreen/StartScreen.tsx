import React from 'react';

import buttons from '../../styles/buttons.module.less';
import stage from '../../styles/stage.module.less';
import { FarmBackground } from '../FarmBackground';
import { SoundToggle } from '../SoundToggle';
import { ChickenSprite, WolfSprite } from '../Sprites';

import styles from './StartScreen.module.less';

type Props = {
  highScore: number;
  muted: boolean;
  onPlay: () => void;
  onToggleMute: () => void;
};

export const StartScreen: React.FC<Props> = ({ highScore, muted, onPlay, onToggleMute }) => (
  <section className={`${stage.stage} ${styles.screen}`} aria-labelledby="game-title">
    <FarmBackground />

    <div className={styles.soundCorner}>
      <SoundToggle muted={muted} onToggle={onToggleMute} />
    </div>

    <div className={styles.mascots} aria-hidden="true">
      <div className={styles.wolfMascot}>
        <WolfSprite />
      </div>
      <div className={styles.chickenMascot}>
        <ChickenSprite />
      </div>
      <span className={`${styles.egg} ${styles.eggOne}`} />
      <span className={`${styles.egg} ${styles.eggTwo}`} />
      <span className={`${styles.egg} ${styles.eggThree}`} />
    </div>

    <main className={styles.content}>
      <span className={styles.kicker}>Серия «Электроника»</span>
      <h1 id="game-title" className={styles.title}>
        Ну, погоди!
      </h1>
      <p className={styles.subtitle}>Волк выходит на охоту. Лови яйца, набирай очки и не растеряй все жизни!</p>

      <button type="button" className={`${buttons.base} ${buttons.primary} ${styles.playButton}`} onClick={onPlay}>
        Играть
      </button>

      {highScore > 0 ? (
        <p className={styles.best}>
          Рекорд: <strong>{highScore}</strong>
        </p>
      ) : (
        <p className={styles.bestHint}>Первый рекорд ждёт тебя</p>
      )}

      <div className={styles.hint}>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> или <kbd>A</kbd>
          <kbd>D</kbd> - движение
        </span>
        <span>
          <kbd>P</kbd> или <kbd>Пробел</kbd> - пауза
        </span>
        <span>На телефоне - экранные кнопки</span>
      </div>
    </main>
  </section>
);
