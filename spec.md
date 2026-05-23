# CAHIER DES CHARGES — APPLICATION T-SUSSARGUES

## Version modernisée — Next.js / TypeScript / PostgreSQL

---

## 1. Présentation du projet

L’application **T-Sussargues** est une plateforme web interne destinée à la gestion :

- des interventions techniques ;
- des demandes d’achat ;
- des validations hiérarchiques ;
- des notifications email ;
- des utilisateurs ;
- des services municipaux ;
- des catégories et statuts ;
- de l’historique des actions ;
- de l’administration globale de l’application.

L’application sera développée sous forme d’application web moderne avec :

- **Next.js** ;
- **TypeScript** ;
- **Tailwind CSS** ;
- **shadcn/ui** ;
- **PostgreSQL** ;
- **Prisma ORM**.

Le nom recommandé du projet est :

```txt
T-Sussargues
```

Le nom recommandé du dépôt GitHub est :

```txt
t-sussargues
```

Description GitHub recommandée :

```txt
Application web interne pour la gestion des interventions techniques, des demandes d’achat, des validations, des utilisateurs, des services et des notifications email.
```

---

## 2. Objectifs du projet

L’application doit permettre de :

- centraliser les demandes d’intervention technique ;
- centraliser les demandes d’achat ;
- suivre l’état d’avancement des traitements ;
- gérer les validations hiérarchiques ;
- conserver un historique détaillé des actions ;
- envoyer des notifications email paramétrables ;
- administrer les utilisateurs, rôles, services, catégories et statuts ;
- proposer une interface moderne, claire et responsive ;
- préparer les évolutions futures comme les exports, les pièces jointes, les tableaux de bord et les workflows avancés.

---

## 3. Stack technique cible

### 3.1 Frontend

Technologies utilisées :

- **Next.js** ;
- **React** ;
- **TypeScript** ;
- **Tailwind CSS** ;
- **shadcn/ui** ;
- **React Hook Form** ;
- **Zod**.

Utilisation prévue :

- interfaces responsive ;
- formulaires typés ;
- tableaux administrables ;
- modales de confirmation ;
- filtres et recherche ;
- dashboard ;
- composants UI réutilisables.

---

### 3.2 Backend

Le backend sera intégré directement dans l’application Next.js.

Composants backend :

- **Server Actions** pour les mutations simples liées aux formulaires ;
- **Route Handlers** pour les endpoints API spécifiques ;
- **Services métier TypeScript** pour isoler la logique métier ;
- **Prisma ORM** pour l’accès à la base de données ;
- **Zod** pour la validation des données entrantes.

Exemples de services métier :

```txt
intervention.service.ts
purchase-request.service.ts
notification.service.ts
history.service.ts
user.service.ts
permission.service.ts
email.service.ts
```

---

### 3.3 Base de données

Base recommandée :

```txt
PostgreSQL
```

ORM recommandé :

```txt
Prisma ORM
```

Fonctionnalités attendues :

- schéma de base versionné ;
- migrations Prisma ;
- seed initial ;
- relations propres entre les entités ;
- historique des actions ;
- logs d’envoi email ;
- gestion des invitations utilisateur ;
- gestion des rôles et permissions.

---

### 3.4 Authentification

Solution recommandée :

```txt
Auth.js / NextAuth
```

Alternative possible :

```txt
Authentification custom avec sessions sécurisées
```

Fonctionnalités attendues :

- connexion email / mot de passe ;
- mot de passe hashé ;
- sessions sécurisées ;
- déconnexion ;
- reset mot de passe ;
- création de compte par invitation email uniquement ;
- contrôle des rôles ;
- protection des pages privées ;
- redirection automatique si l’utilisateur n’est pas connecté.

---

### 3.5 Email

Solution recommandée :

- SMTP Infomaniak ;
- Nodemailer côté serveur ;
- templates email stockés en base ;
- variables dynamiques ;
- logs d’envoi ;
- emails de test depuis l’administration.

L’application devra pouvoir envoyer des emails pour :

- invitation utilisateur ;
- reset mot de passe ;
- création intervention ;
- affectation intervention ;
- changement de statut ;
- clôture intervention ;
- création demande achat ;
- validation achat ;
- refus achat ;
- demande d’information complémentaire ;
- réception achat.

