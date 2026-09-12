# Malo Kart — Riviera GP

Jeu de kart 3D solo contre sept pilotes, inspiré des courses de kart arcade. Circuit côtier original, trois tours, dérapages avec mini-turbo, pistes turbo, quatre objets, classement et records locaux.

Ouvrir `malo-kart.html` dans un navigateur récent avec WebGL, ou cliquer sur **Malo Kart — Riviera GP** depuis l’accueil. Tous les fichiers nécessaires sont locaux ; aucune installation ni connexion n’est nécessaire pour jouer une fois le dossier téléchargé.

- **ZQSD, WASD ou flèches** : accélérer, freiner, tourner.
- **Maj ou Espace + direction** : déraper. Relâcher après 0,75 s pour un mini-turbo, après 2 s pour un super-turbo.
- **E ou Entrée** : utiliser un objet. Un missile vise le prochain adversaire dans une portée de 210 mètres ; sans cible, il est perdu.
- **R** : replacer le kart au centre de la piste, avec perte de vitesse.
- **C** : changer de caméra.
- **Échap ou P** : pause. La course se met aussi en pause quand la fenêtre perd le focus.
- Écran tactile : commandes affichées automatiquement ; toucher l’objet pour l’utiliser.

Les niveaux modifient la vitesse des adversaires. Les records personnels, tous niveaux confondus, sont enregistrés dans le stockage local du navigateur quand il est disponible. Le classement final fige les positions à l’arrivée du joueur ; les concurrents encore en piste affichent leur retard en mètres.

Le jeu utilise une conduite arcade avec inertie latérale et collisions avec les rails, sur un parcours fermé. Il ne s’agit pas d’une simulation automobile. Les décors, les karts, les textures et les sons sont générés par le jeu. Le mode son s’active avec le bouton en haut à droite.

Moteur : [Three.js 0.160.1](https://github.com/mrdoob/three.js/tree/r160), distribué localement sous licence MIT dans `vendor/three.LICENSE.txt`. Le bundle classique permet aussi l’ouverture directe depuis un fichier ; sa console signale sa dépréciation au profit des modules JavaScript.

Pour servir le site localement, depuis la racine : `python -m http.server 8000`, puis ouvrir `http://localhost:8000/web/malo-kart.html`.

## Vérifications automatiques

Les scripts `tests/test_malo_kart.py` et `tests/test_malo_kart_edges.py` utilisent Python, Playwright (`python -m pip install playwright`) et Microsoft Edge installé. Démarrer le serveur local sur le port 8000, puis exécuter les deux scripts depuis la racine du dépôt. Les captures sont écrites dans `.tmp/kart-checks`.

Ils contrôlent une course complète, le classement, les records, la direction, les deux niveaux de turbo de dérapage, les quatre objets, les collisions, les pistes turbo, le freinage, les niveaux des adversaires, la pause, le redémarrage, le tactile, le mode fichier local et les erreurs de stockage ou de contexte graphique. L’accès à l’état de simulation est injecté uniquement dans la réponse JavaScript du navigateur de test.
