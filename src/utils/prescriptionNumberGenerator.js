const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique prescription number
 * Format: PR-YYYYMMDD-XXXXX (where XXXXX is a random 5-digit number)
 */
const generatePrescriptionNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');

  return `PR-${year}${month}${day}-${random}`;
};

/**
 * Generate a unique prescription number with timestamp
 * Format: PR-YYYYMMDD-HHMMSS-XXXXX
 */
const generatePrescriptionNumberWithTime = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');

  return `PR-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

module.exports = {
  generatePrescriptionNumber,
  generatePrescriptionNumberWithTime,
};
