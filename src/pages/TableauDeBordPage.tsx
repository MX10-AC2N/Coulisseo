import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIntermittence } from '../context/IntermittenceContext';
import { useSimulation } from '../hooks/useSimulation';
import {
  ArrowRight,
  CalendarClock,
  Check,
  AlertCircle,
  Clock,
  Coins,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import { Badge, Card, Kpi, Notice, PageHeader, Progress, Ring, Sparkline, Stat, eur, nb } from '../components/ui';
import {
  SEUIL_HEURES,
  estSpectacle,
  finContrat,
  formatDateFR,
  parseDate,
  toISODate,
  type TypeContrat,
} from '../lib/calculs';
import { echeances } from '../lib/echeances';
import { recommandations } from '../lib/reexamen';

const joursEntre = (a: string, b: string): number =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

/** Frise du droit : de l'ouverture à l'anniversaire, jalonnée par les mois. */
const Frise: React.FC<{ debut: string; fin: string; aujourdhui: string; marqueurs: string[] }> = ({ debut, fin, aujourdhui, marqueurs }) => {
  const d0 = parseDate(debut).getTime();
  const d1 = parseDate(fin).getTime();
  const duree = Math.max(1, d1 - d0);
  const pos = (iso: string) => Math.min(100, Math.max(0, ((parseDate(iso).getTime() - d0) / duree) * 100));
  const ecoul = pos(aujourdhui);
  const MOIS_COURTS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  return (
    <div className="relative mx-2 mt-6 h-28">
      {/* rail */}
      <div className="absolute inset-x-0 top-9 h-2 rounded-full bg-white/8" />
      <div className="absolute left-0 top-9 h-2 rounded-full bg-gradient-to-r from-brand-600 to-lime-400 transition-all duration-700" style={{ width: `${ecoul}%` }} />
      {/* jalons de mois, au-dessus du rail */}
      {marqueurs.map((m) => (
        <div key={m} className="absolute -translate-x-1/2 text-center" style={{ left: `${pos(m)}%`, top: 0 }}>
          <div className="whitespace-nowrap text-[10px] text-ink-dim">{MOIS_COURTS[parseDate(m).getMonth()]}</div>
          <div className="mx-auto mt-1 h-4 w-px bg-white/15" />
        </div>
      ))}
      {/* début */}
      <div className="absolute left-0 top-[22px]">
        <div className="h-5 w-5 rounded-full border-2 border-brand-300 bg-brand-900 shadow-float" />
        <div className="absolute left-0 top-7 whitespace-nowrap rounded-lg border border-line-soft bg-surface-strong px-2 py-0.5 text-[11px] font-medium text-ink shadow-card">
          Ouverture {formatDateFR(debut)}
        </div>
      </div>
      {/* fin */}
      <div className="absolute right-0 top-[22px]">
        <div className="h-5 w-5 rounded-full border-2 border-lime-300 bg-brand-900 shadow-float" />
        <div className="absolute right-0 top-7 whitespace-nowrap rounded-lg border border-line-soft bg-surface-strong px-2 py-0.5 text-[11px] font-medium text-ink shadow-card">
          Anniversaire {formatDateFR(fin)}
        </div>
      </div>
      {/* aujourd'hui */}
      {ecoul > 1 && ecoul < 99 && (
        <div className="absolute -translate-x-1/2" style={{ left: `${ecoul}%`, top: 20 }}>
          <div className="h-7 w-7 rounded-full border-2 border-white bg-brand-600 shadow-glow" />
          <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-lg bg-lime-400 px-2 py-0.5 text-[11px] font-semibold text-brand-950 shadow-float">
            Aujourd'hui
          </div>
        </div>
      )}
    </div>
  );
};

/** Histogramme empilé : salaires nets et ARE, mois par mois. */
const RevenusMensuels: React.FC<{ mois: { cle: string; label: string; net: number; areVersee: number; totalNet: number }[] }> = ({ mois }) => {
  const max = Math.max(1, ...mois.map((m) => m.totalNet));
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {mois.map((m) => {
        const hSalaire = (m.net / max) * 100;
        const hAre = (m.areVersee / max) * 100;
        return (
          <div key={m.cle} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${m.label} — salaires ${eur(m.net, 0)} + ARE ${eur(m.areVersee, 0)}`}>
            <div className="relative flex h-28 w-full items-end justify-center">
              <div className="absolute bottom-0 w-full overflow-hidden rounded-t-md bg-white/5" style={{ height: `${hSalaire + hAre}%` }}>
                <div className="absolute bottom-0 w-full rounded-t-md bg-brand-500/80 transition-all" style={{ height: `${(hSalaire / (hSalaire + hAre || 1)) * 100}%` }} />
                <div className="absolute bottom-0 w-full bg-lime-400/85 transition-all" style={{ height: `${(hAre / (hSalaire + hAre || 1)) * 100}%` }} />
              </div>
            </div>
            <span className="num truncate text-[10px] text-ink-dim">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const TableauDeBordPage: React.FC = () => {
  const { data } = useIntermittence();
  const sim = useSimulation();
  const aff = sim.affiliation;

  const reste = joursEntre(toISODate(new Date()), sim.dateAnniversaire);

  const reco = useMemo(
    () =>
      recommandations(data.contrats, {
        annexe: data.annexe,
        heuresApres: sim.heuresApres,
        plus50ans: data.plus50ans,
        ajBase: sim.ajBrute,
        dateAnniversaire: sim.dateAnniversaire,
        dateIndem: sim.dateIndem,
        eligible: aff.eligible,
        heuresManquantes: aff.heuresManquantes,
        mois: 18,
      }).slice(0, 3),
    [data.contrats, data.annexe, data.plus50ans, sim, aff]
  );

  const echeancesFutures = useMemo(
    () =>
      echeances({
        aujourdHui: toISODate(new Date()),
        dateAnniversaire: sim.dateAnniversaire,
        rattrapagePossible: false,
      }).slice(0, 4),
    [sim.dateAnniversaire]
  );

  const revenus: Record<TypeContrat, number> = { Cachet: 0, Heures: 0, Enseignement: 0, RegimeGeneral: 0, NonSalarie: 0, Arret: 0, Formation: 0 };
  data.contrats.forEach((c) => (revenus[c.type] += c.brut));
  const hors = revenus.RegimeGeneral + revenus.NonSalarie;
  const totalRev = revenus.Cachet + revenus.Heures + revenus.Enseignement + hors;

  const moisSuivi = sim.suivi.mois.filter((m) => m.totalNet > 0 || m.areBrute > 0);
  const netMoyen = moisSuivi.length ? moisSuivi.reduce((s, m) => s + m.totalNet, 0) / moisSuivi.length : 0;
  const dernierContrat = data.contrats.filter(estSpectacle).reduce((max, c) => (finContrat(c) > max ? finContrat(c) : max), '');

  const marqueurs: string[] = [];
  const d0 = parseDate(sim.dateIndem);
  for (let cur = new Date(d0.getFullYear(), d0.getMonth() + 1, 1); cur < parseDate(sim.dateAnniversaire); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)) {
    marqueurs.push(toISODate(cur));
  }

  const etat = aff.eligible ? (reste > 90 ? 'Droit actif' : 'Droit à renouveler') : 'Seuil des 507 h non atteint';
  const toneEtat = aff.eligible ? (reste > 90 ? 'lime' : 'amber') : 'red';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pilotage"
        title="Tableau de bord"
        accent="votre situation, en un coup d'œil"
        description="Où vous en êtes, ce qui se prépare, et ce qu'il faut avoir fait avant la prochaine échéance."
      />

      {/* ------------------------------------------------------- Bandeau état */}
      <Card className="overflow-hidden" bodyClassName="p-0">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <Ring value={Math.min(1, reste > 0 ? reste / 365 : 1)} max={1} size={116} stroke={11} track={1}>
              <span className="num text-2xl font-semibold tracking-tight text-gradient-lime">{reste > 0 ? nb(reste) : '0'}</span>
              <span className="text-[9px] uppercase tracking-[0.12em] text-ink-faint">jours</span>
            </Ring>
            <div>
              <Badge tone={toneEtat}>{etat}</Badge>
              <p className="mt-2 text-sm text-ink-muted">
                Droit ouvert le <b className="text-ink">{formatDateFR(sim.dateIndem)}</b>, jusqu'au{' '}
                <b className="text-ink">{formatDateFR(sim.dateAnniversaire)}</b>.
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                Examen des nouveaux droits : {formatDateFR(sim.examen.dateExamen)}
                {sim.examen.reporte && <span className="ml-1 text-amber-300">(reporté : contrat en cours)</span>}
              </p>
            </div>
          </div>

          <div className="hidden h-16 w-px bg-line-soft lg:block" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="AJ brute" value={sim.ajBrute > 0 ? eur(sim.ajBrute) : '—'} hint={sim.ajBrute > 0 ? `${eur(sim.retenues.net)} net` : 'non notifiée'} />
            <Stat label="Heures 507 h" value={`${nb(aff.heuresAffiliation, 0)} h`} hint={aff.eligible ? 'seuil atteint' : `manque ${nb(aff.heuresManquantes, 0)} h`} />
            <Stat label="Salaire de réf." value={eur(aff.sr, 0)} hint={`${nb(aff.nht, 0)} h retenues`} />
            <Stat label="Net moyen / mois" value={eur(netMoyen, 0)} hint={`${moisSuivi.length} mois suivis`} />
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------- KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Heures pour le prochain droit"
          aide="h507"
          value={`${nb(aff.heuresAffiliation, 0)} h`}
          sub={sim.heuresApres ? `depuis le ${formatDateFR(aff.periode.debut)}` : `sur ${SEUIL_HEURES} h requises`}
          tone={aff.eligible ? 'green' : 'amber'}
          footer={<Progress value={aff.heuresAffiliation} max={SEUIL_HEURES} tone={aff.eligible ? 'green' : 'amber'} />}
        />
        <Kpi
          label="Allocation journalière"
          aide="aj"
          variant="dark"
          value={sim.ajBrute > 0 ? eur(sim.ajBrute) : 'Non éligible'}
          sub={sim.ajBrute > 0 ? `${eur(sim.retenues.net)} net / jour` : undefined}
          footer={<>Fin du droit : {formatDateFR(sim.dateFinDroit)}</>}
        />
        <Kpi
          label="Revenus nets"
          icon={<Coins className="h-4 w-4" />}
          value={eur(netMoyen, 0)}
          sub="moyenne des mois suivis"
          footer={
            moisSuivi.length > 1 ? (
              <Sparkline values={moisSuivi.map((m) => m.totalNet)} height={34} tone="lime" className="w-full" />
            ) : undefined
          }
        />
        <Kpi
          label="Échéances à venir"
          icon={<CalendarClock className="h-4 w-4" />}
          value={`${echeancesFutures.length}`}
          sub={echeancesFutures[0] ? echeancesFutures[0].titre : 'aucune'}
          footer={
            echeancesFutures[0] ? (
              <>
                {formatDateFR(echeancesFutures[0].date)} ·{' '}
                <Link to="/echeances" className="text-lime-300 hover:underline">
                  tout voir
                </Link>
              </>
            ) : undefined
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {/* ------------------------------------------------------- Frise */}
          <Card title="Frise du droit" icon={<Clock className="h-4 w-4" />}>
            <p className="mb-8 text-xs text-ink-muted">
              {Math.round(joursEntre(sim.dateIndem, sim.dateAnniversaire))} jours de droit · période de référence des 507 h :{' '}
              {formatDateFR(aff.periode.debut)} → {formatDateFR(aff.periode.fin)}
            </p>
            <Frise debut={sim.dateIndem} fin={sim.dateAnniversaire} aujourdhui={toISODate(new Date())} marqueurs={marqueurs} />
            {dernierContrat && dernierContrat >= sim.dateIndem && dernierContrat <= sim.dateAnniversaire && (
              <p className="mt-8 text-xs text-ink-faint">
                Dernier contrat spectacle : <b className="text-ink-muted">{formatDateFR(dernierContrat)}</b> — il fixe la fin
                de la période de référence du droit suivant.
              </p>
            )}
          </Card>

          {/* --------------------------------------------------- Revenus */}
          <Card
            title="Revenus nets, mois par mois"
            icon={<TrendingUp className="h-4 w-4" />}
            action={
              <div className="flex items-center gap-3 text-[11px] text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-brand-500/80" />
                  Salaires
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-lime-400/85" />
                  ARE
                </span>
              </div>
            }
          >
            {moisSuivi.length === 0 ? (
              <p className="text-sm text-ink-muted">Aucun mois à afficher : saisissez vos contrats.</p>
            ) : (
              <RevenusMensuels mois={moisSuivi} />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* ------------------------------------------------- Vigilance */}
          <Card
            title="Points de vigilance"
            icon={<AlertCircle className="h-4 w-4" />}
            action={
              <Link to="/reexamen" className="inline-flex items-center gap-1 text-xs font-semibold text-lime-300 hover:underline">
                anticiper
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {reco.length === 0 ? (
              <div className="flex items-center gap-3 rounded-3xl border border-lime-300/20 bg-lime-400/10 p-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lime-400/20 text-lime-300">
                  <Check className="h-4 w-4" />
                </span>
                <p className="text-sm text-ink-muted">
                  Rien à signaler : votre droit tient jusqu'au {formatDateFR(sim.dateAnniversaire)}.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {reco.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-3.5 ${
                      r.priorite === 'critique'
                        ? 'border-rose-400/25 bg-rose-500/10'
                        : r.priorite === 'attention'
                          ? 'border-amber-300/20 bg-amber-400/10'
                          : 'border-line-soft bg-surface-muted'
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">{r.titre}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{r.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ------------------------------------------------ Échéances */}
          <Card
            title="Prochaines échéances"
            icon={<CalendarClock className="h-4 w-4" />}
            action={
              <Link to="/echeances" className="inline-flex items-center gap-1 text-xs font-semibold text-lime-300 hover:underline">
                calendrier
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="space-y-2.5">
              {echeancesFutures.map((e) => (
                <div key={e.id} className="flex gap-3 rounded-2xl border border-line-soft bg-surface-muted p-3">
                  <div className="num w-14 flex-shrink-0 text-center">
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

          {/* ----------------------------------------------- Répartition */}
          <Card title="Répartition des revenus" icon={<Gauge className="h-4 w-4" />}>
            {totalRev > 0 ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/8">
                  <div className="bg-brand-500" style={{ width: `${(revenus.Cachet / totalRev) * 100}%` }} />
                  <div className="bg-brand-300" style={{ width: `${(revenus.Heures / totalRev) * 100}%` }} />
                  <div className="bg-lime-400" style={{ width: `${(revenus.Enseignement / totalRev) * 100}%` }} />
                  <div className="bg-sky-400" style={{ width: `${(hors / totalRev) * 100}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink-muted">
                  {(
                    [
                      ['Cachets', revenus.Cachet, 'bg-brand-500'],
                      ['Heures', revenus.Heures, 'bg-brand-300'],
                      ['Cours', revenus.Enseignement, 'bg-lime-400'],
                      ['Hors spectacle', hors, 'bg-sky-400'],
                    ] as const
                  ).map(([t, v, cls]) =>
                    v > 0 ? (
                      <span key={t} className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${cls}`} />
                        {t}
                        <span className="num ml-auto text-ink-faint">{eur(v, 0)}</span>
                      </span>
                    ) : null
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Aucun revenu saisi.</p>
            )}
          </Card>
        </div>
      </div>

      {!aff.eligible && (
        <Notice tone="warn" title="Le seuil des 507 h n'est pas atteint">
          Il vous manque <b>{nb(aff.heuresManquantes, 0)} h</b> pour que le droit soit ouvert. La page{' '}
          <Link to="/reexamen" className="font-semibold text-lime-300 underline underline-offset-2">
            Réexamen
          </Link>{' '}
          vous montre quand le seuil se perd si rien ne change, et ce qu'il faudrait signer pour le tenir.
        </Notice>
      )}
    </div>
  );
};

export default TableauDeBordPage;
