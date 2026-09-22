---
title: "Lycées : importer un lot d'offres depuis un tableur"
description: "Créer plusieurs dizaines d'offres de mini-stage en une fois, à partir du modèle Excel généré pour votre établissement : télécharger, remplir, analyser, créer."
state: draft
collections: [mini-stages]
---
## Objectif

Créer d'un coup toutes les offres d'une campagne, au lieu de les saisir une par une.

Cet article s'adresse aux **lycées d'accueil** : administrateur d'établissement ou DDF.

Pour créer une seule offre, restez sur le formulaire : voir « 4. Ajouter vos premières offres de mini-stage ».

## Ce qu'il vous faut

- Un compte **Administrateur établissement** ou **DDF, ATDDF, BDE, Personnel de direction**
- Vos **filières** et vos **professeur(e)s** déjà déclarés : c'est d'eux que le modèle tire ses listes déroulantes
- Un tableur capable d'ouvrir un fichier `.xlsx`

---

## 1. Ouvrir « Mes offres »

Cliquez sur **« Mes offres »** dans la barre de gauche.

Dans la carte **« Proposez un mini-stage »**, deux boutons : **« Importer »** et **« Publier »**.

> **Vous ne voyez ni l'un ni l'autre, mais un bouton « Terminer la mise en place » ?** Votre établissement n'est pas encore complètement configuré. Cliquez dessus : la liste des étapes qui restent s'ouvre. Tant qu'elle n'est pas soldée, aucune offre ne peut être créée, à l'unité comme en lot.

## 2. Cliquer sur « Importer »

La fenêtre **« Importer un lot d'offres »** s'ouvre. Elle annonce la règle du fichier : *« Une ligne du tableur = une offre d'un seul jour. Le modèle contient déjà vos filières et vos professeurs en listes déroulantes. »*

## 3. Télécharger le modèle

Cliquez sur **« Télécharger le modèle »**. Vous recevez un fichier `Modele_Import_Offres.xlsx`.

> **Ce modèle est fabriqué pour votre établissement**, au moment où vous cliquez. Vos filières et vos professeur(e)s y sont déjà, en listes déroulantes. Ne réutilisez pas le modèle d'un collègue ni celui de l'an dernier : une équipe qui a changé donne un fichier qui sera refusé ligne par ligne.

---

## Remplir le fichier

Le classeur porte deux feuilles visibles :

| Feuille | À quoi elle sert |
|---|---|
| **Offres** | La seule qui est lue. C'est là que vous saisissez. |
| **Exemple** | Une ligne remplie, pour montrer la forme attendue. Elle n'est **jamais** lue. |

## 4. Saisir une offre par ligne

Dix colonnes, dans cet ordre :

| Colonne | Obligatoire | Remarques |
|---|---|---|
| **Date (JJ/MM/AAAA)** | Oui | Un seul jour par ligne |
| **Heure d'arrivée (HH:MM)** | Oui | |
| **Heure de départ (HH:MM)** | Oui | Postérieure à l'heure d'arrivée |
| **Filière** | Oui | À choisir dans la liste déroulante |
| **Professeur 1** | Voir ci-dessous | À choisir dans la liste déroulante |
| **Professeur 2** | Non | |
| **Professeur 3** | Non | |
| **Salle** | Non | |
| **Places max** | Oui | Un entier supérieur à 0 |
| **Description** | Non | |

> **Un encadrant au minimum, trois au maximum.** Les trois colonnes sont équivalentes : remplir « Professeur 3 » seul suffit, le trou dans l'ordre ne gêne pas. Un même professeur ne peut pas figurer deux fois sur la même ligne.

> **Un mini-stage sur plusieurs jours ne se décrit pas ici.** Une ligne vaut une offre d'un seul jour. Pour une offre qui se répète, le formulaire de création accepte plusieurs dates.

## 5. Respecter la forme du modèle

- **200 lignes au maximum** par fichier. Au-delà, scindez en plusieurs imports.
- **Les colonnes ne se déplacent pas, ne se suppriment pas et ne se renomment pas.** Laissez vides celles qui ne vous servent pas.
- **N'ajoutez aucune colonne** après « Description » : le fichier serait refusé en entier.
- **Ne saisissez pas dans la feuille « Exemple »** : elle n'est pas lue.
- La date doit être suffisamment avancée dans le futur. Le délai est celui que votre établissement a réglé pour la dépublication automatique ; si une ligne est trop proche, l'analyse le dit avec le nombre de jours attendu.

---

## Créer les offres

## 6. Déposer le fichier

Dans la fenêtre d'import, cliquez sur la zone **« Cliquez pour sélectionner un fichier .xlsx »** et choisissez votre fichier.

## 7. Cliquer sur « Analyser le fichier »

Rien n'est créé à cette étape. L'aperçu vous montre :

- le nombre d'**offres** reconnues, sur le nombre de lignes du fichier ;
- le nombre de **places ouvertes** par ce lot, et ce qu'il reste dans votre formule ;
- la liste des **erreurs**, s'il y en a, avec le numéro de ligne et la colonne à corriger.

> **L'import est tout ou rien.** *« Rien ne sera créé tant qu'elles subsistent »* : une seule ligne fautive suspend le lot entier. Corrigez le fichier, puis analysez-le de nouveau.

> **Un message de blocage peut aussi porter sur votre abonnement.** Si votre formule a atteint son nombre d'élèves inscrits, l'ouverture de nouvelles offres est refusée, import compris. Voir « Lycées : ce que votre formule décompte ».

## 8. Choisir de publier ou non

La case **« Publier tout de suite »** est **cochée par défaut** : les offres créées seront immédiatement visibles des collèges.

Décochez-la pour les créer sans les publier, et les relire dans « Mes offres » avant de les rendre visibles.

## 9. Cliquer sur « Créer N offres »

Le bouton porte le nombre d'offres qui seront créées.

> **Laissez la fenêtre ouverte jusqu'au bout.** Sur un gros lot, l'import prend un moment ; la fenêtre reste volontairement ouverte pendant ce temps. Relancer un import déjà en cours créerait chaque offre en double, et rien ne permet ensuite de distinguer les doublons.

---

## Résultat attendu

Un message confirme le nombre d'offres créées, la fenêtre se ferme, et vos offres apparaissent dans **« Mes offres »**. Le compteur de places de l'en-tête se met à jour dans la foulée.

---

## Si le fichier est refusé

| Ce que dit le message | Ce qu'il faut faire |
|---|---|
| Le fichier n'a pas pu être lu | Vérifiez qu'il s'agit bien d'un `.xlsx`, et non d'un `.csv` ou d'un `.ods` |
| Le classeur ne contient aucune feuille « Offres » | La feuille a été renommée ou supprimée : repartez du modèle |
| Une colonne devrait s'intituler autrement | Une colonne a été déplacée, renommée ou supprimée : repartez du modèle |
| Une colonne ne fait pas partie du modèle | Supprimez la colonne ajoutée |
| Filière ou professeur inconnu | Le libellé ne vient pas de la liste déroulante, ou la personne a quitté l'établissement. Téléchargez un modèle à jour |

---

## Besoin d'aide ?

- **Par email :** [support@bacastages.fr](mailto:support@bacastages.fr)
- **Par le chat :** la bulle en bas à droite de votre écran
