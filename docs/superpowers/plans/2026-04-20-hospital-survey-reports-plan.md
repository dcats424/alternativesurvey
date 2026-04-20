# Hospital Survey Reports Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a Reports module in the admin dashboard with Doctor's Report and General Report, featuring server-side filtering, dynamic tables, and multi-format export (Excel, CSV, PDF).

**Architecture:** Add new API endpoints for report data aggregation. Create Reports tab in frontend with reusable filter and table components. PDF generation uses existing PDFKit library.

**Tech Stack:** Express.js backend, React frontend, PDFKit for PDF export, xlsx library for Excel export

---

## Task 1: Add Backend API Endpoints

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: Add GET /api/reports/doctors endpoint**

Add after line ~1275 (after existing doctor-ratings endpoint):

```javascript
app.get('/api/reports/doctors', requireAuth, async function (req, res) {
  try {
    const doctorIdFilter = textOrEmpty(req.query.doctor_id || '');
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

            const numericValue = Number(answerValue);
            if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
              if (!doctorRatingsInSubmission[doctorId].questions[questionKey]) {
                doctorRatingsInSubmission[doctorId].questions[questionKey] = { total: 0, count: 0 };
              }
              doctorRatingsInSubmission[doctorId].questions[questionKey].total += numericValue;
              doctorRatingsInSubmission[doctorId].questions[questionKey].count++;
              doctorRatingsInSubmission[doctorId].total += numericValue;
              doctorRatingsInSubmission[doctorId].count++;
            }
          }
        }
      }

      for (const doctorId of Object.keys(doctorRatingsInSubmission)) {
        const docData = doctorRatingsInSubmission[doctorId];

        if (!doctorStats[doctorId]) {
          let doctorName = localIdToNameMap[doctorId] || doctorId;
          doctorStats[doctorId] = {
            doctor_id: doctorId,
            doctor_name: doctorName,
            total_patients: 0,
            total_sum: 0,
            question_ratings: {}
          };
        }

        const patientAvg = docData.count > 0 ? docData.total / docData.count : 0;
        doctorStats[doctorId].total_patients++;
        doctorStats[doctorId].total_sum += patientAvg;

        for (const [qKey, qData] of Object.entries(docData.questions)) {
          if (!doctorStats[doctorId].question_ratings[qKey]) {
            doctorStats[doctorId].question_ratings[qKey] = { total: 0, count: 0 };
          }
          doctorStats[doctorId].question_ratings[qKey].total += qData.total;
          doctorStats[doctorId].question_ratings[qKey].count += qData.count;
        }
      }
    }

    const orderedQuestions = doctorQuestions.rows || [];
    const questionKeyOrder = new Map(orderedQuestions.map((q, idx) => [q.question_key, idx]));

    let doctors = Object.values(doctorStats).map(d => {
      const questionRatingsArray = Object.entries(d.question_ratings)
        .map(([qKey, qr]) => ({
          question_key: qKey,
          average: qr.count > 0 ? qr.total / qr.count : 0,
          count: qr.count
        }))
        .sort((a, b) => (questionKeyOrder.get(a.question_key) ?? 999) - (questionKeyOrder.get(b.question_key) ?? 999));

      return {
        doctor_id: d.doctor_id,
        doctor_name: d.doctor_name,
        question_ratings: questionRatingsArray,
        total_average: d.total_patients > 0 ? d.total_sum / d.total_patients : 0,
        total_patients: d.total_patients
      };
    });

    if (doctorIdFilter) {
      doctors = doctors.filter(d => d.doctor_id === doctorIdFilter);
    }

    doctors.sort((a, b) => a.doctor_name.localeCompare(b.doctor_name));

    return res.json({
      doctors,
      date_from: dateFrom || null,
      date_to: dateTo || null
    });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});
```

- [ ] **Step 2: Add GET /api/reports/general endpoint**

Add after the doctors endpoint:

