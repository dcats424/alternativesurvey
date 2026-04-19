require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const db = require('./db');
const { sendSms } = require('./services/sms');
const { sendEmail } = require('./services/email');
const doctorsService = require('./services/doctors');
const surveyService = require('./services/survey');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || ('http://localhost:' + PORT)).replace(/\/$/, '');
const FRONTEND_DIST = path.join(__dirname, '../public/app');

const QUESTION_TYPES = new Set(['text', 'stars', 'single_choice', 'multi_choice', 'number', 'yes_no', 'scale_1_5']);

app.use(express.json());
app.use(express.static(FRONTEND_DIST));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/survey', function(req, res) {
  // Check if token already provided in query
  if (req.query.t) {
    // Token provided - serve the survey page
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  } else {
    // No token - generate one and redirect
    surveyService.createToken()
      .then(tokenData => {
        res.redirect('/survey?t=' + encodeURIComponent(tokenData.token));
      })
      .catch(e => {
        res.redirect('/');
      });
  }
});

async function ensureAdminUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
}

async function ensureSessionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at)`);
}

async function ensureDoctorsTableColumns() {
  await db.query(`ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email TEXT`);
}

async function loadSessions() {
  await db.query(`DELETE FROM admin_sessions WHERE expires_at < NOW()`);
  const result = await db.query('SELECT token, user_id, username, email FROM admin_sessions');
  const loaded = new Map();
  for (const row of result.rows) {
    loaded.set(row.token, { id: row.user_id, username: row.username, email: row.email });
  }
  return loaded;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

let sessions = new Map();

async function requireAuth(req, res, next) {
  const token = req.header('x-session-token');
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!sessions.has(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.adminUser = sessions.get(token);
  next();
}

app.get('/api/doctors', requireAuth, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    const result = await doctorsService.getDoctorsPaginated({ search, page, limit });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

app.post('/api/doctors', requireAuth, async (req, res) => {
  try {
    const { name, department, email } = req.body;
    const doctor = await doctorsService.createDoctor({ name, department, email });
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
    const { name, department, email, is_active } = req.body;
    const doctor = await doctorsService.updateDoctor(req.params.id, { name, department, email, is_active });
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

function requireAdmin(req, res, next) {
  const allowInsecure = String(process.env.ALLOW_INSECURE_ADMIN || 'true').toLowerCase() === 'true';
  if (allowInsecure) return next();

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return next();

  const key = req.header('x-admin-key');
  if (key !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  next();
}

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getExpiry() {
  const ttl = Number(process.env.TOKEN_TTL_HOURS || 48);
  const d = new Date();
  d.setHours(d.getHours() + ttl);
  return d.toISOString();
}

function textOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function normalizeRegistrationBody(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid_body' };

  const patientInput = body.patient || {};
  const patientName = textOrEmpty(patientInput.name);
  if (!patientName) return { error: 'patient_name_required' };

  const patientId = textOrEmpty(patientInput.id) || makeId('P');
  const visitId = textOrEmpty(body.visit_id) || makeId('V');
  const phone = textOrEmpty(body.phone || patientInput.phone) || null;

  const doctorsInput = Array.isArray(body.doctors) ? body.doctors : [];
  if (!doctorsInput.length) return { error: 'at_least_one_doctor_required' };

  const doctorMap = new Map();
  for (let i = 0; i < doctorsInput.length; i += 1) {
    const raw = doctorsInput[i] || {};
    const name = textOrEmpty(raw.name);
    if (!name) return { error: 'doctor_name_required_at_index_' + i };

    const id = textOrEmpty(raw.id) || makeId('D');
    if (!doctorMap.has(id)) doctorMap.set(id, { id, name });
  }

  const doctors = Array.from(doctorMap.values());
  if (!doctors.length) return { error: 'at_least_one_doctor_required' };

  return {
    payload: {
      patient: { id: patientId, name: patientName },
      doctors,
      visit_id: visitId
    },
    phone
  };
}

function normalizeQuestionType(type) {
  const t = textOrEmpty(type).toLowerCase();
  if (t === 'scale_1_5') return 'stars';
  return t;
}

function normalizeQuestionInput(body) {
  const labelEn = textOrEmpty(body.label_en || body.label);
  const labelAm = textOrEmpty(body.label_am || '');
  const type = normalizeQuestionType(body.type);
  const required = Boolean(body.required);
  const min = Number.isFinite(Number(body.min)) ? Number(body.min) : null;
  const max = Number.isFinite(Number(body.max)) ? Number(body.max) : null;
  const optionsEn = Array.isArray(body.options_en || body.options)
    ? (body.options_en || body.options).map(textOrEmpty).filter(Boolean)
    : typeof body.options_csv === 'string'
      ? body.options_csv.split(',').map(textOrEmpty).filter(Boolean)
      : [];
  const optionsAm = Array.isArray(body.options_am)
    ? body.options_am.map(textOrEmpty).filter(Boolean)
    : [];
  const category = body.category === 'doctor' ? 'doctor' : 'general';

  if (!labelEn) return { error: 'question_label_required' };
  if (!QUESTION_TYPES.has(type)) return { error: 'invalid_question_type' };
  if ((type === 'single_choice' || type === 'multi_choice') && optionsEn.length === 0) {
    return { error: 'options_required_for_choice_type' };
  }

  const label = { en: labelEn, am: labelAm || labelEn };
  const options = { en: optionsEn, am: optionsAm.length > 0 ? optionsAm : optionsEn };
  const key = textOrEmpty(body.key) || slugify(labelEn) || ('question_' + Date.now());

  return {
    question: {
      key,
      label,
      type,
      required,
      options,
      min_value: min,
      max_value: max,
      is_active: body.is_active === undefined ? true : Boolean(body.is_active),
      category
    }
  };
}

function validateQuestionAnswers(questionAnswers, questions, doctors) {
  if (!questionAnswers || typeof questionAnswers !== 'object' || Array.isArray(questionAnswers)) {
    return { ok: false, error: 'invalid_question_answers' };
  }

  const doctorQuestionKeys = new Set(questions.filter(q => q.category === 'doctor').map(q => q.key));
  const generalQuestionKeys = new Set(questions.filter(q => q.category === 'general').map(q => q.key));

  for (const q of questions) {
    const qType = normalizeQuestionType(q.type);
    
    let hasAnswer = false;
    let value = null;
    
    if (q.category === 'doctor' && doctors && doctors.length > 0) {
      for (const d of doctors) {
        const prefixedKey = 'doctor_' + d.id + '_' + q.key;
        if (Object.prototype.hasOwnProperty.call(questionAnswers, prefixedKey)) {
          hasAnswer = true;
          value = questionAnswers[prefixedKey];
          break;
        }
      }
    } else {
      hasAnswer = Object.prototype.hasOwnProperty.call(questionAnswers, q.key);
      value = questionAnswers[q.key];
    }

    if (q.required && !hasAnswer) return { ok: false, error: 'missing_answer_' + q.key };
    if (!hasAnswer) continue;

    if (qType === 'text') {
      if (typeof value !== 'string' || (q.required && !textOrEmpty(value))) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
    }

    if (qType === 'stars') {
      const min = Number.isFinite(Number(q.min_value)) ? Number(q.min_value) : 1;
      const max = Number.isFinite(Number(q.max_value)) ? Number(q.max_value) : 5;
      if (!Number.isInteger(value) || value < min || value > max) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
    }

    if (qType === 'single_choice') {
      let opts = Array.isArray(q.options) ? q.options : [];
      if (typeof opts === 'object' && opts !== null && !Array.isArray(opts)) {
        opts = opts.en || [];
      }
      if (typeof value !== 'string' || opts.indexOf(value) === -1) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
    }

    if (qType === 'multi_choice') {
      let opts = Array.isArray(q.options) ? q.options : [];
      if (typeof opts === 'object' && opts !== null && !Array.isArray(opts)) {
        opts = opts.en || [];
      }
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || opts.indexOf(v) === -1)) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
      if (q.required && value.length === 0) return { ok: false, error: 'invalid_answer_' + q.key };
    }

    if (qType === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num)) return { ok: false, error: 'invalid_answer_' + q.key };
      if (q.min_value !== null && q.min_value !== undefined && num < Number(q.min_value)) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
      if (q.max_value !== null && q.max_value !== undefined && num > Number(q.max_value)) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
    }

    if (qType === 'yes_no') {
      const normalized = typeof value === 'string' ? value.toLowerCase() : value;
      if (!(normalized === 'yes' || normalized === 'no' || normalized === true || normalized === false)) {
        return { ok: false, error: 'invalid_answer_' + q.key };
      }
    }
  }

  return { ok: true };
}

async function ensureQuestionsTableAndDefaults() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS survey_questions (
      id BIGSERIAL PRIMARY KEY,
      question_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      required BOOLEAN NOT NULL DEFAULT TRUE,
      options JSONB NOT NULL DEFAULT '[]'::jsonb,
      min_value NUMERIC,
      max_value NUMERIC,
      order_no INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  await db.query(`
    ALTER TABLE survey_questions 
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'
  `);
}

async function fetchQuestions(args) {
  const includeInactive = args && args.includeInactive;
  const categoryFilter = args && args.category;
  
  let whereClause = 'is_deleted = FALSE';
  if (!includeInactive) {
    whereClause += ' AND is_active = TRUE';
  }
  if (categoryFilter) {
    whereClause += ` AND category = '${categoryFilter}'`;
  }
  
  const rows = await db.query(
    `SELECT id, question_key, label, type, required, options, min_value, max_value, order_no, is_active, page_number, category
     FROM survey_questions
     WHERE ${whereClause}
     ORDER BY page_number ASC, order_no ASC, id ASC`
  );

  return rows.rows.map((r) => {
    let parsedLabel = r.label;
    if (typeof r.label === 'string') {
      try { parsedLabel = JSON.parse(r.label); } catch (e) { parsedLabel = { en: r.label, am: r.label }; }
    }
    if (typeof parsedLabel !== 'object' || parsedLabel === null) {
      parsedLabel = { en: String(r.label || ''), am: String(r.label || '') };
    }
    
    let parsedOptions = r.options;
    if (Array.isArray(r.options)) {
      parsedOptions = { en: r.options, am: r.options };
    } else if (typeof r.options === 'string') {
      try { parsedOptions = JSON.parse(r.options); } catch (e) { parsedOptions = { en: [], am: [] }; }
    }
    if (typeof parsedOptions !== 'object' || parsedOptions === null || Array.isArray(parsedOptions)) {
      parsedOptions = { en: Array.isArray(r.options) ? r.options : [], am: Array.isArray(r.options) ? r.options : [] };
    }

    return {
      id: Number(r.id),
      key: r.question_key,
      label: parsedLabel,
      type: normalizeQuestionType(r.type),
      required: Boolean(r.required),
      options: parsedOptions,
      min_value: r.min_value === null ? null : Number(r.min_value),
      max_value: r.max_value === null ? null : Number(r.max_value),
      order_no: Number(r.order_no),
      is_active: Boolean(r.is_active),
      page_number: Number(r.page_number) || 1,
      category: r.category || 'general'
    };
  });
}

async function upsertVisitGraph(payload) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO patients(id, patient_name) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET patient_name = EXCLUDED.patient_name',
      [payload.patient.id, payload.patient.patient_name]
    );

    await client.query(
      'INSERT INTO visits(id, patient_id) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET patient_id = EXCLUDED.patient_id',
      [payload.visit_id, payload.patient.id]
    );

    for (const doctor of payload.doctors) {
      await client.query(
        'INSERT INTO doctors(id, doctor_name) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET doctor_name = EXCLUDED.doctor_name',
        [doctor.id, doctor.doctor_name]
      );

      await client.query(
        'INSERT INTO visit_doctors(visit_id, doctor_id) VALUES($1, $2) ON CONFLICT (visit_id, doctor_id) DO NOTHING',
        [payload.visit_id, doctor.id]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function createTokenRecord(args) {
  const token = generateToken();
  const expiresAt = getExpiry();
  const maxUses = Number(process.env.TOKEN_MAX_USES || 1);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO survey_tokens(token, visit_id, patient_id, phone, expires_at, max_uses, used_count) VALUES($1, $2, $3, $4, $5, $6, 0)',
      [token, args.visitId, args.patientId, args.phone || null, expiresAt, maxUses]
    );

    for (const doctorId of args.doctorIds) {
      await client.query('INSERT INTO token_doctors(token, doctor_id) VALUES($1, $2)', [token, doctorId]);
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  return { token, expiresAt, maxUses };
}



async function issueSurveyFromPayload(payload, phone) {
  await upsertVisitGraph(payload);

  const tokenInfo = await createTokenRecord({
    visitId: payload.visit_id,
    patientId: payload.patient.id,
    doctorIds: payload.doctors.map(function (d) { return d.id; }),
    phone
  });

  const link = BASE_URL + '/survey?t=' + encodeURIComponent(tokenInfo.token);

  return {
    token: tokenInfo.token,
    link,
    expires_at: tokenInfo.expiresAt,
    max_uses: tokenInfo.maxUses
  };
}

app.get('/health', function (_req, res) {
  res.json({ ok: true });
});

app.post('/api/patients/upsert', async function (req, res) {
  try {
    const id = textOrEmpty(req.body.id) || makeId('P');
    const name = textOrEmpty(req.body.name);
    if (!name) return res.status(400).json({ error: 'patient_name_required' });

    const row = await db.query(
      'INSERT INTO patients(id, name) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
      [id, name]
    );

    return res.json({ patient: row.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'patient_upsert_failed', details: e.message });
  }
});

app.post('/api/doctors/upsert', async function (req, res) {
  try {
    const id = textOrEmpty(req.body.id) || makeId('D');
    const name = textOrEmpty(req.body.name);
    if (!name) return res.status(400).json({ error: 'doctor_name_required' });

    const row = await db.query(
      'INSERT INTO doctors(id, name) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
      [id, name]
    );

    return res.json({ doctor: row.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: 'doctor_upsert_failed', details: e.message });
  }
});

app.get('/api/patients', async function (req, res) {
  try {
    const q = '%' + textOrEmpty(req.query.q || '') + '%';
    const rows = await db.query(
      'SELECT id, patient_name FROM patients WHERE ($1 = \'%%\' OR patient_name ILIKE $1 OR id ILIKE $1) ORDER BY patient_name ASC LIMIT 200',
      [q]
    );
    return res.json({ count: rows.rowCount, patients: rows.rows });
  } catch (e) {
    return res.status(500).json({ error: 'patients_list_failed', details: e.message });
  }
});

app.get('/api/doctors', async function (req, res) {
  try {
    const q = '%' + textOrEmpty(req.query.q || '') + '%';
    const rows = await db.query(
      'SELECT id, doctor_name FROM doctors WHERE ($1 = \'%%\' OR doctor_name ILIKE $1 OR id ILIKE $1) ORDER BY doctor_name ASC LIMIT 200',
      [q]
    );
    return res.json({ count: rows.rowCount, doctors: rows.rows });
  } catch (e) {
    return res.status(500).json({ error: 'doctors_list_failed', details: e.message });
  }
});

app.get('/api/visits/:visitId', async function (req, res) {
  try {
    const visitId = req.params.visitId;

    const visit = await db.query(
      'SELECT v.id AS visit_id, v.created_at, p.id AS patient_id, p.patient_name FROM visits v JOIN patients p ON p.id = v.patient_id WHERE v.id = $1',
      [visitId]
    );

    if (!visit.rowCount) return res.status(404).json({ error: 'visit_not_found' });

    const doctors = await db.query(
      'SELECT d.id, d.doctor_name FROM visit_doctors vd JOIN doctors d ON d.id = vd.doctor_id WHERE vd.visit_id = $1 ORDER BY d.doctor_name ASC',
      [visitId]
    );

    return res.json({ visit: visit.rows[0], doctors: doctors.rows });
  } catch (e) {
    return res.status(500).json({ error: 'visit_fetch_failed', details: e.message });
  }
});

app.post('/api/register/visit', async function (req, res) {
  try {
    const normalized = normalizeRegistrationBody(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const payload = normalized.payload;
    const out = await issueSurveyFromPayload(payload, normalized.phone);

    let sms = { ok: false, skipped: true, reason: 'no_phone_provided' };
    if (normalized.phone) {
      sms = await sendSms({ to: normalized.phone, message: 'Please provide feedback: ' + out.link });
    }

    return res.json({
      ...out,
      visit: {
        visit_id: payload.visit_id,
        patient: payload.patient,
        doctors: payload.doctors
      },
      sms
    });
  } catch (e) {
    return res.status(500).json({ error: 'register_visit_failed', details: e.message });
  }
});

app.get('/api/external/test', async function (_req, res) {
  return res.json({ ok: true, message: 'External API test endpoint (no-op)' });
});

app.get('/api/questions', requireAuth, async function (req, res) {
  try {
    await ensureQuestionsTableAndDefaults();
    const includeInactive = String(req.query.all || '').toLowerCase() === 'true';
    const questions = await fetchQuestions({ includeInactive });
    return res.json({ count: questions.length, questions });
  } catch (e) {
    return res.status(500).json({ error: 'questions_fetch_failed', details: e.message });
  }
});

app.post('/api/questions', requireAuth, async function (req, res) {
  try {
    await ensureQuestionsTableAndDefaults();
    const normalized = normalizeQuestionInput(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const q = normalized.question;
    const orderNo = Number.isInteger(req.body.order_no)
      ? req.body.order_no
      : (await db.query('SELECT COALESCE(MAX(order_no), 0) + 1 AS next_order FROM survey_questions WHERE is_deleted = FALSE')).rows[0].next_order;

    const pageNum = Number.isInteger(req.body.page_number) && req.body.page_number >= 1 ? req.body.page_number : 1;
    const inserted = await db.query(
      'INSERT INTO survey_questions(question_key, label, type, required, options, min_value, max_value, order_no, is_active, is_deleted, page_number, category) VALUES($1,$2::jsonb,$3,$4,$5::jsonb,$6,$7,$8,$9,FALSE,$10,$11) RETURNING id, question_key, label, type, required, options, min_value, max_value, order_no, is_active, page_number, category',
      [q.key, JSON.stringify(q.label), q.type, q.required, JSON.stringify(q.options), q.min_value, q.max_value, orderNo, q.is_active, pageNum, q.category]
    );

    await logActivity(req.adminUser.id, 'create_question', { question_id: inserted.rows[0].id, label: q.label });
    return res.json({ question: inserted.rows[0] });
  } catch (e) {
    if (String(e.message || '').toLowerCase().includes('unique')) {
      return res.status(400).json({ error: 'question_key_already_exists' });
    }
    return res.status(500).json({ error: 'question_create_failed', details: e.message });
  }
});

app.patch('/api/questions/:id', requireAuth, async function (req, res) {
  try {
    await ensureQuestionsTableAndDefaults();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_question_id' });

    const current = await db.query('SELECT * FROM survey_questions WHERE id = $1 AND is_deleted = FALSE', [id]);
    if (!current.rowCount) return res.status(404).json({ error: 'question_not_found' });

    const source = current.rows[0];
    let sourceLabel = source.label;
    if (typeof sourceLabel === 'string') {
      try { sourceLabel = JSON.parse(sourceLabel); } catch (e) { sourceLabel = { en: sourceLabel, am: sourceLabel }; }
    }
    let sourceOptions = source.options;
    if (Array.isArray(sourceOptions)) {
      sourceOptions = { en: sourceOptions, am: sourceOptions };
    } else if (typeof sourceOptions === 'string') {
      try { sourceOptions = JSON.parse(sourceOptions); } catch (e) { sourceOptions = { en: [], am: [] }; }
    }
    if (typeof sourceOptions !== 'object' || sourceOptions === null) {
      sourceOptions = { en: [], am: [] };
    }

    const merged = {
      key: textOrEmpty(req.body.key) || source.question_key,
      label: {
        en: textOrEmpty(req.body.label_en || req.body.label) || (sourceLabel.en || sourceLabel),
        am: textOrEmpty(req.body.label_am) || (sourceLabel.am || sourceLabel.en || sourceLabel)
      },
      type: normalizeQuestionType(req.body.type || source.type),
      required: req.body.required === undefined ? source.required : Boolean(req.body.required),
      options: {
        en: Array.isArray(req.body.options_en || req.body.options)
          ? (req.body.options_en || req.body.options).map(textOrEmpty).filter(Boolean)
          : (sourceOptions.en || []),
        am: Array.isArray(req.body.options_am)
          ? req.body.options_am.map(textOrEmpty).filter(Boolean)
          : (sourceOptions.am || sourceOptions.en || [])
      },
      min_value: req.body.min === undefined ? source.min_value : Number(req.body.min),
      max_value: req.body.max === undefined ? source.max_value : Number(req.body.max),
      order_no: req.body.order_no === undefined ? source.order_no : Number(req.body.order_no),
      is_active: req.body.is_active === undefined ? source.is_active : Boolean(req.body.is_active),
      page_number: req.body.page_number === undefined ? Number(source.page_number) || 1 : Number(req.body.page_number),
      category: req.body.category === 'doctor' ? 'doctor' : (req.body.category === 'general' ? 'general' : (source.category || 'general'))
    };

    if (!QUESTION_TYPES.has(merged.type)) return res.status(400).json({ error: 'invalid_question_type' });
    if ((merged.type === 'single_choice' || merged.type === 'multi_choice') && (!merged.options.en || merged.options.en.length === 0)) {
      return res.status(400).json({ error: 'options_required_for_choice_type' });
    }

    const updated = await db.query(
      'UPDATE survey_questions SET question_key=$1,label=$2::jsonb,type=$3,required=$4,options=$5::jsonb,min_value=$6,max_value=$7,order_no=$8,is_active=$9,page_number=$10,category=$11,updated_at=NOW() WHERE id=$12 RETURNING id, question_key, label, type, required, options, min_value, max_value, order_no, is_active, page_number, category',
      [merged.key, JSON.stringify(merged.label), merged.type, merged.required, JSON.stringify(merged.options || { en: [], am: [] }), merged.min_value, merged.max_value, merged.order_no, merged.is_active, merged.page_number, merged.category, id]
    );

    await logActivity(req.adminUser.id, 'update_question', { question_id: id, label: merged.label });
    return res.json({ question: updated.rows[0] });
  } catch (e) {
    if (String(e.message || '').toLowerCase().includes('unique')) {
      return res.status(400).json({ error: 'question_key_already_exists' });
    }
    return res.status(500).json({ error: 'question_update_failed', details: e.message });
  }
});

app.delete('/api/questions/:id', requireAuth, async function (req, res) {
  try {
    await ensureQuestionsTableAndDefaults();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_question_id' });

    const out = await db.query(
      'DELETE FROM survey_questions WHERE id = $1 RETURNING id',
      [id]
    );

    if (!out.rowCount) return res.status(404).json({ error: 'question_not_found' });
    await logActivity(req.adminUser.id, 'delete_question', { question_id: id });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'question_delete_failed', details: e.message });
  }
});

app.post('/api/questions/reorder', requireAuth, async function (req, res) {
  try {
    await ensureQuestionsTableAndDefaults();
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0) : [];
    if (!ids.length) return res.status(400).json({ error: 'ids_required' });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < ids.length; i += 1) {
        await client.query('UPDATE survey_questions SET order_no=$1, updated_at=NOW() WHERE id=$2 AND is_deleted=FALSE', [i + 1, ids[i]]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'questions_reorder_failed', details: e.message });
  }
});

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

app.get('/api/survey', async (req, res) => {
  const token = req.query.token || req.query.t;
  
  if (!token) {
    return res.status(400).json({ error: 'token_required' });
  }
  
  const validation = await surveyService.validateToken(token);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }
  
  const doctors = await db.query(
    `SELECT id, name, department FROM doctors WHERE is_active = TRUE ORDER BY name ASC`
  );
  
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

app.get('/api/responses', requireAuth, async function (req, res) {
  const grouped = String(req.query.grouped || '').toLowerCase() === 'true';
  const search = String(req.query.search || '').trim();
  const doctorId = String(req.query.doctor_id || '').trim();
  const dateFrom = String(req.query.date_from || '').trim();
  const dateTo = String(req.query.date_to || '').trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(`(
      fs.patient_name ILIKE $${paramIdx} OR
      fs.token ILIKE $${paramIdx}
    )`);
    params.push('%' + search + '%');
    paramIdx++;
  }

  if (doctorId) {
    conditions.push(`fs.selected_doctor_ids::text ILIKE $${paramIdx}`);
    params.push('%' + doctorId + '%');
    paramIdx++;
  }

  if (dateFrom) {
    conditions.push(`fs.submitted_at >= $${paramIdx}`);
    params.push(dateFrom);
    paramIdx++;
  }

  if (dateTo) {
    conditions.push(`fs.submitted_at <= $${paramIdx}`);
    params.push(dateTo + 'T23:59:59.999');
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  if (!grouped) {
    let sql = `SELECT fs.id AS submission_id, fs.submitted_at, fs.token, fs.patient_name,
               fs.question_answers
               FROM feedback_submissions fs
               ${whereClause}
               ORDER BY fs.submitted_at DESC, fs.id DESC`;
    const rows = await db.query(sql, params);
    return res.json({ count: rows.rowCount, responses: rows.rows });
  }

  const countSql = `SELECT COUNT(DISTINCT fs.id) AS total FROM feedback_submissions fs ${whereClause}`;
  const countResult = await db.query(countSql, params);
  const totalCount = parseInt(countResult.rows[0]?.total || 0);
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;

  let sql = `SELECT fs.id AS submission_id, fs.submitted_at, fs.token, fs.patient_name,
             fs.selected_doctor_names, fs.question_answers
             FROM feedback_submissions fs
             ${whereClause}
             ORDER BY fs.submitted_at DESC, fs.id DESC
             LIMIT ${limit} OFFSET ${offset}`;
  const rows = await db.query(sql, params);

  const responses = rows.rows.map((row) => ({
    submission_id: row.submission_id,
    submitted_at: row.submitted_at,
    token: row.token,
    patient_name: row.patient_name,
    doctor_names: row.selected_doctor_names ? row.selected_doctor_names.join(', ') : '',
    question_answers: row.question_answers || {}
  }));

  return res.json({
    count: responses.length,
    total: totalCount,
    page,
    limit,
    total_pages: totalPages,
    responses: responses
  });
});

app.delete('/api/responses', requireAuth, async function (req, res) {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids_required' });
  }

  const safeIds = ids.map((id) => String(id).trim()).filter(Boolean);
  if (safeIds.length === 0) {
    return res.status(400).json({ error: 'ids_required' });
  }

  try {
    const delSubmissions = await db.query(
      `DELETE FROM feedback_submissions WHERE id = ANY($1::bigint[])`,
      [safeIds.map(id => parseInt(id))]
    );
    return res.json({ ok: true, deleted: delSubmissions.rowCount });
  } catch (e) {
    console.error('Delete responses error:', e);
    return res.status(500).json({ error: 'delete_failed', details: e.message });
  }
});

app.get('/api/doctors/list', requireAuth, async function (_req, res) {
  try {
    const rows = await db.query(`
      SELECT DISTINCT unnest(fs.selected_doctor_ids) as doctor_id, 
             unnest(fs.selected_doctor_names) as doctor_name
      FROM feedback_submissions fs
      WHERE fs.selected_doctor_ids IS NOT NULL
      ORDER BY doctor_name ASC
    `);
    return res.json({ doctors: rows.rows });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

app.get('/api/doctor-ratings', requireAuth, async function (req, res) {
  try {
    const doctorNameFilter = textOrEmpty(req.query.doctor_name || '');
    const dateFrom = textOrEmpty(req.query.date_from || '');
    const dateTo = textOrEmpty(req.query.date_to || '');

    let whereConditions = [];
    let params = [];
    let paramIdx = 1;

    if (dateFrom) {
      whereConditions.push(`submitted_at >= $${paramIdx++}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push(`submitted_at <= $${paramIdx++}`);
      params.push(dateTo + ' 23:59:59');
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const doctorQuestions = await db.query(
      `SELECT id, question_key, label, type FROM survey_questions WHERE category = 'doctor' AND is_active = TRUE AND is_deleted = FALSE ORDER BY page_number ASC, order_no ASC, id ASC`
    );

    const submissions = await db.query(`
      SELECT id, patient_name, selected_doctor_ids, selected_doctor_names, question_answers, submitted_at
      FROM feedback_submissions
      ${whereClause}
      ORDER BY submitted_at DESC
    `, params);

    const doctorStats = {};

    for (const sub of submissions.rows) {
      const qa = sub.question_answers || {};
      const doctorIdsList = sub.selected_doctor_ids || [];
      const doctorNamesList = sub.selected_doctor_names || [];
      
      const allKeys = Object.keys(qa);
      const doctorIdsInOrder = [];
      const seenIds = new Set();
      
      for (const key of allKeys) {
        if (key.startsWith('doctor_')) {
          const match = key.match(/^doctor_([^_]+)_(.+)$/);
          if (match) {
            const doctorId = match[1];
            if (!seenIds.has(doctorId)) {
              seenIds.add(doctorId);
              doctorIdsInOrder.push(doctorId);
            }
          }
        }
      }
      
      const localIdToNameMap = {};
      if (doctorIdsList.length > 0 && doctorIdsList.length === doctorNamesList.length) {
        for (let i = 0; i < doctorIdsList.length; i++) {
          localIdToNameMap[doctorIdsList[i]] = doctorNamesList[i];
        }
      } else {
        for (let i = 0; i < doctorIdsInOrder.length; i++) {
          localIdToNameMap[doctorIdsInOrder[i]] = doctorNamesList[i] || doctorIdsInOrder[i];
        }
      }
      
      const doctorRatingsInSubmission = {};
      
      for (const dq of doctorQuestions.rows) {
        const questionKey = dq.question_key || String(dq.id);
        for (const doctorId of doctorIdsInOrder) {
          const answerKey = `doctor_${doctorId}_${questionKey}`;
          const answerValue = qa[answerKey];
          
          if (answerValue !== undefined && answerValue !== null) {
            if (!doctorRatingsInSubmission[doctorId]) {
              doctorRatingsInSubmission[doctorId] = { total: 0, count: 0, questions: {} };
            }
            
            if (dq.type === 'yes_no') {
              const normalizedAnswer = String(answerValue).toLowerCase();
              if (normalizedAnswer === 'yes' || normalizedAnswer === 'no') {
                if (!doctorRatingsInSubmission[doctorId].questions[questionKey]) {
                  doctorRatingsInSubmission[doctorId].questions[questionKey] = {
                    type: 'yes_no',
                    yes_count: 0,
                    no_count: 0,
                    total: 0,
                    count: 0
                  };
                }
                if (normalizedAnswer === 'yes') {
                  doctorRatingsInSubmission[doctorId].questions[questionKey].yes_count++;
                } else {
                  doctorRatingsInSubmission[doctorId].questions[questionKey].no_count++;
                }
                doctorRatingsInSubmission[doctorId].questions[questionKey].count++;
              }
            } else {
              const numericValue = Number(answerValue);
              if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
                if (!doctorRatingsInSubmission[doctorId].questions[questionKey]) {
                  doctorRatingsInSubmission[doctorId].questions[questionKey] = {
                    type: dq.type,
                    total: 0,
                    count: 0
                  };
                }
                doctorRatingsInSubmission[doctorId].questions[questionKey].total += numericValue;
                doctorRatingsInSubmission[doctorId].questions[questionKey].count++;
                doctorRatingsInSubmission[doctorId].total += numericValue;
                doctorRatingsInSubmission[doctorId].count++;
              }
            }
          }
        }
      }
      
      for (const doctorId of Object.keys(doctorRatingsInSubmission)) {
        const docData = doctorRatingsInSubmission[doctorId];
        
        if (!doctorStats[doctorId]) {
          let doctorName = localIdToNameMap[doctorId] || doctorId;
          if (!doctorName.match(/^dr\.?\s/i)) {
            doctorName = 'Dr. ' + doctorName;
          }
          
          doctorStats[doctorId] = {
            doctor_id: doctorId,
            doctor_name: doctorName,
            department: 'General',
            patient_count: 0,
            total_patient_avg: 0,
            five_star: 0,
            four_star: 0,
            three_star: 0,
            two_star: 0,
            one_star: 0,
            question_ratings: {}
          };
        }
        
        const patientAvg = docData.count > 0 ? docData.total / docData.count : 0;
        doctorStats[doctorId].patient_count++;
        doctorStats[doctorId].total_patient_avg += patientAvg;
        
        const roundedAvg = Math.round(patientAvg);
        if (roundedAvg === 5) doctorStats[doctorId].five_star++;
        else if (roundedAvg === 4) doctorStats[doctorId].four_star++;
        else if (roundedAvg === 3) doctorStats[doctorId].three_star++;
        else if (roundedAvg === 2) doctorStats[doctorId].two_star++;
        else if (roundedAvg === 1) doctorStats[doctorId].one_star++;
        
        for (const [qKey, qData] of Object.entries(docData.questions)) {
          if (!doctorStats[doctorId].question_ratings[qKey]) {
            doctorStats[doctorId].question_ratings[qKey] = {
              question_key: qKey,
              type: qData.type || 'stars',
              total: 0,
              count: 0
            };
            if (qData.type === 'yes_no') {
              doctorStats[doctorId].question_ratings[qKey].yes_count = 0;
              doctorStats[doctorId].question_ratings[qKey].no_count = 0;
            }
          }
          doctorStats[doctorId].question_ratings[qKey].total += qData.total || 0;
          doctorStats[doctorId].question_ratings[qKey].count += qData.count;
          if (qData.type === 'yes_no') {
            doctorStats[doctorId].question_ratings[qKey].yes_count += qData.yes_count || 0;
            doctorStats[doctorId].question_ratings[qKey].no_count += qData.no_count || 0;
          }
        }
      }
    }

    const orderedQuestions = doctorQuestions.rows || [];
    const questionKeyOrder = new Map(orderedQuestions.map((q, idx) => [q.question_key, idx]));
    
    let ratings = Object.values(doctorStats).map(d => {
      const qKeyOrder = new Map([...questionKeyOrder].map(([k, v]) => [k, v]));
      const questionRatingsArray = Object.values(d.question_ratings)
        .filter(qr => qr.count > 0)
        .sort((a, b) => (qKeyOrder.get(a.question_key) ?? 999) - (qKeyOrder.get(b.question_key) ?? 999))
        .map(qr => ({
          question_key: qr.question_key,
          type: qr.type,
          average: qr.count > 0 ? qr.total / qr.count : 0,
          count: qr.count,
          yes_count: qr.yes_count || 0,
          no_count: qr.no_count || 0
        }));

      return {
        doctor_id: d.doctor_id,
        doctor_name: d.doctor_name,
        department: d.department,
        total_patients: d.patient_count,
        average_rating: d.patient_count > 0 ? d.total_patient_avg / d.patient_count : 0,
        five_star: d.five_star,
        four_star: d.four_star,
        three_star: d.three_star,
        two_star: d.two_star,
        one_star: d.one_star,
        question_ratings: questionRatingsArray
      };
    });

    if (doctorNameFilter) {
      ratings = ratings.filter(r => 
        r.doctor_name.toLowerCase().includes(doctorNameFilter.toLowerCase()) ||
        r.doctor_id.toLowerCase().includes(doctorNameFilter.toLowerCase())
      );
    }

    ratings.sort((a, b) => a.doctor_name.localeCompare(b.doctor_name));

    const doctorIds = ratings.map(r => r.doctor_id);
    const doctorNames = ratings.map(r => r.doctor_name.replace(/^Dr\.?\s*/i, '').trim().toLowerCase());
    let doctorEmails = {};
    
    if (doctorIds.length > 0) {
      const emailResult = await db.query(
        `SELECT id, name, email FROM doctors`
      );
      for (const row of emailResult.rows) {
        const rowName = (row.name || '').replace(/^Dr\.?\s*/i, '').trim().toLowerCase();
        if (doctorIds.includes(row.id)) {
          doctorEmails[row.id] = row.email;
        }
        if (doctorNames.includes(rowName) && rowName.length > 0) {
          const ratingDoctor = ratings.find(r => 
            r.doctor_name.replace(/^Dr\.?\s*/i, '').trim().toLowerCase() === rowName
          );
          if (ratingDoctor && !doctorEmails[ratingDoctor.doctor_id]) {
            doctorEmails[ratingDoctor.doctor_id] = row.email;
          }
        }
      }
    }

    ratings = ratings.map(r => ({
      ...r,
      email: doctorEmails[r.doctor_id] || ''
    }));

    return res.json({ ratings });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

