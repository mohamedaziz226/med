"""Fuseau horaire métier du cabinet : Africa/Tunis (UTC+1, pas d'heure d'été).

Convention du projet :
  - La base stocke des instants exacts (PostgreSQL ``timestamptz``, valeurs UTC).
  - Toute heure saisie SANS fuseau explicite (formulaire secrétaire, datetime-local,
    payloads historiques) représente l'heure MÉTIER locale du cabinet en
    Africa/Tunis et est convertie vers UTC à la source (backend).
  - Tout affichage / toute comparaison contre des fenêtres horaires métier
    (disponibilités hebdo, blocages) convertit l'instant UTC vers l'heure
    murale Africa/Tunis via :func:`to_business_naive`.

Côté client, ``frontend/src/utils/timezone.js`` applique la même convention afin
que « 10:00 saisi » reste « 10:00 affiché », quel que soit le navigateur.
"""

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

BUSINESS_TZ = ZoneInfo("Africa/Tunis")
UTC = timezone.utc


def normalize_to_utc(value: datetime | None) -> datetime | None:
    """Normalise un datetime entrant en instant UTC exact.

    - naïf  → interprété comme heure métier Africa/Tunis puis converti en UTC ;
    - conscient → converti tel quel vers UTC (quelle que soit son origine).
    """
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=BUSINESS_TZ).astimezone(UTC)
    return value.astimezone(UTC)


def to_business_naive(value: datetime | None) -> datetime | None:
    """Convertit un datetime en heure murale métier (Africa/Tunis) sans fuseau.

    Les valeurs naïves sortant de la base représentent déjà l'heure UTC
    (convention du projet) : elles sont traitées comme telles.
    """
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(BUSINESS_TZ).replace(tzinfo=None)


def business_now_naive() -> datetime:
    """« Maintenant » en heure murale métier (Africa/Tunis), sans fuseau."""
    return datetime.now(UTC).astimezone(BUSINESS_TZ).replace(tzinfo=None)


def combine_business(day: date, moment: time) -> datetime:
    """Construit un datetime naïf métier (heure murale Africa/Tunis)."""
    return datetime.combine(day, moment)


def business_to_utc(value: datetime) -> datetime:
    """Reconvertit une heure murale métier naïve en instant UTC conscient."""
    return value.replace(tzinfo=BUSINESS_TZ).astimezone(UTC)