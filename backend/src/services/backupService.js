const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const { config } = require('../config');
const { query } = require('../database/db');

let s3Client = null;
try {
  s3Client = new S3Client({ region: config.aws.region });
} catch (err) {
  console.warn('[Backup] S3 client init warning:', err.message);
}

/**
 * Exports current incident records to an archival backup JSON file
 * and optionally uploads it to Amazon S3 (s3://<bucket>/backups/...)
 */
async function exportIncidentsBackup() {
  const incidents = await query('SELECT * FROM incidents ORDER BY id ASC');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `aquaalert-incidents-backup-${timestamp}.json`;
  const backupData = JSON.stringify({
    exported_at: new Date().toISOString(),
    total_records: incidents.length,
    records: incidents
  }, null, 2);

  // If local or dev
  if (config.aws.useLocalStorage || !config.aws.s3Bucket) {
    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const localPath = path.join(backupDir, filename);
    await fs.promises.writeFile(localPath, backupData, 'utf8');
    return {
      destination: 'local',
      path: localPath,
      records: incidents.length,
      filename
    };
  }

  // S3 Archival
  const s3Key = `backups/${filename}`;
  const putCmd = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    Body: backupData,
    ContentType: 'application/json'
  });

  await s3Client.send(putCmd);
  return {
    destination: 's3',
    bucket: config.aws.s3Bucket,
    key: s3Key,
    records: incidents.length,
    filename
  };
}

module.exports = {
  exportIncidentsBackup
};

