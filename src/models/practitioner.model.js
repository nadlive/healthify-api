// models/practitioner.model.js

const PRACTITIONER_LANGUAGES = ['English', 'Sinhala', 'Tamil'];

const normalizeLocalizedNames = (data = {}) => {
  if (Array.isArray(data.names) && data.names.length > 0) {
    return PRACTITIONER_LANGUAGES.map((language) => {
      const match = data.names.find(
        (entry) =>
          entry?.language === language ||
          (language === 'English' && entry?.language === 'language1') ||
          (language === 'Sinhala' && entry?.language === 'language2') ||
          (language === 'Tamil' && entry?.language === 'language3'),
      );
      return {
        language,
        prefix: match?.prefix || '',
        firstName: match?.firstName || '',
        lastName: match?.lastName || '',
      };
    });
  }

  return [
    {
      language: 'English',
      prefix: data.prefix || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
    },
    { language: 'Sinhala', prefix: '', firstName: '', lastName: '' },
    { language: 'Tamil', prefix: '', firstName: '', lastName: '' },
  ];
};

class PractitionerModel {
  constructor(data = {}) {
    const names = normalizeLocalizedNames(data);
    const englishName =
      names.find((entry) => entry.language === 'English') || names[0];

    // Demographics
    this.demographics = {
      names,
      firstName: englishName?.firstName || data.firstName || '',
      lastName: englishName?.lastName || data.lastName || '',
      middleName: data.middleName || '',
      prefix: englishName?.prefix || data.prefix || '', // Dr., Prof., Mr., Ms., etc.
      suffix: data.suffix || '', // MD, PhD, etc.
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
    };

    // Contact Details
    this.contactDetails = {
      email: data.email || '',
      phone: data.phone || '',
    };

    // Provider Type and Specialization
    this.providerType = data.providerType || '';

    // Doctor-specific fields
    this.doctorDetails = null;
    if (this.providerType === 'doctor') {
      this.doctorDetails = {
        category: data.doctorDetails?.category || '',
        // Options: 'general_practitioner', 'trainee', 'specialist'

        speciality: data.doctorDetails?.speciality || null,
        // Required if category is 'trainee' or 'specialist'
        // Examples: 'cardiology', 'neurology', 'pediatrics', 'surgery', etc.

        experience: data.doctorDetails?.experience || null,
        // For general practitioners - experience in specialties
      };
    }

    // Mental Health Professional-specific fields
    this.mentalHealthDetails = null;
    if (this.providerType === 'mental_health_professional') {
      this.mentalHealthDetails = {
        category: data.mentalHealthDetails?.category || '',
        // Options: 'psychologist', 'clinical_psychologist', 'psychiatrist', 'other'
        otherCategory: data.mentalHealthDetails?.otherCategory || '',
        specialization: data.mentalHealthDetails?.specialization || [],
        // Array of specializations: ['anxiety', 'depression', 'trauma', 'child_psychology', etc.]
        therapeuticApproaches:
          data.mentalHealthDetails?.therapeuticApproaches || [],
        // Array: ['CBT', 'DBT', 'psychodynamic', 'humanistic', etc.]
      };
    }

    // Physiotherapist-specific fields
    this.physiotherapistDetails = null;
    if (this.providerType === 'physiotherapist') {
      this.physiotherapistDetails = {
        specialization: data.physiotherapistDetails?.specialization || [],
        // Array: ['sports', 'orthopedic', 'neurological', 'pediatric', etc.]
        certifications: data.physiotherapistDetails?.certifications || [],
      };
    }

    // Nurse-specific fields
    this.nurseDetails = null;
    if (this.providerType === 'nurse') {
      this.nurseDetails = {
        category: data.nurseDetails?.category || '',
        // Options: 'registered_nurse', 'nurse_practitioner', 'clinical_nurse_specialist', etc.
        specialization: data.nurseDetails?.specialization || [],
      };
    }

    // Professional Qualifications
    this.qualifications = data.qualifications || [];

    // License Information
    this.licenses = data.licenses || [];

    // Languages spoken
    this.languages = data.languages || [];

    // Professional Experience
    this.experience = {
      totalYears: data.experience?.totalYears || 0,
      positions: data.experience?.positions || [],
    };

    // System fields
    this.fhirId = data.fhirId || null; // FHIR Practitioner resource ID
    this.fhirRoleId = data.fhirRoleId || null; // FHIR PractitionerRole resource ID
    this.identifier = data.identifier || null; // Internal system identifier
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Validation method
  validate() {
    const errors = [];

    // Required demographics (English name)
    const englishName = (this.demographics.names || []).find(
      (entry) => entry.language === 'English',
    );
    if (!englishName?.firstName && !this.demographics.firstName) {
      errors.push('First name is required');
    }
    if (!englishName?.lastName && !this.demographics.lastName) {
      errors.push('Last name is required');
    }
    if (
      !this.demographics.gender ||
      !['male', 'female', 'other', 'unknown'].includes(this.demographics.gender)
    ) {
      errors.push('Valid gender is required');
    }

    // Contact validation
    if (!this.contactDetails.email && !this.contactDetails.phone) {
      errors.push('At least one contact method (email or phone) is required');
    }

    // Provider type validation
    const validProviderTypes = [
      'doctor',
      'mental_health_professional',
      'physiotherapist',
      'nurse',
      'other',
    ];
    if (!this.providerType || !validProviderTypes.includes(this.providerType)) {
      errors.push('Valid provider type is required');
    }

    // Doctor-specific validations
    if (this.providerType === 'doctor') {
      if (!this.doctorDetails) {
        errors.push('Doctor details are required for doctor provider type');
      } else {
        const validCategories = [
          'general_practitioner',
          'trainee',
          'specialist',
        ];
        if (!validCategories.includes(this.doctorDetails.category)) {
          errors.push('Valid doctor category is required');
        }

        if (
          ['trainee', 'specialist'].includes(this.doctorDetails.category) &&
          !this.doctorDetails.speciality
        ) {
          errors.push(
            'Speciality is required for trainee and specialist doctors',
          );
        }
      }
    }

    // Mental health professional validations
    if (this.providerType === 'mental_health_professional') {
      if (!this.mentalHealthDetails) {
        errors.push('Mental health details are required');
      } else {
        const validCategories = [
          'psychologist',
          'clinical_psychologist',
          'psychiatrist',
          'other',
        ];
        if (!validCategories.includes(this.mentalHealthDetails.category)) {
          errors.push('Valid mental health professional category is required');
        }

        if (
          this.mentalHealthDetails.category === 'other' &&
          !this.mentalHealthDetails.otherCategory
        ) {
          errors.push(
            'Other category description is required when category is "other"',
          );
        }
      }
    }

    // License validation (at least one license required for doctors)
    if (this.providerType === 'doctor' && this.licenses.length === 0) {
      errors.push('At least one license (SLMC ID) is required for doctors');
    }

    // Validate license numbers
    this.licenses.forEach((license, index) => {
      if (!license.number) {
        errors.push(`License number is required for license at index ${index}`);
      }
      if (!license.type) {
        errors.push(`License type is required for license at index ${index}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get primary speciality
  getPrimarySpecialty() {
    if (this.providerType === 'doctor' && this.doctorDetails) {
      return this.doctorDetails.speciality;
    }
    if (
      this.providerType === 'mental_health_professional' &&
      this.mentalHealthDetails
    ) {
      return this.mentalHealthDetails.specialization[0] || null;
    }
    if (
      this.providerType === 'physiotherapist' &&
      this.physiotherapistDetails
    ) {
      return this.physiotherapistDetails.specialization[0] || null;
    }
    if (this.providerType === 'nurse' && this.nurseDetails) {
      return this.nurseDetails.specialization[0] || null;
    }
    return null;
  }

  // Convert to JSON
  toJSON() {
    return {
      demographics: this.demographics,
      contactDetails: this.contactDetails,
      providerType: this.providerType,
      doctorDetails: this.doctorDetails,
      mentalHealthDetails: this.mentalHealthDetails,
      physiotherapistDetails: this.physiotherapistDetails,
      nurseDetails: this.nurseDetails,
      qualifications: this.qualifications,
      licenses: this.licenses,
      languages: this.languages,
      experience: this.experience,
      availability: this.availability,
      fhirId: this.fhirId,
      fhirRoleId: this.fhirRoleId,
      identifier: this.identifier,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = PractitionerModel;
module.exports.normalizeLocalizedNames = normalizeLocalizedNames;
module.exports.PRACTITIONER_LANGUAGES = PRACTITIONER_LANGUAGES;