app.post('/api/doctor-ratings/send-email', requireAuth, async function (req, res) {
  try {
    const { doctor_id, doctor_name, email, average_rating, total_patients, total_ratings, date_from, date_to, question_ratings, department } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email_required' });
    }

    const rating = Number(average_rating) || 0;
    const total = Number(total_patients || total_ratings || 0);
    
    const getRatingStatus = () => {
      if (rating >= 4.5) return 'Excellent';
      if (rating >= 4.0) return 'Very Good';
      if (rating >= 3.5) return 'Good';
      if (rating >= 3.0) return 'Average';
      if (rating >= 2.0) return 'Below Average';
      return 'Poor';
    };
    
    const getFeedbackMessage = () => {
      let strengths = [];
      let improvements = [];
      
      if (Array.isArray(question_ratings) && question_ratings.length > 0) {
        for (const qr of question_ratings) {
          const avg = Number(qr.average) || 0;
          const questionName = qr.question_key || 'Rating';
          
          if (qr.type === 'yes_no') {
            const yesCount = qr.yes_count || 0;
            const noCount = qr.no_count || 0;
            const yesPct = (yesCount + noCount) > 0 ? Math.round((yesCount / (yesCount + noCount)) * 100) : 0;
            if (yesPct >= 80) {
              strengths.push(questionName);
            } else if (yesPct < 50) {
              improvements.push(questionName);
            }
          } else {
            if (avg >= 4.0) {
              strengths.push(questionName);
            } else if (avg < 3.0) {
              improvements.push(questionName);
            }
          }
        }
      }
      
      if (rating >= 4.0) {
        return 'Your overall performance is rated as Excellent. Patients consistently rate you at the highest levels across all aspects of care. Your dedication to patient satisfaction is evident. Continue providing this exceptional level of care.';
      } else if (rating >= 3.5 && improvements.length > 0) {
        return `Your overall performance is rated as Good. Patients appreciate your care and service.\n\nAreas where you excel: ${strengths.join(', ')}.\n\nAreas for improvement: ${improvements.join(', ')}. Focusing on these areas could help enhance overall patient satisfaction even more.`;
      } else if (rating >= 3.5) {
        return 'Your overall performance is rated as Good. Patients appreciate the care and service you provide. Your professionalism and communication were positively recognized.\n\nThere are opportunities for further improvement in areas such as quality of care experience and time & attention, which could help enhance overall patient satisfaction even more.';
      } else if (rating >= 3.0) {
        return `Your overall performance is rated as Average. ${improvements.length > 0 ? `Specific areas needing attention: ${improvements.join(', ')}.` : 'Consider reviewing the detailed feedback to identify specific areas where you can enhance patient experience.'}`;
      } else {
        return `Your overall performance needs improvement. We recommend focusing on: ${improvements.length > 0 ? improvements.join(', ') : 'all aspects of patient care'}. Please review the detailed feedback carefully and work with your supervisors to develop an improvement plan.`;
      }
    };
    
    const status = getRatingStatus();
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'All Time';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };

    let categoryRatingsText = '';
    if (Array.isArray(question_ratings) && question_ratings.length > 0) {
      const categoryLines = question_ratings.map(qr => {
        const questionName = qr.question_key || 'Rating';
        const yesCount = qr.yes_count || 0;
        const noCount = qr.no_count || 0;
        const avg = Number(qr.average).toFixed(1);
        
        if (qr.type === 'yes_no') {
          const yesPct = (yesCount + noCount) > 0 ? Math.round((yesCount / (yesCount + noCount)) * 100) : 0;
          return `* ${questionName}: ${yesPct}% Positive Response (${yesCount} Yes / ${noCount} No)`;
        }
        return `* ${questionName}: ${avg} / 5.0`;
      });
      categoryRatingsText = categoryLines.join('\n');
    }

    const message = `Dear ${doctor_name},

Please find below your Patient Feedback Performance Report for the evaluation period ${formatDate(date_from)} - ${formatDate(date_to)}.

This report is based on feedback received from ${total} patient${total !== 1 ? 's' : ''} who completed the patient satisfaction survey during their visit.

Overall Performance Rating

${rating.toFixed(1)} / 5.0
Performance Level: ${status}

Category Ratings

${categoryRatingsText}

Performance Summary

${getFeedbackMessage()}

We appreciate your continued commitment to delivering quality healthcare services and value your dedication to patient care.

Kind regards,
Management Team
Patient Experience & Quality Department`;

    const html = `<pre style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${message}</pre>`;

    try {
      const result = await sendEmail({
        to: email,
        subject: `Patient Feedback Report - ${doctor_name} | Rating: ${rating.toFixed(1)}/5`,
        html
      });

      if (!result.ok) {
        return res.status(500).json({ error: 'email_failed', details: result.error });
      }

      return res.json({ ok: true, message: 'Email sent successfully' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      return res.status(500).json({ error: 'email_failed', details: emailError.message });
    }
  } catch (e) {
    console.error('Send email error:', e);
    return res.status(500).json({ error: 'send_failed', details: e.message });
  }
});

