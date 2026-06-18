const patientFilesService = require('../services/patientFiles.service');
const practitionerFilesService = require('../services/practitionerFiles.service');

class PatientFileController {
  async uploadPatientFile(req, res, next) {
    try {
      const { appointment_id, patient_id, description } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!appointment_id || !patient_id) {
        return res
          .status(400)
          .json({ error: 'Missing appointment or patient' });
      }

      const fileRecord = await patientFilesService.createPatientFile(
        appointment_id,
        patient_id,
        req.file,
        description,
      );

      res.status(201).json({
        message: 'Patient file uploaded successfully',
        file: fileRecord,
      });
    } catch (err) {
      next(err);
    }
  }
  async getUploadedPrescriptionsFile(req, res) {
    try {
      const { appointment_id } = req.params;

      const [patientFiles, practitionerFiles] = await Promise.all([
        patientFilesService.getByAppointmentId(appointment_id),
        practitionerFilesService.getByAppointmentId(appointment_id),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          patient_files: patientFiles,
          practitioner_files: practitionerFiles,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointment files',
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { file_id } = req.params;

      const downloadUrl = await patientFilesService.generateDownloadUrl(
        file_id,
      );

      return res.status(200).json({
        success: true,
        download_url: downloadUrl,
      });
    } catch (error) {
      if (error.message === 'FILE_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate download URL',
      });
    }
  }
}

module.exports = new PatientFileController();
