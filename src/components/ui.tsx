import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSAIRE, type TermeGlossaire } from '../lib/glossaire';

type Tone = 'neutral' | 'brand' | 'green' | 'amber' | 'red' | 'blue' | 'lime';

const toneText: Record<Tone, string> = {
  neutral: 'text-ink',
  brand: 'text-brand-300',
  green: 'text-emerald-300',
  amber: 'text-amber-300',
  red: 'text-rose-300',
  blue: 'text-sky-300',
  lime: 'text-lime-300',
};

/* Fonds translucides : sur fond sombre, un aplat clair ferait tache. */
const toneBg: Record<Tone, string> = {
  neutral: 'bg-white/8 text-ink-muted ring-1 ring-inset ring-white/8',
  brand: 'bg-brand-500/14 text-brand-200 ring-1 ring-inset ring-brand-400/20',
  green: 'bg-emerald-500/14 text-emerald-300 ring-1 ring-inset ring-emerald-400/20',
  amber: 'bg-amber-400/12 text-amber-300 ring-1 ring-inset ring-amber-300/20',
  red: 'bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-400/20',
  blue: 'bg-sky-500/12 text-sky-300 ring-1 ring-inset ring-sky-400/20',
  lime: 'bg-lime-400/14 text-lime-300 ring-1 ring-inset ring-lime-300/20',
};

// ---------------------------------------------------------------------------
// Infobulle ⓘ : survol, focus clavier ou appui (mobile)
// ---------------------------------------------------------------------------

const LARGEUR_BULLE = 272;

export const Aide: React.FC<{ terme?: TermeGlossaire; texte?: React.ReactNode; className?: string; dark?: boolean }> = ({ terme, texte, className = '', dark }) => {
  const [ouvert, setOuvert] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; dessus: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  const contenu = texte ?? (terme ? GLOSSAIRE[terme] : null);

  // La bulle est rendue dans <body> en position fixe : elle n'est jamais coupée par un tableau défilant.
  const placer = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const vw = window.innerWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - LARGEUR_BULLE / 2), vw - LARGEUR_BULLE - 8);
    const dessus = r.top > 170;
    setPos({ left, top: dessus ? r.top - 8 : r.bottom + 8, dessus });
  };

  useEffect(() => {
    if (!ouvert) return;
    placer();
    const fermer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    const bouger = () => placer();
    document.addEventListener('mousedown', fermer);
    document.addEventListener('touchstart', fermer);
    document.addEventListener('keydown', echap);
    window.addEventListener('scroll', bouger, true);
    window.addEventListener('resize', bouger);
    return () => {
      document.removeEventListener('mousedown', fermer);
      document.removeEventListener('touchstart', fermer);
      document.removeEventListener('keydown', echap);
      window.removeEventListener('scroll', bouger, true);
      window.removeEventListener('resize', bouger);
    };
  }, [ouvert]);

  if (!contenu) return null;
  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`} onMouseEnter={() => setOuvert(true)} onMouseLeave={() => setOuvert(false)}>
      <button
        type="button"
        aria-label="Explication"
        aria-describedby={ouvert ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOuvert((o) => !o);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold normal-case leading-none transition ${
          dark ? 'bg-white/15 text-white/80 hover:bg-white/25' : 'bg-white/10 text-ink-faint ring-1 ring-inset ring-white/10 hover:bg-lime-400/20 hover:text-lime-200'
        }`}
      >
        i
      </button>
      {ouvert &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{ left: pos.left, top: pos.top, width: LARGEUR_BULLE, transform: pos.dessus ? 'translateY(-100%)' : undefined }}
            className="pointer-events-none fixed z-[100] rounded-2xl border border-white/10 bg-brand-950/95 px-3.5 py-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-card-lg backdrop-blur-xl"
          >
            {contenu}
          </span>,
          document.body
        )}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

