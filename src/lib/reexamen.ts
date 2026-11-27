import {
  affiliation,
  calculAJ,
  dateAnniversaireDepuis,
  examenAnniversaire,
  finContrat,
  parseDate,
  toISODate,
  addMonths,
  estSpectacle,
  SEUIL_HEURES,
  type Annexe,
  type Contrat,
} from './calculs';

/**
 * Anticipation de l'intermittence.
 *
 * Trois lectures complémentaires d'un même constat : la période de référence
 * est une fenêtre de 12 mois qui glisse, et ce qui compte n'est pas seulement
 * ce que l'on a fait, mais ce que l'on aura fait le jour où elle se refermera.
 *
 *  - `projectionSecurite` : la fenêtre mois par mois, sans apport de contrats.
 *  - `evaluerScenarios`   : ce que donnerait l'ajout de contrats envisagés.
 *  - `optimiserFinContrat`: la date de fin du dernier contrat qui maximise l'AJ.
 *
 * Aucune règle nouvelle n'est introduite ici : tout est recalculé par les
 * fonctions de `calculs.ts`, déjà testées sur les exemples chiffrés du guide
 * France Travail.
 */

// ---------------------------------------------------------------------------
// Contrats envisagés
// ---------------------------------------------------------------------------

/** Contrat « à venir » que l'utilisateur envisage de signer. */
export interface Hypothese {
  id: string;
  nom: string;
  date: string;
  dateFin: string;
  employeur: string;
  type: 'Heures' | 'Cachet';
  nombre: number;
  brut: number;
}

export const hypotheseVersContrat = (h: Hypothese): Contrat => ({
  id: h.id,
  date: h.date,
  dateFin: h.dateFin,
  employeur: h.employeur,
  type: h.type,
  nombre: h.nombre,
  brut: h.brut,
});

// ---------------------------------------------------------------------------
// 1. Fenêtre de sécurité : que devient le droit si rien ne change ?
// ---------------------------------------------------------------------------

export interface OptionProjection {
  annexe: Annexe;
  /** Fin du contrat qui a ouvert le droit en cours : seules les heures suivantes comptent. */
  heuresApres?: string;
  /** Mois projetés (24 par défaut). */
  mois?: number;
  /** Premier mois projeté (défaut : le mois en cours). */
  debut?: string;
  plus50ans?: boolean;
}

