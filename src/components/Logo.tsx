import React from 'react';

/**
 * Marque « Coulisseo ».
 *
 * Le symbole est un C en Manrope ExtraBold, pose sur un carre de scene
 * degrade (sapin) avec un halo de projecteur. Le logotype reprend le meme
 * C en vert tilleul, et le point du « i » devient le « spot » qui te signale
 * les echeances.
 */

const C_PATH =
  'M758 -30Q542 -30 385.5 64.0Q229 158 144.5 327.0Q60 496 60 720Q60 944 144.5 1113.0Q229 1282 385.5 1376.0Q542 1470 758 1470Q1006 1470 1174.5 1347.0Q1343 1224 1412 1014L1138 938Q1098 1069 1003.0 1141.5Q908 1214 758 1214Q621 1214 529.5 1153.0Q438 1092 392.0 981.0Q346 870 346 720Q346 570 392.0 459.0Q438 348 529.5 287.0Q621 226 758 226Q908 226 1003.0 299.0Q1098 372 1138 502L1412 426Q1343 216 1174.5 93.0Q1006 -30 758 -30Z';

const C_TRANSFORM = 'translate(41.159,157.562) scale(0.079947,-0.079947)';

export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  // identifiants uniques : le logo est rendu plusieurs fois par page (barre laterale + en-tete)
  const uid = React.useId().replace(/:/g, '');
  const tileId = `coul-tile-${uid}`;
  const limeId = `coul-lime-${uid}`;
  const haloId = `coul-halo-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={tileId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#123a34" />
          <stop offset="100%" stopColor="#0a1f1d" />
        </linearGradient>
        <linearGradient id={limeId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#d9f2a3" />
          <stop offset="100%" stopColor="#7fc7ba" />
        </linearGradient>
        <radialGradient id={haloId} cx="0.5" cy="0.42" r="0.62">
          <stop offset="0%" stopColor="#d9f2a3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d9f2a3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" rx="48" fill={`url(#${tileId})`} />
      <circle cx="100" cy="94" r="88" fill={`url(#${haloId})`} />
      <g fill={`url(#${limeId})`} transform={C_TRANSFORM}>
        <path d={C_PATH} />
      </g>
    </svg>
  );
};

export const Marque: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className="flex items-center gap-2.5">
    <Logo size={compact ? 30 : 38} />
    <div className="leading-tight">
      <div className={`font-bold tracking-tight text-ink ${compact ? 'text-base' : 'text-lg'}`}>
        <span className="text-lime-300">C</span>oulisseo
      </div>
      {!compact && <div className="whitespace-nowrap text-[11px] tracking-wide text-brand-300">Pilotage · annexes 8 et 10</div>}
    </div>
  </div>
);