```javascript
app.get('/api/reports/general', requireAuth, async function (req, res) {
  try {
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

    const generalQuestions = await db.query(
      `SELECT id, question_key, label, type FROM survey_questions WHERE category = 'general' AND is_active = TRUE AND is_deleted = FALSE ORDER BY page_number ASC, order_no ASC, id ASC`
    );

    const submissions = await db.query(`
      SELECT id, question_answers, submitted_at
      FROM feedback_submissions
      ${whereClause}
      ORDER BY submitted_at DESC
    `, params);

    const questionStats = {};

    for (const sub of submissions.rows) {
      const qa = sub.question_answers || {};

      for (const gq of generalQuestions.rows) {
        const questionKey = gq.question_key || String(gq.id);
        const answerValue = qa[questionKey];

        if (answerValue !== undefined && answerValue !== null) {
          if (!questionStats[questionKey]) {
            questionStats[questionKey] = { total: 0, count: 0 };
          }

          const numericValue = Number(answerValue);
          if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
            questionStats[questionKey].total += numericValue;
            questionStats[questionKey].count++;
          }
        }
      }
    }

    const orderedQuestions = generalQuestions.rows || [];
    const questionKeyOrder = new Map(orderedQuestions.map((q, idx) => [q.question_key, idx]));

    const questions = Object.entries(questionStats)
      .map(([qKey, qs]) => ({
        question_key: qKey,
        average: qs.count > 0 ? qs.total / qs.count : 0,
        count: qs.count
      }))
      .sort((a, b) => (questionKeyOrder.get(a.question_key) ?? 999) - (questionKeyOrder.get(b.question_key) ?? 999));

    return res.json({
      questions,
      date_from: dateFrom || null,
      date_to: dateTo || null
    });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});
```

- [ ] **Step 3: Add GET /api/doctors/all endpoint for filter dropdown**

Add after the reports endpoints (reuse existing logic, just return all doctors):

```javascript
app.get('/api/doctors/all', requireAuth, async function (req, res) {
  try {
    const rows = await db.query(
      `SELECT id, name FROM doctors ORDER BY name ASC`
    );
    return res.json({ doctors: rows.rows });
  } catch (e) {
    return res.status(500).json({ error: 'fetch_failed', details: e.message });
  }
});
```

- [ ] **Step 4: Test the endpoints**

Start server: `npm run dev`

Test:
```bash
curl -H "x-session-token: <token>" "http://localhost:3000/api/reports/doctors"
curl -H "x-session-token: <token>" "http://localhost:3000/api/reports/general"
curl -H "x-session-token: <token>" "http://localhost:3000/api/doctors/all"
```

---

## Task 2: Add PDF Export Service

**Files:**
- Modify: `src/services/pdf.js`

- [ ] **Step 1: Add generateReportPDF function**

Add at the end of `src/services/pdf.js`:

```javascript
function generateReportPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4'
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { reportType, dateFrom, dateTo, rows, columns } = data;
      const pageW = 595;
      const leftM = 40;
      const rightM = 40;
      const contentW = pageW - leftM - rightM;

      const formatDate = (dateStr) => {
        if (!dateStr) return 'All Time';
        const [y, m, d] = dateStr.split('-');
        return d + '/' + m + '/' + y;
      };

      const now = new Date();
      const timestamp = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // ========== HEADER ==========
      doc.rect(0, 0, pageW, 60).fill('#2563eb');

      // Logo placeholder (left)
      doc.fillColor('white')
         .fontSize(10)
         .text('girum-logo', leftM, 25);

      // Hospital name (center)
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Girum Hospital', 0, 22, { align: 'center', width: pageW });

      // Timestamp (right)
      doc.fontSize(9)
         .font('Helvetica')
         .text(timestamp, pageW - rightM - 80, 25, { width: 80, align: 'right' });

      let y = 75;

      // ========== SUB-HEADER ==========
      const reportName = reportType === 'doctor' ? "Doctor's Report" : "General Report";
      const dateRange = dateFrom || dateTo
        ? `Date: ${formatDate(dateFrom || '')} to ${formatDate(dateTo || '')}`
        : 'Date: All Time';

      doc.fillColor('#111827')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(reportName, leftM, y);

      y += 18;

      doc.fillColor('#6b7280')
         .fontSize(10)
         .font('Helvetica')
         .text(dateRange, leftM, y);

      y += 25;

      // ========== TABLE ==========
      const tableTop = y;
      const colCount = columns.length;
      const colWidth = contentW / colCount;
      const rowHeight = 25;

      // Header row
      doc.rect(leftM, tableTop, contentW, rowHeight).fill('#ffffff').stroke('#000000');
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold');

      columns.forEach((col, i) => {
        const x = leftM + (i * colWidth) + 5;
        doc.text(col, x, tableTop + 7, { width: colWidth - 10, align: 'left' });
      });

      y = tableTop + rowHeight;

      // Data rows
      doc.fontSize(9)
         .font('Helvetica');

      rows.forEach((row, rowIdx) => {
        const isAlternate = rowIdx % 2 === 1;
        if (isAlternate) {
          doc.rect(leftM, y, contentW, rowHeight).fill('#f9fafb');
        } else {
          doc.rect(leftM, y, contentW, rowHeight).fill('#ffffff');
        }
        doc.stroke('#e5e7eb');

        doc.fillColor('#374151');

        row.forEach((cell, i) => {
          const x = leftM + (i * colWidth) + 5;
          const cellStr = String(cell !== undefined && cell !== null ? cell : '');
          doc.text(cellStr, x, y + 7, { width: colWidth - 10, align: 'left' });
        });

        y += rowHeight;
      });

      // Table border
      doc.rect(leftM, tableTop, contentW, y - tableTop).stroke('#000000');

      // ========== FOOTER ==========
      doc.moveTo(leftM, y + 20).lineTo(pageW - rightM, y + 20).stroke('#e5e7eb');

      doc.fillColor('#9ca3af')
         .fontSize(8)
         .font('Helvetica')
         .text('Generated from Hospital Survey Reporting System', 0, y + 30, { align: 'center', width: pageW });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateDoctorReportPDF, generateReportPDF };
```

