"""Monthly cleanup of orphaned MinIO objects (placeholder)."""

import logging

logger = logging.getLogger(__name__)


def cleanup_orphan_documents() -> None:
    """Remove MinIO objects without DB references — run monthly."""
    logger.info("Document cleanup job executed (implement full scan as needed)")
