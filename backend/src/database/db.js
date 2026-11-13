const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { config } = require('../config');

let pool = null;
let sqliteDb = null;
let activeEngine = 'mysql'; // 'mysql' or 'sqlite'

/**
 * Initialize MySQL Connection Pool
 */
async function initMySQL() {
  const connectionOptions = {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: config.db.ssl
  };

  pool = mysql.createPool(connectionOptions);

  // Test connection
  const conn = await pool.getConnection();
  console.log(`[DB] Connected to MySQL / Amazon RDS at ${config.db.host}:${config.db.port}`);
  conn.release();
  activeEngine = 'mysql';
}

/**
 * Fallback to SQLite if MySQL is not available in local environment
 */
async function initSQLite() {
  const dataDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'aquaalert.sqlite');
  console.log(`[DB] Initializing local SQLite database at: ${dbPath}`);

  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        return reject(err);
      }
      activeEngine = 'sqlite';
      console.log('[DB] Local SQLite fallback database initialized successfully.');
      resolve();
    });
  });
}

/**
 * Run schema migrations and create initial admin if needed
 */
async function initSchema() {
  if (activeEngine === 'mysql') {
    // MySQL schema setup
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        incident_id VARCHAR(50) NOT NULL UNIQUE,
        area VARCHAR(150) NOT NULL,
        issue_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        photo_key VARCHAR(255) DEFAULT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Reported',
        resolution_note TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_incidents_status (status),
        INDEX idx_incidents_area (area),
        INDEX idx_incidents_severity (severity),
        INDEX idx_incidents_issue_type (issue_type),
        INDEX idx_incidents_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_username (username),
        INDEX idx_admin_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure initial admin user exists
    const [rows] = await pool.query('SELECT id FROM admin_users WHERE username = ?', [config.initialAdmin.username]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(config.initialAdmin.password, 10);
      await pool.query(
        'INSERT INTO admin_users (username, email, password_hash) VALUES (?, ?, ?)',
        [config.initialAdmin.username, config.initialAdmin.email, hash]
      );
      console.log(`[DB] Created default admin user: ${config.initialAdmin.username}`);
    }

  } else {
    // SQLite schema setup
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT NOT NULL UNIQUE,
        area TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_key TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'Reported',
        resolution_note TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const admin = await getOneSqlite('SELECT id FROM admin_users WHERE username = ?', [config.initialAdmin.username]);
    if (!admin) {
      const hash = await bcrypt.hash(config.initialAdmin.password, 10);
      await runSqlite(
        'INSERT INTO admin_users (username, email, password_hash) VALUES (?, ?, ?)',
        [config.initialAdmin.username, config.initialAdmin.email, hash]
      );
      console.log(`[DB] Created default admin user in SQLite: ${config.initialAdmin.username}`);
    }

    // Seed sample data if empty
    const countRow = await getOneSqlite('SELECT COUNT(*) as cnt FROM incidents');
    if (countRow && countRow.cnt === 0) {
      const seedIncidents = [
        ['AQ-1001', 'Downtown Central, Sector 4', 'No Water Supply', 'Critical', 'Complete water supply disruption since 6:00 AM affecting 4 residential blocks.', null, 'In Progress', 'Field repair team dispatched. Main feeder valve inspection underway.'],
        ['AQ-1002', 'Greenwood Enclave, Main Rd', 'Pipeline Leakage', 'High', 'Major road pipeline burst causing water flooding and loss of clean municipal water.', null, 'Under Review', 'Water engineer assigned to isolate the valve section.'],
        ['AQ-1003', 'Sunrise Apartments, Block B', 'Low Water Pressure', 'Medium', 'Water pressure is insufficient to reach overhead storage tanks.', null, 'Reported', null],
        ['AQ-1004', 'Riverside Colony', 'Contaminated Water', 'High', 'Water is discolored with brownish sediment and pungent odor.', null, 'Reported', null],
        ['AQ-1005', 'Oakwood Hills, Lane 12', 'Other', 'Low', 'Water supply timing delayed by 3 hours without prior municipal notification.', null, 'Resolved', 'Timings restored to normal schedule following booster pump maintenance.']
      ];

      for (const row of seedIncidents) {
        await runSqlite(
          'INSERT INTO incidents (incident_id, area, issue_type, severity, description, photo_key, status, resolution_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          row
        );
      }
      console.log('[DB] Seeded initial incidents in SQLite database.');
    }
  }
}

/**
 * Universal Database Interface
 */
async function query(sql, params = []) {
  if (activeEngine === 'mysql') {
    const [results] = await pool.query(sql, params);
    return results;
  } else {
    // Translate MySQL queries to SQLite if necessary
    // e.g., NOW() -> datetime('now')
    let translatedSql = sql.replace(/NOW\(\)/gi, "datetime('now')");
    
    // Check query type
    const trimmed = translatedSql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      return new Promise((resolve, reject) => {
        sqliteDb.all(translatedSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.run(translatedSql, params, function (err) {
          if (err) return reject(err);
          resolve({
            insertId: this.lastID,
            affectedRows: this.changes
          });
        });
      });
    }
  }
}

function runSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ insertId: this.lastID, affectedRows: this.changes });
    });
  });
}

function getOneSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Initialize Database Connection
 */
async function connectDb() {
  try {
    await initMySQL();
    await initSchema();
    return activeEngine;
  } catch (err) {
    console.warn(`[DB Warning] MySQL connection failed (${err.code || err.message}).`);
    if (config.db.useSqliteFallback) {
      console.log('[DB Info] Engaging local SQLite fallback for seamless offline development...');
      await initSQLite();
      await initSchema();
      return activeEngine;
    } else {
      throw err;
    }
  }
}

function getActiveEngine() {
  return activeEngine;
}

module.exports = {
  connectDb,
  query,
  getActiveEngine
};