app.post('/api/doctor-ratings/send-all', requireAuth, async function (req, res) {
  try {
    const { ratings, date_from, date_to } = req.body;
    
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({ error: 'ratings_required' });
    }

    const results = { sent: [], failed: [] };
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'All Time';
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    };
    
    const getRatingStatus = (rating) => {
      if (rating >= 4.5) return 'Excellent';
      if (rating >= 4.0) return 'Very Good';
      if (rating >= 3.5) return 'Good';
      if (rating >= 3.0) return 'Average';
      if (rating >= 2.0) return 'Below Average';
      return 'Poor';
    };
    
    const getFeedbackMessage = (rating, question_ratings) => {
      let strengths = [];
      let improvements = [];
      
      if (Array.isArray(question_ratings) && question_ratings.length > 0) {
        for (const qr of question_ratings) {
          const avg = Number(qr.average) || 0;
          const questionName = qr.question_key || 'Rating';
          
          if (qr.type === 'yes_no') {
            const yesCount = qr.yes_count || 0;
            const noCount = qr.no_count || 0;
            const yesPct = (yesCount + noCount) > 0 ? Math.round((yesCount / (yesCount + noCount)) * 100) : 0;
            if (yesPct >= 80) {
              strengths.push(questionName);
            } else if (yesPct < 50) {
              improvements.push(questionName);
            }
          } else {
            if (avg >= 4.0) {
              strengths.push(questionName);
            } else if (avg < 3.0) {
              improvements.push(questionName);
            }
          }
        }
      }
      
      if (rating >= 4.0) {
        return 'Your overall performance is rated as Excellent. Patients consistently rate you at the highest levels across all aspects of care. Your dedication to patient satisfaction is evident. Continue providing this exceptional level of care.';
      } else if (rating >= 3.5 && improvements.length > 0) {
        return `Your overall performance is rated as Good. Patients appreciate your care and service.\n\nAreas where you excel: ${strengths.join(', ')}.\n\nAreas for improvement: ${improvements.join(', ')}. Focusing on these areas could help enhance overall patient satisfaction even more.`;
      } else if (rating >= 3.5) {
        return 'Your overall performance is rated as Good. Patients appreciate the care and service you provide. Your professionalism and communication were positively recognized.\n\nThere are opportunities for further improvement in areas such as quality of care experience and time & attention, which could help enhance overall patient satisfaction even more.';
      } else if (rating >= 3.0) {
        return `Your overall performance is rated as Average. ${improvements.length > 0 ? `Specific areas needing attention: ${improvements.join(', ')}.` : 'Consider reviewing the detailed feedback to identify specific areas where you can enhance patient experience.'}`;
      } else {
        return `Your overall performance needs improvement. We recommend focusing on: ${improvements.length > 0 ? improvements.join(', ') : 'all aspects of patient care'}. Please review the detailed feedback carefully and work with your supervisors to develop an improvement plan.`;
      }
    };

    for (const doctor of ratings) {
      const { doctor_id, doctor_name, email, average_rating, total_patients, question_ratings } = doctor;
      
      if (!email) {
        results.failed.push({ doctor_id, doctor_name, error: 'No email' });
        continue;
      }

      const rating = Number(average_rating) || 0;
      const total = Number(total_patients || 0);
      const status = getRatingStatus(rating);

      let categoryRatingsText = '';
      if (Array.isArray(question_ratings) && question_ratings.length > 0) {
        const categoryLines = question_ratings.map(qr => {
          const questionName = qr.question_key || 'Rating';
          const yesCount = qr.yes_count || 0;
          const noCount = qr.no_count || 0;
          const avg = Number(qr.average).toFixed(1);
          
          if (qr.type === 'yes_no') {
            const yesPct = (yesCount + noCount) > 0 ? Math.round((yesCount / (yesCount + noCount)) * 100) : 0;
            return `* ${questionName}: ${yesPct}% Positive Response (${yesCount} Yes / ${noCount} No)`;
          }
          return `* ${questionName}: ${avg} / 5.0`;
        });
        categoryRatingsText = categoryLines.join('\n');
      }

      const message = `Dear ${doctor_name},

Please find below your Patient Feedback Performance Report for the evaluation period ${formatDate(date_from)} - ${formatDate(date_to)}.

This report is based on feedback received from ${total} patient${total !== 1 ? 's' : ''} who completed the patient satisfaction survey during their visit.

Overall Performance Rating

${rating.toFixed(1)} / 5.0
Performance Level: ${status}

Category Ratings

${categoryRatingsText}

Performance Summary

${getFeedbackMessage(rating, question_ratings)}

We appreciate your continued commitment to delivering quality healthcare services and value your dedication to patient care.

Kind regards,
Management Team
Patient Experience & Quality Department`;

      const html = `<pre style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${message}</pre>`;

      try {
        const result = await sendEmail({
          to: email,
          subject: `Patient Feedback Report - ${doctor_name} | Rating: ${rating.toFixed(1)}/5`,
          html
        });

        if (result.ok) {
          results.sent.push({ doctor_id, doctor_name, email });
        } else {
          results.failed.push({ doctor_id, doctor_name, email, error: result.error });
        }
      } catch (err) {
        results.failed.push({ doctor_id, doctor_name, email, error: err.message });
      }
    }

    return res.json({ 
      ok: true, 
      message: `Sent ${results.sent.length} emails, ${results.failed.length} failed`,
      results 
    });
  } catch (e) {
    return res.status(500).json({ error: 'send_all_failed', details: e.message });
  }
});

