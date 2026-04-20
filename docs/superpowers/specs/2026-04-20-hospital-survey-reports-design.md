# Hospital Survey Reporting Dashboard - Design Spec

**Date:** 2026-04-20
**Status:** Approved Design

---

## 1. Overview

Implement a Reports module in the admin dashboard with two report types:
- Doctor's Report (default view)
- General Report (hospital-wide)

Features: Server-side filtering, dynamic tables, multi-format export (Excel, CSV, PDF).

---

## 2. Backend API

### New Endpoints

#### GET /api/reports/doctors
**Query params:**
- `doctor_id` - Filter by doctor ID (optional, omit for all doctors)
- `date_from` - Start date YYYY-MM-DD (optional)
- `date_to` - End date YYYY-MM-DD (optional)

**Response:**
```json
{
  "doctors": [
    {
      "doctor_id": "D-xxx",
      "doctor_name": "Dr. Name",
      "question_ratings": [
        {
          "question_key": "q1",
          "average": 4.5,
          "count": 10
        }
      ],
      "total_average": 4.2,
      "total_patients": 5
    }
  ],
  "date_from": "2026-01-01",
  "date_to": "2026-04-20"
}
```

#### GET /api/reports/general
**Query params:**
- `date_from` - Start date YYYY-MM-DD (optional)
- `date_to` - End date YYYY-MM-DD (optional)

**Response:**
```json
{
  "questions": [
    {
      "question_key": "q1",
      "average": 4.3,
      "count": 45
    }
  ],
  "date_from": "2026-01-01",
  "date_to": "2026-04-20"
}
```

#### GET /api/doctors/all (reuse existing or create)
Returns all doctors for filter dropdown.

---

### Data Aggregation Logic

**Doctor's Report:**
1. Fetch doctor questions: `WHERE category = 'doctor' AND is_active = TRUE`
2. Query submissions with optional date filters
3. Parse `question_answers` JSONB
4. For each submission, extract keys matching `doctor_{doctor_id}_{question_key}`
5. Calculate per-question average and overall doctor average

**General Report:**
1. Fetch general questions: `WHERE category = 'general' AND is_active = TRUE`
2. Query submissions with optional date filters
3. Parse top-level keys from `question_answers`
4. Calculate average per question key

---

## 3. Frontend UI

### Navigation
Add to sidebar menu items:
```javascript
{ id: 'reports', label: 'Reports', icon: FileSpreadsheet }
```

Add sub-tabs:
- `doctor-report` (default)
- `general-report`

### Filter Section

**Doctor's Report filters:**
| Filter | Type | Source |
|--------|------|--------|
| Doctor | Dropdown (searchable) | GET /api/doctors/all |
| Date From | Date input | - |
| Date To | Date input | - |

**General Report filters:**
| Filter | Type |
|--------|------|
| Date From | Date input |
| Date To | Date input |

**Behavior:** All filters are server-side via API query params. Apply button triggers reload.

### Table: Doctor's Report
| Column | Source |
|--------|--------|
| No. | Row index + 1 |
| Doctor Name | doctor.doctor_name |
| Question Key | question_key |
| Average Score | question_ratings[].average (1 decimal) |
| Total Average Rating | doctor.total_average (1 decimal) |

### Table: General Report
| Column | Source |
|--------|--------|
| No. | Row index + 1 |
| Question Key | question_key |
| Average Rating | average (1 decimal) |

---

## 4. Export Functionality

### Download Button
Location: Top-right of report table
Component: Button with dropdown menu

### Options
- Excel (.xlsx) - Use existing xlsx library
- CSV - Use existing CSV generation
- PDF - Generate with PDFKit

### PDF Styling (Strict Requirements)

**Header row:**
| Left | Center | Right |
|------|--------|-------|
| Hospital logo (girum-logo.png) | "Girum Hospital" | Timestamp (DD/MM/YYYY HH:MM) |

**Sub-header:**
- Report name: "Doctor's Report" or "General Report"
- Dates: "Date: YYYY-MM-DD to YYYY-MM-DD" (or "All Time" if no filter)

**Table:**
- Native table element
- Header row: black text, no background (white fill)
- Content: standard borders
- Professional black-and-white style

---

## 5. Implementation Files

### Backend
- `src/server.js` - Add new endpoints

### Frontend
- `frontend/src/main.jsx` - Add Reports tab and component

---

## 6. Acceptance Criteria

1. Reports menu item visible in sidebar
2. Doctor's Report shown by default
3. Can switch between Doctor's Report and General Report
4. Doctor filter (dropdown) returns all doctors from server
5. Date range filter works for both reports
6. Table displays correct data with question_key visible
7. Excel export works
8. CSV export works
9. PDF export matches spec styling (header, sub-header, black header table)