import { describe, it, expect } from 'vitest';
import {
  barèmeAbattement,
  revenuImposable,
  optionsFiscales,
  optionParCle,
  sommeFraisReels,
  fraisReelsVides,
  retenuesAre,
  impotProgressif,
  deductionAbattement10,
  type FraisReels,
  type RepereFiscal,
} from './fiscal';

const repere = (over: Partial<RepereFiscal> = {}): RepereFiscal => ({
  annee: 2025,
  SalairesBruts: 20000,
  SalairesNetApresCotisations: 15600,
  AreBrute: 8000,
  AreNet: 7400,
  CsgDeductible: 303.6,
  CrdsNonDeductible: 39.3,
  RetraiteComplementaire: 120,
  AutresRevenus: 0,
  ...over,
});

const frais: FraisReels = {
  vestimentaire: 400,
  formation: 200,
  materiel: 500,
  transports: 300,
  repas: 150,
  medical: 50,
  autres: 100,
};

describe('barème de l’abattement de 10 %', () => {
  it('donne le barème publié pour 2023, 2024 et 2025', () => {
    expect(barèmeAbattement(2023)).toMatchObject({ min: 495, max: 14171 });
    expect(barèmeAbattement(2024)).toMatchObject({ min: 504, max: 14426 });
    expect(barèmeAbattement(2025)).toMatchObject({ min: 509, max: 14555 });
  });

  it('réutilise le barème 2025 pour 2026 et le dit', () => {
    const b = barèmeAbattement(2026);
    expect(b.min).toBe(509);
    expect(b.max).toBe(14555);
    expect(b.source).toContain('2025');
    expect(b.source).toContain('pas encore publié');
  });
});

describe('abattement de 10 %', () => {
  it('planchonne la déduction quand 10 % du brut est inférieur au minimum', () => {
    const o = optionParCle(optionsFiscales(repere({ SalairesBruts: 1000 }), fraisReelsVides(), 2025), 'abattement10');
    expect(o.deduction).toBe(509);
  });

  it('plafonne la déduction au barème', () => {
    const o = optionParCle(optionsFiscales(repere({ SalairesBruts: 300000 }), fraisReelsVides(), 2025), 'abattement10');
    expect(o.deduction).toBe(14555);
  });

  it('calcule sur le salaire brut, pas sur le net', () => {
    const r = repere({ SalairesBruts: 20000, SalairesNetApresCotisations: 15600 });
    const o = optionParCle(optionsFiscales(r, fraisReelsVides(), 2025), 'abattement10');
    expect(o.deduction).toBe(2000); // 10 % du brut (10 % du net ne donnerait que 1 560)
  });

  it('borne la déduction entre le minimum et le plafond', () => {
    expect(deductionAbattement10(0, 2025).deduction).toBe(509);
    expect(deductionAbattement10(20000, 2025).deduction).toBe(2000);
    expect(deductionAbattement10(20000, 2025).min).toBe(509);
    expect(deductionAbattement10(20000, 2025).max).toBe(14555);
  });
});

describe('frais réels', () => {
  it('additionne les catégories saisies', () => {
    expect(sommeFraisReels(frais)).toBe(1700);
    const o = optionParCle(optionsFiscales(repere(), frais, 2025), 'fraisReels');
    expect(o.deduction).toBe(1700);
  });

  it('réintègre les indemnités de défraiement au revenu imposable', () => {
    const opts = optionsFiscales(repere({ IndemnitesDefraiement: 500 }), frais, 2025);
    const reel = optionParCle(opts, 'fraisReels');
    const dix = optionParCle(opts, 'abattement10');
    // les frais réels déduisent moins que le forfait : le revenu imposable remonte de 300 €,
    // et 500 € de plus du fait de la réintégration du défraiement
    expect(reel.revenuImposable).toBe(dix.revenuImposable + 300 + 500);
  });
});

