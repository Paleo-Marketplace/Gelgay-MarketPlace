const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'paleo-market',
  api_key: process.env.CLOUDINARY_API_KEY || '1234567890',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret_key',
  secure: true
});

/**
 * Upload image buffer to Cloudinary with automatic responsive scaling & WEBP transformation
 */
const uploadToCloudinary = async (fileBuffer, folder = 'paleo/products') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback base64 / mock link if Cloudinary credentials are not set
      const base64 = fileBuffer.toString('base64');
      return resolve(`data:image/jpeg;base64,${base64}`);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: 'webp',
        transformation: [{ width: 1000, crop: 'limit', quality: 'auto' }]
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]:', error.message);
          const base64 = fileBuffer.toString('base64');
          return resolve(`data:image/jpeg;base64,${base64}`);
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary
};