- [ ] **Step 2: Add PDF download endpoint**

Add in server.js after the existing PDF endpoint (around line 1400):

```javascript
app.get('/api/reports/export-pdf', requireAuth, async function (req, res) {
  try {
    const { report_type, doctor_id, date_from, date_to } = req.query;

    if (report_type === 'doctor') {
      const doctorIdFilter = textOrEmpty(doctor_id || '');
      let whereConditions = [];
      let params = [];
      let paramIdx = 1;

      if (date_from) {
        whereConditions.push(`submitted_at >= $${paramIdx++}`);
        params.push(date_from);
      }
      if (date_to) {
        whereConditions.push(`submitted_at <= $${paramIdx++}`);
        params.push(date_to + ' 23:59:59');
      }
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const doctorQuestions = await db.query(
        `SELECT question_key FROM survey_questions WHERE category = 'doctor' AND is_active = TRUE AND is_deleted = FALSE ORDER BY page_number ASC, order_no ASC, id ASC`
      );

      const submissions = await db.query(`
        SELECT selected_doctor_ids, selected_doctor_names, question_answers
        FROM feedback_submissions
        ${whereClause}
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
            if (match && !seenIds.has(match[1])) {
              seenIds.add(match[1]);
              doctorIdsInOrder.push(match[1]);
            }
          }
        }

        const localIdToNameMap = {};
        if (doctorIdsList.length > 0 && doctorIdsList.length === doctorNamesList.length) {
          for (let i = 0; i < doctorIdsList.length; i++) {
            localIdToNameMap[doctorIdsList[i]] = doctorNamesList[i];
          }
        }

        const doctorRatingsInSubmission = {};

        for (const dq of doctorQuestions.rows) {
          const questionKey = dq.question_key;
          for (const doctorId of doctorIdsInOrder) {
            const answerKey = `doctor_${doctorId}_${questionKey}`;
            const answerValue = qa[answerKey];

            if (answerValue !== undefined && answerValue !== null) {
              if (!doctorRatingsInSubmission[doctorId]) {
                doctorRatingsInSubmission[doctorId] = { total: 0, count: 0, questions: {} };
              }

              const numericValue = Number(answerValue);
              if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
                if (!doctorRatingsInSubmission[doctorId].questions[questionKey]) {
                  doctorRatingsInSubmission[doctorId].questions[questionKey] = { total: 0, count: 0 };
                }
                doctorRatingsInSubmission[doctorId].questions[questionKey].total += numericValue;
                doctorRatingsInSubmission[doctorId].questions[questionKey].count++;
                doctorRatingsInSubmission[doctorId].total += numericValue;
                doctorRatingsInSubmission[doctorId].count++;
              }
            }
          }
        }

        for (const doctorId of Object.keys(doctorRatingsInSubmission)) {
          const docData = doctorRatingsInSubmission[doctorId];
          if (!doctorStats[doctorId]) {
            doctorStats[doctorId] = {
              doctor_name: localIdToNameMap[doctorId] || doctorId,
              total_patients: 0,
              total_sum: 0,
              question_ratings: {}
            };
          }

          const patientAvg = docData.count > 0 ? docData.total / docData.count : 0;
          doctorStats[doctorId].total_patients++;
          doctorStats[doctorId].total_sum += patientAvg;

          for (const [qKey, qData] of Object.entries(docData.questions)) {
            if (!doctorStats[doctorId].question_ratings[qKey]) {
              doctorStats[doctorId].question_ratings[qKey] = { total: 0, count: 0 };
            }
            doctorStats[doctorId].question_ratings[qKey].total += qData.total;
            doctorStats[doctorId].question_ratings[qKey].count += qData.count;
          }
        }
      }

      const columns = ['No.', 'Doctor Name', 'Question Key', 'Average Score', 'Total Average Rating'];
      const rows = [];

      let idx = 1;
      for (const d of Object.values(doctorStats)) {
        if (doctorIdFilter && d.doctor_id !== doctorIdFilter) continue;

        for (const [qKey, qr] of Object.entries(d.question_ratings)) {
          rows.push([
            idx++,
            d.doctor_name,
            qKey,
            (qr.count > 0 ? qr.total / qr.count : 0).toFixed(1),
            (d.total_patients > 0 ? d.total_sum / d.total_patients : 0).toFixed(1)
          ]);
        }
      }

      const pdfBuffer = await generateReportPDF({
        reportType: 'doctor',
        dateFrom: date_from,
        dateTo: date_to,
        columns,
        rows
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=doctors_report.pdf');
      res.send(pdfBuffer);

    } else if (report_type === 'general') {
      let whereConditions = [];
      let params = [];
      let paramIdx = 1;

      if (date_from) {
        whereConditions.push(`submitted_at >= $${paramIdx++}`);
        params.push(date_from);
      }
      if (date_to) {
        whereConditions.push(`submitted_at <= $${paramIdx++}`);
        params.push(date_to + ' 23:59:59');
      }
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const generalQuestions = await db.query(
        `SELECT question_key FROM survey_questions WHERE category = 'general' AND is_active = TRUE AND is_deleted = FALSE ORDER BY page_number ASC, order_no ASC, id ASC`
      );

      const submissions = await db.query(`
        SELECT question_answers FROM feedback_submissions ${whereClause}
      `, params);

      const questionStats = {};

      for (const sub of submissions.rows) {
        const qa = sub.question_answers || {};
        for (const gq of generalQuestions.rows) {
          const questionKey = gq.question_key;
          const answerValue = qa[questionKey];
          if (answerValue !== undefined && answerValue !== null) {
            if (!questionStats[questionKey]) {
              questionStats[questionKey] = { total: 0, count: 0 };
            }
            const numericValue = Number(answerValue);
            if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
              questionStats[questionKey].total += numericValue;
              questionStats[questionKey].count++;
            }
          }
        }
      }

      const columns = ['No.', 'Question Key', 'Average Rating'];
      const rows = [];

      let idx = 1;
      for (const [qKey, qs] of Object.entries(questionStats)) {
        rows.push([
          idx++,
          qKey,
          (qs.count > 0 ? qs.total / qs.count : 0).toFixed(1)
        ]);
      }

      const pdfBuffer = await generateReportPDF({
        reportType: 'general',
        dateFrom: date_from,
        dateTo: date_to,
        columns,
        rows
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=general_report.pdf');
      res.send(pdfBuffer);

    } else {
      res.status(400).json({ error: 'invalid_report_type' });
    }
  } catch (e) {
    res.status(500).json({ error: 'export_failed', details: e.message });
  }
});
```

- [ ] **Step 3: Test PDF endpoint**

```bash
curl -H "x-session-token: <token>" "http://localhost:3000/api/reports/export-pdf?report_type=doctor" -o test_doctor.pdf
curl -H "x-session-token: <token>" "http://localhost:3000/api/reports/export-pdf?report_type=general" -o test_general.pdf
```

---

## Task 3: Add Frontend Reports Tab

**Files:**
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Add Reports state and menu item**

Find the `menuItems` array (around line 2184) and add:
```javascript
{ id: 'reports', label: 'Reports', icon: FileSpreadsheet },
```

Add state variables after `activityLogs` state (around line 1178):
```javascript
const [reportsTab, setReportsTab] = React.useState('doctor-report');
const [doctorReportData, setDoctorReportData] = React.useState([]);
const [generalReportData, setGeneralReportData] = React.useState([]);
const [reportDoctors, setReportDoctors] = React.useState([]);
const [reportFilters, setReportFilters] = React.useState({
  doctor_id: '',
  date_from: '',
  date_to: ''
});
const [reportsLoading, setReportsLoading] = React.useState(false);
```

- [ ] **Step 2: Add fetch functions for reports**

Add after the `fetchActivityLogs` function (around line 1466):
```javascript
async function fetchReportDoctors() {
  try {
    const res = await fetch('/api/doctors/all', { headers: headers() });
    const data = await res.json();
    if (res.ok) setReportDoctors(data.doctors || []);
  } catch (err) {
    console.error('Failed to fetch report doctors:', err);
  }
}

