/**
 * Moteur fiscal du simulateur : déductions de frais professionnels, revenu
 * imposable et impôt estimé d'un intermittent du spectacle.
 *
 * Ce module est pur (aucune dépendance React) : la page « Fiscalité » et les
 * tests s'appuient dessus pour que les chiffres affichés ne divergent jamais.
 *
 * Sources officielles citées dans l'interface :
 *  - BOFiP BOI-RSA-BASE-30-50-30-30 (artistes) : § 440 (artistes musiciens),
 *    § 460 (artistes choristes, chorégraphiques et lyriques), § 470 (ensemble
 *    des professions artistiques), § 490 (cumul 5 % / 14 %), § 500 ;
 *  - BOFiP BOI-RSA-BASE-30-50-20 § 10 (abattement forfaitaire de 10 %) ;
 *  - BOFiP BOI-RSA-BASE-30-50-30 § 340 (CSG déductible à hauteur de 3,8 points) ;
 *  - BOFiP BOI-BAREME-000035 (barème de l'abattement forfaitaire de 10 %) ;
 *  - service-public F1989 (frais professionnels) et F1419 (barème de l'IR) ;
 *  - impots.gouv.fr « Dois-je déclarer mes allocations chômage ? » ;
 *  - service-public A15597 (calendrier de la déclaration des revenus).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Frais professionnels justifiés, par catégorie (montants en euros). */
export interface FraisReels {
  /** Costumes, accessoires, coiffure, maquillage, représentation. */
  vestimentaire: number;
  /** Cours de danse, chant, jeu, piano, coaching. */
  formation: number;
  /** Instruments, matériel technique, costumes achetés. */
  materiel: number;
  /** Carburant, péages, billets, nuitées. */
  transports: number;
  /** Repas de chantier. */
  repas: number;
  /** Frais médicaux. */
  medical: number;
  /** Autres frais professionnels justifiés. */
  autres: number;
}

/** Repères de la année fiscale déclarée : d'où viennent les montants à déclarer. */
export interface RepereFiscal {
  /** Année de revenu déclarée (revenus 2025 = déclaration 2042 en 2026). */
  annee: number;
  /** Salaires bruts de l'année, tous types de contrats (spectacle + hors spectacle). */
  SalairesBruts: number;
  /** Salaires nets après cotisations salariales. */
  SalairesNetApresCotisations: number;
  /** ARE brute versée sur l'année (avant CSG, CRDS et prélèvement à la source). */
  AreBrute: number;
  /** ARE réellement versée (après retenues sociales et prélèvement à la source). */
  AreNet: number;
  /** CSG déductible : 3,8 points quand la CSG est acquittée au taux plein de 6,2 %. */
  CsgDeductible: number;
  /** CRDS 0,5 % : jamais déductible. */
  CrdsNonDeductible: number;
  /** Retenue de retraite complémentaire (0,93 % du SJM par jour indemnisé). */
  RetraiteComplementaire: number;
  /** Autres revenus imposables (non salarié, autres). */
  AutresRevenus: number;
  /** Cotisations salariales retenues sur les salaires (brut − net). */
  CotisationsSalariales?: number;
  /**
   * Indemnités de défraiement perçues. En option « frais réels », elles sont
   * réintégrées au revenu imposable : sans cela, le même frais serait déduit
   * deux fois (une fois par l'employeur, une fois en frais réels).
   */
  IndemnitesDefraiement?: number;
}

/** Identifiant d'une option de déduction. */
export type CleOption = 'abattement10' | 'fraisReels' | 'abattement5' | 'abattement14' | 'abattement5et14';

/** Une option de déduction, chiffrée. */
export interface OptionFiscale {
  cle: CleOption;
  libelle: string;
  /** Déduction imputée sur le revenu imposable, en euros. */
  deduction: number;
  /** Revenu imposable après déduction, en euros. */
  revenuImposable: number;
  /** Montant de l'impôt estimé, en euros (revenu imposable × taux d'imposition). */
  impot: number;
  /** Taux d'imposition moyen supposé pour la comparaison (0, 11, 30, 41 ou 45 %). */
  tauxImposition: number;
  /** Rappel de la règle appliquée, affiché dans l'interface. */
  regle: string;
}

