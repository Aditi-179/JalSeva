const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { config } = require('../config');

// Initialize S3 Client (picks up IAM Role automatically when on EC2)
let s3Client = null;
try {
  s3Client = new S3Client({
    region: config.aws.region
  });
} catch (err) {
  console.warn('[Storage] S3 Client initialization warning:', err.message);
}

/**
 * Uploads a file buffer to S3 or local storage
 * @param {Object} file - Multer file object
 * @returns {Promise<string>} The storage key (e.g., incidents/abc-123.jpg)
 */
async function uploadFile(file) {
  if (!file) return null;

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
  }

  const uniqueId = crypto.randomBytes(12).toString('hex');
  const key = `incidents/${Date.now()}-${uniqueId}${ext}`;

  // If local storage is explicitly enabled or S3 bucket is not configured
  if (config.aws.useLocalStorage) {
    const uploadDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, path.basename(key));
    await fs.promises.writeFile(localFilePath, file.buffer);
    console.log(`[Storage] Saved file to local directory: ${key}`);
    return key;
  }

  // AWS S3 Upload using AWS SDK v3
  try {
    const putCommand = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // Note: Bucket remains strictly private; no ACL: 'public-read'
    });

    await s3Client.send(putCommand);
    console.log(`[Storage] Successfully uploaded ${key} to S3 bucket ${config.aws.s3Bucket}`);
    return key;
  } catch (err) {
    console.error('[Storage Error] S3 upload failed:', err.message);
    // If S3 upload fails in dev mode, fallback to saving locally
    if (config.nodeEnv !== 'production') {
      console.warn('[Storage Warning] Falling back to local storage for file...');
      const uploadDir = path.resolve(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, path.basename(key));
      await fs.promises.writeFile(localFilePath, file.buffer);
      return key;
    }
    throw err;
  }
}

/**
 * Generates an authorized viewing URL for a photo key
 * (Pre-signed S3 URL or local endpoint)
 * @param {string} photoKey
 * @returns {Promise<string|null>}
 */
async function getPhotoUrl(photoKey) {
  if (!photoKey) return null;

  // If stored locally or configured for local storage
  if (config.aws.useLocalStorage) {
    const filename = path.basename(photoKey);
    return `/uploads/${filename}`;
  }

  // Generate AWS S3 Pre-signed URL (Valid for 1 hour = 3600 seconds)
  try {
    const getCommand = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: photoKey
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    return presignedUrl;
  } catch (err) {
    console.warn(`[Storage Warning] Could not generate pre-signed URL for ${photoKey}:`, err.message);
    // Return local fallback route
    return `/uploads/${path.basename(photoKey)}`;
  }
}

module.exports = {
  uploadFile,
  getPhotoUrl
};

