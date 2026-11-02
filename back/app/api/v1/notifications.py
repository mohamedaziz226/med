"""In-app notification API routes (patient space)."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    UnreadCountResponse,
)
from app.services import notification_store

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    db: DbSession,
    current_user: CurrentUser,
    unread: bool = Query(False, description="Ne renvoyer que les notifications non lues"),
    limit: int = Query(50, ge=1, le=200),
) -> list[NotificationResponse]:
    """Notifications de l'utilisateur connecté (patients → les leurs)."""
    notifications = notification_store.list_notifications(
        db, current_user, unread_only=unread, limit=limit
    )
    return [notification_store.to_notification_response(n) for n in notifications]


@router.get("/unread", response_model=list[NotificationResponse])
def list_unread_notifications(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(50, ge=1, le=200),
) -> list[NotificationResponse]:
    """Uniquement les notifications non lues."""
    notifications = notification_store.list_notifications(
        db, current_user, unread_only=True, limit=limit
    )
    return [notification_store.to_notification_response(n) for n in notifications]


@router.get("/unread/count", response_model=UnreadCountResponse)
def unread_count(db: DbSession, current_user: CurrentUser) -> UnreadCountResponse:
    """Nombre de notifications non lues (badge de la cloche)."""
    return UnreadCountResponse(count=notification_store.get_unread_count(db, current_user))


@router.get("/dedup-exists", response_model=dict)
def dedup_exists(
    db: DbSession,
    current_user: CurrentUser,
    dedup_key: str = Query(..., min_length=1, max_length=255),
) -> dict:
    """Vérifie si une notification avec cette clé anti-doublon existe déjà.

    Utilisé par n8n AVANT l'envoi d'un email de rappel pour garantir
    qu'aucun doublon n'est envoyé (idempotence de bout en bout).
    """
    exists = (
        db.query(Notification.id)
        .filter(Notification.dedup_key == dedup_key)
        .first()
        is not None
    )
    return {"exists": exists}


@router.post("", response_model=NotificationResponse, status_code=201)
def create_notification(
    data: NotificationCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> NotificationResponse:
    """Crée une notification (backend/n8n). Idempotente pour les rappels."""
    notification = notification_store.create_notification(db, data, current_user)
    return notification_store.to_notification_response(notification)


@router.patch("/read-all", response_model=dict)
def read_all(db: DbSession, current_user: CurrentUser) -> dict:
    """Marque toutes les notifications accessibles comme lues."""
    updated = notification_store.mark_all_notifications_read(db, current_user)
    return {"updated": updated}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> NotificationResponse:
    """Marque une notification comme lue (uniquement ses propres notifications)."""
    notification = notification_store.mark_notification_as_read(db, current_user, notification_id)
    return notification_store.to_notification_response(notification)