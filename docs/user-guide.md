# HealthSync User & Test Scenario Guide

## Synthetic Demo Personas & Credentials
All demo accounts use password: `HealthSync@2025`

| Persona | Name | Role | Email |
|---|---|---|---|
| **Patient** | Aarav Sharma | `PATIENT` | `patient.aarav@healthsync.mock` |
| **Cardiologist** | Dr. Priya Nair | `DOCTOR` | `doctor.priya@healthsync.mock` |
| **General Physician** | Dr. Rajesh Verma | `DOCTOR` | `doctor.rajesh@healthsync.mock` |
| **Hospital Administrator** | Anita Desai | `HOSPITAL_ADMIN` | `hospital.admin@apex.mock` |
| **Diagnostic Lab Tech** | Sunil Joshi | `LAB_TECHNICIAN` | `lab.tech@apex.mock` |
| **Platform Administrator** | Vikram Singhania | `PLATFORM_ADMIN` | `admin@healthsync.mock` |

---

## Interactive End-to-End Walkthrough Scenarios

### Scenario A: Patient Document Upload & Cryptographic Verification
1. Click **"Patient Portal"** on the landing page or navbar.
2. Navigate to **Medical Records**.
3. Click **Upload Medical Document**, choose a PDF or image report, and submit.
4. Notice the document is stored privately, a SHA-256 hash is computed, and candidate lab values (e.g. Glucose, Lipids) are parsed into an **Unverified OCR Draft**.
5. Click **Verify Ledger** to cryptographically verify the file hash against the immutable ledger anchor.

### Scenario B: Zero-Trust Scoped Consent Grant & Doctor Consultation
1. Under **Consent & Sharing**, view existing permissions.
2. Dr. Priya Nair has active access to `LAB_REPORT` and `PRESCRIPTION`.
3. Switch persona to **Dr. Rajesh Verma** (General Medicine). Try to view Aarav's records:
   - System strictly denies access with `403 Forbidden: NO_ACTIVE_CONSENT_GRANT`.
4. Switch persona to **Dr. Priya Nair**:
   - Access is granted strictly for the permitted categories!
   - Dr. Priya can view the lab report, record a clinical consultation note, and issue an anchored digital prescription.
5. Switch back to **Patient (Aarav)**:
   - Check the **Medical Timeline** to see the new prescription and consultation recorded.
   - Review the **Security & Access Audit Trail** to verify Dr. Priya's access event.
   - Click **Revoke Access** to immediately terminate Dr. Priya's permissions.

### Scenario C: AI Health Assistant & Deterministic Red-Flag Triage
1. Navigate to **AI Care Assistant**.
2. Click the test pill: *"What foods should I avoid with high blood pressure?"* -> Receives routine lifestyle guidance.
3. Click the test pill: *"I have severe crushing chest pain radiating to my left arm"* -> The deterministic red-flag engine activates immediately, outputting an **Emergency Red-Flag Warning** with **112** guidance without delay.
4. Click the test pill: *"Should I stop taking my amlodipine?"* -> Receives an immediate **Medication Safety Warning** instructing consultation with the prescribing physician.

### Scenario D: Hospital & Trauma Center Discovery
1. Navigate to **Find Hospitals**.
2. Explore the interactive Leaflet OpenStreetMap with facility markers in Delhi.
3. Toggle the **Search Radius** (5 km, 10 km, 25 km, 50 km).
4. Filter by **24/7 Emergency & Trauma Units Only** to isolate emergency-capable institutions.
5. Click **Book Slot** to schedule a confirmed appointment.
