const PDFDocument = require('pdfkit');
const fs = require('fs');
const { Invoice, InvoiceItem, Patient } = require('../models');

class InvoiceService {
  buildInvoiceMetaData(plan, subscriptionUsage) {
    return {
      type: 'subscription_new',
      planId: plan.id,
      subscriptionId: subscriptionUsage.subscriptionId,
      subscriptionUsageId: subscriptionUsage.id,
    };
  }

  async getActiveInvoice(userId) {
    return await Invoice.findOne({
      where: { userId, invoiceActiveStatus: true },
      include: [{ model: Patient, as: 'patient', required: false }],
    });
  }

  async createInvoiceItemForActiveInvoice(userId, appointment, charge, transaction) {
    const invoice = await this.getActiveInvoice(userId);
    const description = `Appointment fee: ${new Date(appointment.scheduled_time).toISOString().split('T')[0]}`;
    return await InvoiceItem.create(
      {
        invoiceId: invoice.id,
        type: 'appointment',
        description,
        amount: charge,
        appointmentId: appointment.appointment_id,
        metadata: { appointmentId: appointment.appointment_id },
      },
      { transaction },
    );
  }

  async addInvoiceItems(userId, metadata, plan, transaction) {
    const invoice = await Invoice.findOne({
      where: { userId, invoiceActiveStatus: true },
      transaction,
    });

    const invoiceItem = await invoice.createItem(
      {
        type: 'subscription-fee',
        description: `${plan.displayName} Subscription (${plan.billingPeriod})`,
        amount: plan.price ?? 0,
        metadata,
      },
      { transaction },
    );

    return { invoice, invoiceItems: [invoiceItem] };
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);

        doc.pipe(stream);

        // Header
        this.generateHeader(doc);

        // Customer information
        this.generateCustomerInformation(doc, invoiceData);

        // Invoice details
        this.generateInvoiceTable(doc, invoiceData);

        // Footer
        this.generateFooter(doc);

        doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  generateHeader(doc) {
    doc
      .fontSize(20)
      .text('HEALTHIFY', 50, 45, { align: 'left' })
      .fontSize(10)
      .text('Telemedicine Platform', 50, 70)
      .text('Colombo, Sri Lanka', 50, 85)
      .text('contact@healthify.lk', 50, 100)
      .moveDown();
  }

  generateCustomerInformation(doc, invoice) {
    const customerInformationTop = 140;

    doc
      .fontSize(10)
      .text('Invoice Number:', 50, customerInformationTop)
      .font('Helvetica-Bold')
      .text(invoice.invoiceNumber, 150, customerInformationTop)
      .font('Helvetica')
      .text('Invoice Date:', 50, customerInformationTop + 15)
      .text(
        this.formatDate(invoice.issuedAt || new Date()),
        150,
        customerInformationTop + 15,
      )
      .text('Due Date:', 50, customerInformationTop + 30)
      .text(
        this.formatDate(invoice.dueDate || new Date()),
        150,
        customerInformationTop + 30,
      )
      .moveDown();

    // Bill To
    const billToTop = customerInformationTop + 60;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Bill To:', 50, billToTop)
      .font('Helvetica')
      .text(invoice.customerName || 'Customer', 50, billToTop + 15)
      .text(invoice.customerEmail || '', 50, billToTop + 30);

    if (invoice.billingAddress) {
      doc
        .text(invoice.billingAddress.address || '', 50, billToTop + 45)
        .text(
          `${invoice.billingAddress.city || ''}, ${invoice.billingAddress.country || ''}`,
          50,
          billToTop + 60,
        );
    }
  }

  generateInvoiceTable(doc, invoice) {
    let tableTop = 320;

    // Table header
    this.generateTableRow(
      doc,
      tableTop,
      'Item',
      'Quantity',
      'Unit Price',
      'Amount',
    );

    this.generateHr(doc, tableTop + 20);

    // Line items
    let position = tableTop + 30;
    invoice.lineItems.forEach((item) => {
      position =
        this.generateTableRow(
          doc,
          position,
          item.description,
          item.quantity,
          this.formatCurrency(item.unitPrice, invoice.currency),
          this.formatCurrency(item.amount, invoice.currency),
        ) + 20;
    });

    // Subtotal, tax, discount, total
    const subtotalPosition = position + 20;
    this.generateTableRow(
      doc,
      subtotalPosition,
      '',
      '',
      'Subtotal:',
      this.formatCurrency(invoice.amount, invoice.currency),
    );

    if (invoice.discount > 0) {
      this.generateTableRow(
        doc,
        subtotalPosition + 20,
        '',
        '',
        'Discount:',
        `-${this.formatCurrency(invoice.discount, invoice.currency)}`,
      );
    }

    if (invoice.tax > 0) {
      this.generateTableRow(
        doc,
        subtotalPosition + 40,
        '',
        '',
        'Tax:',
        this.formatCurrency(invoice.tax, invoice.currency),
      );
    }

    this.generateHr(doc, subtotalPosition + 60);

    this.generateTableRow(
      doc,
      subtotalPosition + 70,
      '',
      '',
      'Total:',
      this.formatCurrency(invoice.total, invoice.currency),
      true,
    );
  }

  generateTableRow(doc, y, item, quantity, unitPrice, amount, isBold = false) {
    const font = isBold ? 'Helvetica-Bold' : 'Helvetica';
    doc
      .font(font)
      .fontSize(10)
      .text(item, 50, y, { width: 200 })
      .text(quantity, 270, y, { width: 90, align: 'right' })
      .text(unitPrice, 370, y, { width: 90, align: 'right' })
      .text(amount, 0, y, { align: 'right' });

    return y;
  }

  generateHr(doc, y) {
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }

  generateFooter(doc) {
    doc
      .fontSize(10)
      .text('Thank you for your business with Healthify!', 50, 700, {
        align: 'center',
        width: 500,
      })
      .text('For support, contact us at support@healthify.lk', 50, 720, {
        align: 'center',
        width: 500,
      });
  }

  formatCurrency(amount, currency = 'LKR') {
    return `${currency} ${parseFloat(amount).toFixed(2)}`;
  }

  formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  /**
   * Generate invoice buffer (for sending via email or direct download)
   */
  async generateInvoiceBuffer(invoiceData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Generate PDF content
        this.generateHeader(doc);
        this.generateCustomerInformation(doc, invoiceData);
        this.generateInvoiceTable(doc, invoiceData);
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new InvoiceService();
