# Malo Kart — Grand Prix

Jeu de kart 3D pour navigateur desktop, avec des menus inspirés de Mario Kart 8 Deluxe. Affronte cinq adversaires sur deux tours, ramasse deux objets et charge un mini-turbo en dérapant. Le garage propose seize pilotes, trois châssis, trois types de roues, trois ailes, trois circuits et des pièces à dépenser. Le chemin `web/malo-kart-phase1/` est conservé pour garder les liens existants fonctionnels. L’ancienne version Riviera GP reste séparée dans `../malo-kart.html`.

## Lancer

Ouvrir `index.html` de ce dossier dans un navigateur récent avec WebGL. Aucun compte, installation ou serveur applicatif. Le jeu fonctionne aussi directement en `file://`.

Pour servir le dépôt localement, depuis sa racine :

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8000/web/malo-kart-phase1/`. Arrêter le serveur avec Ctrl+C. Tous les fichiers sont statiques et utilisent des chemins relatifs, compatibles avec une publication de la racine du dépôt sur GitHub Pages. Conserver `web/vendor/`. Aucune publication n’a été effectuée ici.

## Préparer une course

L’accueil propose Jouer, Choix du pilote, Choix du véhicule, Choix du circuit, Boutique et Options. Jouer mène au parcours pilote → véhicule → circuit → départ. Les menus présentent une grille de personnages sur fond cyan, un kart sur podium, une sélection jaune et une barre de confirmation. Le bouton Retour remonte d’une étape. Chaque choix apparaît réellement dans la scène 3D et pendant la course.

Mario, Luigi, Peach, Daisy, Yoshi, Toad, Koopa, Maskass, Bowser, Wario, Waluigi et Harmonie rejoignent les quatre pilotes d’origine. Leurs portraits proviennent du site officiel Nintendo ; leurs modèles 3D sont des interprétations simplifiées générées par le code. Les portraits des pilotes d’origine sont rendus à partir de leurs modèles :

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

Le garage affiche trois colonnes indépendantes : **Kart**, **Roues**, **Aile**, soit 27 combinaisons. Chaque colonne conserve son choix lorsque l’on modifie une autre pièce. Les vignettes sont rendues à partir des pièces 3D. Les statistiques affichées correspondent au châssis équipé des pneus choisis :

| Roues | Vitesse | Accélération | Maniabilité | Poids |
| --- | --- | --- | --- | --- |
| Standard | inchangée | inchangée | inchangée | inchangé |
| Roller rouges | −7,2 km/h | +2 | +0,10 | −0,10 |
| Cyber violettes | +7,2 km/h | −1 | −0,07 | +0,15 |

Les ailes **Delta**, **Fleur** et **Nuage** sont cosmétiques : elles se déploient dans l’aperçu du garage et restent repliées sur le kart en course. Les circuits actuels ne comportent pas de sections de vol. Roues et ailes sont sauvegardées avec le reste du garage ; une ancienne sauvegarde sans ces champs reçoit les roues Standard et l’aile Delta sans perdre ses achats.

Les circuits ont des tracés distincts, un aperçu 3D de leur piste, une difficulté et une ambiance : **Circuit Azur** en bord de mer, **Forêt Néon** de nuit avec des virages plus serrés, **Désert Turbo** avec cactus et longues portions rapides. Leurs vignettes sont rendues à partir des scènes réellement jouables. Ils sont tous accessibles immédiatement.

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
- Maintenir le dérapage au moins 0,8 seconde, puis relâcher : mini-turbo. À partir de 1,6 seconde, le turbo dure plus longtemps.
- E, Maj ou bouton de l’objet : utiliser le premier objet ; l’objet en réserve prend automatiquement sa place.
- Échap ou Ⅱ : pause. Reprendre, recommencer ou retourner à l’accueil depuis la pause.

Départ 3–2–1–GO, deux tours et sept checkpoints à passer dans l’ordre. La ligne ne valide un tour qu’après ces portes et dans le bon sens. Rester immobile, revenir sur la ligne ou sauter des portes ne valide pas un tour. La caméra suit le kart librement déplacé en X/Z. Les barrières limitent la trajectoire et réduisent la vitesse au contact. Perdre le focus ou changer d’onglet met le jeu en pause et libère les touches.

## Adversaires et objets

Cinq rivaux suivent des trajectoires décalées, ralentissent dans les virages et utilisent les mêmes objets que toi. Les contacts entre ton kart et un rival ralentissent les deux véhicules. Le classement suit la progression sur les deux tours et conserve l’ordre des pilotes ayant franchi l’arrivée. À ton arrivée, la course s’arrête : les rivaux restants sont classés selon leur progression et portent la mention « En piste ». La mini-carte affiche tous les karts ; le tien est jaune.

Traverse une boîte bleue « ? » avec un emplacement d’objet vide. Chaque boîte revient après quatre secondes. Tu peux conserver deux objets à la fois, utilisés dans l’ordre du ramassage : un objet prêt à utiliser et un en réserve, tous deux affichés à l’écran. Si les deux emplacements sont pleins, la boîte reste sur la piste. Les adversaires disposent aussi de deux emplacements ; les pilotes dans la seconde moitié du classement ont davantage de chances d’obtenir un turbo.

| Objet | Effet |
| --- | --- |
| Turbo | Accélération et vitesse maximale augmentées pendant 2 secondes. |
| Orbe | Poursuit le rival le plus proche devant toi à moins de 100 mètres. Sans cible, l’objet est conservé. |
| Bouclier | Absorbe une attaque ; expire après 6 secondes. |
| Piège | Obstacle posé derrière le kart ; disparaît après un impact ou 14 secondes. Son propriétaire est immunisé. |

Une attaque ralentit le kart pendant une seconde, avec deux secondes de protection contre les attaques successives. Le temps, les rivaux, les objets et leurs effets sont figés en pause. Recommencer remet la course et les objets à zéro, sans effacer le garage ni les pièces déjà sauvegardées.

## Sons

Le moteur monte dans les tours avec la vitesse. Le départ, les pièces, les objets, les impacts et l’arrivée ont leurs effets sonores, synthétisés localement sans téléchargement. Le son démarre après le clic sur « Prendre le départ ». La pause, le retour au menu et la perte de focus coupent le son. La case « Activer les sons » dans les options permet de le désactiver pour la session. Si Web Audio est indisponible, le jeu reste jouable silencieusement.

## Fichiers

- `index.html`, `style.css` : accueil, sélections, boutique, options, HUD et arrivée.
- `garage.js` : catalogue, portefeuille, achats, validation et sauvegarde par profil.
- `kart.js` : modèles 3D des pilotes et des véhicules.
- `menus.js`, `menu.css` : grille de personnages, aperçus de circuits, statistiques et navigation des nouveaux menus.
- `guest-drivers.js` : modèles 3D simplifiés des douze personnages ajoutés.
- `assets/portraits/` : portraits et [sources des images](assets/portraits/SOURCES.md) ; `assets/menu-pattern.svg` : motifs dessinés pour les menus.
- `circuit.js` : trois tracés originaux et checkpoints.
- `simulation.js` : conduite, différences de véhicules, collisions et tours.
- `race.js` : adversaires, classement, boîtes à objets, attaques et effets.
- `race-view.js` : karts adverses, objets en 3D, boucliers et mini-carte.
- `audio.js` : moteur et effets sonores synthétisés avec Web Audio.
- `scene.js` : décor, thèmes, pièces et caméra.
- `game.js` : clavier, course, collecte, application des choix et qualité.
- `preview.png` : capture réelle du jeu pour l’accueil du dépôt.
- `../../index.html` : lien vers cette version.
- `../../tests/test_malo_kart_phase1.py` et `../../tests/test_malo_kart_garage.py` : vérifications navigateur.
- `../../tests/test_malo_kart_race.py` : courses avec adversaires, deux emplacements d’objets, classement, mini-turbo, signal audio et coupure du son.

## Vérifications

Depuis la racine du dépôt, avec Python et Microsoft Edge installé :

```powershell
python -m pip install playwright
python tests/test_malo_kart_phase1.py
python tests/test_malo_kart_garage.py
python tests/test_malo_kart_race.py
```

Chaque script gère son propre serveur temporaire. Captures dans `.tmp/malo-phase1-checks/`, `.tmp/malo-garage-checks/` et `.tmp/malo-race-checks/`.

Les vérifications couvrent commandes simultanées, sens à l’écran, freinage, dérapage, barrières, checkpoints, pause, rejeu, caméra et ouverture locale ; navigation, aperçus distincts, sauvegarde des choix, différences physiques de véhicules ; les 27 assemblages du garage, l’accélération avec chaque type de pneus, l’ouverture et le repli des ailes, les anciennes sauvegardes et les identifiants de pièces invalides ; neuf courses de deux tours (chaque véhicule sur chaque circuit) ; collecte au-delà de dix pièces, plafond de 100, absence de double collecte, achats, solde insuffisant, absence de double débit, persistance après rechargement, isolation des profils et repli sans stockage. Les accès à l’état du jeu utilisés par les tests sont injectés dans la réponse JavaScript de test uniquement.

## Performances, licences et limites

Objectif : 60 FPS sur PC standard, sans garantie pour tous les GPU. Options Automatique, Élevée ou Légère. En automatique, résolution limitée à 1,5 fois la taille CSS et abaissée progressivement jusqu’à 0,75 si la moyenne dépasse 24 ms/image sur quatre secondes ; les ombres sont alors désactivées au facteur 1 ou moins. Le mode léger utilise un facteur 0,8 sans ombres. Les anciens modèles, matériaux, textures et ombres sont libérés lors des changements.

Three.js 0.160.1 est fourni localement sous licence MIT (`../vendor/three.LICENSE.txt`). Son bundle classique affiche un avertissement de dépréciation non bloquant, mais permet l’ouverture en fichier local. Les douze portraits de personnages sont © Nintendo et proviennent de la [page officielle de Mario Kart 8 Deluxe](https://www.nintendo.com/au/games/nintendo-switch/mario-kart-8-deluxe/) ; les liens individuels sont conservés dans `assets/portraits/SOURCES.md`. Ils ne sont pas sous la licence MIT du moteur. Les modèles 3D et les motifs du menu sont générés localement. Aucune requête externe à l’exécution, musique externe, police distante ou dépendance payante. Si Three.js ou WebGL manque, un message propose de recharger la page.

Jeu solo contre cinq adversaires automatisés ; pas de multijoueur ni de musique. Pas de commandes tactiles ni de marche arrière. Les graphismes restent stylisés et les collisions simplifiées ; les adversaires suivent le tracé avec une conduite simplifiée. Cette version n’est pas le jeu officiel : elle ne reproduit pas ses modèles détaillés, ses circuits, l’antigravité ou le vol. Les tests ont été exécutés dans Edge/Chromium ; Chrome desktop reste à vérifier sur un poste qui le possède.
