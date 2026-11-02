"""Real-time WebSocket notifications."""

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_active_connections: dict[int, list[WebSocket]] = {}


@router.websocket("/ws/notifications/{user_id}")
async def notifications_websocket(websocket: WebSocket, user_id: int) -> None:
    """WebSocket endpoint for real-time user notifications."""
    await websocket.accept()
    _active_connections.setdefault(user_id, []).append(websocket)
    logger.info("WebSocket connected for user %s", user_id)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _active_connections[user_id].remove(websocket)
        if not _active_connections[user_id]:
            del _active_connections[user_id]
        logger.info("WebSocket disconnected for user %s", user_id)


async def send_notification(user_id: int, message: dict[str, Any]) -> None:
    """Push notification to all active WebSocket connections for a user."""
    connections = _active_connections.get(user_id, [])
    payload = json.dumps(message)
    dead: list[WebSocket] = []
    for ws in connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections.remove(ws)
