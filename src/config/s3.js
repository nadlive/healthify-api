const { S3Client } = require('@aws-sdk/client-s3');

const useLocalS3 = process.env.USE_LOCAL_S3 === 'true';

const s3 = new S3Client({
  region: process.env.APP_AWS_REGION,
  ...(useLocalS3 && {
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: true,
  }),
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID_FOR_S3,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY_FOR_S3,
  },
});

module.exports = s3;
