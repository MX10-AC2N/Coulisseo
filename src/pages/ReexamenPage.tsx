import React, { useMemo, useState } from 'react';
import { useIntermittence } from '../context/IntermittenceContext';
import { useSimulation } from '../hooks/useSimulation';
import {
  Badge,
  Card,
  Delta,
  Field,
  InputSuffix,
  Kpi,
  Notice,
  PageHeader,
  Progress,
  Segmented,
  Stat,
  eur,
  nb,
} from '../components/ui';
import { Plus, Trash2, TrendingUp, AlertTriangle, CalendarCheck, Gauge } from 'lucide-react';
import { SEUIL_HEURES, addMonths, formatDateFR, parseDate, toISODate } from '../lib/calculs';
import {
  evaluerScenario,
  optimiserFinContrat,
  projectionSecurite,
  recommandations,
  type Hypothese,
  type PointSecurite,
} from '../lib/reexamen';

/**
 * Courbe de la fenêtre de sécurité : l'AJ projetée mois par mois, et le moment
 * où le seuil des 507 h n'est plus atteint. Tout est lu sur la même échelle.
 */
const FenetreSecurite: React.FC<{ points: PointSecurite[] }> = ({ points }) => {
  const W = 720;
  const H = 220;
  const marge = { g: 34, d: 26 };
  const largeur = W - marge.g - marge.d;
  const hauteur = H - marge.g - marge.d;
  const maxAj = Math.max(...points.map((p) => p.aj), 1);
  const x = (i: number) => marge.g + (i / Math.max(1, points.length - 1)) * largeur;
  const y = (v: number) => marge.g + hauteur - (v / maxAj) * hauteur;

  const courbe = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.aj).toFixed(1)}`).join(' ');
  const aire = `${courbe} L${x(points.length - 1).toFixed(1)},${marge.g + hauteur} L${x(0).toFixed(1)},${marge.g + hauteur} Z`;

  // Rupture : premier mois non éligible
  const rupture = points.findIndex((p) => !p.eligible);
  const grad = 'grad-fenetre';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Projection de l'allocation journalière mois par mois">
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe176" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#bfe176" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* lignes de repère */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={marge.g} x2={W - marge.d} y1={y(maxAj * f)} y2={y(maxAj * f)} stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
            <text x={marge.g - 8} y={y(maxAj * f) + 4} textAnchor="end" className="fill-ink-faint text-[10px]">
              {eur(maxAj * f, 0)}
            </text>
          </g>
        ))}

        {/* zone non éligible */}
        {rupture > 0 && (
          <rect
            x={x(rupture)}
            y={marge.g}
            width={Math.max(0, x(points.length - 1) - x(rupture))}
            height={hauteur}
            fill="rgb(251 113 133 / 0.10)"
          />
        )}

        <path d={aire} fill={`url(#${grad})`} />
        <path d={courbe} fill="none" stroke="#bfe176" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={p.cle}
            cx={x(i)}
            cy={y(p.aj)}
            r={p.eligible ? 2.5 : 3.5}
            className={p.eligible ? 'fill-lime-400' : 'fill-rose-400'}
          >
            <title>{`${p.label} — ${p.eligible ? eur(p.aj) : `non éligible (${nb(p.heuresAffiliation, 0)} h)`}`}</title>
          </circle>
        ))}

        {/* axe des mois : une étiquette sur trois */}
        {points.map((p, i) =>
          i % 3 === 0 ? (
            <text key={p.cle} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-faint text-[10px]">
              {p.label.split(' ')[0]}
            </text>
          ) : null
        )}

        {rupture > 0 && (
          <g>
            <line x1={x(rupture)} x2={x(rupture)} y1={marge.g} y2={marge.g + hauteur} stroke="rgb(251 113 133 / 0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={x(rupture) + 6} y={marge.g + 12} className="fill-rose-300 text-[10px] font-semibold">
              seuil perdu
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

const ReexamenPage: React.FC = () => {
  const { data } = useIntermittence();
  const sim = useSimulation();
  const [typeScenario, setTypeScenario] = useState<'Heures' | 'Cachet'>('Heures');
  const [hypotheses, setHypotheses] = useState<Hypothese[]>([]);
  const [form, setForm] = useState({
    date: toISODate(new Date()),
    dateFin: toISODate(new Date()),
    nombre: '20',
    brut: '600',
    employeur: '',
  });

  const options = useMemo(
    () => ({
      annexe: data.annexe,
      heuresApres: sim.heuresApres,
      plus50ans: data.plus50ans,
      mois: 24,
      debut: toISODate(new Date()),
    }),
    [data.annexe, data.plus50ans, sim.heuresApres]
  );

  const points = useMemo(() => projectionSecurite(data.contrats, options), [data.contrats, options]);

  const candidats = useMemo(
    () => optimiserFinContrat(data.contrats, { ...options, mois: 18, dateReference: sim.dateAnniversaire }),
    [data.contrats, options, sim.dateAnniversaire]
  );

  const reference = useMemo(
    () => ({
      aj: sim.affiliation.eligible ? sim.ajCalculee.aj : 0,
      nht: sim.affiliation.nht,
      sr: sim.affiliation.sr,
      eligible: sim.affiliation.eligible,
      dateExamen: sim.examen.dateExamen,
      dateAnniversaire: sim.dateAnniversaire,
    }),
    [sim]
  );

  const scenario = useMemo(
    () =>
      hypotheses.length
        ? evaluerScenario(data.contrats, hypotheses, { ...options, dateAnniversaire: sim.dateAnniversaire, reference })
        : null,
    [data.contrats, hypotheses, options, sim.dateAnniversaire, reference]
  );

  const reco = useMemo(
    () =>
      recommandations(data.contrats, {
        ...options,
        ajBase: reference.aj,
        dateAnniversaire: sim.dateAnniversaire,
        dateIndem: sim.dateIndem,
        eligible: reference.eligible,
        heuresManquantes: sim.affiliation.heuresManquantes,
      }),
    [data.contrats, options, reference, sim.dateAnniversaire, sim.dateIndem]
  );

  // Meilleure date de fin : celle qui maximise l'AJ au réexamen.
  const meilleur = useMemo(() => {
    const eligibles = candidats.filter((c) => c.eligible);
    if (!eligibles.length) return null;
    return eligibles.reduce((a, b) => (b.aj > a.aj ? b : a));
  }, [candidats]);

  // Fenêtre d'éligibilité : la suite de mois consécutifs où le seuil est atteint.
  const fenetre = useMemo(() => {
    const premier = points.findIndex((p) => p.eligible);
    if (premier < 0) return null;
    let fin = premier;
    while (fin + 1 < points.length && points[fin + 1].eligible) fin++;
    return { debut: points[premier], fin: points[fin], mois: fin - premier + 1, indexFin: fin };
  }, [points]);

  // Rupture : le premier mois qui suit la fenêtre et où le seuil retombe.
  const rupture = fenetre ? (points[fenetre.indexFin + 1] ?? null) : null;
  const ajMax = Math.max(...points.map((p) => p.aj));

  const ajouter = () => {
    const nombre = parseFloat(form.nombre.replace(',', '.')) || 0;
    const brut = parseFloat(form.brut.replace(',', '.')) || 0;
    if (nombre <= 0) return;
    const h: Hypothese = {
      id: `h-${Date.now()}`,
      nom: `${form.employeur || 'Contrat envisagé'} · ${typeScenario === 'Cachet' ? `${nombre} cachet(s)` : `${nombre} h`}`,
      date: form.date,
      dateFin: form.dateFin < form.date ? form.date : form.dateFin,
      employeur: form.employeur || 'Employeur envisagé',
      type: typeScenario,
      nombre,
      brut,
    };
    setHypotheses((h2) => [...h2, h]);
    setForm((f) => ({ ...f, date: toISODate(addMonths(parseDate(f.dateFin), 1)), dateFin: toISODate(addMonths(parseDate(f.dateFin), 1)), nombre: '20', brut: '600' }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Anticipation"
        title="Réexamen"
        accent="optimiser le prochain droit"
        description="La période de référence est une fenêtre de 12 mois qui glisse. Voici ce que vaut votre droit au réexamen, ce qu'il peut devenir, et ce qu'il vous reste à faire."
        actions={
          <Badge tone="brand">
            Examen {formatDateFR(sim.examen.dateExamen)}
          </Badge>
        }
      />

      {/* ---------------------------------------------------------- Verdict */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="AJ au réexamen"
          value={reference.aj > 0 ? eur(reference.aj) : '—'}
          sub={reference.eligible ? 'si le droit est réexaminé aujourd’hui' : 'seuil des 507 h non atteint'}
          tone={reference.eligible ? 'green' : 'amber'}
          variant="dark"
          icon={<TrendingUp className="h-4 w-4" />}
          footer={
            reference.eligible ? (
              <>
                NHT {nb(sim.affiliation.nht, 0)} h · SR {eur(sim.affiliation.sr, 0)}
              </>
            ) : (
              <>il manque {nb(sim.affiliation.heuresManquantes, 0)} h</>
            )
          }
        />
        <Kpi
          label="Meilleure date de fin"
          value={meilleur ? meilleur.label : '—'}
          sub={meilleur ? `AJ ${eur(meilleur.aj)} au réexamen` : 'aucune date éligible'}
          tone="lime"
          icon={<CalendarCheck className="h-4 w-4" />}
          footer={meilleur ? <>anniversaire suivant : {formatDateFR(meilleur.dateAnniversaire)}</> : undefined}
        />
        <Kpi
          label="Fenêtre d'éligibilité"
          value={fenetre ? `${fenetre.mois} mois` : '—'}
          sub={
            fenetre
              ? `de ${fenetre.debut.label} à ${fenetre.fin.label}`
              : 'le seuil n’est atteint sur aucun des 24 mois'
          }
          tone={rupture ? 'amber' : 'green'}
          icon={<Gauge className="h-4 w-4" />}
          footer={
            fenetre ? (
              <Progress value={(fenetre.mois / 24) * 100} max={100} tone={rupture ? 'amber' : 'green'} />
            ) : undefined
          }
        />
        <Kpi
          label="Droit en cours"
          value={sim.ajBrute > 0 ? eur(sim.ajBrute) : '—'}
          sub={sim.ajBrute > 0 ? `${eur(sim.retenues.net)} net / jour` : 'aucun droit saisi'}
          icon={<TrendingUp className="h-4 w-4" />}
          footer={<>jusqu’au {formatDateFR(sim.dateAnniversaire)}</>}
        />
      </div>

      {/* ------------------------------------------------- Recommandations */}
      {reco.length > 0 && (
        <Card title="Ce qu'il faut faire, et quand" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="space-y-3">
            {reco.map((r) => (
              <div
                key={r.id}
                className={`rounded-3xl border p-4 ${
                  r.priorite === 'critique'
                    ? 'border-rose-400/25 bg-rose-500/10'
                    : r.priorite === 'attention'
                      ? 'border-amber-300/20 bg-amber-400/10'
                      : 'border-line-soft bg-surface-muted'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.priorite === 'critique' ? 'red' : r.priorite === 'attention' ? 'amber' : 'neutral'}>
                    {r.priorite === 'critique' ? 'Urgent' : r.priorite === 'attention' ? 'À surveiller' : 'Info'}
                  </Badge>
                  <p className="text-sm font-semibold text-ink">{r.titre}</p>
                  {r.date && <span className="num text-xs text-ink-faint">{formatDateFR(r.date)}</span>}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{r.detail}</p>
                {r.action && <p className="mt-1.5 text-sm font-medium text-lime-300">→ {r.action}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ------------------------------------------------- Fenêtre de sécurité */}
      <Card
        title="Fenêtre de sécurité"
        icon={<Gauge className="h-4 w-4" />}
        action={
          <span className="num text-xs text-ink-faint">
            projection sur 24 mois, sans nouveau contrat
          </span>
        }
      >
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">
          En l'absence de nouveau contrat, vos heures les plus anciennes quittent la période de référence. Voici l'AJ
          que donnerait le droit suivant, mois par mois.
        </p>
        {points.every((p) => p.aj === 0) ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface-muted px-6 py-8 text-center">
            <p className="text-sm font-semibold text-ink">Aucune date n'atteint les 507 h</p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-muted">
              Les heures déjà retenues pour le droit en cours ne comptent pas pour le suivant. Tant que le total
              n'atteint pas {SEUIL_HEURES} h, aucune allocation journalière ne peut être calculée : le scénario
              ci-dessous permet de tester l'effet d'un nouveau contrat.
            </p>
          </div>
        ) : (
          <FenetreSecurite points={points} />
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat label="AJ max projeté" value={eur(ajMax)} hint="au moment le plus favorable" />
          <Stat
            label="Mois non éligibles"
            value={nb(points.filter((p) => !p.eligible).length)}
            hint={rupture ? `à partir de ${rupture.label}` : 'aucun sur 24 mois'}
          />
          <Stat
            label="Heures sorties au total"
            value={`${nb(points.reduce((s, p) => s + p.heuresSortantes, 0), 0)} h`}
            hint="quittent la fenêtre de référence"
          />
        </div>
        {rupture && (
          <Notice tone="warn" className="mt-4">
            Sans contrat supplémentaire, le seuil des {SEUIL_HEURES} h ne serait plus atteint en <b>{rupture.label}</b>. Il
            faudrait <b>{nb(rupture.heuresManquantes, 0)} h</b> de plus, sur les 12 mois qui précèdent.
          </Notice>
        )}
      </Card>

      {/* -------------------------------------------------------- Scénarios */}
      <Card
        title="Et si je signais un contrat de plus ?"
        icon={<Plus className="h-4 w-4" />}
        action={<span className="text-xs text-ink-faint">simulation, rien n’est enregistré</span>}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <Field label="Employeur">
              <input
                className="input"
                value={form.employeur}
                placeholder="Théâtre des Lucioles"
                onChange={(e) => setForm((f) => ({ ...f, employeur: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début">
                <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </Field>
              <Field label="Fin">
                <input type="date" className="input" value={form.dateFin} onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={typeScenario === 'Cachet' ? 'Cachets' : 'Heures'}>
                <InputSuffix suffix={typeScenario === 'Cachet' ? 'cachets' : 'h'}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  />
                </InputSuffix>
              </Field>
              <Field label="Brut">
                <InputSuffix suffix="€">
                  <input
                    className="input"
                    inputMode="decimal"
                    value={form.brut}
                    onChange={(e) => setForm((f) => ({ ...f, brut: e.target.value }))}
                  />
                </InputSuffix>
              </Field>
            </div>
            <Segmented
              value={typeScenario}
              onChange={(v) => setTypeScenario(v)}
              options={[
                { value: 'Heures', label: 'Heures' },
                { value: 'Cachet', label: 'Cachets' },
              ]}
            />
            <button type="button" className="btn-lime w-full" onClick={ajouter}>
              <Plus className="h-4 w-4" />
              Ajouter au scénario
            </button>

            {hypotheses.length > 0 && (
              <div className="space-y-2">
                {hypotheses.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-2xl border border-line-soft bg-surface-muted px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{h.nom}</p>
                      <p className="num text-[11px] text-ink-faint">
                        {formatDateFR(h.date)} → {formatDateFR(h.dateFin)} · {eur(h.brut, 0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-ink-faint transition hover:bg-rose-500/15 hover:text-rose-300"
                      onClick={() => setHypotheses((list) => list.filter((x) => x.id !== h.id))}
                      aria-label="Retirer ce contrat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-line-soft bg-surface-muted p-4">
                <p className="eyebrow mb-2">Sans le contrat</p>
                <p className="num text-3xl font-medium tracking-tight text-ink">{reference.aj > 0 ? eur(reference.aj) : '—'}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {nb(reference.nht, 0)} h · SR {eur(reference.sr, 0)}
                </p>
              </div>
              <div
                className={`rounded-3xl border p-4 ${
                  scenario && scenario.deltaAj > 0
                    ? 'border-lime-300/30 bg-lime-400/10'
                    : scenario && scenario.deltaAj < 0
                      ? 'border-rose-400/25 bg-rose-500/10'
                      : 'border-line-soft bg-surface-muted'
                }`}
              >
                <p className="eyebrow mb-2">Avec le contrat</p>
                <p className="num text-3xl font-medium tracking-tight text-ink">{scenario ? eur(scenario.aj) : '—'}</p>
                {scenario && <Delta value={scenario.deltaAj} className="mt-2" label="/ jour" />}
                <p className="mt-1 text-xs text-ink-faint">
                  {scenario ? `${nb(scenario.nht, 0)} h · SR ${eur(scenario.sr, 0)}` : 'ajoutez un contrat'}
                </p>
              </div>
            </div>

            {scenario && (
              <div className="space-y-3">
                <Notice tone={scenario.deltaAj >= 0 ? 'success' : 'warn'}>
                  Sur les 12 mois du nouveau droit, ce contrat change votre revenu d{' '}
                  <b>{eur(Math.abs(scenario.gain12Mois), 0)}</b> ({scenario.deltaAj >= 0 ? 'en plus' : 'en moins'}).
                </Notice>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Examen des nouveaux droits" value={formatDateFR(scenario.dateExamen)} />
                  <Stat label="Anniversaire suivant" value={formatDateFR(scenario.dateAnniversaire)} />
                </div>
                {!scenario.eligible && (
                  <Notice tone="error">
                    Attention : avec ce scénario, le seuil des {SEUIL_HEURES} h n'est pas atteint ({nb(scenario.heuresManquantes, 0)} h
                    manquantes). L'AJ affichée n'est alors pas applicable.
                  </Notice>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* --------------------------------------------- Calendrier des fins */}
      <Card
        title="À quelle date finir votre contrat ?"
        icon={<CalendarCheck className="h-4 w-4" />}
        action={<span className="text-xs text-ink-faint">fin du contrat qui ouvre le droit suivant</span>}
      >
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">
          La fin de votre dernier contrat spectacle fixe la période de référence du droit suivant, donc l'AJ au
          réexamen. Voici l'effet de chaque date de fin possible.
        </p>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Fin du contrat</th>
                <th className="text-right">Anniversaire</th>
                <th className="text-right">Heures</th>
                <th className="text-right">AJ</th>
                <th className="text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              {candidats.map((c) => {
                const estMeilleur = meilleur?.date === c.date;
                return (
                  <tr key={c.date} className={estMeilleur ? 'bg-lime-400/10' : undefined}>
                    <td className="whitespace-nowrap">
                      <span className="num">{formatDateFR(c.date)}</span>
                      {estMeilleur && (
                        <Badge tone="lime" className="ml-2">
                          recommandé
                        </Badge>
                      )}
                    </td>
                    <td className="num whitespace-nowrap text-right text-ink-muted">{formatDateFR(c.dateAnniversaire)}</td>
                    <td className="num text-right">{nb(c.heuresAffiliation, 0)} h</td>
                    <td className="num text-right font-semibold">{c.eligible ? eur(c.aj) : '—'}</td>
                    <td className="num text-right">
                      {c.eligible ? <Delta value={c.deltaAj} /> : <span className="text-xs text-rose-300">non éligible</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Notice tone="info" className="mt-4">
          Ces montants sont des projections : seule votre notification France Travail fait foi. Une fin de contrat
          plus précoce fait entrer en jeu une période de référence différente, et décale le cycle des anniversaires.
        </Notice>
      </Card>
    </div>
  );
};

export default ReexamenPage;
