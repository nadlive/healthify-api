const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const uploadToS3 = async ({ buffer, key, mimeType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.APP_AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Tagging: 'status=pass',
  });

  await s3.send(command);

  return {
    key,
  };
};

const getPresignedDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.APP_AWS_S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3, command, {
    expiresIn: 60 * 1,
  });
};

module.exports = { uploadToS3, getPresignedDownloadUrl };
