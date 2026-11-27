import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { Annexe, Contrat, TypeContrat } from '../lib/calculs';

const TYPES: TypeContrat[] = ['Cachet', 'Heures', 'Enseignement', 'RegimeGeneral', 'NonSalarie', 'Arret', 'Formation'];

/** Droit passé, saisi depuis une notification France Travail. */
export interface DroitPasse {
  id: string;
  /** Premier jour indemnisable du droit. */
  dateDebut: string;
  /** AJ brute notifiée. */
  ajBrute: number;
  /** Heures travaillées retenues (facultatif). */
  heures?: number;
  /** Salaire de référence (facultatif). */
  salaires?: number;
}

/** Données de la page « Fiscalité » : toutes les saisies sont des chaînes, comme ailleurs. */
export interface FiscaliteData {
  /** Année de revenu déclarée (revenus 2025 = déclaration 2042 en 2026). 0 = année du dernier droit. */
  annee: number;
  /** Taux d'imposition moyen retenu pour la comparaison : '0' | '11' | '30' | '41' | '45'. */
  tauxImposition: string;
  /** Régime de déduction : '10' | '5' | '14' | '5et14'. */
  regimeArtiste: string;
  /** Frais professionnels réels, par catégorie (montants saisis en euros). */
  fraisReels: {
    vestimentaire: string;
    formation: string;
    materiel: string;
    transports: string;
    repas: string;
    medical: string;
    autres: string;
  };
  /** ARE brute annuelle saisie manuellement (quand elle n'est pas calculable). */
  areAnnuel: string;
  /** Indemnités de défraiement perçues, à réintégrer au revenu imposable en option frais réels. */
  indemnitesDefraiement: string;
}

export interface IntermittenceData {
  version: 3;
  annexe: Annexe;
  /** Fin du contrat ayant ouvert le droit en cours (sert de défaut au début du droit). */
  dateFinContrat: string;
  /** Facultatif : fige la fin de la période de référence (sinon = fin du dernier contrat). */
  dateFinPRA: string;
  /** Premier jour indemnisable (début du droit). */
  dateIndem: string;
  delaiAttente: boolean;
  /** 50 ans ou plus à la fin du contrat retenu (120 h d'enseignement au lieu de 70). */
  plus50ans: boolean;
  /** Contrats dans les deux annexes : une annexe par contrat. */
  multiAnnexe: boolean;
  /** AJ brute figurant sur la notification France Travail (vide = AJ calculée). */
  ajBruteNotifiee: string;
  /** Franchises calculées automatiquement ou saisies (notification). */
  franchisesAuto: boolean;
  franchiseConges: string;
  joursConges: string;
  franchiseSalaires: string;
  joursSalaires: string;
  /** Taux de prélèvement à la source, en %. */
  tauxPrelevement: string;
  /** Taux de CSG sur l'ARE : 6,2 % (taux plein) ou 3,8 % (taux réduit). */
  tauxCSG: '6.2' | '3.8';
  /** Cotisations salariales estimées sur les salaires, en %. */
  tauxCotisationsSalaire: string;
  contrats: Contrat[];
  /** Droits précédents, pour suivre la progression d'une date anniversaire à l'autre. */
  historique: DroitPasse[];
  /** Données d'exemple fictives chargées au premier lancement. */
  exemple?: boolean;
  /** Profil pour l'onglet « Mes droits » (perte de l'intermittence, congés). */
  profil: {
    ancienneteAns: number;
    cinqAnsSur10: boolean;
    afdDeja: number;
    congeDebut: string;
    congeType: string;
  };
  /** Fiscalité : options de déduction, frais réels, données à déclarer. */
  fiscal: FiscaliteData;
}

interface IntermittenceContextProps {
  data: IntermittenceData;
  setData: React.Dispatch<React.SetStateAction<IntermittenceData>>;
  updateField: <K extends keyof IntermittenceData>(field: K, value: IntermittenceData[K]) => void;
  updateContrat: <K extends keyof Contrat>(id: string, field: K, value: Contrat[K]) => void;
  addContrat: () => void;
  removeContrat: (id: string) => void;
  resetData: () => void;
  /** Vide l'exemple sans confirmation (bandeau d'accueil). */
  viderExemple: () => void;
  /** Recharge les données d'exemple fictives. */
  chargerExemple: () => void;
  addDroit: (d?: Partial<DroitPasse>) => void;
  updateDroit: <K extends keyof DroitPasse>(id: string, field: K, value: DroitPasse[K]) => void;
  removeDroit: (id: string) => void;
  exportData: () => void;
  importData: (jsonData: string) => void;
}