---

### 3.6 Hébergement

L’ancienne version prévoyait un hébergement mutualisé PHP/MySQL.

La nouvelle version nécessite un environnement compatible avec Next.js et Node.js.

Options possibles :

- hébergement Node.js Infomaniak ;
- VPS Infomaniak ;
- déploiement Docker ;
- autre plateforme compatible Node.js ;
- base PostgreSQL managée ou hébergée sur le même serveur.

L’application devra utiliser des variables d’environnement pour les informations sensibles :

```txt
DATABASE_URL
AUTH_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
APP_URL
```

---

## 4. Architecture applicative

Architecture recommandée :

```txt
Monolithe Next.js modulaire
```

Objectif : garder une application simple à maintenir, sans complexité inutile au démarrage.

Structure possible :

```txt
app/
  login/
  dashboard/
  interventions/
  achats/
  admin/
    users/
    users/invite/
    services/
    categories/
    statuses/
    notifications/
  invitation/[token]/

components/
  ui/
  forms/
  tables/
  layout/
  modals/

lib/
  auth.ts
  prisma.ts
  permissions.ts
  email.ts
  validators.ts
  utils.ts

server/
  actions/
    intervention.actions.ts
    purchase-request.actions.ts
    user.actions.ts
    notification.actions.ts
  services/
    intervention.service.ts
    purchase-request.service.ts
    notification.service.ts
    history.service.ts
    user.service.ts
    permission.service.ts
    invitation.service.ts

prisma/
  schema.prisma
  migrations/
  seed.ts
```

---

## 5. Modules principaux

L’application comprendra les modules suivants :

- authentification ;
- invitation utilisateur par email ;
- tableau de bord ;
- gestion des interventions ;
- gestion des demandes d’achat ;
- gestion des validations ;
- gestion des utilisateurs ;
- gestion des rôles ;
- gestion des services ;
- gestion des catégories ;
- gestion des statuts ;
- notifications email ;
- historique ;
- administration ;
- logs système.

---

## 6. Rôles utilisateurs

Rôles initiaux :

```txt
admin
elu
responsable_service
agent
lecture
```

Description des rôles :

| Rôle | Description |
|---|---|
| admin | Accès complet à l’application et à l’administration |
| elu | Consultation et validation selon configuration |
| responsable_service | Gestion des demandes liées à son service |
| agent | Traitement des interventions assignées |
| lecture | Consultation uniquement |

La gestion des permissions devra être centralisée côté serveur.

Le frontend pourra masquer certaines actions, mais la sécurité réelle devra toujours être appliquée côté serveur.

---

## 7. Authentification

Fonctionnalités :

- connexion email / mot de passe ;
- sessions sécurisées ;
- déconnexion ;
- reset mot de passe ;
- expiration de session ;
- protection des routes privées ;
- contrôle des rôles côté serveur ;
- interface de login moderne ;
- impossibilité de créer un compte librement depuis une page publique.

Sécurité :

- hash des mots de passe avec `argon2id` ou `bcrypt` ;
- cookies sécurisés ;
- protection des actions serveur ;
- limitation des tentatives de connexion ;
- journalisation des connexions sensibles ;
- désactivation possible d’un utilisateur.

---

## 8. Création des utilisateurs par invitation email

La création des comptes utilisateurs se fait uniquement par invitation envoyée par un administrateur.

Il n’y aura pas d’inscription libre.

### 8.1 Création d’une invitation

Depuis l’interface d’administration, un administrateur peut inviter un nouvel utilisateur en renseignant :

- prénom ;
- nom ;
- adresse email ;
- rôle ;
- service de rattachement.

Page recommandée :

```txt
/app/admin/users/invite
```

---

### 8.2 Envoi de l’email d’invitation

Lorsqu’une invitation est créée, l’utilisateur reçoit un email contenant un lien sécurisé lui permettant de définir son mot de passe.

Exemple :

```txt
Bonjour Jean,

Vous avez été invité à rejoindre l’application T-Sussargues.

Cliquez sur le lien suivant pour créer votre mot de passe :
https://t-sussargues.fr/invitation/xxxxxxxx

Ce lien expire dans 7 jours.
```

