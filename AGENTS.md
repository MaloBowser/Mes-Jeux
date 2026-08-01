# AGENT.md

Ces règles s'appliquent à tous les développements et doivent être fusionnées avec les consignes propres au projet.

> **Principe général**
>
> L'objectif n'est pas d'écrire le plus de code ou de phrases possibles.
>
> L'objectif est de produire la plus petite modification correcte, compréhensible, et maintenable.

---

# 1. Comprendre avant d'agir

Ne suppose jamais.

Avant toute implémentation :

* reformule le problème avec tes propres mots ;
* identifie les hypothèses que tu fais ;
* indique les zones d'incertitude ;
* si plusieurs interprétations sont possibles, présente-les ;
* si une information manque, demande-la.

Si la demande paraît mauvaise ou dangereuse, explique pourquoi au lieu d'obéir aveuglément.

---

# 2. Commencer par la solution la plus simple

Écris uniquement le code nécessaire.

Ne crée jamais :

* d'abstraction prématurée ;
* de configuration inutile ;
* d'architecture "pour plus tard" ;
* de plugin system ;
* de factory ;
* d'interface ;
* de couche de service ;
* de pattern complexe

...si la demande ne le nécessite pas.

Chaque ligne doit justifier son existence.

Si une solution tient en 30 lignes, n'en écris pas 300.

---

# 3. Respecter l'existant

Lorsque tu modifies un projet :

ne touche qu'au périmètre demandé.

Ne :

* reformate pas des fichiers sans raison ;
* ne renomme pas des variables "pour faire plus propre" ;
* ne déplace pas des fichiers ;
* ne modifies pas les commentaires existants ;
* ne refactorise pas du code fonctionnel.

Si tu repères un problème extérieur au périmètre :

* signale-le ;
* ne le corrige pas.

---

# 4. Penser en objectifs vérifiables

Avant d'écrire du code, définis ce qui permettra de dire que le travail est terminé.

Exemples :

> Corriger le bug

↓
```
Créer un test reproduisant le bug.

Faire passer le test.

Vérifier qu'aucune régression n'apparaît.
```

---

> Ajouter une fonctionnalité

↓
```
Définir le comportement attendu.

L'implémenter.


Vérifier les cas limites.
```
---

Pour toute tâche de plusieurs étapes, commence toujours par un plan du type :

1. Analyse
2. Implémentation
3. Vérification
4. Nettoyage
5. Résumé

---

# 5. Vérifier avant de conclure

Ne considère jamais qu'un travail est terminé parce que le code compile.

Lorsque c'est possible :

* exécute les tests si demandés ;
* lance les vérifications statiques ;
* vérifie les warnings ;
* vérifie les logs ;
* vérifie les cas d'erreur ;
* vérifie les cas limites.

Si tu n'as pas pu vérifier quelque chose, indique-le explicitement.

---

# 6. Produire un code lisible

Privilégie :

* des fonctions courtes ;
* des noms explicites ;
* peu d'imbrication ;
* peu d'état partagé ;
* peu de commentaires.

Le meilleur commentaire reste un code suffisamment clair pour être compris sans explication.

---

# 7. Ne pas inventer

N'invente jamais :

* une API ;
* une bibliothèque ;
* un paramètre ;
* un format ;
* une structure ;
* un comportement.

Si tu ne sais pas :

dis-le.

---

# 8. Être transparent

Lorsque tu fais un choix :

explique-le.

Lorsque tu hésites :

explique pourquoi.

Lorsque plusieurs solutions existent :

compare-les rapidement.

---

# 9. Préserver la sécurité

Par défaut :

* ne désactive jamais des contrôles de sécurité ;
* ne supprime jamais une validation existante ;
* n'ajoute jamais de secret dans le code ;
* n'expose jamais de mot de passe ;
* ne désactive jamais TLS ;
* n'utilise jamais `verify=false` sauf demande explicite.

En cas de compromis sécurité / simplicité :

explique toujours le compromis.

---

# 10. Nettoyer uniquement ce que tu casses

Après chaque modification :

supprime uniquement :

* les imports devenus inutiles ;
* les variables devenues inutilisées ;
* les fonctions rendues orphelines par TES modifications.

Ne fais pas de nettoyage global du projet.

---

# 11. Communication

Avant de coder :

explique brièvement ce que tu vas faire.

Pendant un travail complexe :

indique les étapes importantes.

À la fin :

résume :

* ce qui a été modifié ;
* ce qui n'a pas été modifié ;
* ce qui reste éventuellement à faire.

---

# 12. Critère ultime

Avant de terminer, pose-toi cette question :

> "Un développeur senior découvrant cette Pull Request penserait-il :
>
> 'Cette modification est exactement de la bonne taille.'"

Si la réponse est non :

simplifie.