/** Régime de déduction choisi par l'utilisateur. */
export type RegimeArtiste = '10' | '5' | '14' | '5et14';

// ---------------------------------------------------------------------------
// Barèmes et taux
// ---------------------------------------------------------------------------

/**
 * Barème de l'abattement forfaitaire de 10 % (BOI-BAREME-000035 ; service-public F1989).
 * Minimum et plafond de la déduction, par année de revenu.
 */
export const BAREMES_ABATTEMENT: Record<number, { min: number; max: number }> = {
  2023: { min: 495, max: 14171 },
  2024: { min: 504, max: 14426 },
  2025: { min: 509, max: 14555 },
};

/** Dernière année de revenu pour laquelle le barème de 10 % est publié. */
export const DERNIERE_ANNEE_BAREME_ABATTEMENT = 2025;

/** Taux d'imposition moyens proposés à la comparaison. */
export const TAUX_IMPOSITION: readonly number[] = [0, 11, 30, 41, 45];

/** Taux d'imposition moyen par défaut (tranche à 11 %). */
export const TAUX_IMPOSITION_DEFAUT = 11;

/** Taux de CSG applicable à l'ARE : taux plein ou taux réduit. */
export const TAUX_CSG_PLEIN = 6.2;
export const TAUX_CSG_REDUIT = 3.8;
/** CRDS : jamais déductible. */
export const TAUX_CRDS = 0.5;
/** Part de la CSG déductible quand le taux plein de 6,2 % est acquitté. */
export const PART_DEDUCTIBLE_CSG = 3.8;
/** Abattement de 1,75 % au titre des frais de recherche d'emploi : base CSG/CRDS. */
export const ABATTEMENT_FRAIS_RECHERCHE_EMPLOI = 1.75;
/** Retenue de retraite complémentaire : 0,93 % du salaire journalier moyen. */
export const TAUX_RETRAITE_COMPLEMENTAIRE = 0.0093;

/** Barème progressif de l'impôt : le dernier published barème sert de repli. */
export const BAREMES_IR: Record<number, { seuil: number; taux: number }[]> = {
  2025: [
    { seuil: 11600, taux: 0 },
    { seuil: 29579, taux: 0.11 },
    { seuil: 84577, taux: 0.3 },
    { seuil: 181917, taux: 0.41 },
    { seuil: Infinity, taux: 0.45 },
  ],
};

/** Dernière année de revenu pour laquelle le barème de l'IR est publié. */
export const DERNIERE_ANNEE_BAREME_IR = 2025;

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Convertit une saisie en euros (string) en nombre : virgule tolérée, sinon 0. */
export function nombreSaisi(s: string | number | undefined | null): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Catégories de frais réels, avec leur libellé et leur aide. */
export const CATEGORIES_FRAIS: { cle: keyof FraisReels; label: string; aide: string }[] = [
  { cle: 'vestimentaire', label: 'Vestimentaire', aide: 'Costumes, accessoires, coiffure, maquillage, frais de représentation.' },
  { cle: 'formation', label: 'Formation', aide: 'Cours de danse, chant, jeu, piano, coaching, master-class.' },
  { cle: 'materiel', label: 'Matériel', aide: 'Instruments, matériel technique, costumes achetés.' },
  { cle: 'transports', label: 'Transports', aide: 'Carburant, péages, billets, nuitées.' },
  { cle: 'repas', label: 'Repas', aide: 'Repas de chantier et repas pris à l’occasion d’une représentation.' },
  { cle: 'medical', label: 'Médical', aide: 'Frais médicaux (mutuelle, soins, prothèses).' },
  { cle: 'autres', label: 'Autres', aide: 'Autres frais professionnels justifiés (téléphonie professionnelle, fournitures…).' },
];