export const PageHeader: React.FC<{
  title: string;
  accent?: string;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, accent, eyebrow, description, actions }) => (
  <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
        {title}
        {accent && <span className="block text-ink-faint">{accent}</span>}
      </h1>
      {description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

/** Carte en verre : filet lumineux en arête, fond translucide, profondeur douce. */
export const Card: React.FC<{
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  aide?: TermeGlossaire;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, action, aide, className = '', bodyClassName = 'px-5 pb-5 sm:px-6 sm:pb-6', children }) => (
  <section className={`glass ${className}`}>
    {title && (
      <header className="flex flex-wrap items-center gap-2.5 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-400/15">{icon}</span>}
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {aide && <Aide terme={aide} />}
        {action && <div className="ml-auto">{action}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

type KpiVariant = 'glass' | 'light' | 'dark' | 'lime';

export const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  aide?: TermeGlossaire;
  variant?: KpiVariant;
  className?: string;
  /** Variation affichée en pastille (gain / perte). */
  delta?: number | null;
  deltaLabel?: string;
}> = ({ label, value, sub, tone = 'neutral', icon, footer, aide, variant = 'glass', className = '', delta, deltaLabel }) => {
  const v = variant === 'light' ? 'glass' : variant;
  const bg = {
    glass: 'bg-surface-soft',
    dark: 'bg-brand-950/80 border-brand-400/15',
    lime: 'bg-lime-400/[0.07] border-lime-300/15',
  }[v];
  const labelCls = { glass: 'text-ink-muted', dark: 'text-brand-200/80', lime: 'text-lime-200/70' }[v];
  const valueCls = v === 'dark' ? 'text-gradient-lime' : v === 'lime' ? 'text-lime-200' : toneText[tone];
  const subCls = { glass: 'text-ink-faint', dark: 'text-brand-200/70', lime: 'text-lime-200/60' }[v];
  const iconCls = {
    glass: 'bg-white/8 text-ink-muted ring-1 ring-inset ring-white/8',
    dark: 'bg-white/10 text-lime-300',
    lime: 'bg-lime-300/15 text-lime-200',
  }[v];
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-4xl border border-line-soft p-5 shadow-card backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-lg sm:p-6 ${bg} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`flex items-center gap-1.5 text-sm ${labelCls}`}>
          {label}
          {aide && <Aide terme={aide} dark={v === 'dark'} />}
        </p>
        {icon && <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconCls}`}>{icon}</span>}
      </div>
      <p className={`num mt-4 text-[2rem] font-medium leading-none tracking-tight sm:text-4xl ${valueCls}`}>{value}</p>
      {delta != null && (
        <p className={`num mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta >= 0 ? 'bg-lime-400/15 text-lime-300' : 'bg-rose-500/15 text-rose-300'}`}>
          {delta >= 0 ? '▲' : '▼'} {eur(Math.abs(delta))}
          {deltaLabel && <span className="font-normal text-ink-faint">{deltaLabel}</span>}
        </p>
      )}
      {sub && <p className={`mt-2 text-sm ${subCls}`}>{sub}</p>}
      {footer && (
        <div className={`mt-auto pt-4 text-xs ${v === 'glass' ? 'text-ink-muted' : subCls}`}>
          <div className={`border-t pt-3 ${v === 'glass' ? 'border-line-soft' : v === 'dark' ? 'border-white/10' : 'border-lime-300/15'}`}>{footer}</div>
        </div>
      )}
    </div>
  );
};

export const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; aide?: TermeGlossaire; className?: string }> = ({
  label,
  value,
  hint,
  aide,
  className = '',
}) => (
  <div className={className}>
    <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
      {label}
      {aide && <Aide terme={aide} />}
    </dt>
    <dd className="num mt-1 text-lg font-semibold tracking-tight text-ink">{value}</dd>
    {hint && <dd className="text-xs text-ink-faint">{hint}</dd>}
  </div>
);

export const Notice: React.FC<{ tone?: 'info' | 'warn' | 'error' | 'success'; icon?: React.ReactNode; title?: string; children: React.ReactNode; className?: string }> = ({
  tone = 'info',
  icon,
  title,
  children,
  className = '',
}) => {
  const tones = {
    info: 'bg-sky-500/10 text-sky-100 ring-1 ring-inset ring-sky-400/15',
    warn: 'bg-amber-400/10 text-amber-100 ring-1 ring-inset ring-amber-300/15',
    error: 'bg-rose-500/10 text-rose-100 ring-1 ring-inset ring-rose-400/15',
    success: 'bg-lime-400/10 text-lime-100 ring-1 ring-inset ring-lime-300/15',
  } as const;
  return (
    <div className={`rounded-3xl p-4 text-sm sm:p-5 ${tones[tone]} ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 flex-shrink-0 opacity-80">{icon}</span>}
        <div className="flex-1 space-y-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className="leading-relaxed opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; title?: string; className?: string }> = ({ tone = 'neutral', children, title, className = '' }) => (
  <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneBg[tone]} ${className}`}>
    {children}
  </span>
);

export const Progress: React.FC<{
  value: number;
  max: number;
  tone?: 'brand' | 'green' | 'amber' | 'lime' | 'rose';
  marker?: number;
  className?: string;
  dark?: boolean;
}> = ({ value, max, tone = 'brand', marker, className = '', dark }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = {
    brand: 'bg-brand-400',
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    lime: 'bg-lime-400',
    rose: 'bg-rose-400',
  }[tone];
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-white/8'} ${className}`}>
      <div className={`h-2.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      {marker != null && max > 0 && (
        <div className="absolute -top-1 h-[18px] w-1 rounded-full bg-white/70" style={{ left: `calc(${Math.min(100, (marker / max) * 100)}% - 2px)` }} />
      )}
    </div>
  );
};

/** Anneau de progression (ex. heures sur 507). */
export const Ring: React.FC<{
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  dark?: boolean;
  /** Anneau Secondary : un second arc (repère de seuil) en arrière-plan. */
  track?: number;
}> = ({ value, max, size = 132, stroke = 12, children, dark, track }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={dark ? 'stroke-white/12' : 'stroke-white/8'} />
        {track != null && max > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            stroke="currentColor"
            className="text-white/10"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, track / max))}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={pct >= 1 ? 'stroke-lime-400' : 'stroke-brand-400'}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/**
 * Courbe miniature : évolution mensuelle (ARE versée, revenus nets…).
 * Rendue en SVG, sans dépendance.
 */
export const Sparkline: React.FC<{
  values: number[];
  height?: number;
  tone?: 'lime' | 'brand' | 'rose' | 'amber';
  className?: string;
  /** Remplit la surface sous la courbe. */
  fill?: boolean;
}> = ({ values, height = 48, tone = 'lime', className = '', fill = true }) => {
  if (values.length < 2) return <div className={className} style={{ height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${w},${height} L0,${height} Z`;
  const stroke = { lime: '#bfe176', brand: '#57b3a3', rose: '#fb7185', amber: '#fbbf24' }[tone];
  const gid = `sp-${tone}-${values.length}-${Math.round(max)}`;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-full border border-line-soft bg-surface-muted p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            o.value === value ? 'bg-brand-600 text-white shadow-float' : 'text-ink-muted hover:bg-surface-strong hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Field: React.FC<{ label: string; hint?: React.ReactNode; aide?: TermeGlossaire; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  aide,
  children,
  className = '',
}) => (
  <div className={`block ${className}`}>
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-muted">
      {label}
      {aide && <Aide terme={aide} />}
    </span>
    {children}
    {hint && <span className="mt-1.5 block text-xs leading-relaxed text-ink-faint">{hint}</span>}
  </div>
);

