# MedSecretariat — Backend

API backend pour la gestion d'un cabinet médical : rendez-vous, dossiers patients, documents médicaux, facturation, messagerie interne et notifications, avec authentification à deux facteurs (OTP email).

## Stack technique

| Composant | Techno |
|---|---|
| Framework API | FastAPI (Python 3.11) |
| ORM / migrations | SQLAlchemy 2.0 + Alembic |
| Base de données | PostgreSQL 15 |
| Stockage fichiers | MinIO (S3-compatible) |
| Cache / files d'attente | Redis |


## Architecture

Architecture en 3 couches, strictement respectée dans tout le projet :

```
app/api/v1/        → Routers FastAPI (validation d'entrée, appel des services)
app/api/websocket/  → Notifications temps réel
app/services/       → Logique métier, RBAC, orchestration
app/models/          → Modèles SQLAlchemy (ORM)
app/schemas/         → Schémas Pydantic (validation entrée/sortie)
app/core/             → Config, sécurité JWT, permissions, rate limiting, exceptions
app/database/         → Session SQLAlchemy, base déclarative
app/tasks/            → Jobs planifiés (rappels, nettoyage)
app/templates/        → Templates HTML (factures PDF)
app/utils/            → Templates email/SMS
```

Un client (web/mobile) appelle les routers, qui délèguent toute la logique aux services ; les services manipulent les modèles ORM persistés dans PostgreSQL, et s'appuient sur MinIO, Redis, n8n, SMTP/Twilio pour tout ce qui sort du périmètre base de données.

## Fonctionnalités

- **Authentification** — inscription, connexion JWT (access + refresh), profil courant.
- **Double authentification (2FA) par email** — activation/désactivation avec confirmation par mot de passe + OTP, connexion en 2 étapes (mot de passe → code à usage unique envoyé par email, valable 10 min).
- **Rendez-vous** — création avec détection de chevauchement de créneaux, confirmation par le patient, synchronisation vers Google Calendar via n8n, notification temps réel des secrétaires.
- **Documents médicaux** — upload vers MinIO, workflow de validation/rejet, URLs de téléchargement pré-signées.
- **Paiements & facturation** — création, paiement partiel/total, génération de facture PDF stockée dans MinIO et envoyée par email.
- **Messagerie interne** — conversations entre utilisateurs, marquage lu/non lu.
- **Notifications temps réel** — WebSocket par utilisateur.
- **Chatbot** — endpoint de question/réponse (implémentation actuelle : réponse fixe, à connecter à un vrai modèle).
- **Tâches planifiées** — rappels de RDV (J-7 et J-1, indépendants), relances de paiement en retard hebdomadaires, nettoyage mensuel des documents orphelins.
- **RBAC** — 4 rôles (`admin`, `doctor`, `secretary`, `patient`), scoping systématique par cabinet (`doctor_id`).
- **Rate limiting** — protection anti-brute-force sur la connexion par mot de passe.

## Démarrage rapide

```bash
cp .env.example .env
docker compose up --build
```

L'API est ensuite disponible sur `http://localhost:8080`, avec la documentation interactive sur `http://localhost:8080/docs`.

