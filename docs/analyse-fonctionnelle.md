# Analyse fonctionnelle — i18n-chat

---

## 1. Perimetre fonctionnel

La plateforme permet a des agents (membres du personnel) de composer un message une seule fois et de le faire delivrer a un ou plusieurs destinataires dans leur langue préférée, via email, SMS ou WhatsApp. La traduction est automatique.

---

## 2. Acteurs et roles

| Role   | Description                        | Permissions specifiques                                                                  |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| ADMIN  | Administrateur de la plateforme    | Gestion des utilisateurs, des modèles, des langues. Acces a toutes les fonctions SENDER. |
| SENDER | Agent pouvant envoyer des messages | Creation de dispatches, gestion des destinataires, acces a l'historique.                 |
| VIEWER | Observateur en lecture seule       | Consultation de l'historique et des messages. Aucune action de modification.             |

Toute action mutante (creation, mise a jour, suppression) est journalisee dans un journal d'audit immuable.

---

## 3. Canaux de livraison

| Canal    | Identifiant technique | Format du contact |
| -------- | --------------------- | ----------------- |
| Email    | EMAIL                 | Adresse email     |
| SMS      | SMS                   | Numero E.164      |
| WhatsApp | WHATSAPP              | Numero E.164      |

Un destinataire peut avoir plusieurs canaux enregistrés. Lors d'un dispatch, l'agent choisit les canaux a utiliser ; un message est cree par combinaison (destinataire x canal).

---

## 4. Modes de dispatch

### 4.1 Mode REGISTERED (destinataires enregistrés)

L'agent selectionne des destinataires depuis la base de données. Chaque destinataire possede une langue préférée. La plateforme choisit automatiquement la traduction du modèle correspondant a cette langue.

Si aucune traduction n'existe pour la langue préférée d'un destinataire, la plateforme applique la langue de secours definie sur le modèle (par defaut : anglais).

### 4.2 Mode ANONYMOUS (destinataires anonymes)

L'agent saisit directement les coordonnées de contact et la langue cible pour chaque destinataire, sans les enregistrer dans la base. Ces données sont chiffrées et supprimees automatiquement apres 30 jours (regle RGPD).

---

## 5. Gestion des modèles

### 5.1 Structure d'un modèle

Un modèle est identifie par un nom, un identifiant machine unique (slug) et une categorie. Il peut contenir des variables (placeholders Handlebars) et une traduction par langue.

Categories disponibles : general, administratif, medical, juridique, ressources humaines, social, communication.

### 5.2 Variables

Chaque variable d'un modèle possede :

- une clé (ex. : `prenom`, `date`, `lieu`) utilisée dans le corps du message sous la forme `{{cle}}`
- un libellé affiché à l'agent lors de la saisie
- un type : TEXTE, NOMBRE, DATE ou HEURE
- une source :
  - MANUAL : l'agent saisit la valeur lors de la creation du dispatch
  - RECIPIENT_FIELD : la valeur est injectee automatiquement depuis le profil du destinataire (prenom ou nom)
- un indicateur d'obligation et une valeur par defaut optionnelle

Les libellés des variables peuvent etre traduits par langue dans chaque traduction du modèle.

### 5.3 Traductions

