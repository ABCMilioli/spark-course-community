import { S3Client } from '@aws-sdk/client-s3';

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

export { s3Client }; 