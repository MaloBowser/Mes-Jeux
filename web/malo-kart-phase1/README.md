# Malo Kart — Pilotes, véhicules, circuits et boutique

Jeu de kart 3D original, jouable dans un navigateur desktop. Cette version prolonge la Phase 1 avec les choix et la boutique demandés : quatre pilotes, trois véhicules, trois circuits et des pièces à dépenser. Le chemin `web/malo-kart-phase1/` est conservé pour garder les liens existants fonctionnels. L’ancienne version Riviera GP reste séparée dans `../malo-kart.html`.

## Lancer

Ouvrir `index.html` de ce dossier dans un navigateur récent avec WebGL. Aucun compte, installation ou serveur applicatif. Le jeu fonctionne aussi directement en `file://`.

Pour servir le dépôt localement, depuis sa racine :

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8000/web/malo-kart-phase1/`. Arrêter le serveur avec Ctrl+C. Tous les fichiers sont statiques et utilisent des chemins relatifs, compatibles avec une publication de la racine du dépôt sur GitHub Pages. Conserver `web/vendor/`. Aucune publication n’a été effectuée ici.

## Préparer une course

L’accueil propose Jouer, Choix du pilote, Choix du véhicule, Choix du circuit, Boutique et Options. Jouer mène au parcours pilote → véhicule → circuit → départ. Chaque choix apparaît réellement dans la scène 3D et pendant la course ; les portraits sont rendus à partir des mêmes modèles 3D.

- **Malo** : pilote à la casquette bleue.
- **Nova** : pilote aux cheveux violets et au bandeau turquoise.
- **Rocky** : renard orange aux grandes oreilles.
- **Zéphyr** : robot aux yeux lumineux et aux antennes.

Les pilotes sont cosmétiques et restent tous disponibles gratuitement.

| Véhicule | Vitesse maximale | Accélération | Maniabilité | Poids |
| --- | --- | --- | --- | --- |
| Standard | 122,4 km/h | 13 | 1 | 1 |
| Turbo | 147,6 km/h | 11 | 0,84 | 1,4 |
| Compact | 108 km/h | 17 | 1,22 | 0,75 |

Ces valeurs sont utilisées dans la simulation : la maniabilité modifie le braquage, l’accélération et la vitesse modifient la propulsion, le poids influence le freinage et la perte de vitesse lors d’un impact. Les trois châssis ont des proportions différentes. Le choix d’un pilote ne change pas ces valeurs.

Les circuits ont des tracés distincts, un aperçu de leur boucle, une difficulté et une ambiance : **Circuit Azur** en bord de mer, **Forêt Néon** de nuit avec des virages plus serrés, **Désert Turbo** avec cactus et longues portions rapides. Ils sont tous accessibles immédiatement.

## Pièces et boutique

Le portefeuille est limité à **100 pièces au total**. Les pièces dorées sont collectées au contact sur la piste, créditées et sauvegardées immédiatement, même si la course est quittée avant l’arrivée. Chaque pièce n’est récupérable qu’une fois par tour ; elles reviennent au tour suivant et au départ d’une nouvelle course. Un portefeuille plein ne peut plus encaisser de pièces tant qu’un achat n’a pas libéré de place.

| Couleur | Prix |
| --- | --- |
| Couleur du véhicule | Gratuite |
| Corail | 20 pièces |
| Menthe | 35 pièces |
| Violet électrique | 50 pièces |
| Or de champion | 80 pièces |

Cliquer une couleur permet de la prévisualiser sans la payer ni l’équiper. Le bouton Acheter débite les pièces et équipe la couleur. Un achat insuffisamment financé est bloqué ; une couleur déjà acquise peut être équipée gratuitement et ne peut pas être facturée deux fois. Aucun achat en argent réel.

Choix, qualité, solde et couleurs acquises sont sauvegardés sous `malo-kart-garage-v1`, ou `malo.profileData.<profil>.malo-kart-garage-v1` lorsqu’un profil est actif à l’ouverture. Changer de profil dans un autre onglet ne change pas le propriétaire de la partie déjà ouverte. Si le stockage est bloqué, le jeu continue avec une sauvegarde limitée à la session et l’indique dans le menu. C’est une sauvegarde locale modifiable par le propriétaire du navigateur, sans synchronisation entre appareils.

## Conduire

- Flèches ou ZQSD/WASD : accélérer, freiner et tourner.
- Espace + direction en roulant : déraper avec moins d’adhérence.
- Échap ou Ⅱ : pause. Reprendre, recommencer ou retourner à l’accueil depuis la pause.

Départ 3–2–1–GO, deux tours et sept checkpoints à passer dans l’ordre. La ligne ne valide un tour qu’après ces portes et dans le bon sens. Rester immobile, revenir sur la ligne ou sauter des portes ne valide pas un tour. La caméra suit le kart librement déplacé en X/Z. Les barrières limitent la trajectoire et réduisent la vitesse au contact. Perdre le focus ou changer d’onglet met le jeu en pause et libère les touches.

## Fichiers

- `index.html`, `style.css` : accueil, sélections, boutique, options, HUD et arrivée.
- `garage.js` : catalogue, portefeuille, achats, validation et sauvegarde par profil.
- `kart.js` : modèles 3D des pilotes et des véhicules.
- `menus.js` : cartes, aperçus 3D, mini-cartes, statistiques et navigation.
- `circuit.js` : trois tracés originaux et checkpoints.
- `simulation.js` : conduite, différences de véhicules, collisions et tours.
- `scene.js` : décor, thèmes, pièces et caméra.
- `game.js` : clavier, course, collecte, application des choix et qualité.
- `preview.png` : capture réelle du jeu pour l’accueil du dépôt.
- `../../index.html` : lien vers cette version.
- `../../tests/test_malo_kart_phase1.py` et `../../tests/test_malo_kart_garage.py` : vérifications navigateur.

## Vérifications

Depuis la racine du dépôt, avec Python et Microsoft Edge installé :

```powershell
python -m pip install playwright
python tests/test_malo_kart_phase1.py
python tests/test_malo_kart_garage.py
```

Chaque script gère son propre serveur temporaire. Captures dans `.tmp/malo-phase1-checks/` et `.tmp/malo-garage-checks/`.

Les vérifications couvrent commandes simultanées, sens à l’écran, freinage, dérapage, barrières, checkpoints, pause, rejeu, caméra et ouverture locale ; navigation, aperçus distincts, sauvegarde des choix, différences physiques de véhicules ; neuf courses de deux tours (chaque véhicule sur chaque circuit) ; collecte au-delà de dix pièces, plafond de 100, absence de double collecte, achats, solde insuffisant, absence de double débit, persistance après rechargement, isolation des profils et repli sans stockage. Les accès à l’état du jeu utilisés par les tests sont injectés dans la réponse JavaScript de test uniquement.

## Performances, licences et limites

Objectif : 60 FPS sur PC standard, sans garantie pour tous les GPU. Options Automatique, Élevée ou Légère. En automatique, résolution limitée à 1,5 fois la taille CSS et abaissée progressivement jusqu’à 0,75 si la moyenne dépasse 24 ms/image sur quatre secondes ; les ombres sont alors désactivées au facteur 1 ou moins. Le mode léger utilise un facteur 0,8 sans ombres. Les anciens modèles, matériaux, textures et ombres sont libérés lors des changements.

Three.js 0.160.1 est fourni localement sous licence MIT (`../vendor/three.LICENSE.txt`). Son bundle classique affiche un avertissement de dépréciation non bloquant, mais permet l’ouverture en fichier local. Aucun asset Nintendo, musique externe, police distante ou dépendance payante. Les modèles et textures sont générés par le code ; aucune requête externe à l’exécution. Si Three.js ou WebGL manque, un message propose de recharger la page.

Jeu solo pour le moment : les adversaires IA, le classement, les objets offensifs, les sons et le multijoueur ne sont pas encore implémentés. Pas de commandes tactiles ni de marche arrière. Les graphismes restent stylisés et les collisions simplifiées. Les tests ont été exécutés dans Edge/Chromium ; Chrome desktop reste à vérifier sur un poste qui le possède.
