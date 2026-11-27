import React from 'react';
import { useIntermittence } from '../context/IntermittenceContext';
import { useSimulation } from '../hooks/useSimulation';
import { Field, PageHeader, Notice, eur, nb } from '../components/ui';
import { Printer, Download } from 'lucide-react';
import { AJ_MIN, SEUIL_NHT, SEUIL_SR, formatDateFR, HEURES_PAR_CACHET } from '../lib/calculs';
import { TYPES } from '../lib/typesContrat';
import { useIdentite } from '../lib/dossier';
import { echeances } from '../lib/echeances';
import { toISODate } from '../lib/calculs';

/**
 * Dossier imprimable.
 *
 * La page est composée comme une feuille A4 : elle s'affiche sur papier blanc
 * au milieu de l'interface sombre, et s'imprime telle quelle. Tout ce qui
 * n'est pas destiné au dossier (saisie de l'identité, boutons) est exclu de
 * l'impression par la classe `no-print`.
 */

const Cellule: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={className}>
    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-0.5 text-[11px] leading-snug text-slate-900">{children}</div>
  </div>
);

const Bloc: React.FC<{ titre: string; children: React.ReactNode }> = ({ titre, children }) => (
  <section className="mt-5 break-inside-avoid">
    <h2 className="mb-2 border-b border-slate-300 pb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">{titre}</h2>
    {children}
  </section>
);

