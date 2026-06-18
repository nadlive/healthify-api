// Generate a random 6-digit code
const generateLoginCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { generateLoginCode };
