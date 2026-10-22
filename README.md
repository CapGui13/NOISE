# NOISE — Chut !
Détecteur de bruit pour les tournois de bridge, pensé pour Safari sur un iPhone ancien (iOS 15).

**Site :** https://capgui13.github.io/NOISE/

## Fonctionnement
- Niveau sonore relatif 0 à 100 (pas des dB SPL calibrés), jauge et courbe sur 60 secondes.
- Niveau faible, pic récent et nombre d'alertes.
- Seuil ajustable, calibrage au bruit acceptable pendant 8 secondes, ou capture du bruit actuel.
- Bip court, double bip ou carillon, intensité réglable, temporisation avant alerte et repos entre alertes.
- Réglages conservés localement. Aucun son n'est enregistré ou envoyé.

## Utilisation sur iPhone
1. Ouvrir le site en **HTTPS** dans Safari.
2. Désactiver le mode silencieux, augmenter le volume et toucher **Tester le son**.
3. Toucher **Démarrer**, puis autoriser le micro.
4. Calibrer pendant un niveau sonore acceptable, puis ajuster le seuil si nécessaire.
5. Laisser l'application au premier plan, l'écran déverrouillé et l'iPhone sur secteur.
6. Optionnel : Safari → Partager → **Sur l'écran d'accueil**.

**Important :** iOS peut interrompre la capture du micro quand l'écran est verrouillé ou quand l'application n'est plus visible. À la reprise, toucher **Démarrer**. Le niveau mesuré n'est pas un sonomètre étalonné.

## Publication
GitHub → Settings → Pages → Build and deployment : **Deploy from a branch** → **main** / **(root)**.
