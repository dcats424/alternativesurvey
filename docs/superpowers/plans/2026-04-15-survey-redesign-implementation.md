# Survey System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace external API token integration with barcode entry system where patients scan barcode, select doctor(s), and submit feedback.

**Architecture:** 
- Backend generates unique token on survey page load (24hr expiry, one-time use)
- Doctors managed via admin CRUD
- Patient selects doctor(s) at survey start, optional name entry
- Keep existing question system (general + doctor categories)
- Bilingual survey (Amharic default), English-only admin

**Tech Stack:** Node.js/Express backend, Vanilla JS frontend, PostgreSQL

---

## File Structure

```
src/
├── db.js                    (modify - connect to girumsurvey DB)
├── server.js                (modify - update endpoints, remove source API calls)
├── services/
│   ├── doctors.js          (create - doctor CRUD)
│   └── survey.js           (create - token management)

frontend/src/
├── main.jsx                 (modify - add doctor selection, optional name)
└── styles.css               (modify - add doctor selection styles)
```

---

## Tasks

### Task 1: Update Database Connection

**Files:**
- Modify: `src/db.js`

- [ ] **Step 1: Read current db.js**

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
module.exports = { pool };
```

- [ ] **Step 2: Update to connect to girumsurvey DB with credentials**

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'girumsurvey',
  user: process.env.PGUSER || 'admin',
  password: process.env.PGPASSWORD || 'admin',
});
module.exports = { pool };
```

- [ ] **Step 3: Commit**

```bash
git add src/db.js
git commit -m "chore: connect to girumsurvey database"
```

---

### Task 2: Create Doctor Service

**Files:**
- Create: `src/services/doctors.js`
- Modify: `src/server.js` (add doctor routes)

- [ ] **Step 1: Create doctor service**

