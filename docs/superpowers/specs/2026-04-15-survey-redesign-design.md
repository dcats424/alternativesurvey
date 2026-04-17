# Survey System Redesign - Design Spec

**Date:** 2026-04-15
**Status:** Draft

---

## Overview

Replace external API token integration with a self-contained barcode/QR code entry system. Patients scan a clinic barcode to access the survey, select their treating doctor(s), and submit feedback.

---

## Entry Flow

1. Patient scans clinic barcode/QR code
2. Barcode links to `/survey` page (or auto-triggers token generation)
3. Backend generates unique survey token (24-hour expiry)
4. Patient sees survey with doctor selection

---

## Token System

- **Generation:** Each barcode scan creates one unique token
- **Format:** 24-byte random base64url string
- **Expiry:** 24 hours from creation
- **Consumption:** Token becomes invalid after one successful submission
- **Storage:** `survey_tokens` table tracks all tokens

---

## Survey Flow

### Page 1: Doctor Selection
- Patient optionally enters name
- Patient selects one or more doctors from admin-managed list (checkbox multi-select)
- Language toggle: Amharic (default) / English

### Page 2: Doctor Questions
- For each selected doctor:
  - Display doctor's name
  - Show all doctor-category questions
  - Patient answers each question
- Navigation: Next / Previous

### Page 3: General Questions
- Show all general-category questions
- Patient answers each question
- Navigation: Next / Previous

### Page 4: Review & Submit
- Summary of selections
- Submit button
- Success message after submission

---

## Admin Features

### Existing (preserved)
- Question CRUD (general + doctor categories)
- View/analyze feedback responses
- Send email reports to doctors

### New
- Doctor CRUD (add, edit, delete doctors)

### Admin Language
- English only (no language switching)

---

## Database Schema

### New Tables

```sql
CREATE TABLE doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Modified Tables

- `survey_tokens`: Add `used_at` column, update expiry logic
- Existing tables remain unchanged

---

## API Endpoints

### Survey Entry
- `POST /api/survey/start` - Generate token on page load
- `GET /api/survey?token=...` - Fetch survey config with doctors list
- `POST /api/feedback` - Submit feedback (existing, update for new flow)

### Doctor Management
- `GET /api/doctors` - List all doctors
- `POST /api/doctors` - Add doctor
- `PATCH /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor

### Admin (existing)
- All existing endpoints unchanged

---

## Barcode/QR Code

- Encode survey URL: `https://survey.example.com/survey`
- All patients use same barcode (generic clinic entry point)
- Can be printed and displayed in clinic

---

## Key Differences from Current System

| Aspect | Current | New |
|--------|---------|-----|
| Token Source | External API | Generated on scan |
| Doctor Source | External API | Admin-managed |
| Patient Info | From external | Optional entry |
| Entry Point | SMS/Link | Barcode/QR |
| Admin Doctors | N/A | Full CRUD |
