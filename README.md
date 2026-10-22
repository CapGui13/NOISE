# NOISE — Chut !
Détecteur de bruit pour les tournois de bridge, pensé pour Safari sur un iPhone ancien (iOS 15).

**Site :** https://capgui13.github.io/NOISE/

## Fonctionnement
- Niveau sonore relatif 0 à 100 (pas des dB SPL calibrés), jauge et courbe sur 60 secondes.
- Niveau faible, pic récent et nombre d'alertes.
- Seuil ajustable, calibrage au bruit acceptable pendant 8 secondes, ou capture du bruit actuel.
- Mode « Salle bruyante » (trois notes sur environ 1,4 s), double bip, bip court ou carillon. Intensité réglable, temporisation et repos entre alertes.
- Réglages conservés localement. Aucun son n'est enregistré ou envoyé.

## Utilisation sur iPhone
1. Ouvrir le site en **HTTPS** dans Safari.
2. Désactiver le mode silencieux, augmenter le volume et toucher **Tester le son**.
3. Avant de démarrer, toucher **Tester le son (avec micro)** : le micro est ouvert seulement le temps du bip, puis refermé. Sur iPhone, cela permet de tester le volume dans les mêmes conditions audio que la surveillance.
4. Toucher **Démarrer**, puis autoriser le micro.
5. Calibrer pendant un niveau sonore acceptable, puis ajuster le seuil si nécessaire.
6. Laisser l'application au premier plan, l'écran déverrouillé et l'iPhone sur secteur.
7. Optionnel : Safari → Partager → **Sur l'écran d'accueil**.

**Fiabilité v4 :**
- L'AudioContext est réutilisé entre les démarrages pour éviter les fermetures/réouvertures concurrentes sur Safari iOS. Le microphone est bien libéré à chaque arrêt.
- « Arrêter » annule aussi le test sonore, y compris pendant une demande d'autorisation micro. Un délai d'attente de 15 secondes évite de bloquer toute l'interface si Safari ne répond pas.
- La mesure est un **indice relatif 0–100**, et NON des décibels acoustiques (dB SPL). L'ancienne échelle plafonnait artificiellement à environ 80 ; le seuil conservé est converti automatiquement lors du premier lancement V4 pour maintenir un déclenchement voisin.
- Une alarme dont la génération échoue n'est plus comptabilisée ; un nouvel essai est autorisé 5 secondes après l'échec.
- Sept tests de régression s'exécutent automatiquement via GitHub Actions (`node --test tests/noise.test.cjs`).

**Important :** iOS peut interrompre la capture du micro quand l'écran est verrouillé ou quand l'application n'est plus visible. À la reprise, toucher **Démarrer**. Le niveau mesuré n'est pas un sonomètre étalonné.

## Publication
GitHub → Settings → Pages → Build and deployment : **Deploy from a branch** → **main** / **(root)**.