/** Frais réels à zéro. */
export const fraisReelsVides = (): FraisReels => ({
  vestimentaire: 0,
  formation: 0,
  materiel: 0,
  transports: 0,
  repas: 0,
  medical: 0,
  autres: 0,
});

/** Total des frais réels justifiés. */
export function sommeFraisReels(frais: FraisReels): number {
  return CATEGORIES_FRAIS.reduce((a, c) => a + Math.max(0, nombreSaisi(frais[c.cle])), 0);
}

// ---------------------------------------------------------------------------
// Barème de l'abattement de 10 %
// ---------------------------------------------------------------------------

/**
 * Barème de la déduction forfaitaire de 10 % pour une année de revenu.
 * Le barème est encadré par un minimum et un plafond (BOI-BAREME-000035).
 *
 * Attention : le barème 2026 (revenus 2026) n'est pas encore publié ; on
 * réutilise alors le barème 2025 et la source le signale explicitement.
 */
export function barèmeAbattement(annee: number): { min: number; max: number; source: string } {
  const b = BAREMES_ABATTEMENT[annee];
  if (b) {
    return { min: b.min, max: b.max, source: `Barème ${annee} — BOI-BAREME-000035, service-public F1989` };
  }
  if (annee > DERNIERE_ANNEE_BAREME_ABATTEMENT) {
    const dernier = BAREMES_ABATTEMENT[DERNIERE_ANNEE_BAREME_ABATTEMENT];
    return {
      min: dernier.min,
      max: dernier.max,
      source: `Barème ${DERNIERE_ANNEE_BAREME_ABATTEMENT} réutilisé : le barème ${annee} n'est pas encore publié`,
    };
  }
  // Années antérieures : le barème le plus ancien couvert par l'outil.
  const plusAncien = BAREMES_ABATTEMENT[2023];
  return {
    min: plusAncien.min,
    max: plusAncien.max,
    source: `Barème 2023 appliqué : le barème ${annee} n'est pas couvert par cet outil`,
  };
}

// ---------------------------------------------------------------------------
// Revenu imposable
// ---------------------------------------------------------------------------

/**
 * Revenu imposable après déduction des frais professionnels.
 *
 * Terme à terme :
 *  - salaires bruts − cotisations salariales = salaire net imposable ;
 *  - ARE brute : le montant à porter en 1AP à 1DP (« Autres revenus imposables ») ;
 *  - CSG déductible : 3,8 points quand la CSG est acquittée au taux plein de 6,2 %
 *    (BOI-RSA-BASE-30-50-30 § 340) ;
 *  - CRDS : 0,5 %, NON déductible — elle reste donc dans le revenu imposable et
 *    n'est pas soustraite ici (contrairement à la CSG) ;
 *  - retraite complémentaire : déductible ;
 *  - autres revenus : non salarie et divers, ajoutés au revenu imposable ;
 *  - `reintegrationDefraiement` : indemnités de défraiement à réintégrer quand
 *    on déduit des frais réels (sinon double déduction du même frais).
 */
export function revenuImposable(r: RepereFiscal, deduction: number, reintegrationDefraiement = 0): number {
  const cotisations = r.CotisationsSalariales ?? Math.max(0, r.SalairesBruts - r.SalairesNetApresCotisations);
  const netSalaires = Math.max(0, r.SalairesBruts - cotisations);
  return Math.max(
    0,
    netSalaires -
      deduction +
      r.AreBrute -
      r.CsgDeductible -
      r.RetraiteComplementaire +
      r.AutresRevenus +
      reintegrationDefraiement
  );
}

/**
 * Déduction forfaitaire de 10 % : la base est le salaire BRUT (pas le net),
 * plafonnée et plancherée par le barème (BOI-RSA-BASE-30-50-20 § 10).
 *
 * Nuance relevée dans le texte : BOI-RSA-BASE-30-50-20 § 10 mentionne l'ARE
 * parmi les revenus auxquels s'applique la déduction de 10 %. En pratique,
 * l'administration la calcule sur les traitements et salaires déclarés : on
 * applique donc ici la déduction sur les salaires bruts, l'ARE étant déclarée
 * à part en 1AP à 1DP.
 */
