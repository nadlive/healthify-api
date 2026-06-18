const patientService = require('../services/patient.ehr.service');
const patientIdentityService = require('../services/patient.identity.service');

class PatientController {
  async createPatient(req, res) {
    try {
      const patient = await patientService.createPatient(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient,
      });
    } catch (error) {
      res.status(error.message.includes('Validation') ? 400 : 500).json({
        success: false,
        message: error.message.includes('Validation')
          ? 'Validation error'
          : 'Error creating patient',
        error: error.message,
      });
    }
  }

  async getPatient(req, res) {
    try {
      const patient = await patientService.getPatient(req.params.id);
      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      console.error('Controller error getting patient:', error);
      res.status(404).json({
        success: false,
        message: 'Patient not found',
        error: error.message,
      });
    }
  }

  async updatePatient(req, res) {
    try {
      const patient = await patientService.updatePatient(
        req.params.id,
        req.user.userId,
        req.body,
      );
      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Controller error updating patient:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating patient',
        error: error.message,
      });
    }
  }

  async searchPatients(req, res) {
    try {
      const results = await patientIdentityService.searchPatients(
        req.query.query,
      );
      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error searching patients',
        error: error.message,
      });
    }
  }

  async makeInactive(req, res) {
    try {
      const patient = await patientService.changeActiveStatus(
        'inactive',
        req.params.id,
      );
      res.json({
        success: true,
        message: 'Patient made inactive successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error making patient inactive',
        error: error.message,
      });
    }
  }

  async makeActive(req, res) {
    try {
      const patient = await patientService.changeActiveStatus(
        'active',
        req.params.id,
      );
      res.json({
        success: true,
        message: 'Patient made active successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error making patient active',
        error: error.message,
      });
    }
  }

  async makeOverdue(req, res) {
    try {
      const patient = await patientService.changeOverdueStatus(
        'overdue',
        req.params.id,
      );
      res.json({
        success: true,
        message: 'Patient made overdue successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error making patient overdue',
        error: error.message,
      });
    }
  }

  async clearOverdue(req, res) {
    try {
      const patient = await patientService.changeOverdueStatus(
        'clear',
        req.params.id,
      );
      res.json({
        success: true,
        message: 'Patient cleared overdue successfully',
        data: patient,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error clearing patient overdue',
        error: error.message,
      });
    }
  }
}

module.exports = new PatientController();
