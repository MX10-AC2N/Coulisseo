<p align="center">
  <img src="public/logo-light.svg" alt="Coulisseo" height="64" />
</p>

# Coulisseo — pilotage de l'intermittence

**Coulisseo** (de *coulisses*) : le tableau de bord de l'intermittent du spectacle. Suivi du statut,
anticipation du réexamen, module fiscal complet et dossier imprimable, en annexes 8 et 10.

Démo : **https://mx10-ac2n.github.io/Coulisseo/** (GitHub Pages) — démo temporaire :
**https://rojabumzv8awc.space.mcode.io** — dépôt : **https://github.com/MX10-AC2N/Coulisseo**

> Ce projet s'inspire de **[SImulateurIntermittece](https://github.com/mysteropodes/SImulateurIntermittece)**
> de [mysteropodes](https://github.com/mysteropodes), publié en **CC0 1.0** (domaine public). Nous
> avons repris son moteur de calcul et ses tests **sans y toucher**, puis écrit l'interface, le
> module d'anticipation, le module fiscal et le dossier imprimable. Détail dans
> [Crédits](#crédits-et-origine).

La marque : un C en Manrope ExtraBold posé sur un carré de scène, halo de projecteur ; dans le
logotype, le point du « i » est le « spot » qui te signale les échéances. Fichiers dans
`public/` (`logo.svg`, `logo-light.svg`, `mark.svg`) et icônes PWA en PNG.

---

## Ce que Coulisseo ajoute

### 1. Thème sombre premium

L'interface est en thème sombre premium : fond profond vert sapin, cartes en verre dépoli, accents
tilleul, halo ambiant, typographie Manrope variable, anneaux et courbes en SVG natif.

- Jetons sémantiques (`surface`, `ink`, `line`) dans `tailwind.config.js`, appliqués à toutes les
  pages par un codemod (`bg-white` → `bg-surface`, `text-slate-900` → `text-ink`…).
- Composants enrichis dans `src/components/ui.tsx` : `Kpi` (variantes, pastille de variation),
  `Sparkline`, `Delta`, `EmptyState`, `PageHeader` (sur-titre), `Card` en verre.
- Navigation regroupée par usage (Pilotage / Vos données / Suivi / Archives / Administratif).
- Feuille d'impression dédiée (`@media print`) : le dossier sort en A4, noir et blanc.

### 2. Réexamen : anticiper pour ajuster sa demande

Page **Réexamen** (`/reexamen`) et moteur `src/lib/reexamen.ts` (11 tests). Rien de nouveau n'est
introduit dans les règles : tout est recalculé par `src/lib/calculs.ts`, déjà testé sur les exemples
chiffrés du guide France Travail.

- **Fenêtre de sécurité** : la période de référence est une fenêtre de 12 mois qui glisse. La
  projection fait glisser cette fenêtre mois par mois sur 24 mois et montre l'AJ que donnerait le
  droit suivant, et le mois exact où le seuil des 507 h ne serait plus atteint.
- **Recommandations datées** : « le seuil des 507 h ne serait plus atteint en juin 2027, il
  manquerait 12 h : signez au moins 12 h avant fin juin 2027 ».
- **Scénarios** : ajouter un contrat « envisagé » (type, dates, volume, brut) et comparer l'AJ au
  réexamen, l'écart d'AJ journalier et le gain sur les 12 mois du droit suivant.
- **Date de fin du dernier contrat** : la fin du contrat spectacle fixe la période de référence du
  droit suivant. Le tableau compare l'AJ obtenue pour chaque date de fin possible et signale la
  date recommandée.

### 3. Fiscalité

Page **Fiscalité** (`/fiscalite`) et moteur `src/lib/fiscal.ts` (21 tests).

- **Frais professionnels** : comparaison chiffrée de quatre options — abattement de 10 % (sur le
  **salaire brut**, borné par le barème), frais réels, abattement de 5 % (ensemble des professions
  artistiques) et 14 % (artistes musiciens, choristes, chorégraphes, lyriques). Les 5 % et 14 %
  portent sur l'ensemble de la rémunération annuelle, **ARE comprise**, et se cumulent.
  L'écran chiffre le gain d'impôt en euros, au taux que vous choisissez.
- **À déclarer** : salaires bruts par employeur, ARE brute (cases 1AP à 1DP), CSG déductible,
  retraite complémentaire, CRDS non déductible, avec un récapitulatif prêt à copier.
- **CESU** : déclaration de rémunération au plus tard le 5 du mois suivant, et la distinction entre
  l'**attestation de vigilance** URSSAF (employeur → client, ≥ 5 000 € HT, tous les 6 mois) et
  l'**attestation employeur de fin de contrat** (celle qui va à France Travail, transmise
  automatiquement pour les CESU).
- **Calendrier** : dates de la campagne de déclaration, échéances CESU, congés spectacles
  (1er avril → 31 mars, demande à partir de la mi-avril, versement au 1er mai), et ce qui
  **n'existe pas** (pas de contribution sociale additionnelle sur les revenus du spectacle, pas
  d'acompte pour un salarié).

### 4. Dossier imprimable

Page **Dossier** (`/dossier`) : le récapitulatif de votre situation mis en page comme une feuille
A4 — identification, droit en cours, période de référence, détail du calcul de l'AJ, contrats,
suivi mensuel, échéances, pièces jointes — imprimable ou exportable en PDF depuis le navigateur.
L'identité saisie est rangée à part du modèle de simulation : elle n'entre dans aucun calcul.

### 5. Tableau de bord de pilotage

La page d'accueil devient un tableau de bord : état du droit et jours restants, AJ et net, heures
des 507 h avec projection, revenus nets mois par mois, frise du droit, points de vigilance et
prochaines échéances.

---

## Règles appliquées

Toute la logique de calcul est dans [`src/lib`](src/lib) (`calculs.ts`, `droits.ts`, `retraite.ts`…),
testée sur les exemples chiffrés du guide France Travail (`npm test` — 111 tests).

| Règle | Détail |
|---|---|
| Affiliation | 507 h sur les 12 mois précédant la fin du dernier contrat spectacle ; 1 cachet = 12 h ; plafond mensuel 208 h (250 h multi-employeurs) en annexe 8, 28 cachets en annexe 10 ; pour le droit suivant, les heures qui ont déjà servi à ouvrir le droit en cours ne comptent plus |
| Droit en cours / prochain droit | l'AJ calculée, les franchises et la retenue retraite du droit en cours viennent de la période qui l'a ouvert ; le compteur des 507 h et l'AJ projetée portent sur les heures faites depuis |
| Enseignement | compte pour les 507 h (70 h max, 120 h à 50 ans et plus), mais ni dans les heures (partie B) ni dans le salaire (partie A) de l'AJ ; reste une activité du mois |
| Périodes assimilées | arrêt hors contrat (maladie longue, accident du travail, maternité) : 5 h/jour pour les 507 h et l'AJ, salaire de référence aménagé, pas d'ARE ces jours-là ; formation + cours ≤ 338 h |
| Annexes mixtes | droit ouvert dans l'annexe qui a le plus d'heures (guide, exemple 3) |
| AJ brute | A + B + C avec AJ minimale 31,96 € — A8 : A = AJmin × (0,42 × SR ≤ 14 400 € + 0,05 × au-delà) / 5000, B = AJmin × (0,26 × NHT ≤ 720 h + 0,08 × au-delà) / 507, C = AJmin × 0,40 — A10 : 0,36 / 13 700 €, 690 h, C = AJmin × 0,70 |
| Plancher / plafond | 38 € (A8), 44 € (A10) / 174,80 € |
| AJ nette | aucune retenue ≤ 31,96 € ; retraite complémentaire 0,93 % du SJM (annexes 8 et 10) ; CSG (6,2 % ou 3,8 %) + CRDS 0,5 % sur 98,25 % au-delà de 60 € |
| Date anniversaire | 12 mois (365 jours) après la fin du contrat qui a ouvert le droit ; examen le lendemain, ou au premier jour sans contrat spectacle si un contrat est en cours ce jour-là (guide, exemple 13) |
| Délai d'attente | 7 jours à l'ouverture, sur des jours indemnisables |
| Franchise congés payés | ⌊jours travaillés × 2,5 / 24⌋, plafonnée à 30 j ; 2 j/mois (≤ 24 j) ou 3 j/mois |
| Franchise salaires | ⌊(salaires / SMIC mensuel) × (SJM / (3 × SMIC journalier))⌋ − 27, étalée sur 8 mois (arrondi supérieur) |
| Activité dans le mois | jours de travail = heures / 8 (A8) ou / 10 (A10) ; seuil 26 j (A8) / 27 j (A10) → aucune ARE ; jours non indemnisables = ⌊jours × 1,4⌋ (A8) ou ⌊jours × 1,3⌋ (A10) |
| Autres activités | hors spectacle : réduisent l'ARE du mois, ne comptent pas pour les 507 h ; non salarié : heures = revenu brut ÷ SMIC horaire |
| Ordre des déductions | délai d'attente → forfait CP → forfait salaires → reliquats reportés |
| Plafond de cumul | salaires bruts + ARE ≤ 118 % du PMSS (4 559,52 € en 2024, 4 631,50 € en 2025, 4 725,90 € en 2026) ; jours recalculés à l'entier supérieur |
| Clause de rattrapage | 338 à 506 h + 5 ans d'ancienneté : 6 mois à la dernière AJ, franchises 2 + 2 j/mois non reportables |
| AFD | 30 € nets/jour, 61 / 92 / 182 jours selon l'ancienneté |
| Maternité | IJ = salaires des 12 mois civils / 365 × 0,79 (104,02 € max en 2026) ; 5 h/jour assimilées ; SR × 365 / (365 − jours de congé) |
| Congés Spectacles | 10 % des salaires bruts spectacle du 1er avril au 31 mars, payables dès le 1er mai |
| Retraite | 1 trimestre = 150 × SMIC horaire au 1er janvier (1 803 € en 2026) ou 50 jours indemnisés, 4 par an |

**Sources du calcul** : guide « Intermittents du spectacle » de France Travail
([GUIDE-INTERMITTENT.pdf](GUIDE-INTERMITTENT.pdf)), flyer « Franchises, délai d'attente… » et notice
« Allocations de solidarité », ameli.fr (congé maternité), Audiens (Congés Spectacles, garantie
santé), service-public.gouv.fr et L'Assurance retraite (trimestres).

**Sources fiscales** (page Fiscalité) : BOFiP BOI-RSA-BASE-30-50-30-30 § 440, § 460, § 470, § 490,
§ 500 ; BOI-RSA-BASE-30-50-20 § 10 ; BOI-RSA-BASE-30-50-30 § 340 ; BOI-BAREME-000035 ;
service-public F1989 et F1419 ; impots.gouv.fr « Dois-je déclarer mes allocations chômage ? » ;
service-public A15597 ; urssaf.fr (attestation de vigilance) ; francetravail.fr (attestation de
prélèvement à la source) ; Audiens (congés spectacles).

Les montants sont indicatifs : seule la notification de France Travail fait foi. Les valeurs
revalorisées (AJ minimale, SMIC, plafond de la Sécurité sociale) sont dans des tables de
`src/lib/calculs.ts` à mettre à jour chaque année. Le barème de l'abattement de 10 % publié par le
BOFiP s'arrête aux revenus 2025 : au-delà, l'application réutilise le barème 2025 et le signale.

---

## Protection des données

- Les données restent dans votre navigateur (`localStorage`) : rien n'est envoyé à un serveur, aucun
  compte n'est demandé.
- Aucun cookie, aucun traqueur, aucune requête vers un tiers : la police est hébergée avec le site
  et une politique de sécurité du contenu (CSP) interdit tout script ou appel réseau extérieur.
- Le site est servi par GitHub Pages, qui voit l'adresse IP des visiteurs comme n'importe quel
  hébergeur.
- Les données ne sont pas chiffrées sur l'appareil : sur un ordinateur partagé, cliquez sur
  « Réinitialiser » en partant.
- L'export JSON contient vos contrats et salaires en clair : rangez-le comme un document personnel.
- Un fichier importé est vérifié champ par champ (dates, types, tailles) avant d'être chargé.

---

## Publier sur GitHub Pages

Le dépôt contient l'historique complet du projet d'origine, plus les commits de Coulisseo, sur la
branche `feature/dashboard-premium`.

```bash
# 1. Pousser la branche
git remote add origin https://github.com/MX10-AC2N/Coulisseo.git   # si le remote n'existe pas encore
git push -u origin feature/dashboard-premium

# 2. Publier sur GitHub Pages
npm run build          # produit dist/
npx gh-pages -d dist   # ou le script « npm run deploy » du dépôt
```

Le chemin de base est configurable : `BASE_PATH='./' npm run build` produit un site servable à la
racine d'un domaine, `npm run build` garde `/Coulisseo/` pour GitHub Pages.

---

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests des règles de calcul et des nouveaux modules (vitest)
npm run build    # build de production
npm run deploy   # publication sur GitHub Pages (branche gh-pages)
```

Le service worker reçoit une version unique à chaque build : l'application installée se met à jour
d'elle-même.

## Crédits et origine

Coulisseo est une **réécriture et un enrichissement** de
[SImulateurIntermittece](https://github.com/mysteropodes/SImulateurIntermittece), réalisé par
[mysteropodes](https://github.com/mysteropodes) et publié en **CC0 1.0 Universal** (domaine public,
sans aucune obligation d'attribution).

- **Repris à l'identique** : le moteur de calcul `src/lib/calculs.ts`, les règles des annexes 8 et 10,
  les tests associés et les documents de référence (guide France Travail). Ce code n'a pas été
  modifié : c'est la base de confiance de l'application.
- **Écrit pour Coulisseo** : l'interface (thème sombre, navigation, tableau de bord), le module
  d'anticipation du réexamen (`src/lib/reexamen.ts`), le module fiscal (`src/lib/fiscal.ts`), le
  dossier imprimable (`src/lib/dossier.ts`), la marque et les icônes.
- **Vérification** : les montants, barèmes et règles fiscales utilisés sont sourcés dans
  l'interface et dans ce README (BOFiP, service-public.gouv.fr, impots.gouv.fr, urssaf.fr,
  France Travail, Audiens). Les valeurs sont indicatives : seule votre notification fait foi.

Nous remercions [mysteropodes](https://github.com/mysteropodes) pour le travail de fond, qui a rendu
ce projet possible.

## Licence

Coulisseo est distribué sous **licence MIT** — voir [LICENSE](LICENSE).

Le projet d'origine étant en CC0 1.0 (domaine public), cette relicence est possible sans
restriction : le MIT impose seulement de conserver l'avis de droit ci-dessus lors de toute
redistribution.

© 2026 Coulisseo — <https://github.com/MX10-AC2N/Coulisseo>