export function deductionAbattement10(salairesBruts: number, annee: number): { deduction: number; min: number; max: number } {
  const bareme = barèmeAbattement(annee);
  const deduction = clamp(0.1 * Math.max(0, salairesBruts), bareme.min, bareme.max);
  return { deduction, min: bareme.min, max: bareme.max };
}

// ---------------------------------------------------------------------------
// Retenues sociales sur l'ARE
// ---------------------------------------------------------------------------

export interface RetenuesAre {
  /** Base CSG/CRDS : 98,25 % du montant brut (abattement de 1,75 %). */
  base: number;
  /** CSG acquittée (6,2 % ou 3,8 % de la base). */
  csg: number;
  /** Part déductible de la CSG (3,8 points en taux plein, 0 en taux réduit). */
  csgDeductible: number;
  /** CRDS 0,5 % : jamais déductible. */
  crds: number;
  /** Total prélevé sur l'ARE (CSG + CRDS). */
  total: number;
}

/**
 * CSG et CRDS prélevés sur l'ARE annuelle.
 * La CSG n'est due qu'au-delà de 60 € d'AJ journalière (comme dans le moteur
 * d'indemnisation) : `exonere` porte ce cas.
 */
export function retenuesAre(areBrute: number, tauxCsg = TAUX_CSG_PLEIN, exonere = false): RetenuesAre {
  const base = Math.max(0, areBrute) * (1 - ABATTEMENT_FRAIS_RECHERCHE_EMPLOI / 100);
  if (exonere || areBrute <= 0) {
    return { base, csg: 0, csgDeductible: 0, crds: 0, total: 0 };
  }
  const taux = tauxCsg === TAUX_CSG_REDUIT ? TAUX_CSG_REDUIT : TAUX_CSG_PLEIN;
  const csg = (base * taux) / 100;
  const csgDeductible = taux === TAUX_CSG_PLEIN ? (base * PART_DEDUCTIBLE_CSG) / 100 : 0;
  const crds = (base * TAUX_CRDS) / 100;
  return { base, csg, csgDeductible, crds, total: csg + crds };
}

// ---------------------------------------------------------------------------
// Barème de l'impôt sur le revenu
// ---------------------------------------------------------------------------

export interface BaremeIR {
  annee: number;
  tranches: { seuil: number; taux: number }[];
  source: string;
  /** true quand le barème affiché n'est pas celui de l'année demandée. */
  repli: boolean;
}

/** Barème progressif de l'IR applicable à une année de revenu (quotient 1 part). */
export function baremeImposition(annee: number): BaremeIR {
  const b = BAREMES_IR[annee];
  if (b) {
    return { annee, tranches: b, source: `Barème ${annee} — service-public F1419`, repli: false };
  }
  const dernier = BAREMES_IR[DERNIERE_ANNEE_BAREME_IR];
  return {
    annee: DERNIERE_ANNEE_BAREME_IR,
    tranches: dernier,
    source: `Barème ${DERNIERE_ANNEE_BAREME_IR} réutilisé : le barème ${annee} n'est pas encore publié`,
    repli: true,
  };
}

/** Impôt progressif estimé sur un revenu imposable (quotient familial 1 part). */
export function impotProgressif(revenuImposableValue: number, annee: number): number {
  const { tranches } = baremeImposition(annee);
  const r = Math.max(0, revenuImposableValue);
  let impot = 0;
  let precedent = 0;
  for (const t of tranches) {
    if (r <= precedent) break;
    const part = Math.min(r, t.seuil) - precedent;
    impot += part * t.taux;
    precedent = t.seuil;
  }
  return impot;
}

// ---------------------------------------------------------------------------
// Options de déduction
// ---------------------------------------------------------------------------

