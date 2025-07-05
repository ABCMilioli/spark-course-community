const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  endpoint: `https://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  },
  forcePathStyle: true, // Importante para MinIO
  sslEnabled: process.env.MINIO_USE_SSL === 'true'
});

async function getPresignedUrl(bucket, key, expiresInSeconds = 600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

module.exports = {
  s3Client,
  getPresignedUrl
};