async function fetchDoctorReport() {
  setReportsLoading(true);
  try {
    const params = new URLSearchParams();
    if (reportFilters.doctor_id) params.set('doctor_id', reportFilters.doctor_id);
    if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
    if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);

    const res = await fetch('/api/reports/doctors?' + params.toString(), { headers: headers() });
    const data = await res.json();
    if (res.ok) setDoctorReportData(data.doctors || []);
  } catch (err) {
    console.error('Failed to fetch doctor report:', err);
  } finally {
    setReportsLoading(false);
  }
}

async function fetchGeneralReport() {
  setReportsLoading(true);
  try {
    const params = new URLSearchParams();
    if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
    if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);

    const res = await fetch('/api/reports/general?' + params.toString(), { headers: headers() });
    const data = await res.json();
    if (res.ok) setGeneralReportData(data.questions || []);
  } catch (err) {
    console.error('Failed to fetch general report:', err);
  } finally {
    setReportsLoading(false);
  }
}
```

Add effect to load data when tab changes (after existing useEffect around line 1477):
```javascript
React.useEffect(() => {
  if (activeTab === 'reports') {
    fetchReportDoctors();
    if (reportsTab === 'doctor-report') {
      fetchDoctorReport();
    } else {
      fetchGeneralReport();
    }
  }
}, [activeTab, reportsTab]);
```

- [ ] **Step 3: Add export functions**

Add after the `exportToExcel` function (around line 2105):
```javascript
function exportDoctorReportToExcel() {
  const rows = [];
  let idx = 1;
  for (const doctor of doctorReportData) {
    for (const qr of doctor.question_ratings) {
      rows.push({
        'No.': idx++,
        'Doctor Name': doctor.doctor_name,
        'Question Key': qr.question_key,
        'Average Score': qr.average.toFixed(1),
        'Total Average Rating': doctor.total_average.toFixed(1)
      });
    }
  }

  if (rows.length === 0) {
    showMessage('No data to export', 'error');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Doctor Report');
  XLSX.writeFile(wb, 'doctors_report.xlsx');
  showMessage('Exported to Excel', 'success');
}

function exportGeneralReportToExcel() {
  const rows = generalReportData.map((q, idx) => ({
    'No.': idx + 1,
    'Question Key': q.question_key,
    'Average Rating': q.average.toFixed(1)
  }));

  if (rows.length === 0) {
    showMessage('No data to export', 'error');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'General Report');
  XLSX.writeFile(wb, 'general_report.xlsx');
  showMessage('Exported to Excel', 'success');
}

function exportDoctorReportToCSV() {
  const rows = [];
  let idx = 1;
  for (const doctor of doctorReportData) {
    for (const qr of doctor.question_ratings) {
      rows.push({
        'No.': idx++,
        'Doctor Name': doctor.doctor_name,
        'Question Key': qr.question_key,
        'Average Score': qr.average.toFixed(1),
        'Total Average Rating': doctor.total_average.toFixed(1)
      });
    }
  }

  if (rows.length === 0) {
    showMessage('No data to export', 'error');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const val = String(r[h] || '').replace(/"/g, '""');
      return '"' + val + '"';
    }).join(','))
  ].join('\n');

  downloadFile(csv, 'doctors_report.csv', 'text/csv');
  showMessage('Exported to CSV', 'success');
}