```javascript
const db = require('../db');
const { makeId } = require('../utils');

async function getAllDoctors(activeOnly = true) {
  const where = activeOnly ? 'WHERE is_active = TRUE' : '';
  const result = await db.query(
    `SELECT id, name, department, is_active, created_at 
     FROM doctors ${where} ORDER BY name ASC`
  );
  return result.rows;
}

async function getDoctorById(id) {
  const result = await db.query('SELECT * FROM doctors WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createDoctor({ name, department }) {
  if (!name || !name.trim()) {
    throw new Error('doctor_name_required');
  }
  const id = makeId('D');
  const result = await db.query(
    `INSERT INTO doctors (id, name, department) 
     VALUES ($1, $2, $3) 
     RETURNING *`,
    [id, name.trim(), department || null]
  );
  return result.rows[0];
}

async function updateDoctor(id, { name, department, is_active }) {
  const updates = [];
  const values = [];
  let idx = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    values.push(name.trim());
  }
  if (department !== undefined) {
    updates.push(`department = $${idx++}`);
    values.push(department);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${idx++}`);
    values.push(is_active);
  }
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await db.query(
    `UPDATE doctors SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function deleteDoctor(id) {
  const result = await db.query('DELETE FROM doctors WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

module.exports = { getAllDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
```

- [ ] **Step 2: Add doctor routes to server.js**

Add after existing imports:
```javascript
const doctorsService = require('./services/doctors');
```

Add these routes (after requireAuth middleware definition):
```javascript
// Doctor CRUD routes
app.get('/api/doctors', requireAuth, async (req, res) => {
  try {
    const doctors = await doctorsService.getAllDoctors(false);
    res.json({ count: doctors.length, doctors });
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

app.post('/api/doctors', requireAuth, async (req, res) => {
  try {
    const doctor = await doctorsService.createDoctor(req.body);
    await logActivity(req.adminUser.id, 'create_doctor', { doctor_id: doctor.id });
    res.json({ doctor });
  } catch (e) {
    if (e.message === 'doctor_name_required') {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: 'create_failed', details: e.message });
  }
});

app.patch('/api/doctors/:id', requireAuth, async (req, res) => {
  try {
    const doctor = await doctorsService.updateDoctor(req.params.id, req.body);
    if (!doctor) return res.status(404).json({ error: 'doctor_not_found' });
    await logActivity(req.adminUser.id, 'update_doctor', { doctor_id: doctor.id });
    res.json({ doctor });
  } catch (e) {
    res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

app.delete('/api/doctors/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await doctorsService.deleteDoctor(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'doctor_not_found' });
    await logActivity(req.adminUser.id, 'delete_doctor', { doctor_id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'delete_failed', details: e.message });
  }
});
```

- [ ] **Step 3: Add makeId utility if not exists**

Check `src/server.js` for existing `makeId` function. If not present, add to utils file or at top of doctors.js:
```javascript
function makeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/doctors.js src/server.js
git commit -m "feat: add doctor CRUD endpoints"
```

---

### Task 3: Create Survey Token Service

**Files:**
- Create: `src/services/survey.js`
- Modify: `src/server.js` (update survey endpoints)

- [ ] **Step 1: Create survey service for token management**

```javascript
const crypto = require('crypto');
const db = require('../db');

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getExpiry() {
  const ttl = Number(process.env.TOKEN_TTL_HOURS || 24);
  const d = new Date();
  d.setHours(d.getHours() + ttl);
  return d.toISOString();
}

async function createToken() {
  const token = generateToken();
  const expiresAt = getExpiry();
  
  await db.query(
    `INSERT INTO survey_tokens (token, expires_at) VALUES ($1, $2)`,
    [token, expiresAt]
  );
  
  return { token, expiresAt };
}

async function validateToken(token) {
  if (!token) return { error: 'token_required' };
  
  const result = await db.query(
    `SELECT * FROM survey_tokens WHERE token = $1`,
    [token]
  );
  
  if (!result.rows[0]) return { error: 'invalid_token' };
  
  const tokenData = result.rows[0];
  
  // Check if used
  if (tokenData.used_at) {
    return { error: 'token_already_used' };
  }
  
  // Check if expired
  if (new Date(tokenData.expires_at) < new Date()) {
    return { error: 'token_expired' };
  }
  
  return { ok: true, tokenData };
}

async function markTokenUsed(token) {
  await db.query(
    `UPDATE survey_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

module.exports = { createToken, validateToken, markTokenUsed };
```

- [ ] **Step 2: Update server.js - add survey start endpoint**

Add import at top:
```javascript
const surveyService = require('./services/survey');
```

Add new endpoint (before existing `/api/survey` route):
```javascript
// Generate new survey token
app.post('/api/survey/start', async (req, res) => {
  try {
    const tokenData = await surveyService.createToken();
    res.json({
      token: tokenData.token,
      expires_at: tokenData.expiresAt
    });
  } catch (e) {
    res.status(500).json({ error: 'token_generation_failed', details: e.message });
  }
});
```

- [ ] **Step 3: Update GET /api/survey endpoint**

Replace the current `/api/survey` endpoint logic with:
```javascript
app.get('/api/survey', async (req, res) => {
  const token = req.query.token || req.query.t;
  
  if (!token) {
    return res.status(400).json({ error: 'token_required' });
  }
  
  const validation = await surveyService.validateToken(token);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }
  
  // Get all active doctors for selection
  const doctors = await db.query(
    `SELECT id, name, department FROM doctors WHERE is_active = TRUE ORDER BY name ASC`
  );
  
  // Get questions
  await ensureQuestionsTableAndDefaults();
  const doctorQuestions = await fetchQuestions({ includeInactive: false, category: 'doctor' });
  const generalQuestions = await fetchQuestions({ includeInactive: false, category: 'general' });
  
  return res.json({
    doctors: doctors.rows.map(d => ({
      id: d.id,
      name: d.name,
      department: d.department
    })),
    doctor_questions: doctorQuestions.map(q => ({
      id: q.key,
      type: q.type,
      label: q.label,
      required: q.required,
      options: q.options,
      min: q.min_value,
      max: q.max_value,
      page_number: q.page_number
    })),
    general_questions: generalQuestions.map(q => ({
      id: q.key,
      type: q.type,
      label: q.label,
      required: q.required,
      options: q.options,
      min: q.min_value,
      max: q.max_value,
      page_number: q.page_number
    }))
  });
});
```

- [ ] **Step 4: Update POST /api/feedback endpoint**

Replace feedback endpoint with new logic that stores selected doctors:
```javascript
app.post('/api/feedback', async (req, res) => {
  try {
    const token = req.body.token;
    const questionAnswers = req.body.question_answers || {};
    const language = req.body.language || 'am';
    const patientName = req.body.patient_name || null;
    const selectedDoctorIds = req.body.selected_doctor_ids || [];
    const selectedDoctorNames = req.body.selected_doctor_names || [];

    if (!token) return res.status(400).json({ error: 'token_required' });
    if (!selectedDoctorIds.length) return res.status(400).json({ error: 'at_least_one_doctor_required' });

    const validation = await surveyService.validateToken(token);
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    await db.query(
      `INSERT INTO feedback_submissions 
       (token, patient_name, selected_doctor_ids, selected_doctor_names, question_answers, language) 
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [token, patientName, selectedDoctorIds, selectedDoctorNames, JSON.stringify(questionAnswers), language]
    );

    await surveyService.markTokenUsed(token);

    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'feedback_failed', details: e.message });
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add src/services/survey.js src/server.js
git commit -m "feat: implement survey token system and updated feedback endpoint"
```

---

### Task 4: Update Frontend Survey Page

**Files:**
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Read current main.jsx structure**

Review the existing frontend to understand current flow (pages, components, state management).

- [ ] **Step 2: Add doctor selection state and UI**

Add new state variable:
```javascript
const [selectedDoctors, setSelectedDoctors] = useState([]);
const [patientName, setPatientName] = useState('');
const [doctors, setDoctors] = useState([]);
```

Add doctor selection UI (insert after language toggle, before questions):
```javascript
// Doctor Selection Section
function renderDoctorSelection() {
  return `
    <div class="survey-section doctor-selection">
      <h2>${t('select_doctors')}</h2>
      <p class="helper-text">${t('select_doctors_helper')}</p>
      
      <div class="form-group">
        <label>${t('your_name')} (${t('optional')})</label>
        <input type="text" 
               value="${patientName}"
               oninput="setPatientName(this.value)"
               placeholder="${t('name_placeholder')}">
      </div>
      
      <div class="doctors-list">
        ${doctors.map(doc => `
          <label class="doctor-checkbox">
            <input type="checkbox" 
                   value="${doc.id}" 
                   data-name="${doc.name}"
                   ${selectedDoctors.some(d => d.id === doc.id) ? 'checked' : ''}
                   onchange="toggleDoctor('${doc.id}', '${doc.name}')">
            <span class="checkmark"></span>
            <span class="doctor-name">${doc.name}</span>
            ${doc.department ? `<span class="doctor-dept">${doc.department}</span>` : ''}
          </label>
        `).join('')}
      </div>
      
      <button onclick="proceedToQuestions()" 
              ${selectedDoctors.length === 0 ? 'disabled' : ''}>
        ${t('continue')}
      </button>
    </div>
  `;
}

// Helper functions
window.toggleDoctor = function(id, name) {
  const isSelected = selectedDoctors.some(d => d.id === id);
  if (isSelected) {
    setSelectedDoctors(selectedDoctors.filter(d => d.id !== id));
  } else {
    setSelectedDoctors([...selectedDoctors, { id, name }]);
  }
  render();
};

window.setPatientName = function(name) {
  setPatientName(name);
};

window.proceedToQuestions = function() {
  // Proceed to first question page
};
```

- [ ] **Step 3: Update fetchSurveyData to call new endpoint**

```javascript
async function fetchSurveyData(token) {
  try {
    const response = await fetch(`/api/survey?token=${token}`);
    const data = await response.json();
    
    if (data.error) {
      showError(data.error);
      return;
    }
    
    setDoctors(data.doctors || []);
    setDoctorQuestions(data.doctor_questions || []);
    setGeneralQuestions(data.general_questions || []);
    setSurveyReady(true);
    render();
  } catch (e) {
    showError('failed_to_load_survey');
  }
}
```

- [ ] **Step 4: Update submitFeedback to include selected doctors**

```javascript
async function submitFeedback() {
  const answers = collectAnswers();
  
  const payload = {
    token: currentToken,
    patient_name: patientName || null,
    selected_doctor_ids: selectedDoctors.map(d => d.id),
    selected_doctor_names: selectedDoctors.map(d => d.name),
    question_answers: answers,
    language: currentLang
  };
  
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    if (result.ok) {
      showSuccess();
    } else {
      showError(result.error);
    }
  } catch (e) {
    showError('submission_failed');
  }
}
```

- [ ] **Step 5: Add CSS for doctor selection**

```css
.doctor-selection {
  padding: 20px;
}

.doctor-selection h2 {
  margin-bottom: 8px;
  color: #1f2937;
}

.helper-text {
  color: #6b7280;
  margin-bottom: 20px;
  font-size: 14px;
}

.doctors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.doctor-checkbox {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.doctor-checkbox:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.doctor-checkbox input:checked + .checkmark {
  background: #2563eb;
  border-color: #2563eb;
}

.doctor-checkbox input:checked + .checkmark::after {
  display: block;
}

.doctor-checkbox input:checked ~ .doctor-name {
  color: #1f2937;
  font-weight: 500;
}

.doctor-checkbox input:checked ~ .doctor-dept {
  color: #4b5563;
}

.doctor-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  position: relative;
  width: 24px;
  height: 24px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  margin-right: 16px;
  flex-shrink: 0;
}

.checkmark::after {
  content: "";
  position: absolute;
  display: none;
  left: 7px;
  top: 3px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.doctor-name {
  font-size: 16px;
  color: #374151;
}

.doctor-dept {
  font-size: 13px;
  color: #9ca3af;
  margin-left: 8px;
}

.doctor-checkbox:has(input:checked) {
  border-color: #2563eb;
  background: #eff6ff;
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/main.jsx frontend/src/styles.css
git commit -m "feat: add doctor selection and optional name to survey"
```

---

### Task 5: Update Translations

**Files:**
- Modify: `frontend/src/main.jsx` (add new translation keys)

- [ ] **Step 1: Add new translation keys**

Add to translations object:
```javascript
const translations = {
  am: {
    // ... existing keys
    select_doctors: 'ሐኪሞችን ይምረጡ',
    select_doctors_helper: 'የሚረዱዎትን ሁሉም ሐኪሞች ይምረጡ',
    your_name: 'ስምዎ',
    optional: 'አማራጭ',
    name_placeholder: 'ስምዎን ያስገቡ (አማራጭ)',
    continue: 'ቀጥል',
    at_least_one_doctor: 'ቢያንስ አንድ ሐኪም ይምረጡ'
  },
  en: {
    // ... existing keys
    select_doctors: 'Select Your Doctors',
    select_doctors_helper: 'Select all doctors who treated you',
    your_name: 'Your Name',
    optional: 'optional',
    name_placeholder: 'Enter your name (optional)',
    continue: 'Continue',
    at_least_one_doctor: 'Please select at least one doctor'
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/main.jsx
git commit -m "feat: add translations for doctor selection"
```

---

### Task 6: Remove External API Dependencies

**Files:**
- Modify: `src/server.js` (remove source API calls)
- Delete: `src/source-api-server.js` (if standalone)
- Delete: `src/sourceSystemRoutes.js` (if exists)

- [ ] **Step 1: Remove validateTokenFromSourceAPI and related functions**

Remove these functions from server.js:
- `validateTokenFromSourceAPI`
- `recordFeedbackUse`
- Remove `SOURCE_API_URL` constant

- [ ] **Step 2: Update /api/external/test endpoint or remove**

If external test endpoint exists, update or remove it.

- [ ] **Step 3: Remove source API routes file if exists**

Check for and remove references to `sourceSystemRoutes.js`

- [ ] **Step 4: Commit**

```bash
git rm src/source-api-server.js src/sourceSystemRoutes.js 2>/dev/null || true
git add src/server.js
git commit -m "chore: remove external API dependencies"
```

---

### Task 7: Test the System

- [ ] **Step 1: Start the server**

```bash
cd /home/seare-misgana/Desktop/alternative\ survey/girum_survey
npm run dev
```

- [ ] **Step 2: Test admin login**

Visit `http://localhost:3000` and login with admin/admin123

- [ ] **Step 3: Test doctor CRUD**

Use API or admin UI to:
- Create 3 doctors
- Edit 1 doctor
- Delete 1 doctor

- [ ] **Step 4: Test survey flow**

1. Visit `http://localhost:3000/survey`
2. Verify doctor list loads
3. Select 2 doctors
4. Enter optional name
5. Answer questions
6. Submit
7. Verify success message

- [ ] **Step 5: Test token expiry/reuse**

1. Open survey, select doctors, close tab
2. Wait or check token not reusable
3. Try to submit again - should fail

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify complete survey flow"
```

---

## Spec Coverage Check

| Requirement | Task |
|-------------|------|
| Barcode entry → unique token | Task 3 |
| 24hr token expiry | Task 3 |
| One-time token use | Task 3 |
| Doctor CRUD | Task 2 |
| Patient selects doctors (multi) | Task 4 |
| Optional patient name | Task 4 |
| Rate each doctor separately | Task 4 (existing logic) |
| General questions | Task 4 (existing) |
| Bilingual survey (Amharic default) | Task 5 (existing) |
| English-only admin | Task 1 |
| Admin features preserved | Task 2, 3 |
| Email reports | Existing (untouched) |

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** - Execute tasks in this session using executing-plans

Which approach?