describe('abattements artistes', () => {
  it('5 % sur l’ensemble de la rémunération annuelle, ARE comprise', () => {
    const o = optionParCle(optionsFiscales(repere(), fraisReelsVides(), 2025), 'abattement5');
    expect(o.deduction).toBeCloseTo(0.05 * 28000, 2); // 20 000 de salaires + 8 000 d’ARE
  });

  it('14 % sur l’ensemble de la rémunération annuelle, ARE comprise', () => {
    const o = optionParCle(optionsFiscales(repere(), fraisReelsVides(), 2025), 'abattement14');
    expect(o.deduction).toBeCloseTo(0.14 * 28000, 2);
  });

  it('cumul 5 % + 14 % : les deux abattements sont indépendants', () => {
    const o = optionParCle(optionsFiscales(repere(), fraisReelsVides(), 2025), 'abattement5et14');
    expect(o.deduction).toBeCloseTo(0.19 * 28000, 2);
  });
});

describe('revenu imposable', () => {
  it('somme les salaries nets, l’ARE, déduit la CSG déductible et la retraite', () => {
    const r = repere({ CsgDeductible: 300, CrdsNonDeductible: 40, RetraiteComplementaire: 100, AutresRevenus: 0 });
    expect(revenuImposable(r, 0)).toBe(23200); // 15 600 + 8 000 − 300 − 100
  });

  it('ne déduit pas le CRDS : il n’est pas déductible', () => {
    const r = repere({ CsgDeductible: 300, CrdsNonDeductible: 40, RetraiteComplementaire: 100 });
    expect(revenuImposable({ ...r, CrdsNonDeductible: 0 }, 0)).toBe(revenuImposable(r, 0));
  });

  it('ajoute les autres revenus et retire la déduction de frais', () => {
    const r = repere({ AutresRevenus: 1500 });
    expect(revenuImposable(r, 1700)).toBe(revenuImposable(r, 0) - 1700);
  });

  it('ne descend jamais sous zéro', () => {
    const r = repere({ SalairesBruts: 100, SalairesNetApresCotisations: 100, AreBrute: 0, AreNet: 0, CsgDeductible: 0, RetraiteComplementaire: 0 });
    expect(revenuImposable(r, 5000)).toBe(0);
  });
});

describe('comparaison des options', () => {
  // frais réels supérieurs au forfait de 10 % : c'est le cas de figure qui rend l'option utile
  const fraisEleves: FraisReels = {
    vestimentaire: 1400,
    formation: 700,
    materiel: 900,
    transports: 800,
    repas: 450,
    medical: 150,
    autres: 300,
  };

  it('mesure l’écart d’impôt entre deux options au taux saisi', () => {
    const opts = optionsFiscales(repere(), fraisEleves, 2025, 30);
    const dix = optionParCle(opts, 'abattement10');
    const reel = optionParCle(opts, 'fraisReels');
    expect(reel.impot).toBeLessThan(dix.impot);
    expect(dix.impot - reel.impot).toBeCloseTo((reel.deduction - dix.deduction) * 0.3, 2);
    expect(dix.tauxImposition).toBe(30);
  });

  it('quand les frais réels sont inférieurs au forfait, l’abattement de 10 % l’emporte', () => {
    const opts = optionsFiscales(repere(), frais, 2025, 30);
    const dix = optionParCle(opts, 'abattement10');
    const reel = optionParCle(opts, 'fraisReels');
    expect(dix.impot).toBeLessThan(reel.impot);
  });

  it('retient le taux par défaut de 11 %', () => {
    const o = optionParCle(optionsFiscales(repere(), frais, 2025), 'abattement10');
    expect(o.tauxImposition).toBe(11);
    expect(o.impot).toBeCloseTo(o.revenuImposable * 0.11, 2);
  });
});

describe('retenues sociales sur l’ARE', () => {
  it('applique la base de 98,25 % et la CSG à 6,2 % dont 3,8 % déductibles', () => {
    const r = retenuesAre(10000, 6.2);
    expect(r.base).toBeCloseTo(9825, 2);
    expect(r.csg).toBeCloseTo(9825 * 0.062, 2);
    expect(r.csgDeductible).toBeCloseTo(9825 * 0.038, 2);
    expect(r.crds).toBeCloseTo(9825 * 0.005, 2);
  });

  it('ne rend rien déductible en taux réduit de 3,8 %', () => {
    expect(retenuesAre(10000, 3.8).csgDeductible).toBe(0);
  });
});

describe('barème progressif de l’impôt', () => {
  it('applique les tranches du barème 2025', () => {
    expect(impotProgressif(10000, 2025)).toBe(0);
    expect(impotProgressif(20000, 2025)).toBeCloseTo((20000 - 11600) * 0.11, 2);
  });
});
