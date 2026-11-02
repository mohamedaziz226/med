"""Jinja2 email templates."""


def appointment_reminder_email_body(patient_name: str, doctor_name: str, scheduled_at: str) -> str:
    return f"""
    <html><body>
    <h2>Rappel de rendez-vous</h2>
    <p>Bonjour {patient_name},</p>
    <p>Nous vous rappelons votre rendez-vous avec {doctor_name} le <strong>{scheduled_at}</strong>.</p>
    <p>Cordialement,<br/>MedSecretariat</p>
    </body></html>
    """


def payment_reminder_email_body(patient_name: str, amount: str, due_date: str) -> str:
    return f"""
    <html><body>
    <h2>Relance de paiement</h2>
    <p>Bonjour {patient_name},</p>
    <p>Un montant de <strong>{amount}</strong> reste dû depuis le {due_date}.</p>
    <p>Merci de régulariser votre situation.</p>
    <p>Cordialement,<br/>MedSecretariat</p>
    </body></html>
    """


def debt_reminder_email_body(patient_name: str, remaining_debt: str, appointment_date: str) -> str:
    return f"""
    <html><body>
    <h2>Rappel concernant votre solde</h2>
    <p>Bonjour {patient_name},</p>
    <p>Nous vous informons qu'un montant de <strong>{remaining_debt} DT</strong> reste à régler sur votre dossier.</p>
    <p>Votre prochain rendez-vous est prévu le <strong>{appointment_date}</strong>.</p>
    <p>Nous vous invitons à régulariser votre situation avant cette date.</p>
    <p>Cordialement,<br/>MedSecretariat</p>
    </body></html>
    """


def otp_email_body(first_name: str, code: str, expire_minutes: int) -> str:
    return f"""
    <html><body>
    <h2>Code de vérification</h2>
    <p>Bonjour {first_name},</p>
    <p>Votre code de double authentification est :</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{code}</p>
    <p>Ce code expire dans {expire_minutes} minutes.</p>
    <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
    <p>Cordialement,<br/>MedSecretariat</p>
    </body></html>
    """


def invoice_email_body(patient_name: str, invoice_url: str, invoice_number: str) -> str:
    return f"""
    <html><body>
    <h2>Facture {invoice_number}</h2>
    <p>Bonjour {patient_name},</p>
    <p>Votre facture est disponible : <a href="{invoice_url}">Télécharger la facture</a></p>
    <p>Ce lien expire dans 24 heures.</p>
    <p>Cordialement,<br/>MedSecretariat</p>
    </body></html>
    """
