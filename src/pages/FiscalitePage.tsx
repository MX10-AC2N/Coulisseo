import React, { useMemo, useState } from 'react';
import { useIntermittence } from '../context/IntermittenceContext';
import { useSimulation } from '../hooks/useSimulation';
import { Badge, Card, Delta, Field, InputSuffix, Kpi, Notice, PageHeader, Progress, Segmented, Stat, eur } from '../components/ui';
import { AlertCircle, CalendarClock, Check, Copy, FileText, Receipt, Wallet } from 'lucide-react';
import { estSalaire, parseDate, repartirContrat, type Contrat } from '../lib/calculs';
import {
  CATEGORIES_FRAIS,
  TAUX_IMPOSITION,
  barèmeAbattement,
  deductionAbattement10,
  nombreSaisi,
  optionsFiscales,
  optionDuRegime,
  retenuesAre,
  sommeFraisReels,
  type FraisReels,
  type RegimeArtiste,
} from '../lib/fiscal';

/** Repères d'une année civile, assemblés depuis les contrats et le suivi mensuel. */
interface RepereAnnee {
  annee: number;
  SalairesBruts: number;
  Cotisations: number;
  SalairesNet: number;
  AreBrute: number;
  AreNet: number;
  CsgDeductible: number;
  Crds: number;
  Retraite: number;
  AutresRevenus: number;
  /** Salaires bruts par employeur. */
  parEmployeur: { employeur: string; brut: number }[];
}

/** Salaire brut imputé sur une année civile : un contrat est réparti au prorata des jours. */
function brutsParAnnee(contrats: Contrat[]): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>();
  for (const c of contrats) {
    for (const p of repartirContrat(c)) {
      const annee = p.annee;
      const par = out.get(annee) ?? new Map<string, number>();
      const cle = estSalaire(c) ? (c.employeur || 'Employeur non précisé') : '__autres__';
      par.set(cle, (par.get(cle) ?? 0) + p.brut);
      out.set(annee, par);
    }
  }
  return out;
}

/** Copie dans le presse-papiers, avec repli sur une sélection manuelle. */
async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}

