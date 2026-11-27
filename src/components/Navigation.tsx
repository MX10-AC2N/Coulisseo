import React, { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  List,
  Calendar,
  SlidersHorizontal,
  FileSpreadsheet,
  History,
  LifeBuoy,
  ClipboardCheck,
  CalendarClock,
  Scale,
  Receipt,
  Printer,
} from 'lucide-react';

export interface PageNav {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Badge discret : signale un point de vigilance. */
  badge?: string;
}

/** Les entrées sont regroupées : on pilote, on saisit, on suit, on archive. */
export const NAV_GROUPES: { titre: string; pages: PageNav[] }[] = [
  {
    titre: 'Pilotage',
    pages: [
      { to: '/', label: 'Tableau de bord', icon: Home },
      { to: '/reexamen', label: 'Réexamen', icon: Scale, badge: 'Anticipation' },
    ],
  },
  {
    titre: 'Vos données',
    pages: [
      { to: '/contrats', label: 'Contrats', icon: List },
      { to: '/mon-aj', label: 'Mon droit', icon: SlidersHorizontal },
    ],
  },
  {
    titre: 'Suivi',
    pages: [
      { to: '/suivi-mensuel', label: 'Suivi mensuel', icon: Calendar },
      { to: '/actualisation', label: 'Actualisation', icon: ClipboardCheck },
      { to: '/echeances', label: 'Échéances', icon: CalendarClock },
    ],
  },
  {
    titre: 'Archives & droits',
    pages: [
      { to: '/historique', label: 'Historique', icon: History },
      { to: '/mes-droits', label: 'Mes droits', icon: LifeBuoy },
    ],
  },
  {
    titre: 'Administratif',
    pages: [
      { to: '/fiscalite', label: 'Fiscalité', icon: Receipt },
      { to: '/dossier', label: 'Dossier', icon: Printer },
      { to: '/export', label: 'Export Excel', icon: FileSpreadsheet },
    ],
  },
];

/** Liste à plat : conservée pour les usages existants (liens directs, tests). */
export const PAGES: PageNav[] = NAV_GROUPES.flatMap((g) => g.pages);

const Navigation: React.FC<{ variant?: 'side' | 'top' }> = ({ variant = 'side' }) => {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  // mobile : garder l'onglet actif visible dans la barre défilante
  useEffect(() => {
    const actif = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav = navRef.current;
    if (actif && nav) {
      const gauche = actif.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
      nav.scrollTo({ left: gauche - nav.clientWidth / 2 + actif.clientWidth / 2, behavior: 'smooth' });
    }
  }, [location.pathname]);

  if (variant === 'top') {
    return (
      <nav ref={navRef} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {PAGES.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                isActive ? 'bg-lime-400 text-brand-950' : 'text-brand-200 hover:bg-white/10 hover:text-ink'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPES.map((groupe) => (
        <div key={groupe.titre}>
          <p className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-dim">{groupe.titre}</p>
          <div className="flex flex-col gap-0.5">
            {groupe.pages.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={badge ? `${label} — ${badge}` : label}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 ${
                    isActive
                      ? 'bg-lime-400/12 font-semibold text-lime-200 ring-1 ring-inset ring-lime-300/20'
                      : 'text-brand-200/70 hover:bg-white/[0.06] hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-lime-400" />}
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-lime-300' : 'text-brand-300/60 group-hover:text-brand-200'}`} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};

export default Navigation;
