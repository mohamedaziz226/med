"""MinIO object storage service."""

import io
import logging
from datetime import timedelta
from typing import BinaryIO
from uuid import uuid4

from minio import Minio
from minio.error import S3Error

from app.core.config import settings

logger = logging.getLogger(__name__)

_minio_client: Minio | None = None
_public_minio_client: Minio | None = None


def get_minio_client() -> Minio:
    """Return singleton MinIO client."""
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _minio_client


def ensure_buckets_exist() -> None:
    """Create required buckets if they do not exist."""
    client = get_minio_client()
    for bucket in (settings.MINIO_BUCKET_MEDICAL, settings.MINIO_BUCKET_INVOICES):
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info("Created MinIO bucket: %s", bucket)
        except S3Error as exc:
            logger.error("Failed to ensure bucket %s: %s", bucket, exc)


def build_object_key(doctor_id: int, patient_id: int, doc_type: str, filename: str) -> str:
    """Build standardized MinIO object key."""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"doctors/{doctor_id}/patients/{patient_id}/{doc_type}/{uuid4()}.{ext}"


def upload_file(
    bucket: str,
    object_key: str,
    file_data: BinaryIO,
    length: int,
    content_type: str,
) -> str:
    """Upload file to MinIO and return object key."""
    client = get_minio_client()
    client.put_object(bucket, object_key, file_data, length, content_type=content_type)
    return object_key


def upload_bytes(bucket: str, object_key: str, data: bytes, content_type: str) -> str:
    """Upload bytes to MinIO."""
    return upload_file(bucket, object_key, io.BytesIO(data), len(data), content_type)


def get_presigned_url(bucket: str, object_key: str, expiry: int | None = None) -> str:
    """Generate presigned download URL.

    L'URL est signée avec l'endpoint PUBLIC (joignable par le navigateur) car la
    signature SigV4 inclut l'en-tête Host. La génération est un calcul local :
    aucun accès réseau n'est nécessaire, le client interne reste utilisé pour
    les opérations réelles (upload/download/delete).
    """
    client = get_public_minio_client()
    expiry_seconds = expiry or settings.MINIO_PRESIGNED_EXPIRY_SECONDS
    return client.presigned_get_object(bucket, object_key, expires=timedelta(seconds=expiry_seconds))


def get_public_minio_client() -> Minio:
    """Return singleton Minio client configured with the browser-reachable endpoint."""
    global _public_minio_client
    if _public_minio_client is None:
        _public_minio_client = Minio(
            settings.MINIO_PUBLIC_ENDPOINT or settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
            # Région fixée pour éviter un appel réseau (get_bucket_location)
            # lors de la pré-signature : ce client n'est jamais joignable
            # depuis le conteneur backend (endpoint public navigateur).
            region="us-east-1",
        )
    return _public_minio_client


def delete_file(bucket: str, object_key: str) -> None:
    """Delete object from MinIO."""
    client = get_minio_client()
    try:
        client.remove_object(bucket, object_key)
    except S3Error as exc:
        logger.warning("Failed to delete %s/%s: %s", bucket, object_key, exc)