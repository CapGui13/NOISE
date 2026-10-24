# NOISE — Chut !
Détecteur de bruit pour les tournois de bridge, pensé pour Safari sur un iPhone ancien (iOS 15).

**Site :** https://capgui13.github.io/NOISE/

## Fonctionnement
- Niveau sonore relatif 0 à 100 (pas des dB SPL calibrés), jauge et courbe sur 60 secondes.
- Niveau faible, pic récent et nombre d'alertes.
- Seuil ajustable, calibrage au bruit acceptable pendant 8 secondes, ou capture du bruit actuel.
- Mode « Salle bruyante » (trois notes sur environ 1,4 s), double bip, bip court ou carillon. Intensité réglable, temporisation et repos entre alertes.
- **Comparaison NIOSH** : lancement d'une mesure NOISE de 20 secondes en moyenne énergétique (indice relatif /100) et suspension des alertes le temps du relevé. Résultat figé, puis saisie du LAeq NIOSH enregistré sur la même période.
- Jusqu'à 12 paires NOISE / NIOSH mémorisées localement, effaçables séparément et copiables pour les partager dans une conversation. Les cinq observations instantanées précédentes ne sont pas considérées comme des calibrations.
- Réglages conservés localement. Aucun son n'est enregistré ni envoyé.

## Comparer avec NIOSH (20 secondes)
1. Place les deux iPhone côte à côte, micros dégagés. Lance NOISE sur l'ancien iPhone en appuyant sur **Démarrer**.
2. Sur le deuxième iPhone, lance une nouvelle mesure avec NIOSH Sound Level Meter et affiche son **LAeq en dB(A)**. Le calcul NIOSH doit couvrir autant que possible les mêmes 20 secondes.
3. Lance **⏱ Mesurer 20 s** dans NOISE, idéalement en même temps que NIOSH. Les alertes NOISE sont suspendues pendant ces 20 secondes.
4. Une fois le résultat NOISE figé, relève le LAeq de NIOSH et saisis-le dans NOISE. Appuie sur **Enregistrer ce relevé**.
5. Répète à plusieurs niveaux de bruit, puis touche **Copier les relevés** et colle-les dans ChatGPT pour analyser les écarts.

Important : la moyenne énergétique de NOISE porte sur son signal brut *non pondéré A*, et non sur un niveau acoustique étalonné. Le LAeq NIOSH est une valeur acoustique d'un appareil différent. Les deux mesures ne sont pas directement interchangeables. Les données servent à un étalonnage exploratoire ; elles ne transforment pas NOISE en sonomètre professionnel.

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
- Treize tests de régression s'exécutent automatiquement via GitHub Actions (`node --test tests/noise.test.cjs`).

**Important :** iOS peut interrompre la capture du micro quand l'écran est verrouillé ou quand l'application n'est plus visible. À la reprise, toucher **Démarrer**. Le niveau mesuré n'est pas un sonomètre étalonné.

## Publication
GitHub → Settings → Pages → Build and deployment : **Deploy from a branch** → **main** / **(root)**.
