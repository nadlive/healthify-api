const crypto = require('crypto');

const generateSimpleSignature = (prescriptionData) => {
  try {
    const dataString = JSON.stringify(
      prescriptionData,
      Object.keys(prescriptionData).sort(),
    );
    const hash = crypto.createHash('md5').update(dataString).digest('hex');
    return `SIG-${hash.substring(0, 16)}`;
  } catch (error) {
    throw new Error(`Failed to generate simple signature: ${error.message}`);
  }
};

module.exports = {
  generateSimpleSignature,
};
