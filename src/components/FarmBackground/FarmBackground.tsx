import React from 'react';

import { gameConfig } from '../../game/config';

import styles from './FarmBackground.module.less';

const GROUND_HEIGHT_VARIABLE = '--ground-height';

type BackgroundStyle = React.CSSProperties & Record<typeof GROUND_HEIGHT_VARIABLE, string>;

const groundHeightPercent = `${(gameConfig.groundHeight / gameConfig.height) * 100}%`;

const backgroundStyle = {
  [GROUND_HEIGHT_VARIABLE]: groundHeightPercent,
} as BackgroundStyle;

export const FarmBackground: React.FC = () => (
  <div className={styles.background} style={backgroundStyle} aria-hidden="true">
    <div className={styles.sun} />
    <div className={`${styles.cloud} ${styles.cloudOne}`} />
    <div className={`${styles.cloud} ${styles.cloudTwo}`} />
    <div className={`${styles.cloud} ${styles.cloudThree}`} />
    <div className={styles.hills} />
    <div className={styles.fence} />
    <div className={styles.ground} />
  </div>
);
