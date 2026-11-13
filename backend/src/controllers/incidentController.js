const crypto = require('crypto');
const { query } = require('../database/db');
const { uploadFile, getPhotoUrl } = require('../services/storageService');
const { notifyNewIncident } = require('../services/notificationService');

const VALID_ISSUE_TYPES = [
  'No Water Supply',
  'Low Water Pressure',
  'Pipeline Leakage',
  'Contaminated Water',
  'Other'
];

const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Generate a unique human-friendly incident ID like AQ-584912
 */
function generateIncidentId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `AQ-${randomNum}`;
}

/**
 * POST /api/incidents - Submit a new disruption incident report
 */
async function createIncident(req, res, next) {
  try {
    const { area, issue_type, severity, description } = req.body;

    // Validation
    if (!area || typeof area !== 'string' || area.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Area / Locality is required.' });
    }

    if (!issue_type || !VALID_ISSUE_TYPES.includes(issue_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid issue type. Must be one of: ${VALID_ISSUE_TYPES.join(', ')}`
      });
    }

    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity level. Must be one of: ${VALID_SEVERITIES.join(', ')}`
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'A detailed description of at least 10 characters is required.'
      });
    }

    // Process photo upload if file was provided
    let photoKey = null;
    if (req.file) {
      photoKey = await uploadFile(req.file);
    }

    const incidentId = generateIncidentId();

    const insertSql = `
      INSERT INTO incidents (incident_id, area, issue_type, severity, description, photo_key, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Reported')
    `;

    const result = await query(insertSql, [
      incidentId,
      area.trim(),
      issue_type,
      severity,
      description.trim(),
      photoKey
    ]);

    // Fetch the newly inserted record
    const [created] = await query('SELECT * FROM incidents WHERE incident_id = ?', [incidentId]);

    // Async SNS notification
    notifyNewIncident(created).catch((err) => {
      console.error('[Notification Error]', err);
    });

    const photoUrl = photoKey ? await getPhotoUrl(photoKey) : null;

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully.',
      incident: {
        ...created,
        photo_url: photoUrl
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incidents - Retrieve list of incidents with optional filtering & search
 */
async function getIncidents(req, res, next) {
  try {
    const { status, issue_type, severity, area, search, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (issue_type && issue_type !== 'All') {
      sql += ' AND issue_type = ?';
      params.push(issue_type);
    }

    if (severity && severity !== 'All') {
      sql += ' AND severity = ?';
      params.push(severity);
    }

    if (area && area.trim().length > 0) {
      sql += ' AND area LIKE ?';
      params.push(`%${area.trim()}%`);
    }

    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      sql += ' AND (incident_id LIKE ? OR area LIKE ? OR description LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);

    const incidents = await query(sql, params);

    // Attach signed photo URLs if photo_key is present
    const enrichedIncidents = await Promise.all(
      incidents.map(async (item) => {
        const photoUrl = item.photo_key ? await getPhotoUrl(item.photo_key) : null;
        return {
          ...item,
          photo_url: photoUrl
        };
      })
    );

    return res.json({
      success: true,
      count: enrichedIncidents.length,
      incidents: enrichedIncidents
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/incidents/:id - Retrieve incident details by incident_id (e.g. AQ-1001) or numerical id
 */
async function getIncidentById(req, res, next) {
  try {
    const { id } = req.params;

    const sql = 'SELECT * FROM incidents WHERE incident_id = ? OR id = ? LIMIT 1';
    const rows = await query(sql, [id, id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Incident '${id}' not found.`
      });
    }

    const incident = rows[0];
    const photoUrl = incident.photo_key ? await getPhotoUrl(incident.photo_key) : null;

    return res.json({
      success: true,
      incident: {
        ...incident,
        photo_url: photoUrl
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById
};

