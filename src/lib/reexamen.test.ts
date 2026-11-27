import { describe, it, expect } from 'vitest';
import { evaluerScenario, optimiserFinContrat, projectionSecurite, recommandations, type Hypothese } from './reexamen';
import type { Contrat } from './calculs';

const c = (date: string, nombre: number, brut: number, dateFin?: string): Contrat => ({
  id: `${date}-${nombre}`,
  date,
  dateFin,
  employeur: 'E',
  type: 'Heures',
  nombre,
  brut,
});

/** 1 200 h réparties sur les 12 mois précédant le 10/05/2026. */
const contratsLong: Contrat[] = [
  c('2025-06-10', 200, 6000, '2025-06-20'),
  c('2025-08-10', 200, 6000, '2025-08-20'),
  c('2025-10-10', 200, 6000, '2025-10-20'),
  c('2025-12-10', 200, 6000, '2025-12-20'),
  c('2026-02-10', 200, 6000, '2026-02-20'),
  c('2026-05-01', 200, 6000, '2026-05-10'),
];

/** Contrats postérieurs au contrat d'ouverture : ce sont eux qui comptent pour le droit suivant. */
const contratsApres: Contrat[] = [
  c('2026-01-10', 200, 6000, '2026-01-20'),
  c('2026-03-10', 200, 6000, '2026-03-20'),
  c('2026-05-01', 200, 6000, '2026-05-10'),
];

describe('projection de sécurité : la fenêtre qui glisse', () => {
  const options = { annexe: 'A8' as const, debut: '2026-01-01', mois: 12 };

  it('projette un point par mois sur la durée demandée', () => {
    const points = projectionSecurite(contratsLong, options);
    expect(points).toHaveLength(13); // 12 mois + le point de départ
    expect(points[0].cle).toBe('2026-01');
    expect(points[12].cle).toBe('2027-01');
  });

  it('les heures retenues baissent quand les contrats sortent de la période de référence', () => {
    const points = projectionSecurite(contratsLong, options);
    // le contrat de juin 2025 quitte la fenêtre en juillet 2026, celui d'août 2025 en septembre
    const avant = points.find((p) => p.cle === '2026-06');
    const apres = points.find((p) => p.cle === '2026-08');
    expect(avant).toBeDefined();
    expect(apres).toBeDefined();
    expect(apres!.heuresAffiliation).toBeLessThan(avant!.heuresAffiliation);
    expect(apres!.heuresSortantes).toBeGreaterThan(0);
  });

  it('signale le mois où le seuil des 507 h n’est plus atteint', () => {
    const points = projectionSecurite(contratsLong, { ...options, mois: 24 });
    const rupture = points.find((p) => !p.eligible);
    expect(rupture).toBeDefined();
    expect(rupture!.heuresManquantes).toBeGreaterThan(0);
    expect(rupture!.aj).toBe(0);
  });

  it('chaque point éligible porte une AJ calculée', () => {
    const points = projectionSecurite(contratsLong, options);
    for (const p of points.filter((x) => x.eligible)) {
      expect(p.aj).toBeGreaterThan(0);
    }
  });
});

describe('scénarios : ce que donnerait un contrat supplémentaire', () => {
  const options = { annexe: 'A8' as const, debut: '2026-01-01', heuresApres: '2025-12-31' };
  const reference = {
    aj: 60,
    nht: 600,
    sr: 36000,
    eligible: true,
    dateExamen: '2027-05-11',
    dateAnniversaire: '2027-05-10',
  };

  // contrat signé après le contrat d'ouverture : il entre dans la période de référence du droit suivant
  const hypothese: Hypothese = {
    id: 'h1',
    nom: 'Contrat de juillet',
    date: '2026-07-01',
    dateFin: '2026-07-20',
    employeur: 'Festival',
    type: 'Heures',
    nombre: 120,
    brut: 3600,
  };

  it('un contrat ajouté augmente les heures retenues et l’AJ', () => {
    const sans = evaluerScenario(contratsApres, [], { ...options, dateAnniversaire: '2027-05-10', reference });
    const avec = evaluerScenario(contratsApres, [hypothese], { ...options, dateAnniversaire: '2027-05-10', reference });
    expect(sans.nht).toBe(600);
    expect(avec.nht).toBeGreaterThan(sans.nht);
    expect(avec.aj).toBeGreaterThan(sans.aj);
    expect(avec.deltaAj).toBeCloseTo(avec.aj - reference.aj, 6);
  });

  it('le gain est la différence d’AJ sur les 12 mois du nouveau droit', () => {
    const avec = evaluerScenario(contratsApres, [hypothese], { ...options, dateAnniversaire: '2027-05-10', reference });
    expect(avec.gain12Mois).toBeCloseTo(avec.deltaAj * 12, 6);
  });

  it('l’anniversaire du droit suivant suit la fin du dernier contrat spectacle', () => {
    const avec = evaluerScenario(contratsApres, [hypothese], { ...options, dateAnniversaire: '2027-05-10', reference });
    // le contrat de juillet 2026 devient le dernier : son anniversaire est 365 jours plus tard
    expect(avec.dateAnniversaire).toBe('2027-07-20');
    expect(avec.dateExamen).toBe('2027-05-11');
  });
});

describe('optimisation : la date de fin du dernier contrat', () => {
  it('produit une date par mois et mesure l’écart d’AJ', () => {
    const candidats = optimiserFinContrat(contratsLong, { annexe: 'A8', debut: '2026-01-01', mois: 6 });
    expect(candidats).toHaveLength(7);
    for (const cand of candidats) {
      expect(cand.dateAnniversaire).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('l’écart est mesuré par rapport à la date de référence', () => {
    const ref = '2026-05-31';
    const candidats = optimiserFinContrat(contratsLong, { annexe: 'A8', debut: '2026-01-01', mois: 6, dateReference: ref });
    const cible = candidats.find((cand) => cand.date === ref);
    expect(cible).toBeDefined();
    expect(cible!.deltaAj).toBeCloseTo(0, 6);
  });
});

describe('recommandations', () => {
  it('signale la perte du seuil des 507 h quand aucun contrat ne vient', () => {
    const reco = recommandations(contratsLong, {
      annexe: 'A8',
      debut: '2026-01-01',
      mois: 24,
      ajBase: 60,
      dateAnniversaire: '2027-05-10',
      dateIndem: '2026-05-11',
      eligible: true,
      heuresManquantes: 0,
    });
    expect(reco.length).toBeGreaterThan(0);
    expect(reco[0].priorite).toBe('critique');
    expect(reco[0].titre).toContain('507');
  });

  it('classe les recommandations par priorité', () => {
    const reco = recommandations(contratsLong, {
      annexe: 'A8',
      debut: '2026-01-01',
      mois: 6,
      ajBase: 60,
      dateAnniversaire: '2027-05-10',
      dateIndem: '2026-05-11',
      eligible: true,
      heuresManquantes: 0,
    });
    const rangs = reco.map((r) => ({ critique: 0, attention: 1, info: 2 }[r.priorite]));
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });
});
