# HealthSync: Full-Stack Digital Healthcare Platform

HealthSync is an enterprise-grade, patient-centric digital healthcare platform designed for secure, consent-based medical record sharing, intelligent care navigation, and cryptographic audit integrity.

---

## 🌟 Key Platform Features

1. **Unified Digital Health Record:** Securely aggregates laboratory panels, digital prescriptions, consultation notes, and longitudinal biometric vitals with Recharts telemetry.
2. **Zero-Trust Scoped Consent:** Patients explicitly grant, time-bound, and immediately revoke access to specific record categories (`LAB_REPORT`, `PRESCRIPTION`, `IMAGING`, `CONSULTATION_NOTE`, `DISCHARGE_SUMMARY`).
3. **Audited Break-Glass Emergency Override:** Clinicians can invoke audited emergency access for life-critical resuscitation, triggering immediate patient notifications and compliance audit logging.
4. **4 Dedicated User Roles & Dashboards:**
   - **Patient:** Unified health records, biometric vitals tracking, doctor appointments, emergency contacts, and scoped consent management.
   - **Doctor:** Clinical dashboard, authorized patient roster, digital prescriptions, clinical encounters, and consultation quick-access with 6-digit patient PIN.
   - **Hospital Administrator:** Hospital organization profile, multi-doctor facility affiliations, room allocation, and appointment oversight.
   - **Laboratory Administrator:** Diagnostic test catalog, patient report uploading with structured biometric metrics, and cryptographic SHA-256 verification.
5. **Decoupled Registration & Verification:**
   - Newly registered Doctors receive `PENDING_REVIEW` verification status until approved by platform administrators.
   - Newly registered Hospital and Laboratory organizations receive `isVerified: false` until regulatory credentials are authenticated.
6. **Searchable Doctor Directory (`/patient/doctors`):**
   - Search by physician name, specialty, or condition.
   - Specialty filters (Cardiology, General Medicine, Dermatology, Pediatrics, Orthopedics, Gynecology, Neurology).
   - Facility location filter and direct consultation appointment booking.
7. **Hospital & Clinic Discovery (`/patient/hospitals`):**
   - Interactive **Google Maps Platform** integration (`@googlemaps/js-api-loader`).
   - Address, locality, and postcode geocoding via `google.maps.Geocoder`.
   - Distinct "HealthSync Partner" badges for network facilities with appointment booking links.
   - Graceful fallback explanation when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not provided.
8. **Deterministic AI Health Assistant:**
   - Multi-provider architecture supporting local **Ollama** (default offline LLM) and **Google Gemini Cloud API**.
   - Deterministic Red-Flag Triage Engine detects acute coronary syndrome, stroke FAST protocol, severe respiratory distress, anaphylaxis, and self-harm, providing instant **112** emergency guidance.
   - Strict medication safety guardrails preventing unsupervised prescription adjustments.
   - Multilingual support for English, Hindi, and Hinglish.
9. **Cryptographic SHA-256 Data Integrity:**
   - Computes SHA-256 cryptographic checksums on every uploaded clinical document and test report.
   - On-demand tamper-evident integrity verification against physical files.
10. **Automated OCR Parsing:** Extracts candidate measurements (Glucose, Lipids, CBC) into unverified drafts requiring clinician review.

---

## 🏗️ Repository Architecture

```text
healthsync/
  apps/
    api/                     # NestJS TypeScript Backend (REST, Swagger, Prisma, S3, AI, Auth, Audit)
    web/                     # Next.js 14 Web Application (React 18, Tailwind, Recharts, Google Maps)
  packages/
    shared-types/            # Shared TypeScript domain contracts, DTOs, and Enums
    validation/              # Shared Zod validation schemas
  infrastructure/
    docker/                  # Container definitions
    postgres/                # Postgres 16 init scripts
    minio/                   # MinIO S3 object storage configuration
    keycloak/                # Keycloak realm configuration
    ollama/                  # Ollama Modelfile and clinical system prompt
  docs/                      # Comprehensive technical architecture & user guides
  .env.example               # Root configuration template
  docker-compose.yml         # Container orchestration (Postgres, MinIO, Ollama, Keycloak)
  README.md
```

