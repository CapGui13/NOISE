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
- **dB(A) estimés en option (V4.2)** : case « Afficher les dB(A) estimés » activée par défaut, désactivable et mémorisée sur chaque appareil. Affichage purement informatif, aucune incidence sur le seuil et les alertes en indice /100.
- Conversion expérimentale issue de trois paires de moyennes sur 20 secondes : (39,0 ; 62,4), (49,8 ; 71,6), (58,2 ; 80,7). Régression : dB(A) estimés ≈ 25,095 + 0,9484 × indice NOISE. Avertissement quand la valeur sort de la plage testée 39–58,2/100.
- La section « Comparer NOISE avec NIOSH » présente également le niveau estimé sur les mêmes 20 secondes pour le comparer au LAeq NIOSH. **Cela n'ajoute pas de pondération A** au signal du microphone ; la valeur en direct est une approximation instantanée et ne doit pas être interprétée comme un LAeq mesuré.
- **Moteur expérimental V5** : branche secondaire du microphone, avec filtre temporel de pondération A (trois sections biquad) et intégration d'énergie sur la totalité de 20 secondes, dans un `AudioWorklet` (sans enregistrement ni envoi des échantillons). La branche historique de NOISE reste inchangée et pilote seule les alertes.
- **Repli iPhone/Safari** : le nouveau moteur est facultatif et son échec de chargement ou de traitement ne coupe ni le micro ni la surveillance historique.
- **Étalonnage du moteur A** : les nouvelles mesures NIOSH sur 20 s peuvent mémoriser aussi une valeur numérique A en **dBFS(A)**. Après au moins trois nouveaux couples valides, l'interface affiche des **dB(A) estimés** par correction médiane propre au microphone. Les mesures anciennes sans dBFS(A) ne peuvent pas étalonner ce nouveau moteur.
- **Attention** : la pondération A ne transforme pas les dBFS(A) en niveau acoustique. Un iPhone et son navigateur ne constituent pas un sonomètre conforme IEC ; il faut tester le résultat avec du bruit de conversation et différents niveaux sonores.
- Réglages conservés localement. Aucun son n'est enregistré ni envoyé.

## Tester la nouvelle mesure pondérée A — V5
1. Ouvrir NOISE sur l'iPhone habituel, puis appuyer sur **Démarrer**.
2. Vérifier que la section **Mesure pondérée A · V5** affiche « Filtre A actif ». Si elle affiche « indisponible », les alertes historiques continuent de fonctionner.
3. Avec un deuxième iPhone équipé de NIOSH Sound Level Meter, mesurer trois ambiances sonores différentes avec la même séquence de **20 secondes**.
4. Dans la section NOISE / NIOSH, appuyer sur **Mesurer 20 s**. Une fois la mesure achevée, saisir le LAeq de NIOSH et enregistrer. Chaque couple doit inclure la valeur « Pondération A (20 s) » ; sinon le moteur A n'était pas prêt ou le relevé a été interrompu.
5. Après trois couples comparables, NOISE propose une estimation des dB(A) dérivée de la médiane des différences NIOSH − dBFS(A), sur le téléphone utilisé. Vérifier la dispersion et comparer aux voix humaines ; cela ne constitue pas une calibration professionnelle.

La conversion historique (basée sur trois paires avant V5) est conservée en affichage indépendant. Les seuils de déclenchement d'alarme restent exclusivement sur l'indice relatif /100.

**Code utilisé comme référence** : les fréquences des pôles de la pondération A suivent le prototype analogique de l'IEC 61672. L'implémentation locale par sections numériques est indépendante, inspirée de la bibliothèque MIT [audiojs/weighting-a](https://github.com/audiojs/weighting/tree/main/packages/weighting-a). Le filtre est testé à 44,1 et 48 kHz, mais NOISE n'est **pas** un sonomètre certifié ni conforme à l'intégralité des exigences IEC.

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
- Vingt-quatre tests de régression (moteur historique + pondération A) s'exécutent automatiquement via GitHub Actions (`node --test tests/noise.test.cjs tests/a-weighting.test.cjs`).

**Important :** iOS peut interrompre la capture du micro quand l'écran est verrouillé ou quand l'application n'est plus visible. À la reprise, toucher **Démarrer**. Le niveau mesuré n'est pas un sonomètre étalonné.

## Publication
GitHub → Settings → Pages → Build and deployment : **Deploy from a branch** → **main** / **(root)**.
