import React, { useEffect, useRef, useState } from 'react';

import { soundManager } from '../../audio/SoundManager';
import { createInitialState, startGame, togglePause, updateState } from '../../game/logic';
import type { GameModel, InputState } from '../../game/types';
import { useGameLoop } from '../../hooks/useGameLoop';
import { loadHighScore, saveHighScore } from '../../utils/storage';
import { GameOverScreen } from '../GameOverScreen';
import { GameScreen } from '../GameScreen';
import { StartScreen } from '../StartScreen';

import styles from './App.module.less';

export const App: React.FC = () => {
  const [model, setModel] = useState<GameModel>(() => createInitialState(loadHighScore()));
  const [muted, setMuted] = useState<boolean>(() => soundManager.isMuted());
  const inputRef = useRef<InputState>({ left: false, right: false });
  const previousRef = useRef({
    score: model.score,
    lives: model.lives,
    phase: model.phase,
  });

  useGameLoop((deltaSeconds) => {
    setModel((previous) => updateState(previous, deltaSeconds, inputRef.current));
  }, model.phase === 'playing');

  useEffect(() => {
    if (model.phase !== 'playing') {
      inputRef.current.left = false;
      inputRef.current.right = false;
    }
  }, [model.phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const key = event.key.toLowerCase();
      const leftPressed = key === 'arrowleft' || key === 'a';
      const rightPressed = key === 'arrowright' || key === 'd';
      const pausePressed = key === 'p' || key === 'escape' || key === ' ';
      const canPause = model.phase === 'playing' || model.phase === 'paused';

      if (leftPressed || rightPressed) {
        if (model.phase !== 'playing') return;
        event.preventDefault();
        if (leftPressed) inputRef.current.left = true;
        if (rightPressed) inputRef.current.right = true;
        return;
      }

      if (pausePressed && canPause && !event.repeat) {
        event.preventDefault();
        setModel((previous) => togglePause(previous));
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') inputRef.current.left = false;
      if (key === 'arrowright' || key === 'd') inputRef.current.right = false;
    };

    const resetInput = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', resetInput);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', resetInput);
    };
  }, [model.phase]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setModel((previous) => (previous.phase === 'playing' ? togglePause(previous) : previous));
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const previous = previousRef.current;

    if (model.score > previous.score) soundManager.playCatch();
    if (model.lives < previous.lives) soundManager.playLoseLife();
    if (model.phase === 'gameover' && previous.phase !== 'gameover') {
      soundManager.playGameOver();
    }

    previousRef.current = {
      score: model.score,
      lives: model.lives,
      phase: model.phase,
    };
  }, [model.score, model.lives, model.phase]);

  useEffect(() => {
    if (model.phase === 'gameover') saveHighScore(model.highScore);
  }, [model.phase, model.highScore]);

  const startRound = () => {
    soundManager.unlock();
    soundManager.playStart();
    setModel((previous) => startGame(previous.highScore));
  };

  const goToMenu = () => {
    setModel((previous) => createInitialState(previous.highScore));
  };

  const handleTogglePause = () => {
    setModel((previous) => togglePause(previous));
  };

  const handleToggleMute = () => {
    const nextMuted = soundManager.toggleMute();
    if (!nextMuted) soundManager.unlock();
    setMuted(nextMuted);
  };

  const onLeftDown = () => {
    inputRef.current.left = true;
  };

  const onLeftUp = () => {
    inputRef.current.left = false;
  };

  const onRightDown = () => {
    inputRef.current.right = true;
  };

  const onRightUp = () => {
    inputRef.current.right = false;
  };

  const renderScreen = () => {
    if (model.phase === 'start') {
      return (
        <StartScreen highScore={model.highScore} muted={muted} onPlay={startRound} onToggleMute={handleToggleMute} />
      );
    }

    if (model.phase === 'gameover') {
      return (
        <GameOverScreen
          score={model.score}
          highScore={model.highScore}
          isNewRecord={model.isNewRecord}
          muted={muted}
          onRestart={startRound}
          onMenu={goToMenu}
          onToggleMute={handleToggleMute}
        />
      );
    }

    return (
      <GameScreen
        model={model}
        muted={muted}
        onToggleMute={handleToggleMute}
        onTogglePause={handleTogglePause}
        onRestart={startRound}
        onExit={goToMenu}
        onLeftDown={onLeftDown}
        onLeftUp={onLeftUp}
        onRightDown={onRightDown}
        onRightUp={onRightUp}
      />
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.shell}>{renderScreen()}</div>
    </div>
  );
};