---

## 🗺️ Google Maps Platform Setup

To enable live interactive Google Maps rendering, geocoding, and Google Places auto-discovery in `/patient/hospitals`:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/) with active billing.
2. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Geocoding API**
3. Generate an API Key and restrict it to HTTP referrers:
   - `http://localhost:3000/*`
4. Set the key in `apps/web/.env.local`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key
   ```
*Note: If this key is omitted or left blank, HealthSync renders an informative fallback banner while keeping facility discovery and appointment booking fully functional.*

---

## 🚀 Local Quick Start Instructions

### 1. Prerequisites
- Node.js (v18.x to v24.x)
- npm (v9.x to v11.x)

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Shared Domain Packages
```bash
npm run build:packages
```

### 4. Initialize Database & Seed Synthetic Clinical Data
```bash
cd apps/api
npm run prisma:seed
cd ../..
```
*Note: The seed script is completely idempotent. Running it repeatedly safely updates records without creating duplicates or destroying existing patient files.*

### 5. Start the Application
Run both API and Web concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Terminal 1: Backend API on Port 4000
npm run dev:api

# Terminal 2: Frontend Web App on Port 3000
npm run dev:web
```

Access the application in your browser:
- **Web Application:** `http://localhost:3000`
- **Swagger / OpenAPI Documentation:** `http://localhost:4000/api/docs`

---

## 🧪 Automated Testing

```bash
cd apps/api
npm test
```

Test Suites:
1. `test/consent-authorization.spec.ts` - Granular scoped consent enforcement, expirations, break-glass logging.
2. `test/auth-registration.spec.ts` - 4-role registration flows, `PENDING_REVIEW` verification status enforcement.
3. `test/ai-safety.spec.ts` - Deterministic red flag triage, emergency 112 routing, anti-prescribing guardrails.
4. `test/vitals-and-quick-access.spec.ts` - Daily biometric telemetry, 6-digit patient PIN consultation lookup.
5. `test/data-isolation-and-auth.spec.ts` - Cross-patient data isolation, doctor unauthorized access rejection, directory filters.

---

## 👥 Demo Synthetic Accounts

Password for all synthetic test accounts: `HealthSync@2025`

| Role | Email | Notes |
| :--- | :--- | :--- |
| **Patient** | `patient.aarav@healthsync.mock` | PIN: `HS-8821`, Hypertension, Penicillin allergy |
| **Patient** | `patient.sunita@healthsync.mock` | PIN: `HS-4490`, Type 2 Diabetes, Sulfa allergy |
| **Patient** | `patient.rohan@healthsync.mock` | PIN: `HS-3312`, Allergic Rhinitis |
| **Patient** | `patient.kavita@healthsync.mock` | PIN: `HS-7754`, Hypothyroidism |
| **Doctor** | `doctor.priya@healthsync.mock` | Cardiology (Apex Hospital & Metro Care Clinic) |
| **Doctor** | `doctor.rajesh@healthsync.mock` | General Medicine (Apex Hospital) |
| **Doctor** | `doctor.ananya@healthsync.mock` | Dermatology (Metro Care Clinic) |
| **Doctor** | `doctor.vikram@healthsync.mock` | Pediatrics (Sunrise Community Clinic) |
| **Doctor** | `doctor.sandeep@healthsync.mock` | Orthopedics (Apex Hospital) |
| **Doctor** | `doctor.meenakshi@healthsync.mock` | Gynecology (Apex Hospital) |
| **Doctor** | `doctor.alok@healthsync.mock` | Neurology (CareWell Polyclinic) |
| **Doctor (Unverified)**| `doctor.rohan@healthsync.mock` | `PENDING_REVIEW` status test case |
| **Hospital Admin** | `hospital.admin@apex.mock` | Apex Healthcare Network Console |
| **Lab Admin** | `lab.admin@apex.mock` | Apex Central Pathology Diagnostics Console |
| **Platform Admin** | `admin@healthsync.mock` | System administration & provider certifications |
