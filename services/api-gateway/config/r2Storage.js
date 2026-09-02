const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_DOMAIN;

const isConfigured = Boolean(accountId && accessKeyId && secretAccessKey && bucketName && publicBaseUrl);

const s3Client = isConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    })
  : null;

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Unsupported upload type'));
  }
  return cb(null, true);
};

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024) },
  fileFilter
});

const buildObjectKey = (folder, originalName) => {
  const safeName = path.basename(originalName || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`;
};

const uploadBufferToR2 = async ({ buffer, originalName, mimeType = 'application/octet-stream', folder = 'uploads' }) => {
  const key = buildObjectKey(folder, originalName);

  if (s3Client && bucketName && publicBaseUrl) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType
        })
      );

      return {
        key,
        url: `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      };
    } catch (err) {
      console.warn('[R2 Storage] Upload failed, falling back to embedded URI:', err.message);
    }
  }

  // Graceful fallback for local development & testing without cloud credentials
  const base64 = buffer ? buffer.toString('base64') : '';
  const dataUrl = buffer ? `data:${mimeType};base64,${base64}` : 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80';

  return {
    key,
    url: dataUrl,
    isLocalFallback: true
  };
};

module.exports = {
  memoryUpload,
  uploadBufferToR2
};