Le lien d’invitation devra être :

- unique ;
- temporaire ;
- non réutilisable ;
- stocké en base sous forme hashée ;
- expiré automatiquement après une durée configurable.

Durée d’expiration recommandée :

```txt
7 jours
```

---

### 8.3 Finalisation du compte

Lorsque l’utilisateur clique sur le lien, il arrive sur une page :

```txt
/app/invitation/[token]
```

Il doit définir :

- mot de passe ;
- confirmation du mot de passe.

Après validation :

- le mot de passe est hashé ;
- le compte passe en statut `active` ;
- l’invitation passe en statut acceptée ;
- l’utilisateur peut se connecter.

---

### 8.4 Actions administrateur

L’administrateur doit pouvoir :

- créer une invitation ;
- renvoyer une invitation ;
- annuler une invitation ;
- modifier le rôle avant activation ;
- modifier le service avant activation ;
- désactiver un utilisateur actif ;
- consulter les invitations en attente ;
- consulter les invitations expirées.

---

### 8.5 Statuts utilisateur

Statuts recommandés :

```txt
invited   → invitation envoyée, compte non activé
active    → compte actif
disabled  → compte désactivé
```

Statut optionnel :

```txt
expired   → invitation expirée
```

Il est aussi possible de gérer l’expiration uniquement dans la table `user_invitations`.

---

## 9. Gestion des interventions

Fonctionnalités :

- création d’intervention ;
- modification ;
- suppression conditionnelle ;
- affectation à un agent ;
- changement de statut ;
- changement de priorité ;
- rattachement à un service ;
- historique automatique ;
- commentaires internes ;
- suivi par statut ;
- filtres et recherche.

Champs principaux :

- numéro ticket ;
- titre ;
- description ;
- catégorie ;
- priorité ;
- statut ;
- demandeur ;
- agent assigné ;
- service ;
- date de création ;
- date de modification ;
- date de clôture éventuelle.

Priorités possibles :

```txt
basse
normale
haute
urgente
```

---

## 10. Gestion des catégories d’intervention

Fonctionnalités :

- ajout ;
- modification ;
- activation / désactivation ;
- suppression si non utilisée ;
- affichage dans un tableau administrable.

Champs :

- nom ;
- description ;
- actif / inactif ;
- ordre d’affichage ;
- date de création.

---

## 11. Gestion des services

Fonctionnalités :

- ajout ;
- modification ;
- activation / désactivation ;
- suppression si non utilisé ;
- association avec utilisateurs ;
- association avec interventions ;
- association avec demandes d’achat.

Champs :

- nom ;
- description ;
- actif / inactif ;
- responsable du service ;
- date de création.

---

## 12. Gestion des statuts

Fonctionnalités :

- ajout ;
- modification ;
- activation / désactivation ;
- suppression si non utilisé ;
- ordre d’affichage ;
- couleur d’affichage ;
- statut final ou non.

Exemples de statuts intervention :

```txt
nouveau
en cours
en attente
résolu
clôturé
annulé
```

---

## 13. Gestion des utilisateurs

Fonctionnalités :

- invitation par email ;
- modification d’un utilisateur ;
- activation / désactivation ;
- suppression conditionnelle ;
- gestion du rôle ;
- rattachement à un service ;
- réinitialisation du mot de passe ;
- consultation des dernières connexions ;
- consultation du statut du compte.

Champs :

- nom ;
- prénom ;
- email ;
- mot de passe hashé ;
- rôle ;
- service ;
- statut ;
- actif / inactif ;
- date de création ;
- date de dernière connexion.

---

## 14. Historique

Chaque action importante doit être historisée.

Actions à historiser :

- création ;
- modification ;
- suppression ;
- changement de statut ;
- changement de priorité ;
- validation ;
- refus ;
- affectation ;
- commentaire ;
- invitation utilisateur ;
- activation utilisateur ;
- désactivation utilisateur ;
- envoi de notification ;
- reset mot de passe.

Champs recommandés :

- type d’action ;
- entité concernée ;
- identifiant de l’entité ;
- ancien état ;
- nouvel état ;
- utilisateur ayant effectué l’action ;
- date ;
- commentaire éventuel.

---

