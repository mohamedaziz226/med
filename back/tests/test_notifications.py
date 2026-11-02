"""Tests de bout en bout des notifications patient (API /notifications).

Couvre les scénarios demandés :
- TEST 1/2 : création J-7 / J-1, visibilité patient, compteur.
- TEST 3 : exécution (POST) répétée → pas de doublon.
- TEST 4 : isolation entre patients.
- TEST 5 : clic → lecture + compteur.
- Contraintes de sécurité (403/401/404) et validation des données.
"""

from conftest import auth_headers, base_payload, client, make_admin, make_doctor, make_patient


def test_unauthorized_returns_401(db):
    resp = client.get("/api/v1/notifications")
    assert resp.status_code == 401


def test_patient_can_create_and_read_own_notifications(db):
    _, doctor = make_doctor(db)
    patient_user, patient = make_patient(db, doctor.id, "amine.a@example.com")
    headers = auth_headers(patient_user)

    # 1) Création (comme le ferait n8n avec un compte autorisé)
    created = client.post(
        "/api/v1/notifications",
        json=base_payload(patient.id, message="Votre rendez-vous est prévu dans 7 jours."),
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["id"]
    assert body.get("isRead", body.get("is_read")) is False
    assert body["type"] == "appointment_reminder"

    # 2) Compteur non lues
    count = client.get("/api/v1/notifications/unread/count", headers=headers)
    assert count.status_code == 200
    assert count.json()["count"] == 1

    # 3) Liste
    listing = client.get("/api/v1/notifications", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    # 4) Marquer comme lue → compteur à 0
    notif_id = body["id"]
    read = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert read.status_code == 200
    assert read.json().get("isRead", read.json().get("is_read")) is True
    assert client.get("/api/v1/notifications/unread/count", headers=headers).json()["count"] == 0


def test_patient_cannot_create_notification_for_another_patient(db):
    _, doctor = make_doctor(db)
    patient_a, _ = make_patient(db, doctor.id, "amine.b@example.com")
    _, patient_b = make_patient(db, doctor.id, "sarra.b@example.com")

    resp = client.post(
        "/api/v1/notifications",
        json=base_payload(patient_b.id),
        headers=auth_headers(patient_a),
    )
    assert resp.status_code == 403


def test_admin_can_create_notification_for_any_patient(db):
    admin = make_admin(db)
    _, doctor = make_doctor(db)
    _, patient = make_patient(db, doctor.id, "admin.target@example.com")

    resp = client.post(
        "/api/v1/notifications",
        json=base_payload(patient.id),
        headers=auth_headers(admin),
    )
    assert resp.status_code == 201
def test_no_duplicate_for_same_appointment_and_reminder_type(db):
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    _, patient = make_patient(db, doctor.id, "dedup@example.com")
    headers = auth_headers(adm)

    p1 = base_payload(patient.id, reminder_type="j7", related_entity_id=42)
    first = client.post("/api/v1/notifications", json=p1, headers=headers)
    assert first.status_code == 201
    first_id = first.json()["id"]

    # Deuxième exécution du workflow → idempotent
    second = client.post("/api/v1/notifications", json=p1, headers=headers)
    assert second.status_code == 201
    assert second.json()["id"] == first_id

    listing = client.get("/api/v1/notifications", headers=headers)
    assert len(listing.json()) == 1

    # J-1 = clé différente de J-7 → nouvelle notification
    p2 = base_payload(patient.id, reminder_type="j1", related_entity_id=42)
    third = client.post("/api/v1/notifications", json=p2, headers=headers)
    assert third.status_code == 201
    assert third.json()["id"] != first_id

    listing = client.get("/api/v1/notifications", headers=headers)
    assert len(listing.json()) == 2


def test_patient_sees_only_own_notifications(db):
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    patient_a_user, patient_a = make_patient(db, doctor.id, "iso.a@example.com")
    patient_b_user, patient_b = make_patient(db, doctor.id, "iso.b@example.com")

    client.post(
        "/api/v1/notifications",
        json=base_payload(patient_a.id, title="Notif A"),
        headers=auth_headers(adm),
    )
    client.post(
        "/api/v1/notifications",
        json=base_payload(patient_b.id, title="Notif B"),
        headers=auth_headers(adm),
    )

    a_list = client.get("/api/v1/notifications", headers=auth_headers(patient_a_user)).json()
    b_list = client.get("/api/v1/notifications", headers=auth_headers(patient_b_user)).json()

    assert [n["title"] for n in a_list] == ["Notif A"]
    assert [n["title"] for n in b_list] == ["Notif B"]
def test_patient_cannot_read_notification_of_another_patient(db):
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    patient_a_user, _ = make_patient(db, doctor.id, "lock.a@example.com")
    _, patient_b = make_patient(db, doctor.id, "lock.b@example.com")

    created = client.post(
        "/api/v1/notifications",
        json=base_payload(patient_b.id),
        headers=auth_headers(adm),
    )
    notif_id = created.json()["id"]

    resp = client.patch(
        f"/api/v1/notifications/{notif_id}/read",
        headers=auth_headers(patient_a_user),
    )
    assert resp.status_code == 404


def test_mark_all_read(db):
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    patient_user, patient = make_patient(db, doctor.id, "allread@example.com")

    client.post(
        "/api/v1/notifications",
        json=base_payload(patient.id, reminder_type="j7", related_entity_id=1),
        headers=auth_headers(adm),
    )
    client.post(
        "/api/v1/notifications",
        json=base_payload(patient.id, reminder_type="j1", related_entity_id=1),
        headers=auth_headers(adm),
    )

    headers = auth_headers(patient_user)
    assert client.get("/api/v1/notifications/unread/count", headers=headers).json()["count"] == 2

    read_all = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert read_all.status_code == 200
    assert read_all.json()["updated"] == 2
def test_debt_reminder_type_and_dedup_j15_j10(db):
    """TEST dettes : type DEBT_REMINDER + anti-doublon J-15/J-10 par rendez-vous."""
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    _, patient = make_patient(db, doctor.id, "detter@example.com", first_name="Sonia")
    headers = auth_headers(adm)

    # J-15 : type en MAJUSCULES → normalisé en debt_reminder
    j15 = base_payload(
        patient.id,
        type="DEBT_REMINDER",
        title="Rappel de paiement",
        message="Bonjour Sonia, 120.00 DT restent à régler. Prochain RDV le 05/09/2026.",
        reminder_type="j15",
        related_entity_id=77,
    )
    first = client.post("/api/v1/notifications", json=j15, headers=headers)
    assert first.status_code == 201, first.text
    assert first.json()["type"] == "debt_reminder"
    assert first.json()["reminder_type"] == "j15"
    assert first.json()["title"] == "Rappel de paiement"
    first_id = first.json()["id"]

    # Même J-15 rejoué (workflow exécuté 2x) → pas de doublon
    second = client.post("/api/v1/notifications", json=j15, headers=headers)
    assert second.status_code == 201
    assert second.json()["id"] == first_id

    # J-10 pour le même rendez-vous → nouvelle notification
    j10 = base_payload(
        patient.id,
        type="DEBT_REMINDER",
        title="Rappel de paiement",
        message="Bonjour Sonia, 120.00 DT restent à régler. Prochain RDV le 05/09/2026.",
        reminder_type="j10",
        related_entity_id=77,
    )
    third = client.post("/api/v1/notifications", json=j10, headers=headers)
    assert third.status_code == 201
    assert third.json()["id"] != first_id
    assert third.json()["reminder_type"] == "j10"

    listing = client.get("/api/v1/notifications", headers=headers)
    assert len(listing.json()) == 2
    assert listing.json()[0]["type"] == "debt_reminder"
    assert client.get("/api/v1/notifications/unread/count", headers=headers).json()["count"] == 0


def test_invalid_type_is_rejected(db):
    adm = make_admin(db)
    _, doctor = make_doctor(db)
    _, patient = make_patient(db, doctor.id, "badtype@example.com")

    resp = client.post(
        "/api/v1/notifications",
        json=base_payload(patient.id, type="not_a_valid_type"),
        headers=auth_headers(adm),
    )
    assert resp.status_code == 400