app.get('/api/analytics', requireAuth, async function (req, res) {
  const { date_from, date_to } = req.query;
  
  let dateFilter = '';
  const params = [];
  
  if (date_from && date_to) {
    dateFilter = 'WHERE DATE(fs.submitted_at) >= $1 AND DATE(fs.submitted_at) <= $2';
    params.push(date_from, date_to);
  } else if (date_from) {
    dateFilter = 'WHERE DATE(fs.submitted_at) >= $1';
    params.push(date_from);
  } else if (date_to) {
    dateFilter = 'WHERE DATE(fs.submitted_at) <= $1';
    params.push(date_to);
  }
  
  const totals = await db.query(
    `SELECT COUNT(*)::int AS total_submissions FROM feedback_submissions fs ${dateFilter}`,
    params
  );

  const questions = await fetchQuestions({ includeInactive: false });
  const generalQuestionKeys = new Set(questions.filter(q => q.category === 'general').map(q => q.key));

  const submissions = await db.query(
    `SELECT fs.id AS submission_id, fs.question_answers, fs.selected_doctor_ids, fs.selected_doctor_names FROM feedback_submissions fs ${dateFilter}`,
    params
  );
  
  let generalSatisfied = 0;
  let generalNeutral = 0;
  let generalNotSatisfied = 0;
  const generalQuestionStats = {};
  const generalStarRatings = {};
  const generalYesNo = {};

  const doctorStats = {};
  
  for (const row of submissions.rows) {
    const qa = row.question_answers || {};
    const doctorNamesList = row.selected_doctor_names || [];
    const doctorIdsList = row.selected_doctor_ids || [];
    
    const allKeys = Object.keys(qa);
    const doctorIdsInOrder = [];
    const seenIds = new Set();
    
    for (const key of allKeys) {
      const match = key.match(/^doctor_([^_]+)_.+$/);
      if (match) {
        const doctorId = match[1];
        if (!seenIds.has(doctorId)) {
          seenIds.add(doctorId);
          doctorIdsInOrder.push(doctorId);
        }
      }
    }
    
    const idToNameMap = {};
    if (doctorIdsList.length > 0 && doctorIdsList.length === doctorNamesList.length) {
      for (let i = 0; i < doctorIdsList.length; i++) {
        idToNameMap[doctorIdsList[i]] = doctorNamesList[i];
      }
    } else {
      for (let i = 0; i < doctorIdsInOrder.length; i++) {
        idToNameMap[doctorIdsInOrder[i]] = doctorNamesList[i] || doctorIdsInOrder[i];
      }
    }
    
    for (const key of allKeys) {
      const isGeneralQuestion = generalQuestionKeys.has(key);
      const value = qa[key];
      
      if (isGeneralQuestion) {
        if (!generalQuestionStats[key]) {
          generalQuestionStats[key] = { satisfied: 0, neutral: 0, not_satisfied: 0 };
        }
        
        if (typeof value === 'number' && value >= 1 && value <= 5) {
          if (!generalStarRatings[key]) {
            generalStarRatings[key] = [];
          }
          generalStarRatings[key].push(value);
          
          if (value >= 4) {
            generalSatisfied++;
            generalQuestionStats[key].satisfied++;
          }
          else if (value === 3) {
            generalNeutral++;
            generalQuestionStats[key].neutral++;
          }
          else {
            generalNotSatisfied++;
            generalQuestionStats[key].not_satisfied++;
          }
        } else if (typeof value === 'string') {
          const lowerVal = value.toLowerCase();
          if (!generalYesNo[key]) {
            generalYesNo[key] = { yes: 0, no: 0 };
          }
          if (lowerVal === 'yes') {
            generalSatisfied++;
            generalQuestionStats[key].satisfied++;
            generalYesNo[key].yes++;
          }
          else if (lowerVal === 'no') {
            generalNotSatisfied++;
            generalQuestionStats[key].not_satisfied++;
            generalYesNo[key].no++;
          }
        }
      }
      
      const match = key.match(/^doctor_([^_]+)_(.+)$/);
      if (match) {
        const doctorId = match[1];
        const questionKey = match[2];
        const doctorName = idToNameMap[doctorId] || doctorId;
        const value = qa[key];
        
        if (!doctorStats[doctorName]) {
          doctorStats[doctorName] = {
            doctor_id: doctorId,
            doctor_name: doctorName,
            question_ratings: {},
            question_answers: {},
            patient_ids: new Set()
          };
        }
        
        doctorStats[doctorName].patient_ids.add(row.submission_id);
        
        if (typeof value === 'number' && value >= 1 && value <= 5) {
          if (!doctorStats[doctorName].question_ratings[questionKey]) {
            doctorStats[doctorName].question_ratings[questionKey] = [];
          }
          doctorStats[doctorName].question_ratings[questionKey].push(value);
        }
        
        if (value !== undefined && value !== null && value !== '') {
          if (!doctorStats[doctorName].question_answers[questionKey]) {
            doctorStats[doctorName].question_answers[questionKey] = [];
          }
          doctorStats[doctorName].question_answers[questionKey].push(String(value));
        }
      }
    }
  }

  const doctorAverages = Object.values(doctorStats).map(d => {
    const allRatings = [];
    const questionRatings = {};
    const questionAnswers = {};
    
    for (const [qKey, ratings] of Object.entries(d.question_ratings || {})) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      questionRatings[qKey] = Math.round(avg * 100) / 100;
      allRatings.push(...ratings);
    }
    
    for (const [qKey, answers] of Object.entries(d.question_answers || {})) {
      const countByAnswer = {};
      for (const ans of answers) {
        countByAnswer[ans] = (countByAnswer[ans] || 0) + 1;
      }
      const total = answers.length;
      const percentages = {};
      for (const [ans, count] of Object.entries(countByAnswer)) {
        percentages[ans] = Math.round((count / total) * 100);
      }
      questionAnswers[qKey] = {
        counts: countByAnswer,
        percentages,
        total
      };
    }
    
    const avg = allRatings.length > 0 
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
      : 0;
    const patientCount = d.patient_ids ? d.patient_ids.size : 0;
    return {
      doctor_id: d.doctor_id,
      doctor_name: d.doctor_name,
      avg_rating: allRatings.length > 0 ? Math.round(avg * 100) / 100 : null,
      rating_count: allRatings.length,
      patient_count: patientCount,
      question_ratings: questionRatings,
      question_answers: questionAnswers
    };
  }).sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));

  const totalGeneral = generalSatisfied + generalNeutral + generalNotSatisfied;
  const questionBreakdown = Object.entries(generalQuestionStats).map(([key, stats]) => {
    const qTotal = stats.satisfied + stats.neutral + stats.not_satisfied;
    
    let avgSatisfied = 0;
    let avgNeutral = 3;
    let avgNotSatisfied = 0;
    
    if (stats.satisfied > 0) {
      const ratings = (generalStarRatings[key] || []).filter(r => r >= 4);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        avgSatisfied = Math.round(avg * 100) / 100;
      } else {
        avgSatisfied = 4;
      }
    }
    if (stats.not_satisfied > 0) {
      const ratings = (generalStarRatings[key] || []).filter(r => r <= 2);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        avgNotSatisfied = Math.round(avg * 100) / 100;
      } else {
        avgNotSatisfied = 1.5;
      }
    }
    
    const notSatisfiedHeight = avgNotSatisfied;
    const neutralHeight = avgSatisfied - avgNotSatisfied;
    const satisfiedHeight = 5 - avgSatisfied;
    
    return {
      question_key: key,
      satisfied: stats.satisfied,
      neutral: stats.neutral,
      not_satisfied: stats.not_satisfied,
      avg_satisfied: avgSatisfied,
      avg_neutral: avgNeutral,
      avg_not_satisfied: avgNotSatisfied,
      total: qTotal,
      satisfied_percent: qTotal > 0 ? Math.round((stats.satisfied / qTotal) * 100) : 0,
      neutral_percent: qTotal > 0 ? Math.round((stats.neutral / qTotal) * 100) : 0,
      not_satisfied_percent: qTotal > 0 ? Math.round((stats.not_satisfied / qTotal) * 100) : 0
    };
  }).filter(q => q.total > 0);
  
  const starRatingAverages = Object.entries(generalStarRatings).map(([key, ratings]) => {
    if (!ratings || ratings.length === 0) return null;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return {
      question_key: key,
      average: Math.round(avg * 100) / 100,
      total: ratings.length
    };
  }).filter(q => q !== null);
  
  const yesNoBreakdown = Object.entries(generalYesNo).map(([key, stats]) => {
    const total = stats.yes + stats.no;
    return {
      question_key: key,
      yes: stats.yes,
      no: stats.no,
      yes_percent: total > 0 ? Math.round((stats.yes / total) * 100) : 0,
      no_percent: total > 0 ? Math.round((stats.no / total) * 100) : 0,
      total: total
    };
  }).filter(q => q.total > 0);
  
  return res.json({
    total_submissions: totals.rows[0] ? totals.rows[0].total_submissions : 0,
    doctor_averages: doctorAverages,
    general_satisfaction: {
      satisfied: generalSatisfied,
      neutral: generalNeutral,
      not_satisfied: generalNotSatisfied,
      total: totalGeneral,
      satisfied_percent: totalGeneral > 0 ? Math.round((generalSatisfied / totalGeneral) * 100) : 0,
      neutral_percent: totalGeneral > 0 ? Math.round((generalNeutral / totalGeneral) * 100) : 0,
      not_satisfied_percent: totalGeneral > 0 ? Math.round((generalNotSatisfied / totalGeneral) * 100) : 0
    },
    question_breakdown: questionBreakdown,
    star_rating_breakdown: starRatingAverages,
    yesno_breakdown: yesNoBreakdown
  });
});

