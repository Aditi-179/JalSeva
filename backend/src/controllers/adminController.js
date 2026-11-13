const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const { config } = require('../config');
const { getPhotoUrl } = require('../services/storageService');
const { exportIncidentsBackup } = require('../services/backupService');

const VALID_STATUSES = ['Reported', 'Under Review', 'In Progress', 'Resolved'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * POST /api/admin/login - Authenticate administrator and issue JWT
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required.'
      });
    }

    const rows = await query(
      'SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), username.trim()]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.'
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password.'
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/dashboard - Comprehensive aggregated statistics and charts data
 */
async function getDashboardStats(req, res, next) {
  try {
    // 1. Overall metric counts
    const allIncidents = await query('SELECT id, status, severity, area, issue_type, created_at FROM incidents');

    const total = allIncidents.length;
    const reported = allIncidents.filter((i) => i.status === 'Reported').length;
    const underReview = allIncidents.filter((i) => i.status === 'Under Review').length;
    const inProgress = allIncidents.filter((i) => i.status === 'In Progress').length;
    const resolved = allIncidents.filter((i) => i.status === 'Resolved').length;
    const highPriority = allIncidents.filter((i) => ['High', 'Critical'].includes(i.severity)).length;

    // 2. Reports by issue category
    const issueCategoryCounts = {};
    allIncidents.forEach((inc) => {
      issueCategoryCounts[inc.issue_type] = (issueCategoryCounts[inc.issue_type] || 0) + 1;
    });
    const reportsByCategory = Object.keys(issueCategoryCounts).map((category) => ({
      name: category,
      count: issueCategoryCounts[category]
    }));

    // 3. Reports by locality / area (Top 10)
    const areaCounts = {};
    allIncidents.forEach((inc) => {
      areaCounts[inc.area] = (areaCounts[inc.area] || 0) + 1;
    });
    const reportsByLocality = Object.keys(areaCounts)
      .map((area) => ({ name: area, count: areaCounts[area] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Reports by severity distribution
    const severityCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    allIncidents.forEach((inc) => {
      if (severityCounts[inc.severity] !== undefined) {
        severityCounts[inc.severity]++;
      }
    });
    const reportsBySeverity = Object.keys(severityCounts).map((sev) => ({
      name: sev,
      count: severityCounts[sev]
    }));

    // 5. Recent 15 incidents with photos
    const recentRows = await query(
      'SELECT * FROM incidents ORDER BY created_at DESC LIMIT 15'
    );
    const recentIncidents = await Promise.all(
      recentRows.map(async (item) => {
        const photoUrl = item.photo_key ? await getPhotoUrl(item.photo_key) : null;
        return {
          ...item,
          photo_url: photoUrl
        };
      })
    );

    return res.json({
      success: true,
      stats: {
        total,
        pending: reported,
        underReview,
        inProgress,
        resolved,
        highPriority
      },
      charts: {
        reportsByCategory,
        reportsByLocality,
        reportsBySeverity
      },
      recentIncidents
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/incidents/:id - Update incident status, severity, and resolution notes
 */
async function updateIncident(req, res, next) {
  try {
    const { id } = req.params;
    const { status, severity, resolution_note } = req.body;

    // Check incident exists
    const existing = await query('SELECT * FROM incidents WHERE incident_id = ? OR id = ? LIMIT 1', [id, id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Incident '${id}' not found.`
      });
    }

    const currentIncident = existing[0];

    // Build update dynamic fields
    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
        });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (severity !== undefined) {
      if (!VALID_SEVERITIES.includes(severity)) {
        return res.status(400).json({
          success: false,
          error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`
        });
      }
      updates.push('severity = ?');
      params.push(severity);
    }

    if (resolution_note !== undefined) {
      updates.push('resolution_note = ?');
      params.push(resolution_note ? resolution_note.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields provided for update.'
      });
    }

    const updateSql = `UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`;
    params.push(currentIncident.id);

    await query(updateSql, params);

    // Fetch updated record
    const [updated] = await query('SELECT * FROM incidents WHERE id = ?', [currentIncident.id]);
    const photoUrl = updated.photo_key ? await getPhotoUrl(updated.photo_key) : null;

    return res.json({
      success: true,
      message: 'Incident updated successfully.',
      incident: {
        ...updated,
        photo_url: photoUrl
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/backup - Trigger S3 or local archival export
 */
async function triggerBackup(req, res, next) {
  try {
    const result = await exportIncidentsBackup();
    return res.json({
      success: true,
      message: 'Archival backup generated successfully.',
      backup: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getDashboardStats,
  updateIncident,
  triggerBackup
};