/** Clé de stockage inchangée depuis la v2 : migrate() convertit les anciens formats. */
const STORAGE_KEY = 'simulateur-intermittence:v2';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Valeurs par défaut du bloc « fiscal » (aucune donnée inventée). */
export const defaultFiscal: FiscaliteData = {
  annee: 0,
  tauxImposition: '11',
  regimeArtiste: '10',
  fraisReels: {
    vestimentaire: '',
    formation: '',
    materiel: '',
    transports: '',
    repas: '',
    medical: '',
    autres: '',
  },
  areAnnuel: '',
  indemnitesDefraiement: '',
};

export const defaultData: IntermittenceData = {
  version: 3,
  annexe: 'A8',
  dateFinContrat: '',
  dateFinPRA: '',
  dateIndem: '',
  delaiAttente: false,
  plus50ans: false,
  multiAnnexe: false,
  ajBruteNotifiee: '',
  franchisesAuto: true,
  franchiseConges: '',
  joursConges: '',
  franchiseSalaires: '',
  joursSalaires: '',
  tauxPrelevement: '0',
  tauxCSG: '6.2',
  tauxCotisationsSalaire: '22',
  contrats: [],
  historique: [],
  profil: { ancienneteAns: 0, cinqAnsSur10: false, afdDeja: 0, congeDebut: '', congeType: 'maternite-1-2' },
  fiscal: defaultFiscal,
};

/** Date à laquelle le jeu d'exemple a été écrit : on le décale d'autant de mois pour qu'il reste actuel. */
const REFERENCE_EXEMPLE = new Date(2026, 8, 1);

