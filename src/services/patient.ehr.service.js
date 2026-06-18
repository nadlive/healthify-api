// services/patient.service.js
const PatientModel = require('../models/patient.ehr.model');
const patientIdentityService = require('./patient.identity.service');
const { v4: uuidv4 } = require('uuid');
const userService = require('./user.service');

class PatientService {
  async createPatient(patientData, user = null) {
    try {
      const patient = new PatientModel(patientData);
      const validation = patient.validate();

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const patientId = uuidv4();

      if (user) {
        patient.userId = user.userId;
        patient.id = patientId;
        patient.contactInfo.email = user.email;
        await patientIdentityService.createOrUpdatePatient(patient);
      }

      return patient.toJSON();
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  // Get complete patient data
  async getPatient(patientId) {
    try {
      const patient = await patientIdentityService.getPatientById(patientId);

      return patient;
    } catch (error) {
      console.error('Error getting patient:', error);
      throw error;
    }
  }

  async updatePatient(patientId, userId = null, updateData) {
    try {
      const patient = new PatientModel(updateData);
      patient.userId = userId;

      const validation = patient.validate();

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (patientId) {
        await patientIdentityService.createOrUpdatePatient(patient);
      }

      return patient.toJSON();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  async changeActiveStatus(status, patientId) {
    try {
      const patient = await patientIdentityService.getPatientById(patientId);
      // @ts-ignore
      await userService.changeActiveStatus(status, patient.userId);
    } catch (error) {
      throw error;
    }
  }

  async changeOverdueStatus(status, patientId) {
    try {
      const patient = await patientIdentityService.getPatientById(patientId);
      // @ts-ignore
      await userService.changeOverdueStatus(status, patient.userId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PatientService();