export const InputSuffix: React.FC<{ suffix: string; children: React.ReactNode }> = ({ suffix, children }) => (
  <div className="relative">
    {children}
    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-ink-faint">{suffix}</span>
  </div>
);

/** Onglets en pilules, défilables sur mobile. */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; icon?: React.ReactNode }[] }) {
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-full border border-line-soft bg-surface-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              t.value === value ? 'bg-brand-600 text-white shadow-float' : 'text-ink-muted hover:bg-surface-strong hover:text-ink'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** État vide : le plus souvent, « rien à afficher » veut dire « rien de saisi ». */
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; children?: React.ReactNode; className?: string }> = ({
  icon,
  title,
  children,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-10 text-center ${className}`}>
    {icon && <span className="text-ink-faint">{icon}</span>}
    <p className="text-sm font-semibold text-ink-muted">{title}</p>
    {children && <div className="max-w-sm text-xs leading-relaxed text-ink-faint">{children}</div>}
  </div>
);

/** Pastille de variation : gain ou perte, en euros ou en pourcentage. */
export const Delta: React.FC<{ value: number; unite?: '€' | '%' | 'h'; className?: string; label?: string }> = ({ value, unite = '€', className = '', label }) => {
  const signe = value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value);
  const txt = unite === '€' ? eur(abs) : unite === '%' ? `${abs.toFixed(1)} %` : `${nb(abs, 1)} h`;
  return (
    <span className={`num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-lime-400/15 text-lime-300' : value < 0 ? 'bg-rose-500/15 text-rose-300' : 'bg-white/8 text-ink-faint'} ${className}`}>
      {signe}
      {txt}
      {label && <span className="font-normal text-ink-faint">{label}</span>}
    </span>
  );
};

export const eur = (n: number, dec = 2): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

export const nb = (n: number, dec = 0): string => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n);
