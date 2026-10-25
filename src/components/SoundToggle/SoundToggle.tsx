import React from 'react';

import { SoundOffIcon, SoundOnIcon } from '../Icons';

import styles from './SoundToggle.module.less';

type Props = {
  muted: boolean;
  onToggle: () => void;
};

export const SoundToggle: React.FC<Props> = ({ muted, onToggle }) => (
  <button
    type="button"
    className={styles.button}
    onClick={onToggle}
    aria-label={muted ? 'Включить звук' : 'Выключить звук'}
    aria-pressed={!muted}
    title={muted ? 'Включить звук' : 'Выключить звук'}
  >
    {muted ? <SoundOffIcon /> : <SoundOnIcon />}
  </button>
);