function exportGeneralReportToCSV() {
  const rows = generalReportData.map((q, idx) => ({
    'No.': idx + 1,
    'Question Key': q.question_key,
    'Average Rating': q.average.toFixed(1)
  }));

  if (rows.length === 0) {
    showMessage('No data to export', 'error');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const val = String(r[h] || '').replace(/"/g, '""');
      return '"' + val + '"';
    }).join(','))
  ].join('\n');

  downloadFile(csv, 'general_report.csv', 'text/csv');
  showMessage('Exported to CSV', 'success');
}

async function exportDoctorReportToPDF() {
  try {
    const params = new URLSearchParams({ report_type: 'doctor' });
    if (reportFilters.doctor_id) params.set('doctor_id', reportFilters.doctor_id);
    if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
    if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);

    const res = await fetch('/api/reports/export-pdf?' + params.toString(), { headers: headers() });
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doctors_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Exported to PDF', 'success');
  } catch (err) {
    showMessage('PDF export failed: ' + err.message, 'error');
  }
}

async function exportGeneralReportToPDF() {
  try {
    const params = new URLSearchParams({ report_type: 'general' });
    if (reportFilters.date_from) params.set('date_from', reportFilters.date_from);
    if (reportFilters.date_to) params.set('date_to', reportFilters.date_to);

    const res = await fetch('/api/reports/export-pdf?' + params.toString(), { headers: headers() });
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'general_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('Exported to PDF', 'success');
  } catch (err) {
    showMessage('PDF export failed: ' + err.message, 'error');
  }
}
```

- [ ] **Step 4: Add Reports tab UI**

Find where other tabs are rendered (search for `activeTab === 'dashboard'`) and add after the activity log section (around line 4300):

```javascript
{activeTab === 'reports' && (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        <button
          onClick={() => setReportsTab('doctor-report')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            reportsTab === 'doctor-report'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Doctor's Report
        </button>
        <button
          onClick={() => setReportsTab('general-report')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            reportsTab === 'general-report'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          General Report
        </button>
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex flex-wrap items-center gap-4">
        {reportsTab === 'doctor-report' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Doctor:</label>
            <select
              value={reportFilters.doctor_id}
              onChange={(e) => setReportFilters({ ...reportFilters, doctor_id: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Doctors</option>
              {reportDoctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">From:</label>
          <input
            type="date"
            value={reportFilters.date_from}
            onChange={(e) => setReportFilters({ ...reportFilters, date_from: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">To:</label>
          <input
            type="date"
            value={reportFilters.date_to}
            onChange={(e) => setReportFilters({ ...reportFilters, date_to: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => {
            if (reportsTab === 'doctor-report') {
              fetchDoctorReport();
            } else {
              fetchGeneralReport();
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Apply Filters
        </button>

        <div className="relative ml-auto">
          <button
            onClick={() => setDownloadDropdown(!downloadDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
            <ChevronDown className="w-4 h-4" />
          </button>
          {downloadDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <button
                onClick={() => {
                  setDownloadDropdown(false);
                  if (reportsTab === 'doctor-report') exportDoctorReportToExcel();
                  else exportGeneralReportToExcel();
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Excel (.xlsx)
              </button>
              <button
                onClick={() => {
                  setDownloadDropdown(false);
                  if (reportsTab === 'doctor-report') exportDoctorReportToCSV();
                  else exportGeneralReportToCSV();
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                CSV
              </button>
              <button
                onClick={() => {
                  setDownloadDropdown(false);
                  if (reportsTab === 'doctor-report') exportDoctorReportToPDF();
                  else exportGeneralReportToPDF();
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-red-600" />
                PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {reportsLoading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading...</p>
        </div>
      ) : reportsTab === 'doctor-report' ? (
        doctorReportData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Doctor Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Question Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Average Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Average Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  let idx = 1;
                  return doctorReportData.map(doctor =>
                    doctor.question_ratings.map(qr => (
                      <tr key={`${doctor.doctor_id}-${qr.question_key}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{idx++}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{doctor.doctor_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{qr.question_key}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{qr.average.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{doctor.total_average.toFixed(1)}</td>
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
        )
      ) : (
        generalReportData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Question Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Average Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {generalReportData.map((q, idx) => (
                  <tr key={q.question_key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{q.question_key}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{q.average.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Add click-outside handler for download dropdown**

Add at the end of the component (before final closing tags), or add a simple document click handler:
```javascript
React.useEffect(() => {
  function handleClickOutside(e) {
    if (downloadDropdown && !e.target.closest('.relative')) {
      setDownloadDropdown(false);
    }
  }
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [downloadDropdown]);
```

- [ ] **Step 6: Test the frontend**

Start frontend: `cd frontend && npm run dev`

Test:
1. Login to admin
2. Click "Reports" in sidebar
3. Verify Doctor's Report loads with table
4. Switch to General Report
5. Test filters
6. Test Excel/CSV/PDF exports

---

## Task 4: Verify and Test

- [ ] Run server and frontend together
- [ ] Test all API endpoints with different filter combinations
- [ ] Verify PDF styling matches spec (header, sub-header, black header table)
- [ ] Test export for both report types

---

**Plan complete.**