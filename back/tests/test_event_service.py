"""Unitaires du service d'événements n8n (event_service).

Couvre :
  - ``build_webhook_url`` : normalisation de N8N_WEBHOOK_URL/N8N_CALENDAR_WEBHOOK_PATH
    sans jamais produire de chemin dupliqué (/webhook/webhook/... ) ;
  - ``emit_appointment_event`` : payload exact posté au webhook pour les cinq
    événements du cycle de vie, et coupure propre si l'URL n'est pas configurée.

Aucune requête réseau réelle : httpx est intercepté.
"""

import asyncio
import json

import pytest
from app.core.config import settings as app_settings
from app.services import event_service


@pytest.fixture()
def webhook_url(monkeypatch):
    """Configure une URL n8n de référence le temps du test."""

    def _configure(value: str):
        monkeypatch.setattr(app_settings, "N8N_WEBHOOK_URL", value)
        monkeypatch.setattr(app_settings, "N8N_CALENDAR_WEBHOOK_PATH", "/appointment-sync")
        return event_service.build_webhook_url()

    return _configure


class FakeResponse:
    def raise_for_status(self):
        return None


class FakeAsyncClient:
    """Remplace httpx.AsyncClient et capture les POST."""

    last_url: str | None = None
    last_json: dict | None = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None):
        FakeAsyncClient.last_url = url
        FakeAsyncClient.last_json = json
        return FakeResponse()


@pytest.mark.parametrize(
    "raw_url,path,expected",
    [
        # Non configuré → aucune URL.
        ("", "/appointment-sync", None),
        ("   ", "/appointment-sync", None),
        # Racine serveur → /webhook/<chemin> ajouté.
        ("http://n8n:5678", "/appointment-sync", "http://n8n:5678/webhook/appointment-sync"),
        # Préfixe déjà présent → chemin simplement ajouté.
        (
            "http://n8n:5678/webhook",
            "/appointment-sync",
            "http://n8n:5678/webhook/appointment-sync",
        ),
        # URL complète → STRICTEMENT identique (jamais de doublon).
        (
            "http://n8n:5678/webhook/appointment-sync",
            "/appointment-sync",
            "http://n8n:5678/webhook/appointment-sync",
        ),
        # URL complète + slash final, chemin vide après strip → inchangée.
        (
            "http://n8n:5678/webhook/appointment-sync/",
            "",
            "http://n8n:5678/webhook/appointment-sync",
        ),
        # webhook-test préservé tel quel.
        (
            "https://n8n.exemple.io/webhook-test/x",
            "/appointment-sync",
            "https://n8n.exemple.io/webhook-test/x/appointment-sync",
        ),
        # Chemin vide → base conservée telle quelle.
        ("http://n8n:5678/webhook/foo", "", "http://n8n:5678/webhook/foo"),
    ],
)
def test_build_webhook_url_normalisation(monkeypatch, raw_url, path, expected):
    monkeypatch.setattr(app_settings, "N8N_WEBHOOK_URL", raw_url)
    monkeypatch.setattr(app_settings, "N8N_CALENDAR_WEBHOOK_PATH", path)
    assert event_service.build_webhook_url() == expected


def test_events_webhook_json_ne_duplique_pas_le_chemin():
    """Le workflow exporté déclare le chemin UNE seule fois, côté node webhook."""
    from pathlib import Path

    workflow = Path(__file__).resolve().parents[1] / "n8n" / "workflows" / "appointment-events-webhook.json"
    data = json.loads(workflow.read_text(encoding="utf-8"))
    webhook_nodes = [n for n in data["nodes"] if n["type"].endswith(".webhook")]
    assert len(webhook_nodes) == 1
    assert webhook_nodes[0]["parameters"]["path"] == "appointment-sync"


@pytest.mark.parametrize(
    "event",
    [
        "appointment.requested",
        "appointment.confirmed",
        "appointment.rejected",
        "appointment.rescheduled",
        "appointment.cancelled",
    ],
)
def test_emit_appointment_event_poste_le_bon_payload(monkeypatch, webhook_url, event):
    monkeypatch.setattr(event_service.httpx, "AsyncClient", FakeAsyncClient)

    class _FakeAppointment:
        id = 42
        patient_id = 7
        doctor_id = 3
        duration_minutes = 30
        scheduled_at = None
        proposed_at = None
        status = type("S", (), {"value": "pending"})()
        reason = "Consultation"

    class _FakeUser:
        first_name = "Amine"
        last_name = "Test"

    class _FakePatient:
        user = _FakeUser()

    monkeypatch.setattr(app_settings, "N8N_WEBHOOK_URL", "http://n8n:5678")
    asyncio.run(
        event_service.emit_appointment_event(event, _FakeAppointment(), _FakePatient())
    )

    assert FakeAsyncClient.last_url == "http://n8n:5678/webhook/appointment-sync"
    payload = FakeAsyncClient.last_json
    assert payload["event"] == event
    for key in ("appointment_id", "patient_id", "patient_name", "doctor_id", "duration", "status"):
        assert key in payload


def test_emit_sans_configuration_ne_poste_pas(monkeypatch):
    monkeypatch.setattr(app_settings, "N8N_WEBHOOK_URL", "")

    called = {"post": False}

    class GuardClient(FakeAsyncClient):
        async def post(self, url, json=None):  # noqa: D102
            called["post"] = True
            raise AssertionError("aucun POST attendu sans URL configuree")

    monkeypatch.setattr(event_service.httpx, "AsyncClient", GuardClient)

    class _A:
        id = 1

    class _P:
        pass

    asyncio.run(event_service.emit_appointment_event("appointment.requested", _A(), _P()))
    assert called["post"] is False