function decaler(iso: string, mois: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const r = new Date(y, m - 1 + mois, 1);
  const dernier = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d, dernier));
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`;
}

/** Exemple fictif pour découvrir l'outil (technicienne en annexe 8, employeurs inventés). */
export const exempleData = (aujourdHui = new Date()): IntermittenceData => {
  const k = (aujourdHui.getFullYear() - REFERENCE_EXEMPLE.getFullYear()) * 12 + aujourdHui.getMonth() - REFERENCE_EXEMPLE.getMonth();
  const d = (iso: string) => decaler(iso, k);
  const c = (date: string, dateFin: string, employeur: string, type: Contrat['type'], nombre: number, brut: number): Contrat => ({
    id: newId(),
    date: d(date),
    dateFin: d(dateFin),
    employeur,
    type,
    nombre,
    brut,
  });
  return {
    ...defaultData,
    exemple: true,
    dateFinContrat: d('2026-03-13'),
    dateIndem: d('2026-03-15'),
    delaiAttente: true,
    ajBruteNotifiee: '71.40',
    tauxPrelevement: '4.5',
    profil: { ...defaultData.profil, ancienneteAns: 6, cinqAnsSur10: true },
    historique: [
      { id: newId(), dateDebut: d('2024-03-02'), ajBrute: 62.8, heures: 612, salaires: 16900 },
      { id: newId(), dateDebut: d('2025-03-08'), ajBrute: 67.15, heures: 684, salaires: 19800 },
    ],
    contrats: [
      c('2025-04-07', '2025-04-18', 'Théâtre des Lucioles', 'Heures', 70, 2240),
      c('2025-05-12', '2025-05-16', 'Festival Ondes Claires', 'Heures', 40, 1360),
      c('2025-06-02', '2025-06-27', 'Compagnie Nuit Blanche', 'Heures', 120, 3720),
      c('2025-07-10', '2025-07-20', 'Festival Ondes Claires', 'Heures', 88, 2900),
      c('2025-09-15', '2025-09-26', 'Studio Pixel Rouge', 'Heures', 72, 2450),
      c('2025-10-06', '2025-10-10', 'École Arts du Son', 'Enseignement', 21, 790),
      c('2025-11-03', '2025-11-21', 'Théâtre des Lucioles', 'Heures', 105, 3390),
      c('2025-12-08', '2025-12-12', 'Opéra Miniature', 'Cachet', 5, 1500),
      c('2026-01-19', '2026-01-30', 'Studio Pixel Rouge', 'Heures', 64, 2210),
      c('2026-02-16', '2026-03-13', 'Compagnie Nuit Blanche', 'Heures', 110, 3530),
      c('2026-04-13', '2026-04-17', 'Festival Ondes Claires', 'Heures', 38, 1290),
      c('2026-05-25', '2026-06-05', 'Théâtre des Lucioles', 'Heures', 76, 2530),
      c('2026-06-15', '2026-06-19', 'Agence Clair-Obscur', 'RegimeGeneral', 28, 520),
      c('2026-07-06', '2026-07-24', 'Festival Ondes Claires', 'Heures', 96, 3180),
      c('2026-09-07', '2026-09-11', 'Opéra Miniature', 'Cachet', 4, 1240),
      c('2026-08-11', '2026-08-29', 'Compagnie Nuit Blanche', 'Heures', 120, 3900),
      c('2026-10-06', '2026-10-23', 'Théâtre des Lucioles', 'Heures', 155, 5100),
    ],
  };
};

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v));

/** Limites d'un fichier importé : au-delà, il ne s'agit pas d'un export du simulateur. */
export const IMPORT_MAX_OCTETS = 2_000_000;
const MAX_CONTRATS = 5000;
const MAX_DROITS = 200;
const MAX_TEXTE = 200;

/** Date AAAA-MM-JJ valide, sinon '' : une date mal formée ferait planter les calculs. */
const date = (v: unknown): string => {
  const s = str(v).trim();
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  const iso = fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const t = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === iso ? iso : '';
};

/**
 * Accepte les JSON de la v1 (annexe en libellé, ajBrute/ajNette…) comme de la v2
 * et de la v3, et remet chaque champ dans un état sûr.
 */
export function migrate(raw: unknown): IntermittenceData {
  if (!raw || typeof raw !== 'object') throw new Error('format invalide');
  const r = raw as Record<string, unknown>;

  const annexeRaw = str(r.annexe, 'A8');
  const annexe: Annexe = annexeRaw === 'A10' || /10|artiste/i.test(annexeRaw) ? 'A10' : 'A8';

  const contratsRaw = Array.isArray(r.contrats) ? r.contrats.slice(0, MAX_CONTRATS) : [];
  const contrats: Contrat[] = contratsRaw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      id: str(c.id).slice(0, 64) || newId(),
      date: date(c.date) || new Date().toISOString().slice(0, 10),
      dateFin: date(c.dateFin) || undefined,
      employeur: str(c.employeur).slice(0, MAX_TEXTE),
      type: TYPES.includes(c.type as TypeContrat) ? (c.type as TypeContrat) : 'Heures',
      annexe: c.annexe === 'A8' || c.annexe === 'A10' ? c.annexe : undefined,
      nombre: Math.max(0, num(c.nombre, 0)),
      brut: Math.max(0, num(c.brut, 0)),
    }));

  const historiqueRaw = Array.isArray(r.historique) ? r.historique.slice(0, MAX_DROITS) : [];
  const historique: DroitPasse[] = historiqueRaw
    .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object' && !!date(h.dateDebut))
    .map((h) => ({
      id: str(h.id).slice(0, 64) || newId(),
      dateDebut: date(h.dateDebut),
      ajBrute: Math.max(0, num(h.ajBrute, 0)),
      heures: h.heures == null || h.heures === '' ? undefined : Math.max(0, num(h.heures, 0)),
      salaires: h.salaires == null || h.salaires === '' ? undefined : Math.max(0, num(h.salaires, 0)),
    }));

  const version = num(r.version, 1);
  const v1 = version < 2;

  // Bloc fiscal : absent des exports antérieurs à la v3, on prend les valeurs par défaut.
  const fiscalRaw = (r.fiscal && typeof r.fiscal === 'object' ? r.fiscal : {}) as Record<string, unknown>;
  const fraisRaw = (fiscalRaw.fraisReels && typeof fiscalRaw.fraisReels === 'object' ? fiscalRaw.fraisReels : {}) as Record<
    string,
    unknown
  >;
  const taux = str(fiscalRaw.tauxImposition, '11');
  const regime = str(fiscalRaw.regimeArtiste, '10');
  const fiscal: FiscaliteData = {
    annee: Math.max(0, Math.floor(num(fiscalRaw.annee, 0))),
    tauxImposition: ['0', '11', '30', '41', '45'].includes(taux) ? taux : '11',
    regimeArtiste: ['10', '5', '14', '5et14'].includes(regime) ? regime : '10',
    fraisReels: {
      vestimentaire: str(fraisRaw.vestimentaire),
      formation: str(fraisRaw.formation),
      materiel: str(fraisRaw.materiel),
      transports: str(fraisRaw.transports),
      repas: str(fraisRaw.repas),
      medical: str(fraisRaw.medical),
      autres: str(fraisRaw.autres),
    },
    areAnnuel: str(fiscalRaw.areAnnuel),
    indemnitesDefraiement: str(fiscalRaw.indemnitesDefraiement),
  };

  const franchisesSaisies = !!(str(r.franchiseConges) || str(r.franchiseSalaires));

  return {
    version: 3,
    annexe,
    dateFinContrat: date(r.dateFinContrat),
    dateFinPRA: date(r.dateFinPRA),
    dateIndem: date(r.dateIndem),
    delaiAttente: !!r.delaiAttente,
    plus50ans: !!r.plus50ans,
    multiAnnexe: !!r.multiAnnexe,
    ajBruteNotifiee: str(r.ajBruteNotifiee ?? (v1 ? r.ajBrute : '')),
    franchisesAuto: typeof r.franchisesAuto === 'boolean' ? r.franchisesAuto : !franchisesSaisies,
    franchiseConges: str(r.franchiseConges),
    joursConges: str(r.joursConges),
    franchiseSalaires: str(r.franchiseSalaires),
    joursSalaires: str(r.joursSalaires),
    tauxPrelevement: str(r.tauxPrelevement, '0') || '0',
    tauxCSG: r.tauxCSG === '3.8' ? '3.8' : '6.2',
    tauxCotisationsSalaire: str(r.tauxCotisationsSalaire, '22') || '22',
    contrats,
    historique,
    exemple: r.exemple === true,
    profil: (() => {
      const p = (r.profil && typeof r.profil === 'object' ? r.profil : {}) as Record<string, unknown>;
      return {
        ancienneteAns: Math.max(0, num(p.ancienneteAns, 0)),
        cinqAnsSur10: !!p.cinqAnsSur10,
        afdDeja: Math.max(0, Math.floor(num(p.afdDeja, 0))),
        congeDebut: date(p.congeDebut),
        congeType: str(p.congeType, 'maternite-1-2') || 'maternite-1-2',
      };
    })(),
    fiscal,
  };
}

function loadInitial(): IntermittenceData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return migrate(JSON.parse(saved));
  } catch {
    /* stockage indisponible ou corrompu : on repart de l'exemple */
  }
  return exempleData();
}

export const IntermittenceContext = createContext<IntermittenceContextProps>({} as IntermittenceContextProps);

export const useIntermittence = () => useContext(IntermittenceContext);

export const IntermittenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<IntermittenceData>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota ou navigation privée : l'export JSON reste disponible */
    }
  }, [data]);

  const updateField: IntermittenceContextProps['updateField'] = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateContrat: IntermittenceContextProps['updateContrat'] = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      contrats: prev.contrats.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const addContrat = () => {
    setData((prev) => ({
      ...prev,
      contrats: [
        ...prev.contrats,
        { id: newId(), date: new Date().toISOString().slice(0, 10), employeur: '', type: 'Cachet', nombre: 1, brut: 0 },
      ],
    }));
  };

  const removeContrat = (id: string) => {
    setData((prev) => ({ ...prev, contrats: prev.contrats.filter((c) => c.id !== id) }));
  };

  const addDroit = (d: Partial<DroitPasse> = {}) => {
    setData((prev) => {
      // par défaut : un an avant le droit le plus ancien connu
      const plusAncien = [prev.dateIndem, ...prev.historique.map((h) => h.dateDebut)].filter(Boolean).sort()[0];
      const y = plusAncien ? Number(plusAncien.slice(0, 4)) - 1 : new Date().getFullYear() - 1;
      const dateDebut = plusAncien ? `${y}${plusAncien.slice(4)}` : `${y}-01-01`;
      return { ...prev, historique: [...prev.historique, { id: newId(), dateDebut, ajBrute: 0, ...d }] };
    });
  };

  const updateDroit: IntermittenceContextProps['updateDroit'] = (id, field, value) => {
    setData((prev) => ({ ...prev, historique: prev.historique.map((h) => (h.id === id ? { ...h, [field]: value } : h)) }));
  };

  const removeDroit = (id: string) => {
    setData((prev) => ({ ...prev, historique: prev.historique.filter((h) => h.id !== id) }));
  };

  const viderExemple = () => setData({ ...defaultData, contrats: [] });
  const chargerExemple = () => setData(exempleData());

  const resetData = () => {
    if (confirm('Effacer toutes les données saisies ?')) setData({ ...defaultData, contrats: [] });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation_intermittence.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string) => {
    try {
      setData(migrate(JSON.parse(jsonData)));
    } catch (error) {
      console.error("Erreur lors de l'import des données", error);
      alert('Le fichier importé contient des données invalides.');
    }
  };

  const value = { data, setData, updateField, updateContrat, addContrat, removeContrat, resetData, viderExemple, chargerExemple, addDroit, updateDroit, removeDroit, exportData, importData };

  return <IntermittenceContext.Provider value={value}>{children}</IntermittenceContext.Provider>;
};
