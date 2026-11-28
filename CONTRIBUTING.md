# Contribuer

Merci de votre intérêt. Voici comment proposer une contribution sans perdre de temps.

## Avant de commencer

- **Une règle de calcul** ne se modifie pas sur un coup de tête. Toute modification de
  `src/lib/calculs.ts` doit s'appuyer sur une source officielle (guide France Travail,
  BOFiP, service-public.gouv.fr) et sur un test.
- **Une valeur monétaire** (SMIC, PMSS, AJ minimale) se met à jour dans les tables de
  `src/lib/calculs.ts`, jamais en dur dans une page.
- Si l'issue concerne le droit ou la fiscalité, explique la source : les montants affichés
  sont indicatifs, seule la notification de France Travail fait foi.

## Marche à suivre

```bash
npm install
npm run dev        # serveur de développement (port 3000)
npm run check      # typage + tests + build, exactement ce que fait la CI
```

1. Créez une branche : `git checkout -b ma-contribution`.
2. Vos changements, avec un test quand c'est du calcul.
3. `npm run check` doit passer.
4. Ouvrez une pull request : la CI se lance, et un aperçu du site est produit en artefact.

## Règles de forme

- TypeScript strict, pas de `any` implicite.
- Commentaires et noms en français, comme le reste du code.
- Pas de nouvelle dépendance sans justification (l'application fonctionne hors ligne et
  sans appel réseau).
- Les textes de l'interface sont en français, ton factuel.

## Licence

En contribuant, vous acceptez que votre travail soit publié sous licence MIT (voir
[LICENSE](LICENSE)).