const DossierPage: React.FC = () => {
  const { data } = useIntermittence();
  const sim = useSimulation();
  const [identite, majIdentite] = useIdentite();
  const aff = sim.affiliation;

  const contrats = [...data.contrats].sort((a, b) => a.date.localeCompare(b.date));
  const echeancesDossier = echeances({
    aujourdHui: toISODate(new Date()),
    dateAnniversaire: sim.dateAnniversaire,
    rattrapagePossible: false,
  });

  const heuresDe = (c: (typeof contrats)[number]): string => {
    if (c.type === 'Cachet') return `${nb(c.nombre * HEURES_PAR_CACHET, 0)} h`;
    if (c.type === 'Arret') return `${nb(c.nombre * 5, 0)} h`;
    if (c.type === 'NonSalarie') return '—';
    return `${nb(c.nombre, 0)} h`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administratif"
        title="Dossier"
        accent="prêt à imprimer"
        description="Le récapitulatif de votre situation, mis en page pour être imprimé ou joint à une demande. Renseignez votre identité, puis imprimez."
        actions={
          <button type="button" className="btn-lime no-print" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </button>
        }
      />

      {/* ------------------------------------------------------ Saisie */}
      <div className="glass no-print p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-lime-300" />
          <h2 className="text-base font-semibold text-ink">Votre identité</h2>
          <span className="text-xs text-ink-faint">— conservée dans ce navigateur, absente des calculs</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nom">
            <input className="input" value={identite.nom} onChange={(e) => majIdentite('nom', e.target.value)} />
          </Field>
          <Field label="Prénom">
            <input className="input" value={identite.prenom} onChange={(e) => majIdentite('prenom', e.target.value)} />
          </Field>
          <Field label="Date de naissance">
            <input type="date" className="input" value={identite.naissance} onChange={(e) => majIdentite('naissance', e.target.value)} />
          </Field>
          <Field label="N° de sécurité sociale" hint="À n'indiquer que si l'administration vous le demande.">
            <input className="input" value={identite.nir} onChange={(e) => majIdentite('nir', e.target.value)} />
          </Field>
          <Field label="Adresse">
            <input className="input" value={identite.adresse} onChange={(e) => majIdentite('adresse', e.target.value)} />
          </Field>
          <Field label="Qualité">
            <input className="input" placeholder="Comédienne, technicienne son…" value={identite.qualite} onChange={(e) => majIdentite('qualite', e.target.value)} />
          </Field>
          <Field label="Courriel">
            <input type="email" className="input" value={identite.email} onChange={(e) => majIdentite('email', e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input className="input" value={identite.telephone} onChange={(e) => majIdentite('telephone', e.target.value)} />
          </Field>
          <Field label="Organisme de rattachement">
            <input className="input" placeholder="France Travail, Audiens…" value={identite.organisme} onChange={(e) => majIdentite('organisme', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Pièces jointes au dossier" hint="Listez ce que vous joignez : attestations employeur, contrats, relevés…">
            <textarea
              className="input min-h-[90px] w-full resize-y"
              value={identite.pieces}
              onChange={(e) => majIdentite('pieces', e.target.value)}
              placeholder={'— Attestations employeur\n— Contrats de travail\n— Attestation de prélèvement à la source'}
            />
          </Field>
        </div>
        <Notice tone="info" className="mt-4">
          Le dossier est un récapitulatif de vos saisies. Les montants sont indicatifs : seule votre notification France
          Travail fait foi. Vérifiez chaque ligne avant de la transmettre.
        </Notice>
      </div>

      {/* ------------------------------------------------------ Document */}
      <article className="mx-auto w-full max-w-[210mm] bg-white p-[12mm] text-slate-800 shadow-card-lg print:p-0 print:shadow-none">
        {/* en-tête */}
        <header className="flex items-start justify-between border-b-2 border-brand-700 pb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-brand-800">Récapitulatif de situation</h1>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Intermittent du spectacle — annexe {data.annexe === 'A8' ? '8 (artistes et techniciens)' : '10 (artistes du spectacle)'}
            </p>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-slate-600">
            <p>Établi le {formatDateFR(toISODate(new Date()))}</p>
            <p>Régime : {data.annexe}</p>
          </div>
        </header>

        {/* identité */}
        <Bloc titre="Identification">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Cellule label="Nom et prénom">
              {[identite.prenom, identite.nom].filter(Boolean).join(' ') || '—'}
            </Cellule>
            <Cellule label="Date de naissance">{identite.naissance ? formatDateFR(identite.naissance) : '—'}</Cellule>
            <Cellule label="Qualité">{identite.qualite || '—'}</Cellule>
            <Cellule label="Adresse" className="col-span-2">
              {identite.adresse || '—'}
            </Cellule>
            <Cellule label="Contact">
              {[identite.telephone, identite.email].filter(Boolean).join(' · ') || '—'}
            </Cellule>
          </div>
        </Bloc>

        {/* droit en cours */}
        <Bloc titre="Droit en cours">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Cellule label="Ouverture du droit">{formatDateFR(sim.dateIndem)}</Cellule>
            <Cellule label="Date anniversaire">{formatDateFR(sim.dateAnniversaire)}</Cellule>
            <Cellule label="Examen des nouveaux droits">{formatDateFR(sim.examen.dateExamen)}</Cellule>
            <Cellule label="Allocation journalière brute">
              {sim.ajBrute > 0 ? eur(sim.ajBrute) : '—'}
              {sim.sourceAJ === 'notifiee' && <span className="ml-1 text-slate-500">(notifiée)</span>}
            </Cellule>
            <Cellule label="AJ nette">{sim.ajBrute > 0 ? eur(sim.retenues.net) : '—'}</Cellule>
            <Cellule label="Franchises">
              CP {sim.franchiseCP.total} j · salaires {sim.franchiseSal.total} j
            </Cellule>
            <Cellule label="Délai d'attente">{data.delaiAttente ? 'Appliqué' : 'Sans délai'}</Cellule>
            <Cellule label="Taux de prélèvement à la source">{data.tauxPrelevement || '0'} %</Cellule>
          </div>
        </Bloc>

        {/* période de référence */}
        <Bloc titre="Période de référence des 507 heures">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Cellule label="Période">{formatDateFR(aff.periode.debut)} → {formatDateFR(aff.periode.fin)}</Cellule>
            <Cellule label="Heures retenues (507 h)">{nb(aff.heuresAffiliation, 1)} h</Cellule>
            <Cellule label="Heures pour l'AJ (NHT)">{nb(aff.nht, 1)} h</Cellule>
            <Cellule label="Salaire de référence">{eur(aff.sr, 2)}</Cellule>
            <Cellule label="Jours de travail">{nb(aff.joursTravail, 1)} j</Cellule>
            <Cellule label="Enseignement retenu">{nb(aff.heuresEnseignementRetenues, 1)} h</Cellule>
            <Cellule label="Heures d'arrêt assimilées">{nb(aff.heuresArret, 1)} h</Cellule>
            <Cellule label="Seuil atteint">{aff.eligible ? 'Oui' : `Non (${nb(aff.heuresManquantes, 1)} h manquantes)`}</Cellule>
          </div>
        </Bloc>

        {/* détail AJ */}
        {sim.ajCalculee && (
          <Bloc titre="Détail du calcul de l'allocation journalière">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-600">
                  <th className="py-1 font-semibold">Composante</th>
                  <th className="py-1 text-right font-semibold">Montant</th>
                  <th className="py-1 pl-4 font-semibold">Détail</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1">Partie A — salaire de référence</td>
                  <td className="num py-1 text-right">{eur(sim.ajCalculee.A)}</td>
                  <td className="py-1 pl-4 text-slate-600">
                    SR {eur(aff.sr, 0)} → {data.annexe === 'A8' ? '0,42' : '0,36'} jusqu'à {eur(SEUIL_SR[data.annexe], 0)}, 0,05 au-delà
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1">Partie B — nombre d'heures</td>
                  <td className="num py-1 text-right">{eur(sim.ajCalculee.B)}</td>
                  <td className="py-1 pl-4 text-slate-600">
                    {nb(aff.nht, 0)} h → 0,26 jusqu'à {SEUIL_NHT[data.annexe]} h, 0,08 au-delà
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-1">Partie C — plancher</td>
                  <td className="num py-1 text-right">{eur(sim.ajCalculee.C)}</td>
                  <td className="py-1 pl-4 text-slate-600">
                    AJ minimale {eur(AJ_MIN)} × {data.annexe === 'A8' ? '0,40' : '0,70'}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-bold">Allocation journalière brute</td>
                  <td className="num py-1 text-right font-bold">{eur(sim.ajCalculee.aj)}</td>
                  <td className="py-1 pl-4 text-slate-600">retenues : {eur(sim.retenues.retraiteComplementaire + sim.retenues.csgCrds)} → net {eur(sim.retenues.net)}</td>
                </tr>
              </tbody>
            </table>
          </Bloc>
        )}

        {/* contrats */}
        <Bloc titre={`Contrats déclarés (${contrats.length})`}>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th className="py-1 font-semibold">Début</th>
                <th className="py-1 font-semibold">Fin</th>
                <th className="py-1 font-semibold">Employeur</th>
                <th className="py-1 font-semibold">Type</th>
                <th className="py-1 text-right font-semibold">Nombre</th>
                <th className="py-1 text-right font-semibold">Heures</th>
                <th className="py-1 text-right font-semibold">Brut</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map((c) => (
                <tr key={c.id} className="border-b border-slate-200">
                  <td className="num py-0.5">{formatDateFR(c.date)}</td>
                  <td className="num py-0.5">{formatDateFR(c.dateFin || c.date)}</td>
                  <td className="py-0.5">{c.employeur || '—'}</td>
                  <td className="py-0.5">{TYPES[c.type].court}</td>
                  <td className="num py-0.5 text-right">{nb(c.nombre, c.type === 'Cachet' ? 0 : 1)}</td>
                  <td className="num py-0.5 text-right">{heuresDe(c)}</td>
                  <td className="num py-0.5 text-right">{eur(c.brut, 0)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="py-1 font-bold">
                  Total
                </td>
                <td className="num py-1 text-right font-bold">{eur(contrats.reduce((s, c) => s + c.brut, 0), 0)}</td>
              </tr>
            </tbody>
          </table>
        </Bloc>

        {/* suivi mensuel */}
        <Bloc titre="Suivi mensuel">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th className="py-1 font-semibold">Mois</th>
                <th className="py-1 text-right font-semibold">Heures</th>
                <th className="py-1 text-right font-semibold">Brut</th>
                <th className="py-1 text-right font-semibold">J. trav.</th>
                <th className="py-1 text-right font-semibold">J. ind.</th>
                <th className="py-1 text-right font-semibold">ARE brute</th>
                <th className="py-1 text-right font-semibold">ARE versée</th>
                <th className="py-1 text-right font-semibold">Total net</th>
              </tr>
            </thead>
            <tbody>
              {sim.suivi.mois.map((m) => (
                <tr key={m.cle} className="border-b border-slate-200">
                  <td className="py-0.5">{m.label}</td>
                  <td className="num py-0.5 text-right">{nb(m.heures, 0)}</td>
                  <td className="num py-0.5 text-right">{eur(m.brut, 0)}</td>
                  <td className="num py-0.5 text-right">{nb(m.joursTravail, 1)}</td>
                  <td className="num py-0.5 text-right">{nb(m.joursIndemnises)}</td>
                  <td className="num py-0.5 text-right">{eur(m.areBrute, 0)}</td>
                  <td className="num py-0.5 text-right">{eur(m.areVersee, 0)}</td>
                  <td className="num py-0.5 text-right font-semibold">{eur(m.totalNet, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloc>

        {/* échéances */}
        <Bloc titre="Échéances">
          <ul className="space-y-1 text-[11px]">
            {echeancesDossier.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="num w-24 flex-shrink-0 text-brand-700">{formatDateFR(e.date)}</span>
                <span className="font-semibold">{e.titre}</span>
              </li>
            ))}
          </ul>
        </Bloc>

        {/* pièces */}
        {identite.pieces && (
          <Bloc titre="Pièces jointes">
            <p className="whitespace-pre-line text-[11px] leading-relaxed">{identite.pieces}</p>
          </Bloc>
        )}

        <footer className="mt-6 border-t border-slate-300 pt-2 text-[9px] leading-relaxed text-slate-500">
          Récapitulatif établi à partir des données saisies par l'intéressé. Les montants sont indicatifs et ne
          remplacent pas la notification de France Travail, qui seule fait foi. Règles appliquées : guide
          « Intermittents du spectacle » de France Travail.
        </footer>
      </article>
    </div>
  );
};

export default DossierPage;