const FiscalitePage: React.FC = () => {
  const { data, updateField } = useIntermittence();
  const sim = useSimulation();
  const [onglet, setOnglet] = useState<'frais' | 'declarer' | 'cesu' | 'calendrier'>('frais');
  const [copie, setCopie] = useState<string | null>(null);

  const fiscal = data.fiscal;
  const annee = fiscal.annee > 0 ? fiscal.annee : new Date().getFullYear() - 1;
  const tauxImposition = nombreSaisi(fiscal.tauxImposition) || 11;
  const tauxCotisations = (nombreSaisi(data.tauxCotisationsSalaire) || 22) / 100;
  const tauxCSG = data.tauxCSG === '3.8' ? 3.8 : 6.2;

  // ------------------------------------------------------------ Repères
  const annees = useMemo(() => {
    const brutAn = brutsParAnnee(data.contrats);
    const set = new Set<number>(brutAn.keys());
    for (const m of sim.suivi.mois) set.add(m.annee);
    const liste = [...set].sort((a, b) => b - a);
    const out: RepereAnnee[] = [];

    for (const a of liste) {
      const par = brutAn.get(a) ?? new Map<string, number>();
      let SalairesBruts = 0;
      let AutresRevenus = 0;
      const parEmployeur: { employeur: string; brut: number }[] = [];
      for (const [cle, v] of par) {
        if (cle === '__autres__') AutresRevenus += v;
        else {
          SalairesBruts += v;
          parEmployeur.push({ employeur: cle, brut: v });
        }
      }
      parEmployeur.sort((x, y) => y.brut - x.brut);

      // ARE : calculée sur le suivi mensuel, complétée par la saisie manuelle
      const mois = sim.suivi.mois.filter((m) => m.annee === a);
      let AreBrute = mois.reduce((s, m) => s + m.areBrute, 0);
      let AreNet = mois.reduce((s, m) => s + m.areNette, 0);
      let joursIndemnises = mois.reduce((s, m) => s + m.joursIndemnises, 0);
      if (a === annee && fiscal.areAnnuel.trim() !== '') {
        AreBrute = nombreSaisi(fiscal.areAnnuel);
        AreNet = AreBrute;
        joursIndemnises = 0;
      }

      const ret = retenuesAre(AreBrute, tauxCSG, tauxCSG === 3.8 && false);
      const Retraite = joursIndemnises * sim.retenues.retraiteComplementaire;
      const Cotisations = SalairesBruts * tauxCotisations;

      out.push({
        annee: a,
        SalairesBruts,
        Cotisations,
        SalairesNet: SalairesBruts - Cotisations,
        AreBrute,
        AreNet,
        CsgDeductible: ret.csgDeductible,
        Crds: ret.crds,
        Retraite,
        AutresRevenus,
        parEmployeur,
      });
    }
    return out;
  }, [data.contrats, sim.suivi.mois, sim.retenues.retraiteComplementaire, annee, fiscal.areAnnuel, tauxCotisations, tauxCSG]);

  const courant = annees.find((a) => a.annee === annee) ?? annees[0];

  const frais: FraisReels = {
    vestimentaire: nombreSaisi(fiscal.fraisReels.vestimentaire),
    formation: nombreSaisi(fiscal.fraisReels.formation),
    materiel: nombreSaisi(fiscal.fraisReels.materiel),
    transports: nombreSaisi(fiscal.fraisReels.transports),
    repas: nombreSaisi(fiscal.fraisReels.repas),
    medical: nombreSaisi(fiscal.fraisReels.medical),
    autres: nombreSaisi(fiscal.fraisReels.autres),
  };

  const options = useMemo(() => {
    if (!courant) return [];
    return optionsFiscales(
      {
        annee: courant.annee,
        SalairesBruts: courant.SalairesBruts,
        SalairesNetApresCotisations: courant.SalairesNet,
        AreBrute: courant.AreBrute,
        AreNet: courant.AreNet,
        CsgDeductible: courant.CsgDeductible,
        CrdsNonDeductible: courant.Crds,
        RetraiteComplementaire: courant.Retraite,
        AutresRevenus: courant.AutresRevenus,
        CotisationsSalariales: courant.Cotisations,
        IndemnitesDefraiement: nombreSaisi(fiscal.indemnitesDefraiement),
      },
      frais,
      courant.annee,
      tauxImposition
    );
  }, [courant, frais, tauxImposition, fiscal.indemnitesDefraiement]);

  const reference = options.find((o) => o.cle === 'abattement10');
  const choisie = optionDuRegime(options, (fiscal.regimeArtiste as RegimeArtiste) || '10');
  const meilleure = options.reduce((a, b) => (b.impot < a.impot ? b : a), options[0]);
  const bareme = barèmeAbattement(annee);
  const totalFrais = sommeFraisReels(frais);

  // ---------------------------------------------------------- Calendrier
  const anneeDeclaration = annee + 1;
  const calendrier = useMemo(() => {
    const d = (m: number, j: number) => `${anneeDeclaration}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
    // au-delà de 2026, les dates de la campagne ne sont pas encore publiées
    if (anneeDeclaration > 2026) {
      return [
        {
          date: `${anneeDeclaration}-04-01`,
          titre: 'Campagne de déclaration des revenus ' + annee,
          detail: `Les dates de la campagne ${anneeDeclaration} ne sont pas encore publiées : le calendrier officiel est mis en ligne chaque année sur impots.gouv.fr et service-public.fr.`,
          tone: 'info' as const,
        },
      ];
    }
    return [
      {
        date: d(4, 9),
        titre: 'Ouverture de la déclaration en ligne',
        detail: `Déclaration des revenus ${annee} : ouverture le 9 avril ${anneeDeclaration}.`,
        tone: 'info' as const,
      },
      {
        date: d(5, 21),
        titre: 'Déclaration en ligne — 1re échéance (01 à 19) et non-résidents',
        detail: 'Vous êtes dans la première tranche si votre code postal commence par 01 à 19.',
        tone: 'info' as const,
      },
      {
        date: d(5, 28),
        titre: 'Déclaration en ligne — 2e tranche (20 à 54)',
        detail: 'Vous êtes dans la deuxième tranche si votre code postal commence par 20 à 54.',
        tone: 'info' as const,
      },
      {
        date: d(6, 4),
        titre: 'Déclaration en ligne — 3e tranche (55 à 974 et 976)',
        detail: 'Dernière tranche : codes postaux de 55 à 974 et 976. Les départements 01 à 19 et les non-résidents déclarent avant.',
        tone: 'info' as const,
      },
      {
        date: d(5, 19),
        titre: 'Déclaration papier',
        detail: 'Si vous déposez une déclaration papier, la date limite est le 19 mai.',
        tone: 'info' as const,
      },
      {
        date: d(4, 15),
        titre: 'Congés Spectacles — demande possible',
        detail: 'Demande à partir de la mi-avril, 15 jours avant le départ, au plus tard le 31 mars.',
        tone: 'info' as const,
      },
      {
        date: d(3, 31),
        titre: 'Congés Spectacles — dernier jour pour demander',
        detail: 'Période de référence du 1er avril au 31 mars.',
        tone: 'warn' as const,
      },
      {
        date: d(5, 1),
        titre: 'Congés Spectacles — premiers paiements',
        detail: 'Versement à compter du 1er mai, au moins 15 jours après la demande. Indemnité : 10 % du salaire de référence brut.',
        tone: 'info' as const,
      },
      {
        date: d(5, 5),
        titre: 'CESU — déclaration de rémunération du mois',
        detail: 'Rémunération déclarée au plus tard le 5 du mois suivant la période d’activité (du 25 au 5).',
        tone: 'info' as const,
      },
    ];
  }, [anneeDeclaration]);

  // ---------------------------------------------------------------- CESU
  const cessuParEmployeur = useMemo(() => {
    const map = new Map<string, { brut: number; mois: Set<string>; contrats: number }>();
    for (const c of data.contrats) {
      if (!c.employeur) continue;
      const cur = map.get(c.employeur) ?? { brut: 0, mois: new Set<string>(), contrats: 0 };
      for (const p of repartirContrat(c)) {
        cur.brut += p.brut;
        cur.mois.add(p.cle);
      }
      cur.contrats += 1;
      map.set(c.employeur, cur);
    }
    return [...map.entries()]
      .map(([employeur, v]) => ({ employeur, brut: v.brut, mois: v.mois.size, contrats: v.contrats }))
      .filter((e) => e.brut > 0)
      .sort((a, b) => b.brut - a.brut);
  }, [data.contrats]);

  // ---------------------------------------------------- Bloc à déclarer
  const blocADeclarer = useMemo(() => {
    if (!courant) return '';
    const lignes: string[] = [];
    lignes.push(`Revenus ${courant.annee} — montants à reporter`);
    lignes.push('');
    lignes.push('TRAITEMENTS ET SALAIRES (cases 1AH à 1CZ)');
    if (courant.parEmployeur.length === 0) lignes.push('  (aucun salaire saisi)');
    for (const e of courant.parEmployeur) {
      lignes.push(`  ${e.employeur} : ${eur(e.brut, 2).replace(/ /g, ' ')}`);
    }
    lignes.push(`  Total salaires bruts : ${eur(courant.SalairesBruts, 2)}`);
    lignes.push('');
    lignes.push('AUTRES REVENUS IMPOSABLES (cases 1AP à 1DP) — allocations de chômage');
    lignes.push(`  ARE brute : ${eur(courant.AreBrute, 2)}`);
    lignes.push('');
    lignes.push('Retenues sur l’ARE (non déductibles) :');
    lignes.push(`  CSG déductible : ${eur(courant.CsgDeductible, 2)}`);
    lignes.push(`  CRDS (0,5 %, non déductible) : ${eur(courant.Crds, 2)}`);
    lignes.push(`  Retraite complémentaire : ${eur(courant.Retraite, 2)}`);
    if (courant.AutresRevenus > 0) {
      lignes.push('');
      lignes.push(`Autres revenus imposables : ${eur(courant.AutresRevenus, 2)}`);
    }
    lignes.push('');
    lignes.push('Joindre l’attestation de prélèvement à la source des allocations (France Travail).');
    return lignes.join('\n');
  }, [courant]);

  const copierBloc = async () => {
    const ok = await copier(blocADeclarer);
    setCopie(ok ? 'ok' : 'ko');
    setTimeout(() => setCopie(null), 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administratif"
        title="Fiscalité"
        accent="déclaration, frais professionnels, CESU"
        description="Ce que vous déclarez, comment le déclarer, et quelle option de frais professionnels vous fait le plus gagner d'impôt."
        actions={
          <Segmented
            value={onglet}
            onChange={(v) => setOnglet(v)}
            options={[
              { value: 'frais', label: 'Frais pro' },
              { value: 'declarer', label: 'À déclarer' },
              { value: 'cesu', label: 'CESU' },
              { value: 'calendrier', label: 'Calendrier' },
            ]}
          />
        }
      />

      {/* --------------------------------------------------------- Frais pro */}
      {onglet === 'frais' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Salaires bruts"
              value={courant ? eur(courant.SalairesBruts, 0) : '—'}
              sub={`revenus ${annee}`}
              icon={<Wallet className="h-4 w-4" />}
              footer={courant ? <>net après cotisations : {eur(courant.SalairesNet, 0)}</> : undefined}
            />
            <Kpi
              label="ARE brute"
              value={courant ? eur(courant.AreBrute, 0) : '—'}
              sub="à déclarer en 1AP à 1DP"
              tone="lime"
              variant="dark"
              footer={
                courant && courant.AreBrute === 0 ? (
                  <>non couverte par la simulation : reportez le montant de votre attestation</>
                ) : courant ? (
                  <>versée : {eur(courant.AreNet, 0)}</>
                ) : undefined
              }
            />
            <Kpi
              label="Option retenue"
              value={choisie ? eur(choisie.deduction, 0) : '—'}
              sub={choisie?.libelle}
              icon={<Receipt className="h-4 w-4" />}
              footer={choisie ? <>impôt estimé : {eur(choisie.impot, 0)}</> : undefined}
            />
            <Kpi
              label="Meilleure option"
              value={meilleure ? eur(meilleure.deduction, 0) : '—'}
              sub={meilleure?.libelle}
              tone={meilleure && reference && meilleure.impot < reference.impot ? 'green' : 'neutral'}
              footer={meilleure && reference ? (
                <>
                  gain d'impôt : <Delta value={reference.impot - meilleure.impot} />
                </>
              ) : undefined}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card title="Vos options de déduction" icon={<Receipt className="h-4 w-4" />}>
              {!courant ? (
                <p className="text-sm text-ink-muted">Saisissez vos contrats pour obtenir une comparaison.</p>
              ) : (
                <div className="space-y-3">
                  {options.map((o) => {
                    const estChoisie = choisie.cle === o.cle;
                    const gain = reference ? reference.impot - o.impot : 0;
                    return (
                      <div
                        key={o.cle}
                        className={`rounded-3xl border p-4 transition ${
                          estChoisie ? 'border-lime-300/30 bg-lime-400/10' : 'border-line-soft bg-surface-muted'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink">{o.libelle}</p>
                          {estChoisie && <Badge tone="lime">votre option</Badge>}
                          {meilleure.cle === o.cle && !estChoisie && <Badge tone="green">la plus avantageuse</Badge>}
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-[11px] text-ink-faint">Déduction</div>
                            <div className="num font-semibold text-ink">{eur(o.deduction, 0)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-ink-faint">Revenu imposable</div>
                            <div className="num font-semibold text-ink">{eur(o.revenuImposable, 0)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-ink-faint">Impôt estimé</div>
                            <div className="num font-semibold text-ink">{eur(o.impot, 0)}</div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-ink-faint">{o.regle}</p>
                        {o.cle !== 'abattement10' && (
                          <div className="mt-2">
                            <Delta value={gain} label="d'impôt" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card title="Vos frais réels" icon={<FileText className="h-4 w-4" />} action={<span className="num text-xs text-ink-faint">total {eur(totalFrais, 0)}</span>}>
                <div className="space-y-3">
                  {CATEGORIES_FRAIS.map((cat) => (
                    <div key={cat.cle}>
                      <Field label={cat.label} hint={cat.aide}>
                        <InputSuffix suffix="€">
                          <input
                            className="input"
                            inputMode="decimal"
                            placeholder="0"
                            value={fiscal.fraisReels[cat.cle]}
                            onChange={(e) =>
                              updateField('fiscal', {
                                ...fiscal,
                                fraisReels: { ...fiscal.fraisReels, [cat.cle]: e.target.value },
                              })
                            }
                          />
                        </InputSuffix>
                      </Field>
                      <Progress
                        className="mt-1.5"
                        value={nombreSaisi(fiscal.fraisReels[cat.cle])}
                        max={Math.max(1, totalFrais)}
                        tone="lime"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Réglages" icon={<AlertCircle className="h-4 w-4" />}>
                <div className="space-y-4">
                  <Field label="Année de revenu déclarée" hint={`Revenus ${annee}, déclarés en ${annee + 1}.`}>
                    <input
                      type="number"
                      className="input"
                      value={fiscal.annee || annee}
                      onChange={(e) => updateField('fiscal', { ...fiscal, annee: Number(e.target.value) || 0 })}
                    />
                  </Field>
                  <Field label="Taux d'imposition moyen" hint="Sert à chiffrer le gain en euros. À ajuster selon votre foyer.">
                    <Segmented
                      value={fiscal.tauxImposition}
                      onChange={(v) => updateField('fiscal', { ...fiscal, tauxImposition: v })}
                      options={TAUX_IMPOSITION.map((t) => ({ value: String(t), label: `${t} %` }))}
                    />
                  </Field>
                  <Field label="Votre qualité" hint="Détermine l'abattement forfaitaire auquel vous pouvez prétendre.">
                    <Segmented
                      value={fiscal.regimeArtiste}
                      onChange={(v) => updateField('fiscal', { ...fiscal, regimeArtiste: v })}
                      options={[
                        { value: '10', label: '10 %' },
                        { value: '5', label: '5 %' },
                        { value: '14', label: '14 %' },
                        { value: '5et14', label: '5 % + 14 %' },
                      ]}
                    />
                  </Field>
                  <Field
                    label="ARE brute de l'année"
                    hint="Saisissez-la si votre droit ne couvre pas toute l'année : elle est calculée automatiquement pour la période suivie."
                  >
                    <InputSuffix suffix="€">
                      <input
                        className="input"
                        inputMode="decimal"
                        placeholder="automatique"
                        value={fiscal.areAnnuel}
                        onChange={(e) => updateField('fiscal', { ...fiscal, areAnnuel: e.target.value })}
                      />
                    </InputSuffix>
                  </Field>
                  <Field
                    label="Indemnités de défraiement perçues"
                    hint="À réintégrer au revenu imposable en option frais réels, pour éviter une double déduction."
                  >
                    <InputSuffix suffix="€">
                      <input
                        className="input"
                        inputMode="decimal"
                        placeholder="0"
                        value={fiscal.indemnitesDefraiement}
                        onChange={(e) => updateField('fiscal', { ...fiscal, indemnitesDefraiement: e.target.value })}
                      />
                    </InputSuffix>
                  </Field>
                </div>
              </Card>
            </div>
          </div>

          <Notice tone="info" title="Les règles, sans raccourci">
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>
                L'abattement de 10 % porte sur le <b>salaire brut</b> : {eur(deductionAbattement10(courant?.SalairesBruts ?? 0, annee).min, 0)}{' '}
                au minimum, {eur(deductionAbattement10(courant?.SalairesBruts ?? 0, annee).max, 0)} au plafond. {bareme.source}.
              </li>
              <li>
                Frais réels et abattement de 10 % sont <b>exclusifs</b> : on ne cumule pas les deux. Les indemnités de
                défraiement doivent être réintégrées au revenu imposable.
              </li>
              <li>
                L'abattement de 5 % (ensemble des professions artistiques) et de 14 % (artistes musiciens, choristes,
                chorégraphes, lyriques) porte sur <b>l'ensemble de la rémunération annuelle, ARE comprise</b>, et les deux
                sont indépendants l'un de l'autre.
              </li>
              <li>
                Le véhicule de tourisme reste déductible en frais réels, au barème kilométrique — l'exclusion ne
                concerne pas les salariés.
              </li>
            </ul>
          </Notice>
        </>
      )}

      {/* ------------------------------------------------------ À déclarer */}
      {onglet === 'declarer' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card title={`Montants à reporter (revenus ${annee})`} icon={<FileText className="h-4 w-4" />}>
            {!courant ? (
              <p className="text-sm text-ink-muted">Aucune donnée à déclarer.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Poste</th>
                        <th className="text-right">Montant</th>
                        <th>Case</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courant.parEmployeur.map((e) => (
                        <tr key={e.employeur}>
                          <td className="whitespace-nowrap text-ink">{e.employeur}</td>
                          <td className="num text-right">{eur(e.brut, 2)}</td>
                          <td className="text-xs text-ink-faint">Traitements et salaires</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="font-semibold text-ink">Total salaires bruts</td>
                        <td className="num text-right font-semibold">{eur(courant.SalairesBruts, 2)}</td>
                        <td className="text-xs text-ink-faint">déclarés par l'employeur</td>
                      </tr>
                      <tr>
                        <td className="font-semibold text-ink">ARE brute</td>
                        <td className="num text-right font-semibold">{eur(courant.AreBrute, 2)}</td>
                        <td className="text-xs text-lime-300">1AP à 1DP</td>
                      </tr>
                      <tr>
                        <td className="text-ink-muted">CSG déductible</td>
                        <td className="num text-right text-ink-muted">− {eur(courant.CsgDeductible, 2)}</td>
                        <td className="text-xs text-ink-faint">3,8 points déductibles</td>
                      </tr>
                      <tr>
                        <td className="text-ink-muted">Retraite complémentaire</td>
                        <td className="num text-right text-ink-muted">− {eur(courant.Retraite, 2)}</td>
                        <td className="text-xs text-ink-faint">0,93 % du SJM (annexes 8 et 10)</td>
                      </tr>
                      <tr>
                        <td className="text-ink-muted">CRDS</td>
                        <td className="num text-right text-ink-muted">{eur(courant.Crds, 2)}</td>
                        <td className="text-xs text-rose-300">0,5 % — non déductible</td>
                      </tr>
                      {courant.AutresRevenus > 0 && (
                        <tr>
                          <td className="text-ink">Autres revenus imposables</td>
                          <td className="num text-right">{eur(courant.AutresRevenus, 2)}</td>
                          <td className="text-xs text-ink-faint">selon votre régime</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button type="button" className="btn-outline mt-5 w-full" onClick={copierBloc}>
                  {copie === 'ok' ? <Check className="h-4 w-4 text-lime-300" /> : <Copy className="h-4 w-4" />}
                  {copie === 'ok' ? 'Copié dans le presse-papiers' : copie === 'ko' ? 'Copie impossible — sélectionnez le texte' : 'Copier le récapitulatif'}
                </button>

                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-line-soft bg-surface-inset p-4 text-[11px] leading-relaxed text-ink-muted">
                  {blocADeclarer}
                </pre>
              </>
            )}
          </Card>

          <div className="space-y-6">
            <Card title="L'attestation de prélèvement à la source" icon={<Receipt className="h-4 w-4" />}>
              <p className="text-sm leading-relaxed text-ink-muted">
                Depuis le 1er janvier 2019, France Travail prélève l'impôt sur le revenu <b>à la place</b> du salarié et
                le verse à la DGFiP. Pour reporter le bon montant dans votre déclaration, il vous faut l'attestation
                correspondante.
              </p>
              <ol className="mt-3 space-y-2 text-sm text-ink-muted">
                {[
                  'Espace demandeur → « Mes échanges et documents » → « Mes documents ».',
                  'Service « Mes attestations » → « attestation de prélèvement à la source ».',
                  'L’attestation indique le taux appliqué et le montant prélevé ; envoi postal possible.',
                  'Vue complémentaire : « Mon dossier demandeur d’emploi » → « Mes allocations » → « Paiements et trop-perçus » → « Mon prélèvement à la source ».',
                ].map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="num flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-lime-400/15 text-[11px] font-semibold text-lime-300">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
              <Notice tone="warn" className="mt-4">
                Le prélèvement à la source est déjà prélevé sur l'ARE : ne le déduisez pas une seconde fois de votre
                revenu imposable.
              </Notice>
            </Card>

            <Card title="Historique par année" icon={<CalendarClock className="h-4 w-4" />}>
              <div className="space-y-2">
                {annees.map((a) => (
                  <div key={a.annee} className="flex items-center gap-3 rounded-2xl border border-line-soft bg-surface-muted px-3 py-2.5">
                    <span className="num w-12 text-sm font-semibold text-lime-300">{a.annee}</span>
                    <span className="num flex-1 text-xs text-ink-muted">
                      salaires {eur(a.SalairesBruts, 0)} · ARE {eur(a.AreBrute, 0)}
                    </span>
                    {a.annee === annee && <Badge tone="lime">déclarée</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- CESU */}
      {onglet === 'cesu' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card title="Vos employeurs" icon={<Wallet className="h-4 w-4" />}>
            {cessuParEmployeur.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun employeur saisi.</p>
            ) : (
              <div className="space-y-2.5">
                {cessuParEmployeur.map((e) => (
                  <div key={e.employeur} className="rounded-2xl border border-line-soft bg-surface-muted p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{e.employeur}</p>
                      <span className="num text-sm font-semibold text-lime-300">{eur(e.brut, 0)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">
                      {e.contrats} contrat{e.contrats > 1 ? 's' : ''} · activité sur {e.mois} mois
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Notice tone="info" className="mt-4">
              Rémunération déclarée <b>au plus tard le 5 du mois suivant</b> la période d'activité (du 25 du mois
              travaillé au 5 du mois suivant). Une seule déclaration par mois si le travail est régulier.
            </Notice>
          </Card>

          <div className="space-y-6">
            <Card title="Deux attestations, deux usages" icon={<FileText className="h-4 w-4" />}>
              <p className="text-sm leading-relaxed text-ink-muted">
                Ces deux documents sont souvent confondus. Voici la différence.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3.5">
                  <p className="text-sm font-semibold text-ink">Attestation de vigilance (URSSAF)</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    Obligation de l'<b>employeur</b> envers son client ou donneur d'ordre, pour tout contrat de{' '}
                    <b>5 000 € HT ou plus</b>, à la signature puis <b>tous les 6 mois</b>. Délivrée en ligne, dans l'espace
                    URSSAF. <b className="text-amber-200">Ce n'est pas le document à envoyer à France Travail.</b>
                  </p>
                </div>
                <div className="rounded-2xl border border-lime-300/20 bg-lime-400/10 p-3.5">
                  <p className="text-sm font-semibold text-ink">Attestation employeur de fin de contrat</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    C'est celle-ci que le salarié transmet à France Travail (article R. 1234-9 du code du travail). Pour
                    les adhérents CESU, elle est produite depuis l'espace CESU et <b>transmise automatiquement</b> à France
                    Travail ; un exemplaire est remis au salarié.
                  </p>
                </div>
              </div>
              <Notice tone="warn" className="mt-4">
                Il n'existe pas de « déclaration préalable de chiffre d'affaires » côté particulier employeur CESU, ni
                d'échéance au 1er février. Ces dispositifs relèvent de l'auto-entrepreneur.
              </Notice>
            </Card>

            <Card title="Le salarié ne déclare pas son CA à France Travail" icon={<AlertCircle className="h-4 w-4" />}>
              <p className="text-sm leading-relaxed text-ink-muted">
                En cas de cumul emploi et activité partielle, la déclaration d'activité se fait par l'actualisation
                (du 28 au 15 du mois suivant). Le chiffre d'affaires CESU se déclare à l'URSSAF, pas à France Travail.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ Calendrier */}
      {onglet === 'calendrier' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card title={`Calendrier ${anneeDeclaration}`} icon={<CalendarClock className="h-4 w-4" />}>
            <div className="space-y-2.5">
              {calendrier.map((e) => (
                <div key={e.date + e.titre} className="flex gap-4 rounded-2xl border border-line-soft bg-surface-muted p-3.5">
                  <div className="num w-12 flex-shrink-0 text-center">
                    <div className="text-lg font-semibold leading-none text-lime-300">{parseDate(e.date).getDate()}</div>
                    <div className="mt-0.5 text-[10px] uppercase text-ink-faint">
                      {new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(parseDate(e.date))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{e.titre}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{e.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Ce qui n'existe pas" icon={<AlertCircle className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm leading-relaxed text-ink-muted">
                <li>
                  <b className="text-ink">Pas de contribution sociale additionnelle</b> sur les revenus du spectacle pour
                  les intermittents. Ce qui existe : la CSG et la CRDS sur l'ARE, les contributions sur les redevances
                  versées aux artistes et mannequins, et la taxe sur les spectacles de 3,5 % sur les recettes — côté
                  employeur.
                </li>
                <li>
                  <b className="text-ink">Pas d'acompte d'impôt</b> pour un intermittent salarié : les acomptes
                  concernent les revenus fonciers, BIC, BNC, BA, pensions alimentaires et les indépendants.
                </li>
              </ul>
            </Card>

            <Card title="Vos repères" icon={<CalendarClock className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Année déclarée" value={annee} hint={`déclaration en ${annee + 1}`} />
                <Stat label="Plafond 10 %" value={eur(bareme.max, 0)} hint={bareme.source} />
                <Stat label="Salaires bruts" value={courant ? eur(courant.SalairesBruts, 0) : '—'} hint="tous employeurs" />
                <Stat label="ARE à reporter" value={courant ? eur(courant.AreBrute, 0) : '—'} hint="cases 1AP à 1DP" />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalitePage;
