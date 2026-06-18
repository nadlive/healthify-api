const PractitionerFile = require('../models/practitionerFiles.model');
const { uploadToS3 } = require('./s3.service');

class PractitionerFileService {
  async createPractitionerFile(appointment_id, practitioner_id, file, notes) {
    const key = `appointments/practitioners/${Date.now()}-${file.originalname}`;

    const s3Result = await uploadToS3({
      buffer: file.buffer,
      key,
      mimeType: file.mimetype,
    });

    const record = await PractitionerFile.create({
      appointment_id,
      practitioner_id,
      s3_key: s3Result.key,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
      notes,
    });

    return record;
  }

  async getByAppointmentId(appointment_id) {
    return await PractitionerFile.findAll({
      where: { appointment_id },
      attributes: { exclude: ['s3_key'] },
      order: [['uploaded_at', 'ASC']],
    });
  }
}

module.exports = new PractitionerFileService();
