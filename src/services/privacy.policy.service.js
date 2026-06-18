// @ts-nocheck
const { Patient, Practitioner } = require('../models');

class PolicyChecker {
  /**
   * @param {any} userId
   * @param {any} patientId
   */
  async canAccessPatient(userId, patientId) {
    const patient = await Patient.findOne({
      where: {
        patient_id: patientId,
        userId: userId,
      },
    });

    return patient !== null;
  }

  /**
   * @param {any} userId
   * @param {any} providerId
   */
  async canAccessProvider(userId, providerId) {
    const provider = await Practitioner.findOne({
      where: {
        practitioner_id: providerId,
        userId: userId,
      },
    });

    return provider !== null;
  }

  /**
   * @param {any} userId
   */
  async checkIfUserIsPractitioner(userId) {
    const practitioner = await Practitioner.findOne({
      where: {
        userId: userId,
      },
    });
    return practitioner !== null;
  }

  /**
   * Determine whether the user is a Practitioner or Patient
   * @param {any} userId
   * @returns {'practitioner' | 'patient' | null}
   */
  async getUserRole(userId) {
    const practitioner = await Practitioner.findOne({
      where: { userId },
    });

    if (practitioner) {
      return 'practitioner';
    }

    const patient = await Patient.findOne({
      where: { userId },
    });

    if (patient) {
      return 'patient';
    }

    return null;
  }
}

module.exports = new PolicyChecker();
