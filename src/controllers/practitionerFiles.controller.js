const {
  createPractitionerFile,
} = require('../services/practitionerFiles.service');

class PractitionerFileController {
  async uploadPractitionerFile(req, res, next) {
    try {
      const { appointment_id, practitioner_id, notes } = req.body;
  
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!appointment_id ) {
        return res
          .status(400)
          .json({ error: 'Missing appointment' });
      }
       if (!practitioner_id ) {
        return res
          .status(400)
          .json({ error: 'Missing practitioner' });
      }
      const fileRecord = await createPractitionerFile(
        appointment_id,
        practitioner_id,
        req.file,
        notes,
      );

      res.status(201).json({
        message: 'Practitioner file uploaded successfully',
        file: fileRecord,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PractitionerFileController();
