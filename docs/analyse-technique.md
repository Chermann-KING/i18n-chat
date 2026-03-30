# Analyse technique — i18n-chat

---

## 1. Vue d'ensemble de l'architecture

i18n-chat est un monorepo TypeScript strict organisé avec Turborepo et pnpm workspaces. Il comprend deux applications (`api`, `web`) et quatre packages partagés (`database`, `domain`, `dto`, `config`).

```
i18n-chat/
├── apps/
│   ├── api/          NestJS 11 — REST API + workers BullMQ
│   └── web/          Next.js 15 — interface staff
├── packages/
│   ├── domain/       Énumérations, exceptions, interfaces de port (zéro import infra)
│   ├── dto/          Schémas Zod + types TypeScript déduits
│   ├── database/     Schéma Prisma, migrations, seed
│   └── config/       ESLint et Prettier partagés
├── infra/
│   ├── compose/      Docker Compose on-premise
│   ├── docker/       Dockerfiles api, web, nginx
│   └── k8s/          Manifestes Kubernetes
└── .github/
    └── workflows/    Pipeline CI GitHub Actions
```

Le graphe de dépendances entre packages respecte le principe d'inversion de dépendance : `api` et `web` dépendent de `domain` et `dto` ; `domain` n'a aucune dépendance sur les couches infrastructure.

---

## 2. Choix technologiques

| Domaine              | Choix                                    | Justification                                                                                  |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Monorepo             | Turborepo + pnpm                         | Pipeline de build avec cache incrémental, gestion des dépendances workspace:\*                 |
| API                  | NestJS 11                                | Injection de dépendances, modules, décorateurs — structure adaptée aux principes SOLID         |
| ORM                  | Prisma 6                                 | Schéma-first, migrations versionnées, client type-safe généré                                  |
| Base de données      | PostgreSQL 16                            | JSONB pour les variables, UUID générés par pgcrypto, extension pgcrypto pour gen_random_uuid() |
| Cache / Queue        | Redis 7 + BullMQ 5                       | File de messages fiable avec politique de retry, persistance AOF                               |
| Traduction libre     | LibreTranslate (self-hosted)             | Aucun coût, conforme RGPD, supporte 8 langues                                                  |
| Rendu de templates   | Handlebars.js                            | Pas d'exécution de code, XSS impossible si les variables sont nettoyées                        |
| WhatsApp             | Meta Cloud API (direct)                  | Templates HSM pré-approuvés requis                                                             |
| Hachage mot de passe | argon2                                   | Résistant aux attaques GPU                                                                     |
| Auth                 | JWT access (4h) + refresh (7j, rotation) | Pas de dépendance vendor, rotation des tokens à chaque utilisation                             |
| Chiffrement          | AES-256-GCM                              | Authentifié, format iv:authTag:ciphertext, clé de 256 bits                                     |
| Frontend             | Next.js 15 + React 18                    | App Router, output standalone pour Docker, server components                                   |
| UI                   | Radix UI + Tailwind CSS + shadcn         | Composants accessibles, pas de CSS-in-JS                                                       |
| État global (web)    | Zustand 5                                | Léger, adapté au wizard multi-étapes                                                           |
| Fetching (web)       | TanStack Query 5                         | Cache, invalidation, états de chargement                                                       |
| i18n (web)           | next-intl 3                              | Intégration native App Router, 3 locales (fr, nl, en)                                          |
| Validation           | Zod 3                                    | Schémas partagés entre api et web via le package dto                                           |
| Logging              | Pino + JSON structuré                    | Faible overhead, correlation ID sur chaque requête                                             |
| Build Docker         | Multistage + pnpm deploy                 | Image de production sans devDependencies                                                       |

---

## 3. API NestJS — structure des modules

