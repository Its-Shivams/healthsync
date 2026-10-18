# HealthSync REST API Reference

Swagger UI is interactively available at: `http://localhost:4000/api/docs`

## 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register User (Patient, Doctor, Staff).
- `POST /api/auth/login` — Sign in with credentials, sets HTTP-only `healthsync_session` cookie.
- `POST /api/auth/demo-login` — 1-click test persona login (`PATIENT`, `DOCTOR`, `HOSPITAL_ADMIN`, `LAB_TECHNICIAN`, `PLATFORM_ADMIN`).
- `GET /api/auth/me` — Current user profile and roles.
- `POST /api/auth/logout` — Revokes session cookie.

## 2. Patient Profile & Timeline (`/api/patients`)
- `GET /api/patients/profile` — Self clinical profile, allergies, conditions, emergency contact.
- `PUT /api/patients/profile` — Update clinical baseline & vitals.
- `GET /api/patients/timeline` — Unified chronological event history.
- `GET /api/patients/vitals/trends` — Longitudinal telemetry for Recharts.

## 3. Medical Documents & Storage (`/api/documents`)
- `POST /api/documents/upload` — Multipart upload with MIME validation, SHA-256 hashing, and OCR job initiation.
- `GET /api/documents` — List patient documents.
- `GET /api/documents/:id` — Document metadata & short-lived pre-signed URL.
- `GET /api/documents/:id/verify` — Cryptographic file hash verification vs ledger.
- `POST /api/documents/:id/verify-draft` — Clinician confirmation of OCR draft metrics.

## 4. Consent & Access Control (`/api/consent`)
- `POST /api/consent/grants` — Patient issues category-scoped, time-limited consent grant.
- `GET /api/consent/my-grants` — Active and historical grants issued by patient.
- `DELETE /api/consent/grants/:id` — Immediate revocation of consent grant.
- `POST /api/consent/requests` — Doctor requests access from patient.
- `POST /api/consent/requests/:id/respond` — Patient approves or rejects request.
- `POST /api/consent/break-glass` — Audited emergency override for critical care.

## 5. Doctor Portal & Consultations (`/api/doctors`)
- `GET /api/doctors/directory` — List verified practitioners.
- `GET /api/doctors/authorized-patients` — Patients with active consent grants to doctor.
- `GET /api/doctors/patients/:patientId/records` — Scoped medical records (strictly filtered by active consent).
- `POST /api/doctors/encounters` — Clinical consultation note & vitals.
- `POST /api/doctors/prescriptions` — Digital prescription issuance.

## 6. Hospital & Facility Discovery (`/api/facilities`)
- `GET /api/facilities/search` — Search by latitude, longitude, radius (km), specialty, type.
- `GET /api/facilities/:id` — Facility details and doctor availability roster.

## 7. Appointment Booking (`/api/appointments`)
- `GET /api/appointments/slots` — Available slots.
- `POST /api/appointments/book` — Atomic slot booking inside database transaction.
- `GET /api/appointments/my` — User appointments.
- `PATCH /api/appointments/:id/status` — Status update.

## 8. AI Health Assistant (`/api/ai`)
- `POST /api/ai/chat` — Natural-language query with deterministic red-flag triage.
- `GET /api/ai/conversations` — User conversation threads.
- `GET /api/ai/status` — Provider and model availability.

## 9. Security Access Audit & Cryptographic Verification (`/api/audit`)
- `GET /api/audit/my-logs` — Immutable access trail for patient data requests and disclosures.
- `GET /api/audit/system-trail` — System-wide immutable administrative audit trail.