export interface PointSecurite {
  cle: string;
  label: string;
  /** Fin de la période de référence projetée. */
  fin: string;
  /** Heures retenues pour l'AJ. */
  nht: number;
  /** Heures comptées pour la condition des 507 h. */
  heuresAffiliation: number;
  eligible: boolean;
  /** AJ calculée sur la période projetée (0 si non éligible). */
  aj: number;
  heuresManquantes: number;
  /** Heures qui quittent la période de référence entre le point précédent et celui-ci. */
  heuresSortantes: number;
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/**
 * Fait glisser la période de référence mois par mois, sans apport de contrats :
 * les contrats les plus anciens quittent la fenêtre, l'AJ descend, le droit peut
 * se refermer. C'est la projection qui manque le plus souvent à l'intermittent.
 */
export function projectionSecurite(contrats: Contrat[], o: OptionProjection): PointSecurite[] {
  const nbMois = o.mois ?? 24;
  const base = o.debut ? parseDate(o.debut) : new Date();
  const points: PointSecurite[] = [];
  let precedent = 0;

  for (let i = 0; i <= nbMois; i++) {
    const d = addMonths(base, i);
    // fin de période de référence : dernier jour du mois projeté
    const fin = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const aff = affiliation(contrats, o.annexe, fin, { apres: o.heuresApres, plus50ans: o.plus50ans });
    const aj = aff.eligible ? calculAJ(o.annexe, aff.sr, aff.nht).aj : 0;
    points.push({
      cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`,
      fin,
      nht: aff.nht,
      heuresAffiliation: aff.heuresAffiliation,
      eligible: aff.eligible,
      aj,
      heuresManquantes: aff.heuresManquantes,
      heuresSortantes: Math.max(0, precedent - aff.heuresAffiliation),
    });
    precedent = aff.heuresAffiliation;
  }
  return points;
}

// ---------------------------------------------------------------------------
// 2. Scénarios : ce que donnerait un contrat supplémentaire
// ---------------------------------------------------------------------------

export interface ScenarioEvalue {
  id: string;
  nom: string;
  /** AJ brute au réexamen avec ce scénario. */
  aj: number;
  nht: number;
  sr: number;
  eligible: boolean;
  heuresManquantes: number;
  /** Écart d'AJ par rapport à la situation sans ce scénario. */
  deltaAj: number;
  /** Gain estimé sur les 12 mois du nouveau droit, à AJ constant. */
  gain12Mois: number;
  /** Date anniversaire du droit qui s'ouvrirait (12 mois après le contrat d'ouverture). */
  dateAnniversaire: string;
  /** Date d'examen des nouveaux droits. */
  dateExamen: string;
}

/** Situation de référence : les contrats saisis, sans apport. */
export interface Reference {
  aj: number;
  nht: number;
  sr: number;
  eligible: boolean;
  dateExamen: string;
  dateAnniversaire: string;
}

/**
 * Évalue un scénario : on ajoute les contrats envisagés, on recalcule la
 * période de référence et l'AJ du droit suivant, exactement comme le fait la
 * simulation pour la situation réelle.
 */
export function evaluerScenario(
  contrats: Contrat[],
  hypotheses: Hypothese[],
  o: OptionProjection & { dateAnniversaire: string; reference: Reference }
): ScenarioEvalue {
  const combos: Contrat[] = [...contrats, ...hypotheses.map(hypotheseVersContrat)];
  const examen = examenAnniversaire(combos, o.dateAnniversaire, o.heuresApres);
  const finPRA = examen.finContratRetenue || (o.heuresApres ? o.dateAnniversaire : undefined);
  const aff = affiliation(combos, o.annexe, finPRA, { apres: o.heuresApres, plus50ans: o.plus50ans });
  const aj = aff.eligible ? calculAJ(o.annexe, aff.sr, aff.nht).aj : 0;
  const derniers = combos.filter(estSpectacle).map(finContrat).sort();
  const finDernier = derniers.length ? derniers[derniers.length - 1] : o.dateAnniversaire;

  return {
    id: hypotheses.map((h) => h.id).join('|') || 'reference',
    nom: hypotheses.map((h) => h.nom).join(' + ') || 'Situation actuelle',
    aj,
    nht: aff.nht,
    sr: aff.sr,
    eligible: aff.eligible,
    heuresManquantes: aff.heuresManquantes,
    deltaAj: aj - o.reference.aj,
    gain12Mois: (aj - o.reference.aj) * 12,
    dateAnniversaire: dateAnniversaireDepuis(finDernier),
    dateExamen: examen.dateExamen,
  };
}

// ---------------------------------------------------------------------------
// 3. Optimisation : la date de fin du dernier contrat
// ---------------------------------------------------------------------------

export interface CandidatFin {
  /** Date de fin du contrat spectacle qui ouvre le droit suivant. */
  date: string;
  label: string;
  /** Date anniversaire du droit qui s'ouvrirait. */
  dateAnniversaire: string;
  nht: number;
  heuresAffiliation: number;
  eligible: boolean;
  aj: number;
  /** Écart d'AJ avec la date de référence testée. */
  deltaAj: number;
}

/**
 * Fait varier la fin du contrat qui ouvre le droit suivant : la période de
 * référence glisse, des contrats sortent, l'AJ change. On peut ainsi comparer
 * « mon contrat se termine le 14 mars » et « il se termine le 30 mars ».
 */
export function optimiserFinContrat(
  contrats: Contrat[],
  o: OptionProjection & { dateReference?: string }
): CandidatFin[] {
  const nbMois = o.mois ?? 18;
  const base = o.debut ? parseDate(o.debut) : new Date();
  const candidats: CandidatFin[] = [];

  for (let i = 0; i <= nbMois; i++) {
    const d = addMonths(base, i);
    const fin = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const aff = affiliation(contrats, o.annexe, fin, { apres: o.heuresApres, plus50ans: o.plus50ans });
    const aj = aff.eligible ? calculAJ(o.annexe, aff.sr, aff.nht).aj : 0;
    candidats.push({
      date: fin,
      label: `${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`,
      dateAnniversaire: dateAnniversaireDepuis(fin),
      nht: aff.nht,
      heuresAffiliation: aff.heuresAffiliation,
      eligible: aff.eligible,
      aj,
      deltaAj: 0,
    });
  }

  const ref = o.dateReference;
  const ajRef = ref
    ? (() => {
        const aff = affiliation(contrats, o.annexe, ref, { apres: o.heuresApres, plus50ans: o.plus50ans });
        return aff.eligible ? calculAJ(o.annexe, aff.sr, aff.nht).aj : 0;
      })()
    : 0;
  for (const c of candidats) c.deltaAj = c.aj - ajRef;
  return candidats;
}

// ---------------------------------------------------------------------------
// 4. Recommandations : ce qu'il faut faire, et quand
// ---------------------------------------------------------------------------

export type Priorite = 'critique' | 'attention' | 'info';

export interface Recommandation {
  id: string;
  priorite: Priorite;
  titre: string;
  detail: string;
  /** Action proposée, formulée à l'intermittent. */
  action?: string;
  /** Raccourci interne vers la page concernée. */
  lien?: string;
  /** Échéance indicative. */
  date?: string;
}

/**
 * Croise la projection et la situation courante pour formuler des conseils
 * datés, pas des slogans.
 */
export function recommandations(
  contrats: Contrat[],
  o: OptionProjection & { ajBase: number; dateAnniversaire: string; dateIndem: string; eligible: boolean; heuresManquantes: number }
): Recommandation[] {
  const out: Recommandation[] = [];
  const points = projectionSecurite(contrats, { ...o, mois: o.mois ?? 24 });

  // 1. Le seuil des 507 h : le droit tient-il, et jusqu'à quand ?
  const idxRupture = points.findIndex((p, i) => i > 0 && !p.eligible && points[i - 1].eligible);
  const perte = idxRupture > 0 ? points[idxRupture] : null;
  if (perte) {
    out.push({
      id: 'seuil',
      priorite: 'critique',
      titre: `Le seuil des ${SEUIL_HEURES} h ne serait plus atteint en ${perte.label}`,
      detail: `Sans nouveau contrat, il manquerait ${Math.round(perte.heuresManquantes)} h à cette date : le droit ne serait pas ouvert.`,
      action: `Signer au moins ${Math.round(perte.heuresManquantes)} h avant fin ${perte.label} pour rester éligible.`,
      lien: '/contrats',
      date: perte.fin,
    });
  } else if (points[0] && !points[0].eligible) {
    out.push({
      id: 'seuil-actuel',
      priorite: 'critique',
      titre: `Les ${SEUIL_HEURES} h ne sont pas réunies aujourd'hui`,
      detail: `Il manque ${Math.round(points[0].heuresManquantes)} h dans la période de référence : le droit ne peut pas être ouvert en l'état.`,
      action: 'Ajouter les contrats manquants ou vérifier les heures déjà saisies.',
      lien: '/contrats',
      date: points[0].fin,
    });
  }

  // 2. Les contrats qui quittent la fenêtre et font baisser l'AJ.
  const avecSortie = points.filter((p) => p.heuresSortantes > 0.5);
  if (avecSortie.length) {
    const premier = avecSortie[0];
    const chute = points.find((p) => p.cle === premier.cle);
    if (chute && chute.aj > 0 && premier.heuresSortantes > 0) {
      out.push({
        id: 'sortie',
        priorite: 'attention',
        titre: `${Math.round(premier.heuresSortantes)} h sortent de la période de référence en ${premier.label}`,
        detail: `Les contrats les plus anciens quittent la fenêtre glissante : l'AJ du droit suivant baisse (${premier.aj.toFixed(2)} € à cette date).`,
        action: 'Anticiper un contrat sur cette période pour maintenir les heures.',
        lien: '/reexamen',
        date: premier.fin,
      });
    }
  }

  // 3. Le report de l'examen : un contrat spectacle court le jour de l'anniversaire.
  const exam = examenAnniversaire(contrats, o.dateAnniversaire, o.heuresApres);
  if (exam.reporte) {
    out.push({
      id: 'report',
      priorite: 'attention',
      titre: `L'examen du ${o.dateAnniversaire} est reporté`,
      detail: `Un contrat spectacle est en cours ce jour-là : le nouveau droit ne commencera que le ${exam.dateExamen}.`,
      action: 'Si possible, terminer ou suspendre le contrat pour ne pas perdre de jours d\'ARE.',
      lien: '/contrats',
      date: exam.dateExamen,
    });
  }

  // 4. La fenêtre d'éligibilité : 507 h, c'est 42 jours de travail.
  const reste = points.filter((p) => p.eligible).length;
  if (reste > 0 && reste < 24) {
    out.push({
      id: 'fenetre',
      priorite: 'info',
      titre: `Fenêtre d'éligibilité : ${reste} mois`,
      detail: `Tel quel, votre droit tient jusqu'en ${points[points.length - 1].label}. Passé ce cap, il faut un nouveau volume d'heures.`,
      action: 'Ciblez les 507 h dans les 12 mois qui suivent votre dernier contrat.',
      lien: '/suivi-mensuel',
    });
  }

  return out.sort((a, b) => {
    const rang = { critique: 0, attention: 1, info: 2 } as const;
    return rang[a.priorite] - rang[b.priorite];
  });
}
