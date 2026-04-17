# ABG Survey System (PostgreSQL)

## Services
- Main app (survey + admin): `http://localhost:3000`
- Standalone source API (test external system): `http://localhost:3002`

## Setup
1. Create DB
- `PGPASSWORD=admin psql -h localhost -U admin -d postgres -c "CREATE DATABASE abgsurvey_db OWNER admin;"`

2. Create tables
- `PGPASSWORD=admin psql -h localhost -U admin -d abgsurvey_db -f sql/schema.sql`

3. Install deps
- `npm install`
- `npm --prefix frontend install`

4. Build frontend
- `npm run build`

## Run
1. Main app (port 3000)
- `npm run dev`

2. Standalone source API (port 3002)
- `npm run dev:source-api`

## Standalone Source API (External Simulator)
Base URL: `http://localhost:3002`

1. Create patient
- `POST /source/patients`

2. Create doctor
- `POST /source/doctors`

3. Create encounter (1..N doctors)
- `POST /source/encounters`
- body: `patient_id`, `doctor_ids`, optional `visit_id`, status: `in_progress|finished`

4. Finish encounter and auto-generate survey link
- `PATCH /source/encounters/:id/status`
- body: `{ "status": "finished" }`

5. Read payload as external API
- by encounter id: `GET /source/external/visit/:encounterId`
- by visit id: `GET /source/external/visit-by-visit/:visitId`

6. Open generated patient survey
- returned as `survey_link` (points to main app `/survey?t=...`)

## Main App APIs
- `POST /api/register/visit`
- `POST /api/visits/sync` (reads from standalone API)
- `GET /api/survey?token=...`
- `POST /api/feedback`
- `GET /api/responses?grouped=true` (admin key)
- `GET /api/analytics` (admin key)
- Question builder:
  - `GET /api/questions?all=true`
  - `POST /api/questions`
  - `PATCH /api/questions/:id`
  - `DELETE /api/questions/:id`
  - `POST /api/questions/reorder`

## Notes
- Demo mode and demo token endpoints were removed.
- Source API is now fully separate from main app runtime.
