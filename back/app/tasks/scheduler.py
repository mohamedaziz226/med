"""Scheduled background jobs."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from redis import Redis

from app.core.config import settings
from app.services.appointment_service import REMINDER_BIT_J1, REMINDER_BIT_J7
from app.tasks.document_cleanup import cleanup_orphan_documents
from app.tasks.payment_reminders import send_payment_reminders
from app.tasks.reminders import send_appointment_reminders

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def init_scheduler() -> BackgroundScheduler:
    """Initialize APScheduler with Redis job store and cron jobs."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    try:
        from apscheduler.jobstores.redis import RedisJobStore

        redis_client = Redis.from_url(settings.REDIS_URL)
        jobstores = {"default": RedisJobStore(jobs_key="medsecretariat:jobs", run_times_key="medsecretariat:runs", redis=redis_client)}
    except Exception as exc:
        logger.warning("Redis job store unavailable, using in-memory store: %s", exc)
        jobstores = {}

    _scheduler = BackgroundScheduler(jobstores=jobstores, timezone=settings.SCHEDULER_TIMEZONE)

    if settings.ENABLE_BACKEND_REMINDERS:
        _scheduler.add_job(
            send_appointment_reminders,
            CronTrigger(hour=9, minute=0),
            kwargs={"days_ahead": 1, "reminder_bit": REMINDER_BIT_J1},
            id="appointment_reminder_j1",
            replace_existing=True,
        )
        _scheduler.add_job(
            send_appointment_reminders,
            CronTrigger(hour=9, minute=5),
            kwargs={"days_ahead": 7, "reminder_bit": REMINDER_BIT_J7},
            id="appointment_reminder_j7",
            replace_existing=True,
        )
        _scheduler.add_job(
            send_payment_reminders,
            CronTrigger(day_of_week="mon", hour=10, minute=0),
            id="payment_reminders",
            replace_existing=True,
        )

    _scheduler.add_job(
        cleanup_orphan_documents,
        CronTrigger(day=1, hour=3, minute=0),
        id="document_cleanup",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("APScheduler started with %d jobs", len(_scheduler.get_jobs()))
    return _scheduler


def shutdown_scheduler() -> None:
    """Shutdown scheduler gracefully."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
