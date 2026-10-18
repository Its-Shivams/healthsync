# HealthSync Security & Privacy Architecture

## 1. Zero-Trust Access Model
- **No Blanket Access:** Healthcare providers do not receive default access to any patient records merely because they are authenticated or affiliated with the hospital.
- **Resource-Level Consent Checks:** Every protected endpoint verifies that an active, unexpired `ConsentGrant` exists matching the specific category of the requested record (`LAB_REPORT`, `PRESCRIPTION`, etc.).
- **Immediate Revocation Enforcement:** When a patient revokes a grant, future access calls immediately return `403 Forbidden`.

## 2. Cryptographic Integrity & File Protection
- **Private S3 Storage:** Medical files are kept strictly outside the web root. Files are accessible only via short-lived signed URLs generated on-demand (TTL: 5-10 minutes).
- **Cryptographic Hashing:** Every uploaded file is hashed with SHA-256 upon arrival and anchored to the audit ledger.
- **Integrity Verification:** On demand, the system recomputes the SHA-256 hash of the stored file and compares it with the immutable ledger anchor. Any tampering triggers immediate security alerts.

## 3. Audited Break-Glass Protocol
- For unconscious or life-critical emergency resuscitation, a verified clinician can execute an audited emergency override.
- **Mandatory Justification:** Minimum 20 characters clinical justification required.
- **High-Priority Alerting:** Sends immediate push/in-app alert to the patient and compliance officers.
- **Temporary Scope:** Time-bound to 2 hours.

## 4. Privacy & Anti-Leakage Controls
- Secrets and keys are injected strictly via environment variables.
- Passwords are salted and hashed using bcrypt (10 rounds).
- PII is never included in AI model prompts or on-chain ledger entries.
