# Sécurité

## Signaler une faille

Si tu trouves une faille de sécurité (données personnelles exposées, injection de script,
contournement de la CSP…), **n'ouvre pas d'issue publique**. Écris directement à
l'équipe du dépôt via la page *Security* de GitHub :
**https://github.com/MX10-AC2N/Coulisseo/security/advisories/new**

Décris le problème, les étapes de reproduction et la versionconcernée. Nous accusons
réception sous 7 jours.

## Ce que fait l'application pour la confidentialité

- **Aucune donnée ne quitte le navigateur** : tout est stocké dans `localStorage`, aucun
  compte, aucun envoi vers un serveur, aucun cookie, aucun traqueur.
- **CSP stricte** : `script-src 'self'`, `connect-src 'self'` — aucun script ni appel réseau
  extérieur n'est autorisé.
- **Aucun appel à une API distante** : les calculs sont faits dans l'onglet.
- **Export manuel** : les fichiers (JSON, Excel) ne sortent que si tu les télécharges.

Le seul tiers qui voit quelque chose est l'hébergeur du site (GitHub Pages), qui voit
l'adresse IP du visiteur, comme tout hébergeur web.

## Versions supportées

La branche `main` est la seule version maintenance. Corrigections de sécurité appliquées
directement dessus.