```
src/
├── main.ts                     Bootstrap, Swagger, Pino, port 3001
├── app.module.ts               Module racine — guards et interceptors globaux
├── common/
│   ├── encryption/             EncryptionService (AES-256-GCM, @Global)
│   ├── filters/                GlobalExceptionFilter
│   ├── guards/                 JwtAuthGuard, RolesGuard, JwtRefreshGuard
│   ├── interceptors/           CorrelationIdInterceptor
│   ├── decorators/             @CurrentUser, @Public, @Roles
│   ├── pipes/                  ZodValidationPipe
│   └── prisma/                 PrismaService, PrismaModule (@Global)
└── modules/
    ├── auth/                   Login, refresh, logout — argon2, JWT, refresh rotation
    ├── user/                   CRUD utilisateurs (admin) + profil propre (me)
    ├── language/               CRUD langues
    ├── recipient/              CRUD destinataires + CSV import + canaux
    ├── template/               CRUD modèles + variables + traductions
    │   └── translation.service TranslationService — résolution Handlebars + fallback
    ├── dispatch/               DispatchService + DispatchRepository
    │   ├── message.repository  MessageRepository — countByDispatch, finalizeDispatch
    │   ├── dispatch.producer   DispatchProducer (BullMQ)
    │   ├── queue.module        Email / SMS / WhatsApp workers
    │   ├── purge.job           Cron RGPD — purge des AnonymousTarget expirés
    │   └── failure-notification.service  Email propriétaire si dispatch FAILED
    ├── channel/
    │   ├── email/              EmailChannel (Nodemailer + SMTP)
    │   ├── sms/                SmsChannel (REST générique)
    │   └── whatsapp/           WhatsAppChannel + WhatsAppTemplateService + webhook controller
    ├── translation/            LibreTranslateService (ITranslationProvider)
    └── audit/                  AuditService — append-only sur audit_logs
```

Providers globaux enregistrés dans `AppModule` :

- `ThrottlerGuard` — 10 req / 60 s par IP (override login : 5 / 15 min)
- `JwtAuthGuard` — protège toutes les routes ; bypass via `@Public()`
- `RolesGuard` — applique `@Roles()` quand présent
- `CorrelationIdInterceptor` — UUID attaché à chaque requête et réponse

---

## 4. Flux de données — création d'un dispatch

```
Client (web)
  |
  | POST /api/v1/dispatches
  v
DispatchController
  | ZodValidationPipe (CreateDispatchSchema)
  v
DispatchService.createDispatch()
  |
  |-- Crée enregistrement Dispatch (statut DRAFT)
  |
  |-- Mode REGISTERED:
  |     RecipientRepository.findManyByIds()
  |     RecipientRepository.findChannelsBatch()
  |     TemplateRepository.findById() (variables)
  |     Pour chaque (recipient x canal):
  |       TranslationService.resolveTranslation() -> body + subject
  |       MessageRepository.create()
  |
  |-- Mode ANONYMOUS:
  |     Pour chaque target:
  |       DispatchRepository.createAnonymousTarget() (contact chiffré)
  |       TranslationService.resolveTranslation() OU LibreTranslateService.translate()
  |       MessageRepository.create()
  |
  |-- DispatchRepository.updateStatus(QUEUED)
  |-- DispatchProducer.enqueueAll() -> Redis (BullMQ)
  |-- AuditService.log('dispatch.created')
  |
  v
TDispatchResponse (id, statut, messageCount)
```

---

## 5. Flux de données — livraison d'un message (workers)

```
Redis (BullMQ queue: email | sms | whatsapp)
  |
  v
EmailWorker / SmsWorker / WhatsAppWorker
  |
  |-- try:
  |     EmailChannel.send() / SmsChannel.send() / WhatsAppChannel.send()
  |     MessageRepository.updateStatus(SENT, providerMessageId, sentAt)
  |
  |-- catch:
  |     MessageRepository.updateStatus(FAILED, errorDetails)
  |
  |-- finally:
  |     MessageRepository.finalizeDispatchIfComplete(dispatchId)
  |       -> si tous TERMINAL et tous FAILED: Dispatch.status = FAILED
  |       -> si tous TERMINAL sinon: Dispatch.status = DONE
  |     FailureNotificationService.notifyOwnerIfNeeded(dispatchId)
  |       -> si dispatch.status === FAILED et user.notifyOnFailure:
  |            EmailChannel.send() vers l'agent propriétaire
```