## 15. Gestion des demandes d’achat

Objectif :

Permettre la création et le suivi des demandes d’achat avec workflow de validation.

Fonctionnalités :

- création en brouillon ;
- soumission ;
- validation ;
- refus ;
- demande d’information complémentaire ;
- passage en commande ;
- réception ;
- clôture ;
- historique ;
- notifications.

Workflow initial :

```txt
brouillon
soumise
en validation
informations demandées
validée
refusée
en commande
réceptionnée
clôturée
```

---

## 16. Données demande d’achat

Champs :

- numéro demande ;
- demandeur ;
- service ;
- titre ;
- description ;
- quantité ;
- budget estimé ;
- fournisseur ;
- priorité ;
- statut ;
- validateur ;
- commentaires de validation ;
- date de création ;
- date de soumission ;
- date de validation ;
- date de refus ;
- date de réception ;
- date de clôture.

---

## 17. Validations

Les responsables doivent pouvoir :

- valider une demande ;
- refuser une demande ;
- commenter ;
- demander des informations complémentaires ;
- consulter l’historique de validation.

Règles possibles :

- un agent peut créer une demande ;
- un responsable de service peut valider les demandes de son service ;
- un élu ou un admin peut valider certaines demandes selon le budget ;
- une demande refusée conserve son historique ;
- une demande clôturée ne peut plus être modifiée sauf par admin.

---

## 18. Notifications email paramétrables

Le système doit permettre de configurer :

- quels événements déclenchent des emails ;
- quels rôles reçoivent les notifications ;
- quels utilisateurs spécifiques reçoivent les emails ;
- le sujet de l’email ;
- le modèle de contenu ;
- l’activation ou désactivation par événement.

Événements initiaux :

- invitation utilisateur ;
- reset mot de passe ;
- création intervention ;
- modification intervention ;
- changement statut intervention ;
- affectation intervention ;
- clôture intervention ;
- création demande achat ;
- soumission demande achat ;
- validation achat ;
- refus achat ;
- demande d’information complémentaire ;
- réception achat.

Destinataires possibles :

- admin ;
- élu ;
- responsable service ;
- agent ;
- demandeur ;
- agent assigné ;
- validateur ;
- utilisateurs du service ;
- utilisateurs spécifiques.

---

## 19. Administration des notifications

Page recommandée :

```txt
/app/admin/notifications
```

Fonctionnalités :

- activer / désactiver une notification ;
- choisir les rôles destinataires ;
- choisir des utilisateurs spécifiques ;
- modifier le sujet email ;
- modifier le modèle email ;
- prévisualiser le rendu ;
- envoyer un email de test ;
- consulter les logs d’envoi.

---

## 20. Variables dynamiques emails

Variables supportées :

```txt
{{ticket_number}}
{{request_number}}
{{titre}}
{{statut}}
{{demandeur}}
{{agent}}
{{service}}
{{url}}
{{date}}
{{priority}}
{{validator}}
{{comment}}
{{invitation_url}}
{{user_first_name}}
{{user_last_name}}
{{user_email}}
```

Le moteur de template devra remplacer ces variables avant l’envoi de l’email.

---

## 21. Sécurité

Mesures obligatoires :

- mots de passe hashés ;
- validation des données côté serveur avec Zod ;
- contrôle des permissions côté serveur ;
- requêtes base de données via Prisma ;
- protection des routes privées ;
- variables d’environnement pour les secrets ;
- SMTP authentifié ;
- journalisation des actions sensibles ;
- protection contre les suppressions incohérentes ;
- logs d’erreurs ;
- sauvegarde régulière de la base ;
- séparation des environnements développement / production ;
- tokens d’invitation stockés sous forme hashée ;
- expiration des liens d’invitation ;
- invalidation des liens déjà utilisés.

Points importants :

- ne jamais faire confiance uniquement au frontend ;
- toutes les actions sensibles doivent vérifier le rôle utilisateur côté serveur ;
- les suppressions doivent être conditionnelles si l’objet est déjà utilisé ;
- préférer la désactivation à la suppression pour les utilisateurs, services, catégories et statuts.

---

## 22. Responsive design

L’application doit être compatible avec :

- ordinateur ;
- tablette ;
- smartphone.

