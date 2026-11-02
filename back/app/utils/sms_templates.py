"""SMS message templates."""


def appointment_reminder_sms(patient_name: str, scheduled_at: str) -> str:
    return f"MedSecretariat: Bonjour {patient_name}, rappel RDV le {scheduled_at}."


def payment_reminder_sms(amount: str, due_date: str) -> str:
    return f"MedSecretariat: Relance paiement {amount} dû depuis le {due_date}."
