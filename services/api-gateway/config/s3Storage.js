const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET || 'paleo-raw-storage';

let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

/**
 * Upload raw object buffer to AWS S3 bucket
 */
const uploadToAWS_S3 = async (fileBuffer, originalName, mimeType) => {
  const fileHash = crypto.randomBytes(8).toString('hex');
  const fileName = `uploads/${Date.now()}-${fileHash}-${path.basename(originalName)}`;

  if (s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType
      });
      await s3Client.send(command);
      console.log(`[AWS S3] Uploaded raw object successfully: ${fileName}`);
      return `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
    } catch (err) {
      console.error('[AWS S3 Upload Error]:', err.message);
    }
  }

  // Fallback Data URL / mock URL
  const base64 = fileBuffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
};

module.exports = {
  s3Client,
  uploadToAWS_S3
};