Pages prioritaires en responsive :

- login ;
- invitation utilisateur ;
- dashboard ;
- liste interventions ;
- détail intervention ;
- création intervention ;
- liste demandes achat ;
- détail demande achat ;
- validation ;
- administration simple.

---

## 23. Tables principales

Tables recommandées :

```txt
users
user_invitations
accounts
sessions
roles
services
intervention_categories
intervention_statuses
interventions
intervention_comments
intervention_history
purchase_requests
purchase_request_statuses
purchase_request_history
purchase_request_validations
notification_events
notification_templates
notification_recipients
notification_logs
audit_logs
password_reset_tokens
```

Si Auth.js est utilisé, certaines tables comme `accounts`, `sessions` et `verification_tokens` peuvent suivre le modèle attendu par Auth.js.

---

## 24. Modèle Prisma — première base conceptuelle

Exemple simplifié :

```prisma
model User {
  id              String      @id @default(cuid())
  email           String      @unique
  passwordHash    String?
  firstName       String
  lastName        String
  role            Role
  status          UserStatus  @default(invited)
  isActive        Boolean     @default(false)
  emailVerifiedAt DateTime?
  serviceId       String?
  service         Service?    @relation(fields: [serviceId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model UserInvitation {
  id           String    @id @default(cuid())
  email        String
  tokenHash    String    @unique
  role         Role
  serviceId    String?
  invitedById  String
  expiresAt    DateTime
  acceptedAt   DateTime?
  cancelledAt  DateTime?
  createdAt    DateTime  @default(now())
}

model Service {
  id        String   @id @default(cuid())
  name      String
  isActive  Boolean  @default(true)
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Intervention {
  id            String   @id @default(cuid())
  ticketNumber  String   @unique
  title         String
  description   String
  priority      Priority
  statusId      String
  categoryId    String?
  serviceId     String?
  requesterId   String
  assignedToId  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  closedAt      DateTime?
}

model PurchaseRequest {
  id                String         @id @default(cuid())
  requestNumber     String         @unique
  title             String
  description       String
  quantity          Int?
  estimatedBudget   Decimal?
  supplier          String?
  priority          Priority
  status            PurchaseStatus
  requesterId       String
  serviceId         String?
  validatorId       String?
  validationComment String?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}

model NotificationLog {
  id          String   @id @default(cuid())
  event       String
  recipient   String
  subject     String
  status      String
  errorMessage String?
  createdAt   DateTime @default(now())
}

enum Role {
  admin
  elu
  responsable_service
  agent
  lecture
}

enum UserStatus {
  invited
  active
  disabled
}

enum Priority {
  basse
  normale
  haute
  urgente
}

enum PurchaseStatus {
  brouillon
  soumise
  en_validation
  informations_demandees
  validee
  refusee
  en_commande
  receptionnee
  cloturee
}
```

---

## 25. Tableau de bord

Le dashboard devra afficher :

- nombre d’interventions ouvertes ;
- interventions urgentes ;
- interventions assignées à l’utilisateur ;
- demandes d’achat en attente ;
- validations à traiter ;
- dernières actions ;
- derniers changements de statut.

Pour les administrateurs :

- nombre d’utilisateurs actifs ;
- nombre d’invitations en attente ;
- nombre de services actifs ;
- statistiques globales ;
- logs récents ;
- erreurs d’envoi email.

---

## 26. Recherche et filtres

Les listes devront permettre :

- recherche texte ;
- filtre par statut ;
- filtre par priorité ;
- filtre par service ;
- filtre par agent ;
- filtre par demandeur ;
- filtre par date ;
- tri par date, priorité ou statut.

Pages concernées :

- interventions ;
- demandes d’achat ;
- utilisateurs ;
- invitations ;
- logs ;
- notifications.

---

## 27. Évolutions futures

Évolutions prévues :

- upload de photos pour les interventions ;
- pièces jointes pour les demandes d’achat ;
- génération PDF ;
- export Excel ;
- PWA ;
- gestion fournisseurs ;
- signature électronique ;
- tableaux de bord statistiques ;
- KPI ;
- workflow multi-validation ;
- notifications push ;
- commentaires avec mentions ;
- moteur de recherche avancé ;
- archivage automatique ;
- sauvegarde automatique ;
- version mobile optimisée terrain.

