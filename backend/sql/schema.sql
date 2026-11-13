-- AquaAlert MySQL / Amazon RDS Schema
-- Database initialization for Cloud-Based Water Supply Disruption Reporting System

CREATE DATABASE IF NOT EXISTS aquaalert_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aquaalert_db;

-- 1. Incidents Table
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

-- 2. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_username (username),
  INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

