import React from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';

import styles from './TouchControls.module.less';

type Props = {
  onLeftDown: () => void;
  onLeftUp: () => void;
  onRightDown: () => void;
  onRightUp: () => void;
};

type PressHandler = (event: React.PointerEvent<HTMLButtonElement>) => void;

export const TouchControls: React.FC<Props> = ({ onLeftDown, onLeftUp, onRightDown, onRightUp }) => {
  const createDownHandler =
    (setPressed: (pressed: boolean) => void): PressHandler =>
    (event) => {
      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      setPressed(true);
    };

  const createUpHandler =
    (setPressed: (pressed: boolean) => void): PressHandler =>
    (event) => {
      event.preventDefault();
      setPressed(false);
    };

  const preventContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className={styles.controls} onContextMenu={preventContextMenu}>
      <button
        type="button"
        className={styles.button}
        aria-label="Влево"
        onPointerDown={createDownHandler(onLeftDown)}
        onPointerUp={createUpHandler(onLeftUp)}
        onPointerCancel={createUpHandler(onLeftUp)}
        onPointerLeave={createUpHandler(onLeftUp)}
        onLostPointerCapture={createUpHandler(onLeftUp)}
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Вправо"
        onPointerDown={createDownHandler(onRightDown)}
        onPointerUp={createUpHandler(onRightUp)}
        onPointerCancel={createUpHandler(onRightUp)}
        onPointerLeave={createUpHandler(onRightUp)}
        onLostPointerCapture={createUpHandler(onRightUp)}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};
