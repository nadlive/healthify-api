const PatientFile = require('../models/patientFiles.model');
const PractitionerFile = require('../models/practitionerFiles.model');
const { uploadToS3, getPresignedDownloadUrl } = require('./s3.service');

class PatientFileService {
  async createPatientFile(appointment_id, patient_id, file, description) {
    const key = `appointments/patients/${Date.now()}-${file.originalname}`;

    const s3Result = await uploadToS3({
      buffer: file.buffer,
      key,
      mimeType: file.mimetype,
    });

    const record = await PatientFile.create({
      appointment_id,
      patient_id,
      s3_key: s3Result.key,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      description,
    });

    return record;
  }

  async getByAppointmentId(appointment_id) {
    return await PatientFile.findAll({
      where: { appointment_id },
      attributes: { exclude: ['s3_key'] },
      order: [['uploaded_at', 'ASC']],
    });
  }

  async generateDownloadUrl(file_id) {
    let file = await PatientFile.findByPk(file_id);

    if (!file) {
      file = await PractitionerFile.findByPk(file_id);
    }

    if (!file) {
      throw new Error('FILE_NOT_FOUND');
    }

    return await getPresignedDownloadUrl(file.s3_key);
  }
}

module.exports = new PatientFileService();