---

## 28. Livrables

Livrables attendus :

- code source Next.js ;
- dépôt GitHub `t-sussargues` ;
- schéma Prisma ;
- migrations Prisma ;
- base PostgreSQL initialisée ;
- seed de données initiales ;
- documentation d’installation ;
- documentation d’utilisation ;
- fichier `.env.example` ;
- guide de déploiement ;
- application opérationnelle ;
- compte admin initial ;
- configuration SMTP ;
- tests de base.

---

## 29. Stack finale recommandée

```txt
Framework       : Next.js App Router
Langage         : TypeScript
UI              : Tailwind CSS + shadcn/ui
Formulaires     : React Hook Form + Zod
Backend         : Server Actions + Route Handlers
Base de données : PostgreSQL
ORM             : Prisma
Auth            : Auth.js ou auth custom avec sessions sécurisées
Emails          : Nodemailer + SMTP Infomaniak
Validation      : Zod
Déploiement     : Infomaniak Node.js / VPS / Docker
Versioning      : Git + GitHub
Repository      : t-sussargues
```

---

## 30. Phases de développement recommandées

### Phase 1 — Socle technique

Objectif : créer la base de l’application.

Tâches :

- initialiser le projet Next.js ;
- configurer TypeScript ;
- configurer Tailwind CSS ;
- installer shadcn/ui ;
- configurer Prisma ;
- configurer PostgreSQL ;
- créer le layout principal ;
- créer la page login ;
- mettre en place l’authentification ;
- mettre en place les rôles et permissions de base.

---

### Phase 2 — Gestion des utilisateurs et invitations

Objectif : gérer proprement l’accès à l’application.

Tâches :

- créer la table utilisateurs ;
- créer la table invitations ;
- créer la page d’invitation admin ;
- envoyer l’email d’invitation ;
- créer la page de finalisation du compte ;
- permettre la définition du mot de passe ;
- activer le compte après acceptation ;
- gérer les utilisateurs actifs, désactivés et invités.

---

### Phase 3 — Interventions

Objectif : permettre la gestion complète des interventions techniques.

Tâches :

- créer les catégories ;
- créer les statuts ;
- créer les services ;
- créer le CRUD intervention ;
- gérer l’affectation ;
- gérer les priorités ;
- gérer l’historique ;
- ajouter les filtres et la recherche.

---

### Phase 4 — Demandes d’achat

Objectif : gérer les demandes d’achat et leur workflow.

Tâches :

- créer le CRUD demande achat ;
- gérer les statuts ;
- gérer la soumission ;
- gérer la validation ;
- gérer le refus ;
- gérer la demande d’information complémentaire ;
- gérer la réception ;
- gérer la clôture ;
- historiser les actions.

---

### Phase 5 — Notifications

Objectif : rendre les emails configurables.

Tâches :

- créer les événements de notification ;
- créer les templates email ;
- gérer les destinataires ;
- gérer les variables dynamiques ;
- envoyer les emails ;
- créer les logs d’envoi ;
- permettre l’envoi d’un email de test.

---

### Phase 6 — Administration avancée et dashboard

Objectif : finaliser l’application pour une utilisation réelle.

Tâches :

- créer le dashboard ;
- ajouter les statistiques ;
- améliorer les filtres ;
- ajouter les logs ;
- ajouter les exports simples ;
- finaliser la documentation ;
- préparer le déploiement production.

---

## 31. Conclusion

La nouvelle version de l’application **T-Sussargues** doit être pensée comme une application web moderne, typée, maintenable et évolutive.

Le remplacement de l’ancienne stack PHP/MySQL par **Next.js + TypeScript + PostgreSQL + Prisma** permet :

- une meilleure maintenabilité ;
- une interface plus moderne ;
- une meilleure séparation entre logique métier et interface ;
- une base de données plus robuste ;
- une meilleure sécurité côté serveur ;
- une évolution plus simple vers des fonctionnalités futures.

Le choix de la création des comptes par **invitation email** est recommandé pour une application interne, car il permet de garder un contrôle strict sur les accès tout en offrant une expérience utilisateur propre et simple.