Chaque traduction contient le corps du message en Handlebars, un sujet optionnel (utilisé uniquement pour l'email), et un nom localise du modèle.

Pour WhatsApp, chaque traduction peut etre liée a un modèle HSM approuvé par Meta, avec son statut d'approbation (NON_SOUMIS, EN_ATTENTE, APPROUVE, REJETE) et son identifiant Meta.

### 5.4 Permissions sur les modèles

| Action                                         | Rôles autorisés       |
| ---------------------------------------------- | --------------------- |
| Consulter                                      | Tous                  |
| Creer, modifier, supprimer                     | ADMIN uniquement      |
| Ajouter / supprimer des variables              | ADMIN uniquement      |
| Ajouter / modifier / supprimer des traductions | Tous les authentifies |

---

## 6. Gestion des destinataires

Un destinataire enregistré possède un prenom, un nom, une langue préférée et un statut actif/inactif. La suppression est une désactivation logique (soft delete).

L'agent peut :

- Créer un destinataire manuellement
- Importer des destinataires en lot via un fichier CSV au format `prenom,nom,codeLangue`
- Ajouter ou supprimer des canaux de contact (email ou numero de téléphone) sur un destinataire

Les coordonnées de contact sont chiffrées en base de données.

---

## 7. Flux de creation d'un dispatch

Le dispatch est crée via un assistant (wizard) en quatre étapes :

**Etape 1 — Choisir un modèle**
L'agent selectionne un modèle parmi la liste disponible. Il peut également saisir un texte libre (sans modèle), auquel cas la traduction est effectuee automatiquement par LibreTranslate.

**Etape 2 — Remplir les variables**
Pour chaque variable de type MANUAL, l'agent saisit la valeur qui sera insérée dans le message. Les variables de type RECIPIENT_FIELD sont renseignées automatiquement et n'apparaissent pas dans ce formulaire.

**Etape 3 — Choisir les destinataires**
En mode REGISTERED : l'agent sélectionne les destinataires depuis la liste. En mode ANONYMOUS : l'agent saisit les coordonnées et la langue cible pour chaque destinataire.

**Etape 4 — Vérifier et envoyer**
Récapitulatif avant soumission. L'agent choisit les canaux de livraison (email, SMS, WhatsApp) et confirme l'envoi.

A la confirmation, le dispatch est crée avec le statut DRAFT puis immediatement mis en file d'attente (QUEUED). Un message est enregistré par combinaison destinataire x canal.

---

## 8. Cycle de vie d'un dispatch

```
DRAFT -> QUEUED -> IN_PROGRESS -> DONE
                              -> FAILED
       -> CANCELLED
```

| Statut      | Signification                                                       |
| ----------- | ------------------------------------------------------------------- |
| DRAFT       | Crée, pas encore en file                                            |
| QUEUED      | En attente de traitement par les workers                            |
| IN_PROGRESS | Au moins un message en cours de livraison                           |
| DONE        | Tous les messages ont atteint un état terminal (au moins un succès) |
| FAILED      | Tous les messages ont échoué                                        |
| CANCELLED   | Annulé par un agent avant livraison complète                        |

Un dispatch peut etre annulé uniquement lorsqu'il est en statut DRAFT ou QUEUED. Les messages déjà envoyés ne sont pas rappelés.

Lorsque tous les messages d'un dispatch échouent, le proprietaire du dispatch recoit un email de notification si sa préférence `notifyOnFailure` est activee.

---

## 9. Cycle de vie d'un message

| Statut    | Signification                                       |
| --------- | --------------------------------------------------- |
| PENDING   | En attente de traitement                            |
| SENT      | Transmis au fournisseur de canal                    |
| DELIVERED | Confirmation de livraison recue du fournisseur      |
| FAILED    | Echec après toutes les tentatives de réentrainement |

Chaque message est tenté jusqu'a 3 fois avec un backoff exponentiel (1 s, 5 s, 30 s) en cas d'echec transitoire.

---

## 10. Historique des dispatches

L'agent peut :

- Consulter la liste paginée de tous les dispatches avec filtrage par statut et mode
- Voir le détail d'un dispatch et l'état de chaque message individuel
- Exporter la liste en CSV (compatible Excel, avec BOM UTF-8)

---

## 11. Gestion du compte personnel

Tout utilisateur authentifie peut :

- Consulter et modifier son profil (prenom, nom, langue d'interface)
- Changer son mot de passe (requiert le mot de passe actuel)
- Activer ou désactiver la notification par email en cas d'échec d'un dispatch

---

## 12. Regles metier structurantes

| Regle                   | Detail                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Limite de destinataires | Un dispatch ne peut cibler plus de 10 000 destinataires                                                                                     |
| Langue de secours       | Si aucune traduction n'existe pour la langue préférée d'un destinataire, la langue de secours du modèle est utilisée (par defaut : anglais) |
| Unicité de canal        | Un destinataire ne peut avoir qu'un seul contact par type de canal (une seule adresse email, un seul numero SMS, un seul numero WhatsApp)   |
| Unicité du slug         | Chaque modèle possède un identifiant machine unique dans le systeme                                                                         |
| Suppression logique     | Les destinataires et les modèles sont désactives, pas supprimés physiquement                                                                |
| TTL anonyme             | Les données des destinataires anonymes sont supprimées apres 30 jours                                                                       |
| Audit                   | Toute création, modification ou suppression produit une entrée dans le journal d'audit. Ce journal ne peut pas etre modifié ni supprimé     |
| Modèles WhatsApp        | L'envoi via WhatsApp requiert un modèle HSM prealablement approuvé par Meta. Le statut d'approbation est synchronise via webhook            |
| Annulation              | Un dispatch ne peut être annulé qu'en statut DRAFT ou QUEUED                                                                                |

---

## 13. Interface multilingue

L'interface web est disponible en francais, neerlandais et anglais. La langue de l'interface est independante des langues de traduction des messages : un agent dont l'interface est en neerlandais peut envoyer des messages traduits en arabe, roumain ou polonais.

Les langues de traduction supportées pour les messages sont : arabe, anglais, espagnol, francais, néerlandais, polonais, roumain, turc.