Politique de retry : 3 tentatives, backoff exponentiel 1 s → 5 s → 30 s.

---

## 6. Résolution d'une traduction

```
TranslationService.resolveTranslation(templateId, languageCode, variables)
  |
  |-- TemplateRepository.findTranslation(templateId, languageCode)
  |     -> Si trouvé : utilise cette traduction
  |     -> Si non trouvé : findTranslation(templateId, fallbackLanguageCode)
  |          -> Si trouvé : utilise la traduction de secours
  |          -> Si non trouvé : lève TemplateTranslationNotFoundException
  |
  |-- renderBody(body, variables):
  |     1. Nettoie les valeurs HTML (stripHtml: replace(/<[^>]*>/g, ''))
  |     2. Compile le template Handlebars (noEscape: true — le nettoyage remplace l'échappement)
  |     3. Retourne le corps rendu
  |
  v
{ body: string, subject?: string }
```

Pour les messages libres (sans modèle), `LibreTranslateService.translate(text, targetLang)` est appelé directement via l'API REST de LibreTranslate.

---

## 7. Sécurité

### 7.1 Authentification et sessions

- Mots de passe hachés avec argon2 (résistant aux attaques GPU)
- Access token JWT (4 heures), Refresh token JWT (7 jours)
- Rotation du refresh token à chaque utilisation : l'ancien token est révoqué, un nouveau est émis
- Les tokens de rafraîchissement sont stockés hachés en base (jamais en clair)
- Limite de tentatives de connexion : 5 requêtes par 15 minutes par IP (ThrottlerModule)

### 7.2 Chiffrement des données au repos

L'`EncryptionService` chiffre les adresses email et numéros de téléphone avant persistance :