app.get('/survey', function (_req, res) {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.get('/admin', function (_req, res) {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.get('/api/auth/check', async function (req, res) {
  try {
    await ensureAdminUsersTable();
    const result = await db.query('SELECT COUNT(*) as count FROM admin_users');
    const hasUsers = parseInt(result.rows[0].count) > 0;
    return res.json({ has_users: hasUsers });
  } catch (e) {
    return res.status(500).json({ error: 'check_failed' });
  }
});

app.post('/api/auth/register', async function (req, res) {
  try {
    await ensureAdminUsersTable();
    
    const existingUsers = await db.query('SELECT COUNT(*) as count FROM admin_users');
    const isFirstAdmin = parseInt(existingUsers.rows[0].count) === 0;
    
    if (!isFirstAdmin) {
      const token = req.header('x-session-token');
      if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'authentication_required' });
      }
    }
    
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username_email_password_required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'password_min_6_chars' });
    }
    
    const passwordHash = hashPassword(password);
    
    const result = await db.query(
      'INSERT INTO admin_users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username, email',
      [username.trim(), email.trim().toLowerCase(), passwordHash]
    );
    
    return res.json({ user: result.rows[0] });
  } catch (e) {
    if (String(e.message).includes('unique')) {
      return res.status(400).json({ error: 'username_or_email_exists' });
    }
    return res.status(500).json({ error: 'register_failed', details: e.message });
  }
});