/**
 * Toutes les options de déduction, chiffrées, pour une année de revenu.
 *
 *  - « abattement10 » : 10 % du salaire brut, plancheré et plafonné (§ 10) ;
 *  - « fraisReels » : somme des frais justifiés — option unique, elle ne se
 *    cumule pas avec le forfait ; les indemnités de défraiement sont
 *    réintégrées au revenu imposable ;
 *  - « abattement5 » : 5 % de l'ensemble de la rémunération annuelle, ARE
 *    comprise (§ 470 et § 490) ;
 *  - « abattement14 » : 14 % de l'ensemble de la rémunération annuelle, ARE
 *    comprise (§ 440 et § 460) ;
 *  - « abattement5et14 » : les deux, qui sont indépendants l'un de l'autre (§ 490).
 *
 * `tauxImposition` est le taux moyen que l'utilisateur compare (0, 11, 30, 41
 * ou 45 %) : il sert à chiffrer l'impact de la déduction en euros.
 */
export function optionsFiscales(
  r: RepereFiscal,
  frais: FraisReels,
  annee: number,
  tauxImposition: number = TAUX_IMPOSITION_DEFAUT
): OptionFiscale[] {
  const taux = TAUX_IMPOSITION.includes(tauxImposition) ? tauxImposition : TAUX_IMPOSITION_DEFAUT;
  const brut = Math.max(0, r.SalairesBruts);
  const are = Math.max(0, r.AreBrute);
  const remuneration = brut + are;

  const dix = deductionAbattement10(brut, annee);
  const fraisJustifies = sommeFraisReels(frais);
  const cinq = 0.05 * remuneration;
  const quatorze = 0.14 * remuneration;

  const option = (cle: CleOption, libelle: string, deduction: number, regle: string, reintegration = 0): OptionFiscale => {
    const ri = revenuImposable(r, deduction, reintegration);
    return { cle, libelle, deduction, revenuImposable: ri, impot: (ri * taux) / 100, tauxImposition: taux, regle };
  };

  return [
    option(
      'abattement10',
      'Abattement 10 %',
      dix.deduction,
      `10 % du salaire brut (${dix.min} € minimum, ${dix.max} € plafond — barème ${annee}).`
    ),
    option(
      'fraisReels',
      'Frais réels',
      fraisJustifies,
      'Somme des frais justifiés : option unique, exclusive du forfait de 10 %.',
      r.IndemnitesDefraiement ?? 0
    ),
    option(
      'abattement5',
      'Abattement 5 % — professions artistiques',
      cinq,
      "5 % de l'ensemble de la rémunération annuelle, ARE comprise (BOI-RSA-BASE-30-50-30-30 § 470 et § 490)."
    ),
    option(
      'abattement14',
      'Abattement 14 % — artistes musiciens, choristes, chorégraphes',
      quatorze,
      "14 % de l'ensemble de la rémunération annuelle, ARE comprise (BOI-RSA-BASE-30-50-30-30 § 440, § 460 et § 490)."
    ),
    option(
      'abattement5et14',
      'Abattement 5 % + 14 %',
      cinq + quatorze,
      "Les deux abattements sont indépendants l'un de l'autre (BOI-RSA-BASE-30-50-30-30 § 490) : ils se cumulent."
    ),
  ];
}

/** Retrouve une option par sa clé. */
export function optionParCle(options: OptionFiscale[], cle: CleOption): OptionFiscale {
  const o = options.find((x) => x.cle === cle);
  return o ?? options[0];
}

/**
 * Option correspondant au régime choisi par l'utilisateur.
 * Le 10 % reste la référence de comparaison (c'est le forfait appliqué par défaut).
 */
export function optionDuRegime(options: OptionFiscale[], regime: RegimeArtiste): OptionFiscale {
  switch (regime) {
    case '5':
      return optionParCle(options, 'abattement5');
    case '14':
      return optionParCle(options, 'abattement14');
    case '5et14':
      return optionParCle(options, 'abattement5et14');
    case '10':
    default:
      return optionParCle(options, 'abattement10');
  }
}