- Algorithme : AES-256-GCM (chiffrement authentifié)
- Format stocké : `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
- Clé : variable d'environnement `ENCRYPTION_KEY` (64 caractères hexadécimaux = 256 bits)
- Rétrocompatibilité : si le format ne contient pas trois parties séparées par `:`, la valeur est retournée telle quelle (migration des données existantes)

### 7.3 Protection XSS

Avant le rendu Handlebars, toutes les valeurs de variables passent par `stripHtml(value)` qui supprime les balises HTML (`/<[^>]*>/g`). Handlebars est configuré avec `noEscape: true` car le nettoyage est effectué en amont.

### 7.4 Autorisation

Trois niveaux :

1. `JwtAuthGuard` global : toutes les routes requièrent un JWT valide sauf celles marquées `@Public()`
2. `RolesGuard` : les routes admin sont marquées `@Roles(UserRole.ADMIN)`
3. Routes publiques : `POST /auth/login`, `POST /auth/refresh`, `GET /webhooks/whatsapp`, `POST /webhooks/whatsapp`

### 7.5 RGPD

- Les données de contact des destinataires anonymes sont supprimées après 30 jours par un cron job (`PurgeJob`)
- Les contacts des destinataires enregistrés sont chiffrés en base
- Le journal d'audit est append-only : aucun `UPDATE` ni `DELETE` n'est jamais exécuté sur la table `audit_logs`

---

## 8. Schéma de base de données

### Modèles principaux

| Table                  | Clé primaire      | Description                                        |
| ---------------------- | ----------------- | -------------------------------------------------- |
| languages              | code (VARCHAR 10) | Langues supportées (ISO 639-1)                     |
| users                  | UUID              | Agents staff — rôle ADMIN / SENDER / VIEWER        |
| refresh_tokens         | UUID              | Tokens de rafraîchissement (hachés, TTL 7j)        |
| recipients             | UUID              | Profils de destinataires enregistrés               |
| recipient_channels     | UUID              | Coordonnées de contact chiffrées par canal         |
| templates              | UUID              | Modèles de messages (slug unique)                  |
| template_variables     | UUID              | Variables Handlebars d'un modèle                   |
| template_translations  | UUID              | Corps localisé par langue, métadonnées WhatsApp    |
| dispatches             | UUID              | Opération d'envoi                                  |
| anonymous_targets      | UUID              | Destinataires ad hoc avec TTL RGPD                 |
| dispatch_variable_sets | UUID              | Valeurs des variables par destinataire ou globales |
| messages               | UUID              | Un message par (dispatch, destinataire, canal)     |
| audit_logs             | UUID              | Journal immuable — toutes les mutations            |

### Index

- `recipient_channels(channel)` — filtrage par canal
- `messages(dispatchId, status)` — suivi de l'avancement d'un dispatch
- `messages(status)` — monitoring global
- `anonymous_targets(purgeAt)` — cron de purge RGPD
- `audit_logs(entityId)`, `audit_logs(userId)`, `audit_logs(action)` — requêtes d'audit
- `dispatches(createdById)`, `dispatches(status)` — filtrage de l'historique
- `refresh_tokens(userId)` — révocation des sessions

### Contraintes notables

- `recipient_channels` : unicité sur `(recipientId, channel)` — un contact par canal par destinataire
- `template_variables` : unicité sur `(templateId, key)` — pas de doublon de variable
- `template_translations` : unicité sur `(templateId, languageCode)` — une traduction par langue par modèle
- `templates.slug` : unique global
- UUIDs générés par `gen_random_uuid()` (pgcrypto) directement en base

---

## 9. Application web (Next.js)

### Architecture des pages

```
app/
├── [locale]/
│   ├── (auth)/login/           Page de connexion
│   ├── (app)/
│   │   ├── layout.tsx          Layout authentifié — sidebar + topbar
│   │   ├── dispatches/         Historique des dispatches
│   │   ├── dispatches/new/     Assistant de création de dispatch
│   │   ├── dispatches/[id]/    Détail d'un dispatch et ses messages
│   │   ├── templates/          Gestion des modèles
│   │   ├── recipients/         Gestion des destinataires
│   │   └── settings/           Profil, mot de passe, notifications
│   └── layout.tsx              Providers (next-intl, TanStack Query, theme)
└── api/                        Routes BFF (Backend-For-Frontend)
    ├── auth/                   Proxy vers l'API NestJS, gestion cookies HttpOnly
    ├── templates/[id]/         Traductions, variables
    └── dispatches/             Création, liste
