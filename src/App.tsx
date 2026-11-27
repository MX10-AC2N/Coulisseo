import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { IntermittenceProvider } from './context/IntermittenceContext';
import { useSimulation } from './hooks/useSimulation';

import SynthesePage from './pages/SynthesePage';
import MonAJPage from './pages/MonAJPage';
import ContratsPage from './pages/ContratsPage';
import SuiviMensuelPage from './pages/SuiviMensuelPage';
import TableauDeBordPage from './pages/TableauDeBordPage';
import ExportExcelPage from './pages/ExportExcelPage';
import HistoriquePage from './pages/HistoriquePage';
import MesDroitsPage from './pages/MesDroitsPage';
import ActualisationPage from './pages/ActualisationPage';
import EcheancesPage from './pages/EcheancesPage';
import ReexamenPage from './pages/ReexamenPage';
import FiscalitePage from './pages/FiscalitePage';
import DossierPage from './pages/DossierPage';

import Navigation from './components/Navigation';
import ImportExportBar from './components/ImportExportBar';
import { Badge, eur, nb } from './components/ui';
import { Marque } from './components/Logo';
import { SEUIL_HEURES, formatDateFR, parseDate, toISODate } from './lib/calculs';

/** Nombre de jours entre aujourd'hui et une date (positif = à venir). */
function joursRestants(iso: string): number {
  const cible = parseDate(iso).getTime();
  if (!Number.isFinite(cible)) return 0;
  const aujourdhui = parseDate(toISODate(new Date())).getTime();
  return Math.round((cible - aujourdhui) / 86400000);
}

/** Résumé toujours visible : l'essentiel de la simulation en trois lignes. */
function Resume() {
  const sim = useSimulation();
  const aff = sim.affiliation;
  const pct = Math.min(100, (aff.heuresAffiliation / SEUIL_HEURES) * 100);
  const reste = joursRestants(sim.dateAnniversaire);

  return (
    <div className="space-y-3.5 rounded-4xl border border-line-soft bg-surface-muted p-4 shadow-card backdrop-blur-xl">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Allocation journalière</div>
        <div className="num text-2xl font-medium tracking-tight text-gradient-lime">{sim.ajBrute > 0 ? eur(sim.ajBrute) : '—'}</div>
        {sim.ajBrute > 0 && <div className="num text-xs text-ink-muted">{eur(sim.retenues.net)} net / jour</div>}
      </div>
      <div>
        <div className="flex justify-between text-xs text-ink-muted">
          <span>Heures ({SEUIL_HEURES})</span>
          <span className="num">{nb(aff.heuresAffiliation, 0)} h</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${aff.eligible ? 'bg-lime-400' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>Anniversaire</span>
        <span className="num text-ink">{formatDateFR(sim.dateAnniversaire)}</span>
      </div>
      <div className="flex items-baseline justify-between text-xs text-ink-muted">
        <span>Fin de droit</span>
        <span className={`num font-semibold ${reste > 0 ? 'text-lime-300' : 'text-rose-300'}`}>
          {reste > 0 ? `dans ${nb(reste)} j` : 'échu'}
        </span>
      </div>
    </div>
  );
}

/** Barre d'état : la situation du droit en un coup d'œil, et la prochaine action. */
function Etat() {
  const sim = useSimulation();
  const aff = sim.affiliation;
  const reste = joursRestants(sim.dateAnniversaire);
  const etat = aff.eligible ? (reste > 90 ? 'Droit actif' : 'Droit à renouveler') : 'Seuil non atteint';
  const tone = aff.eligible ? (reste > 90 ? 'lime' : 'amber') : 'red';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Badge tone={tone}>{etat}</Badge>
      <span className="num text-xs text-ink-muted">
        {aff.eligible ? `${nb(aff.heuresAffiliation, 0)} h sur ${SEUIL_HEURES}` : `il manque ${nb(aff.heuresManquantes, 0)} h`}
      </span>
      <span className="h-3 w-px bg-line-soft" />
      <span className="text-xs text-ink-faint">
        Prochaine échéance : <b className="text-ink-muted">{formatDateFR(sim.examen.dateExamen)}</b> (examen des droits)
      </span>
    </div>
  );
}

function Shell() {
  return (
    <div className="min-h-screen lg:flex">
      {/* Barre latérale (bureau) */}
      <aside className="hidden w-64 flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-line-soft bg-brand-950/60 px-4 py-6 backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-2">
          <Marque />
        </div>
        <Navigation />
        <div className="mt-auto space-y-3">
          <Resume />
          <ImportExportBar />
          <p className="px-3 text-[11px] text-ink-dim">Mise à jour le {formatDateFR(__DATE_MAJ__)}</p>
          <p className="px-3 text-[11px] leading-snug text-ink-faint">
            Vos données restent dans ce navigateur. Exportez-les pour les garder.
          </p>
        </div>
      </aside>

      {/* En-tête (mobile / tablette) */}
      <header className="sticky top-0 z-20 border-b border-line-soft bg-brand-950/80 px-4 pb-2 pt-3 backdrop-blur-2xl lg:hidden">
        <div className="mb-2 flex items-center justify-between">
          <Marque compact />
          <ImportExportBar compact />
        </div>
        <Navigation variant="top" />
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 hidden lg:block">
            <Etat />
          </div>
          <Routes>
            <Route path="/" element={<TableauDeBordPage />} />
            <Route path="/reexamen" element={<ReexamenPage />} />
            <Route path="/mon-aj" element={<MonAJPage />} />
            <Route path="/contrats" element={<ContratsPage />} />
            <Route path="/suivi-mensuel" element={<SuiviMensuelPage />} />
            <Route path="/synthese" element={<SynthesePage />} />
            <Route path="/historique" element={<HistoriquePage />} />
            <Route path="/mes-droits" element={<MesDroitsPage />} />
            <Route path="/actualisation" element={<ActualisationPage />} />
            <Route path="/echeances" element={<EcheancesPage />} />
            <Route path="/fiscalite" element={<FiscalitePage />} />
            <Route path="/dossier" element={<DossierPage />} />
            <Route path="/export" element={<ExportExcelPage />} />
          </Routes>
          <footer className="mt-12 border-t border-line-soft pt-4 text-xs text-ink-faint">
            Règles du guide « Intermittents du spectacle » de France Travail. Montants indicatifs : seule votre notification fait foi. Mise à jour le{' '}
            {formatDateFR(__DATE_MAJ__)}. Code source :{' '}
            <a href="https://github.com/mysteropodes/SImulateurIntermittece" target="_blank" rel="noreferrer" className="font-semibold text-brand-300 underline underline-offset-2">
              GitHub
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}

function App() {
  // BASE_URL vaut '/' , '/SImulateurIntermittece/' ou './' (build à la racine d'un domaine).
  // Le routeur exige un chemin absolu : un chemin relatif se résout sur la racine du site.
  const raw = import.meta.env.BASE_URL;
  const basename = raw === './' || raw === '' || raw === '.' ? '/' : raw.replace(/\/$/, '') || '/';
  return (
    <IntermittenceProvider>
      <Router basename={basename}>
        <Shell />
      </Router>
    </IntermittenceProvider>
  );
}

export default App;
