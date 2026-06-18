const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const generatePrescriptionPDF = async (
  prescription,
  items,
  provider,
  patient,
) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      // Header
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('HEALTHIFY TELEMEDICINE', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('E-PRESCRIPTION', { align: 'center' });

      doc.moveDown(1);

      // Prescription Details
      doc.fontSize(12).font('Helvetica-Bold').text('Prescription Details');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Prescription Number: ${prescription.prescription_number}`)
        .text(
          `Date: ${new Date(
            prescription.prescription_date,
          ).toLocaleDateString()}`,
        )
        .text(
          `Valid Until: ${
            prescription.valid_until
              ? new Date(prescription.valid_until).toLocaleDateString()
              : 'Not specified'
          }`,
        );

      doc.moveDown(1);

      // Patient Information
      doc.fontSize(12).font('Helvetica-Bold').text('Patient Information');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${patient.prefix || 'Sir/Madam'} ${patient.firstName} ${patient.lastName}`)
        .text(`Email: ${patient.email || 'N/A'}`);


      doc.moveDown(1);

      // Provider Information
      doc.fontSize(12).font('Helvetica-Bold').text('Healthcare Provider');

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: Dr. ${provider.firstName || 'N/A'} ${provider.lastName || ''}`)
        .text(`Email: ${provider.email || 'N/A'}`);

      doc.moveDown(1);

      // Diagnosis
      if (prescription.diagnosis) {
        doc.fontSize(12).font('Helvetica-Bold').text('Diagnosis');

        doc.fontSize(10).font('Helvetica').text(prescription.diagnosis);

        doc.moveDown(1);
      }

      // Symptoms
      if (prescription.symptoms) {
        doc.fontSize(12).font('Helvetica-Bold').text('Symptoms');

        doc.fontSize(10).font('Helvetica').text(prescription.symptoms);

        doc.moveDown(1);
      }

      // Medications
      if (items && items.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Medications');

        items.forEach((item, index) => {
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${index + 1}. ${item.medication_name}`);

          doc
            .fontSize(9)
            .font('Helvetica')
            .text(`   Dosage: ${item.dosage_instructions}`)
            .text(`   Frequency: ${item.frequency}`)
            .text(`   Duration: ${item.duration || 'As prescribed'}`)
            .text(`   Quantity: ${item.quantity}`)
            .text(`   Refills: ${item.refills_allowed || 0}`);

          if (item.special_instructions) {
            doc.text(`   Special Instructions: ${item.special_instructions}`);
          }

          doc.moveDown(0.5);
        });
      }

      // Notes
      if (prescription.notes) {
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('Additional Notes');

        doc.fontSize(10).font('Helvetica').text(prescription.notes);
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          'This prescription is electronically generated and digitally signed.',
          { align: 'center' },
        );

      doc.text(`Generated on: ${new Date().toLocaleString()}`, {
        align: 'center',
      });

      // Digital Signature
      if (prescription.digital_signature) {
        doc.moveDown(1);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Digital Signature:', { align: 'center' });

        doc
          .fontSize(8)
          .font('Helvetica')
          .text(prescription.digital_signature, { align: 'center' });

        if (prescription.signature_timestamp) {
          doc.text(
            `Signed on: ${new Date(
              prescription.signature_timestamp,
            ).toLocaleString()}`,
            { align: 'center' },
          );
        }
      }

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a simple prescription PDF for testing
 */
const generateSimplePrescriptionPDF = async (prescriptionData, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Simple content
      doc.fontSize(20).text('PRESCRIPTION', { align: 'center' });

      doc.moveDown(2);
      doc
        .fontSize(12)
        .text(`Prescription Number: ${prescriptionData.prescription_number}`)
        .text(`Date: ${prescriptionData.prescription_date}`)
        .text(`Patient: ${prescriptionData.patient_name || 'N/A'}`)
        .text(`Provider: ${prescriptionData.provider_name || 'N/A'}`);

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePrescriptionPDF,
  generateSimplePrescriptionPDF,
};
