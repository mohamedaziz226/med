"""Seed script — crée le compte administrateur initial.

Le compte est celui attendu par les workflows n8n et par la connexion frontend.
Identifiants lus depuis l'environnement (MED_N8N_ADMIN_EMAIL / MED_N8N_ADMIN_PASSWORD)
avec valeurs par défaut. Idempotent : ne fait rien si l'email existe déjà.

Usage (dans le conteneur backend ou avec PYTHONPATH=.) :
    python -m app.seed_admin
"""

import logging
import os

from app.core.config import settings
from app.core.constants import UserRole
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)


def seed_admin() -> dict:
    """Crée l'admin initial si absent. Retourne un résumé."""
    email = os.getenv("MED_N8N_ADMIN_EMAIL") or settings.ADMIN_EMAIL
    password = os.getenv("MED_N8N_ADMIN_PASSWORD") or "admin123"
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            logger.info("Admin %s déjà présent, rien à faire.", email)
            return {"created": False, "email": email}

        user = User(
            email=email,
            password_hash=hash_password(password),
            first_name="Admin",
            last_name="MedSecretariat",
            role=UserRole.ADMIN,
            is_active=True,
            is_2fa_enabled=False,
        )
        db.add(user)
        db.commit()
        logger.info("Admin %s créé (mot de passe par défaut admin123, à changer).", email)
        return {"created": True, "email": email}
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = seed_admin()
    print(result)