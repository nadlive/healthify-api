// models/patient.model.js

class PatientModel {
  constructor(data = {}) {
    this.demographics = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      middleName: data.middleName || '',
      age: data.age || null,
      gender: data.gender || '', // male, female, other, unknown
      dateOfBirth: data.dateOfBirth || null,
      address: {
        street: data.address?.street || '',
        city: data.address?.city || '',
        state: data.address?.state || '',
        postalCode: data.address?.postalCode || '',
        country: data.address?.country || '',
      },
      timezone: data.timezone || '',
    };

    this.contactInfo = {
      email: data.email || '',
      phone: data.phone || '',
    };

    this.vitals = {
      systolicBP: data.vitals?.systolicBP || null, // mmHg
      diastolicBP: data.vitals?.diastolicBP || null, // mmHg
      heartRate: data.vitals?.heartRate || null, // bpm
      respiratoryRate: data.vitals?.respiratoryRate || null, // breaths/min
      bodyTemperature: data.vitals?.bodyTemperature || null, // Celsius
      spO2: data.vitals?.spO2 || null, // percentage
      recordedDate: data.vitals?.recordedDate || null,
    };

    this.biometrics = {
      height: data.biometrics?.height || null, // cm
      weight: data.biometrics?.weight || null, // kg
      bmi: this.calculateBMI(data.biometrics?.height, data.biometrics?.weight),
      recordedDate: data.biometrics?.recordedDate || null,
    };

    this.medications = data.medications || [];

    this.allergies = data.allergies || [];

    this.socialHistory = {
      smoking: {
        status: data.socialHistory?.smoking?.status || 'never', // never, former, current
        packsPerDay: data.socialHistory?.smoking?.packsPerDay || null,
        quitDate: data.socialHistory?.smoking?.quitDate || null,
        notes: data.socialHistory?.smoking?.notes || '',
      },
      alcohol: {
        status: data.socialHistory?.alcohol?.status || 'never', // never, occasional, regular, heavy
        drinksPerWeek: data.socialHistory?.alcohol?.drinksPerWeek || null,
        notes: data.socialHistory?.alcohol?.notes || '',
      },
      otherSubstances: {
        uses: data.socialHistory?.otherSubstances?.uses || false,
        substances: data.socialHistory?.otherSubstances?.substances || [],
        notes: data.socialHistory?.otherSubstances?.notes || '',
      },
      exercise: {
        frequency: data.socialHistory?.exercise?.frequency || 'none', // none, occasional, regular
        type: data.socialHistory?.exercise?.type || '',
        minutesPerWeek: data.socialHistory?.exercise?.minutesPerWeek || null,
        notes: data.socialHistory?.exercise?.notes || '',
      },
    };

    // System fields
    this.fhirId = data.fhirId || null; // FHIR Patient resource ID
    this.identifier = data.identifier || null; // Internal system identifier
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Calculate BMI based on height (cm) and weight (kg)
  calculateBMI(height, weight) {
    if (!height || !weight || height <= 0 || weight <= 0) {
      return null;
    }
    // BMI = weight(kg) / (height(m))^2
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10; // Round to 1 decimal place
  }

  // Validation method
  validate() {
    const errors = [];

    // Required demographics
    if (!this.demographics.firstName) {
      errors.push('First name is required');
    }
    if (!this.demographics.lastName) {
      errors.push('Last name is required');
    }
    if (
      !this.demographics.gender ||
      !['male', 'female', 'other', 'unknown'].includes(this.demographics.gender)
    ) {
      errors.push('Valid gender is required');
    }
    if (!this.demographics.dateOfBirth && !this.demographics.age) {
      errors.push('Either date of birth or age is required');
    }

    // Contact validation
    // if (!this.contactInfo.email && !this.contactInfo.phone) {
    //   errors.push('At least one contact method (email or phone) is required');
    // }

    // Validate vitals ranges if provided
    if (
      this.vitals.systolicBP !== null &&
      (this.vitals.systolicBP < 70 || this.vitals.systolicBP > 250)
    ) {
      errors.push('Systolic BP should be between 70-250 mmHg');
    }
    if (
      this.vitals.diastolicBP !== null &&
      (this.vitals.diastolicBP < 40 || this.vitals.diastolicBP > 150)
    ) {
      errors.push('Diastolic BP should be between 40-150 mmHg');
    }
    if (
      this.vitals.heartRate !== null &&
      (this.vitals.heartRate < 30 || this.vitals.heartRate > 250)
    ) {
      errors.push('Heart rate should be between 30-250 bpm');
    }
    if (
      this.vitals.bodyTemperature !== null &&
      (this.vitals.bodyTemperature < 32 || this.vitals.bodyTemperature > 44)
    ) {
      errors.push('Body temperature should be between 32-44°C');
    }
    if (
      this.vitals.spO2 !== null &&
      (this.vitals.spO2 < 0 || this.vitals.spO2 > 100)
    ) {
      errors.push('SpO2 should be between 0-100%');
    }

    // Validate biometrics
    if (
      this.biometrics.height !== null &&
      (this.biometrics.height < 30 || this.biometrics.height > 300)
    ) {
      errors.push('Height should be between 30-300 cm');
    }
    if (
      this.biometrics.weight !== null &&
      (this.biometrics.weight < 1 || this.biometrics.weight > 500)
    ) {
      errors.push('Weight should be between 1-500 kg');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Convert to JSON
  toJSON() {
    return {
      id: this.id,
      demographics: this.demographics,
      contactInfo: this.contactInfo,
      vitals: this.vitals,
      biometrics: this.biometrics,
      medications: this.medications,
      allergies: this.allergies,
      socialHistory: this.socialHistory,
      fhirId: this.fhirId,
      identifier: this.identifier,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = PatientModel;
