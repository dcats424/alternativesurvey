const db = require('../db');

function makeId(prefix) {
  const crypto = require('crypto');
  return prefix + '-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
}

async function getAllDoctors(activeOnly = true) {
  const where = activeOnly ? 'WHERE is_active = TRUE' : '';
  const result = await db.query(
    `SELECT id, name, department, email, is_active, created_at 
     FROM doctors ${where} ORDER BY name ASC`
  );
  return result.rows;
}

async function getDoctorsPaginated({ search = '', page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  const searchPattern = '%' + search.toLowerCase() + '%';
  
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM doctors 
     WHERE ($1 = '' OR LOWER(name) LIKE $1 OR LOWER(id) LIKE $1)`,
    [searchPattern]
  );
  const total = parseInt(countResult.rows[0].total);
  
  const result = await db.query(
    `SELECT id, name, department, email, is_active, created_at 
     FROM doctors 
     WHERE ($1 = '' OR LOWER(name) LIKE $1 OR LOWER(id) LIKE $1)
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    [searchPattern, limit, offset]
  );
  
  return {
    doctors: result.rows,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit)
  };
}

async function getDoctorById(id) {
  const result = await db.query('SELECT * FROM doctors WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createDoctor({ name, department, email }) {
  if (!name || !name.trim()) {
    throw new Error('doctor_name_required');
  }
  const id = makeId('D');
  const result = await db.query(
    `INSERT INTO doctors (id, name, department, email) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [id, name.trim(), department || null, email || null]
  );
  return result.rows[0];
}

async function updateDoctor(id, { name, department, email, is_active }) {
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
  if (email !== undefined) {
    updates.push(`email = $${idx++}`);
    values.push(email || null);
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

module.exports = { getAllDoctors, getDoctorsPaginated, getDoctorById, createDoctor, updateDoctor, deleteDoctor };