app.post('/api/auth/login', async function (req, res) {
  try {
    await ensureAdminUsersTable();
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'username_password_required' });
    }
    
    const result = await db.query(
      'SELECT id, username, email, password_hash FROM admin_users WHERE (username = $1 OR email = $1) AND is_active = TRUE',
      [username.trim()]
    );
    
    if (!result.rowCount) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    
    const user = result.rows[0];
    
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    
    const sessionToken = generateSessionToken();
    sessions.set(sessionToken, { id: user.id, username: user.username, email: user.email });
    await db.query(
      'INSERT INTO admin_sessions(token, user_id, username, email) VALUES($1, $2, $3, $4) ON CONFLICT (token) DO UPDATE SET expires_at = NOW() + INTERVAL \'7 days\'',
      [sessionToken, user.id, user.username, user.email]
    );
    
    return res.json({ 
      token: sessionToken,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (e) {
    return res.status(500).json({ error: 'login_failed', details: e.message });
  }
});

app.post('/api/auth/logout', requireAuth, async function (req, res) {
  const token = req.header('x-session-token');
  sessions.delete(token);
  await db.query('DELETE FROM admin_sessions WHERE token = $1', [token]);
  return res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, function (req, res) {
  return res.json({ user: req.adminUser });
});

app.get('/api/admin/users', requireAuth, async function (req, res) {
  try {
    const result = await db.query(
      'SELECT id, username, email, created_at, is_active FROM admin_users ORDER BY created_at DESC'
    );
    return res.json({ users: result.rows });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

app.delete('/api/admin/users/:id', requireAuth, async function (req, res) {
  try {
    const id = Number(req.params.id);
    if (id === req.adminUser.id) {
      return res.status(400).json({ error: 'cannot_delete_self' });
    }
    await db.query('DELETE FROM admin_users WHERE id = $1', [id]);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'delete_failed', details: e.message });
  }
});

app.patch('/api/admin/users/:id', requireAuth, async function (req, res) {
  try {
    const id = Number(req.params.id);
    const { username, email, password, is_active } = req.body;
    
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'password_min_6_chars' });
    }
    
    const updates = [];
    const params = [];
    let idx = 1;
    
    if (username) {
      updates.push(`username = $${idx++}`);
      params.push(username.trim());
    }
    if (email) {
      updates.push(`email = $${idx++}`);
      params.push(email.trim().toLowerCase());
    }
    if (password) {
      updates.push(`password_hash = $${idx++}`);
      params.push(hashPassword(password));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(Boolean(is_active));
    }
    
    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
      
      await db.query(
        'INSERT INTO activity_logs(user_id, action, details) VALUES($1, $2, $3)',
        [req.adminUser.id, 'update_user', JSON.stringify({ user_id: id, username, changes: Object.keys({ username, email, password, is_active }).filter(k => ({ username, email, password, is_active }[k] !== undefined)) })]
      );
    }
    
    return res.json({ ok: true });
  } catch (e) {
    if (String(e.message).includes('unique')) {
      return res.status(400).json({ error: 'username_or_email_exists' });
    }
    return res.status(500).json({ error: 'update_failed', details: e.message });
  }
});

app.get('/api/admin/activity-logs', requireAuth, async function (req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 5));
    const offset = (page - 1) * limit;
    
    const countResult = await db.query('SELECT COUNT(*) FROM activity_logs');
    const total = parseInt(countResult.rows[0].count);
    
    const result = await db.query(`
      SELECT al.*, au.username 
      FROM activity_logs al 
      LEFT JOIN admin_users au ON au.id = al.user_id 
      ORDER BY al.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return res.json({ 
      logs: result.rows,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});

async function ensureActivityLogsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES admin_users(id),
      action TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function logActivity(userId, action, details) {
  try {
    await db.query(
      'INSERT INTO activity_logs(user_id, action, details) VALUES($1, $2, $3)',
      [userId, action, JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Failed to log activity:', e.message);
  }
}

async function boot() {
  await ensureQuestionsTableAndDefaults();
  await ensureAdminUsersTable();
  await ensureActivityLogsTable();
  await ensureSessionsTable();
  await ensureDoctorsTableColumns();
  sessions = await loadSessions();
  app.listen(PORT, function () {
    console.log('Server running at ' + BASE_URL);
  });
}

boot().catch((e) => {
  console.error('Boot failed:', e);
  process.exit(1);
});