```

### Pattern BFF (Backend-For-Frontend)

Les routes `app/api/` servent d'intermédiaire entre le navigateur et l'API NestJS. Elles :

- Stockent les tokens JWT dans des cookies HttpOnly (inaccessibles au JavaScript client)
- Transmettent les requêtes avec le header `Authorization: Bearer <token>`
- Peuvent renouveler le token de façon transparente avant retransmission

### Gestion d'état

Le wizard de dispatch utilise un store Zustand (`dispatch-wizard.store`) pour conserver l'état entre les quatre étapes : choix du modèle, saisie des variables, sélection des destinataires, récapitulatif.

### Internationalisation

next-intl avec trois locales : `fr` (défaut), `nl`, `en`. Les fichiers de messages sont dans `apps/web/messages/`. La locale est incluse dans le chemin URL (`/fr/dispatches`, `/nl/dispatches`). Le middleware next-intl intercepte toutes les routes sauf `/api/*`.

---

## 10. File de messages (BullMQ)

Trois queues distinctes, une par canal :

| Queue               | Worker         |
| ------------------- | -------------- |
| `email-delivery`    | EmailWorker    |
| `sms-delivery`      | SmsWorker      |
| `whatsapp-delivery` | WhatsAppWorker |

Chaque job contient : `messageId`, `dispatchId`, `contact`, `body`, `subject?`, `languageCode`, et pour WhatsApp : `waTemplateName`, `waTemplateComponents` (valeurs des variables dans l'ordre d'apparition dans le corps).

La finalisation du dispatch (`finalizeDispatchIfComplete`) est déclenchée dans le bloc `finally` de chaque worker après chaque traitement, par une requête `GROUP BY` sur les statuts des messages du dispatch.

---

## 11. Déploiement

### Dockerfiles

Les deux images utilisent un build multistage avec pnpm :

1. `installer` : copie uniquement les fichiers `package.json` (couche cache)
2. `builder` : copie les sources, exécute `pnpm turbo build --filter=<app>...` (Turborepo respecte l'ordre des dépendances)
3. `deployer` (api uniquement) : `pnpm deploy --prod` — crée un dossier autonome avec uniquement les dépendances de production
4. `runner` : image `node:22-alpine` minimale, utilisateur non-root (`nestjs` uid 1001 / `nextjs` uid 1001)

L'image web exploite la sortie `output: 'standalone'` de Next.js, qui embarque le serveur Node.js et un sous-ensemble minimal de `node_modules`.

### Docker Compose (on-premise)

Services inclus :

- `postgres` (postgres:16-alpine) — script d'init pgcrypto au démarrage
- `redis` (redis:7-alpine) — persistance AOF
- `libretranslate` — 8 langues préchargées
- `api` — dépend de postgres, redis et libretranslate (healthchecks)
- `worker` — même image que api, même CMD, sans port exposé
- `web` — dépend de api (healthcheck)
- `nginx` (nginx:1.27-alpine) — profil `production` uniquement, TLS, proxy vers api et web
- `mailpit` — profil `dev` uniquement, intercepte les emails

### Kubernetes

Manifestes dans `infra/k8s/` :

| Composant      | Type Kubernetes          | Réplicas      |
| -------------- | ------------------------ | ------------- |
| postgres       | StatefulSet + PVC 10Gi   | 1             |
| redis          | StatefulSet + PVC 2Gi    | 1             |
| libretranslate | Deployment + PVC 5Gi     | 1             |
| api            | Deployment + HPA         | min 2, max 10 |
| worker         | Deployment + HPA         | min 2, max 10 |
| web            | Deployment + HPA         | min 2, max 8  |
| nginx          | NGINX Ingress Controller | —             |

TLS géré par cert-manager (Let's Encrypt, ClusterIssuer). Anti-affinité pod configurée sur `api` pour répartir les réplicas sur des nœuds distincts.

---

## 12. Pipeline CI/CD

Fichier : `.github/workflows/ci.yml`

Déclencheurs : push sur `main` et `develop`, pull requests vers `main`.

Étapes séquentielles :

| Job        | Outil                  | Artefact produit                         |
| ---------- | ---------------------- | ---------------------------------------- |
| lint       | ESLint (config Airbnb) | —                                        |
| type-check | tsc --noEmit           | —                                        |
| test       | Jest + coverage        | Rapport de couverture (artifact 7 jours) |
| build      | docker buildx          | Images GHCR (push uniquement sur main)   |

Les images Docker sont buildées en multi-plateforme (`linux/amd64`, `linux/arm64`) avec le cache GitHub Actions (GHA cache backend). Tags : `sha-<commit>`, `<branch>`, `latest` (main uniquement).

---

## 13. Conventions de code

- TypeScript strict mode : pas d'`any`, types explicites sur toutes les signatures publiques
- Nommage : `PascalCase` pour les classes/interfaces/types, `camelCase` pour variables et méthodes, `SCREAMING_SNAKE_CASE` pour les constantes
- Taille des fonctions : maximum 20 lignes (principe Clean Code)
- JSDoc obligatoire sur tous les symboles publics
- Pas de `for...of` ni `continue` (ESLint Airbnb `no-restricted-syntax`)
- Validation Zod à chaque entrée API via `ZodValidationPipe`
- Interfaces de port dans `packages/domain` ; les services dépendent des interfaces, pas des implémentations
- Pre-commit hook (Husky + lint-staged) : ESLint --fix + Prettier sur les fichiers stagés
