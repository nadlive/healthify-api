const prescriptionService = require('../services/prescription.service');

class PrescriptionController {
  async createPrescriptionHandler(req, res, next) {
    try {
      const {
        appointment_id,
        patient_id,
        provider_id,
        diagnosis,
        symptoms,
        notes,
        valid_until, 
        items,
      } = req.body;

      if (
        !appointment_id ||
        !patient_id ||
        !provider_id ||
        !items ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Missing required fields: appointment_id, patient_id, provider_id, and items are required',
        });
      }

      for (const item of items) {
        if (!item.medication_name || !item.dosage || !item.frequency) {
          return res.status(400).json({
            success: false,
            message:
              'Each item must have medication_name, dosage, and frequency',
          });
        }
      }

      let validUntilDate = null;
      if (valid_until) {
        const today = new Date();
        switch (valid_until) {
          case '1_month':
            validUntilDate = new Date(today.setMonth(today.getMonth() + 1));
            break;
          case '2_months':
            validUntilDate = new Date(today.setMonth(today.getMonth() + 2));
            break;
          case '3_months':
            validUntilDate = new Date(today.setMonth(today.getMonth() + 3));
            break;
          default:
            validUntilDate = null;
        }
      }

      const prescriptionData = {
        appointment_id,
        patient_id,
        diagnosis,
        symptoms,
        notes,
        valid_until: validUntilDate,
      };

      const prescription = await prescriptionService.createPrescription(
        prescriptionData,
        items,
        provider_id,
      );

      return res.status(201).json({
        success: true,
        message: 'Prescription created successfully',
        data: prescription,
      });
    } catch (error) {
      console.error('Create prescription error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create prescription',
      });
    }
  }
}

module.exports = new PrescriptionController();
