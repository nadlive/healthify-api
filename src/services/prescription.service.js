const {
  Prescription,
  PrescriptionItem,
  Appointment,
  Patient,
  Practitioner,
} = require('../models');

const {
  generatePrescriptionNumber,
} = require('../utils/prescriptionNumberGenerator');

const { generatePrescriptionPDF } = require('../utils/pdfGenerator');
const { generateSimpleSignature } = require('../utils/digitalSignature');
const practitionerFilesService = require('./practitionerFiles.service');

class PrescriptionService {
async createPrescription(prescriptionData, itemsData, providerUserId) {
  try {
    console.log('Creating prescription with data:', prescriptionData, itemsData, providerUserId);
    const practitioner = await Practitioner.findOne({
      where: { userId: providerUserId },
    });

    if (!practitioner) {
      throw new Error('User is not a practitioner');
    }

    // @ts-ignore
    const practitionerId = practitioner.practitioner_id;


    const appointment = await Appointment.findOne({
      where: {
        appointment_id: prescriptionData.appointment_id,
        practitioner_id: practitionerId,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found for this practitioner');
    }

    // if (
    //   // @ts-ignore
    //   !appointment.status ||
    //   // @ts-ignore
    //   appointment.status.toLowerCase() !== 'completed'
    // ) {
    //   throw new Error('Appointment is not completed');
    // }

 
    const patient = await Patient.findOne({
      where: { patient_id: prescriptionData.patient_id },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    const prescriptionNumber = await generatePrescriptionNumber();
    const digital_signature = generateSimpleSignature(prescriptionData);


    const prescription = await Prescription.create({
      appointment_id: prescriptionData.appointment_id,
      patient_id: prescriptionData.patient_id,
      provider_id: practitionerId, 
      prescription_number: prescriptionNumber,
      diagnosis: prescriptionData.diagnosis,
      symptoms: prescriptionData.symptoms,
      prescription_date: new Date(),
      valid_until: prescriptionData.valid_until,
      status: 'active',
      notes: prescriptionData.notes,
      digital_signature,
      signature_timestamp: new Date(),
    });

    for (const item of itemsData) {
      await PrescriptionItem.create({
        // @ts-ignore
        prescription_id: prescription.id,
        medication_name: item.medication_name,
        dosage_instructions: item.dosage,
        quantity: item.quantity || null,
        frequency: item.frequency,
        duration: item.duration || null,
        instructions: item.instructions || null,
      });
    }

    console.log('Generating PDF for prescription:',  prescription,
      itemsData,
      practitioner,
      patient);

    const pdfBuffer = await generatePrescriptionPDF(
      prescription,
      itemsData,
      practitioner,
      patient
    );

    const fileRecord =
      await practitionerFilesService.createPractitionerFile(
        prescriptionData.appointment_id,
        practitionerId,
        {
          buffer: pdfBuffer,
          originalname: `Prescription-${prescriptionNumber}.pdf`,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
        },
        'Prescription PDF'
      );

    // @ts-ignore
    prescription.pdf_path = fileRecord.file_name;
    // @ts-ignore
    prescription.s3Key = fileRecord.s3_key;
    await prescription.save();

    return prescription;
  } catch (error) {
  console.error('Prescription service error:', error);
  throw error instanceof Error
    ? error
    : new Error('Failed to create prescription');
}

}


}

module.exports = new PrescriptionService();
