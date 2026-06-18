const express = require('express');
const upload = require('../middleware/upload');
const { uploadPatientFile,getUploadedPrescriptionsFile,downloadFile } = require('../controllers/patientFiles.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);
router.post('/upload', upload.single('file'), uploadPatientFile);
router.get('/appointments/:appointment_id/files',getUploadedPrescriptionsFile);
router.get('/files/:file_id/download', downloadFile);
module.exports = router;
