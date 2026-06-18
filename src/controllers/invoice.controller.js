const {
  Invoice,
  Transaction,
  UserSubscription,
  SubscriptionPlan,
} = require('../models');
const invoiceService = require('../services/invoice.service');
const path = require('path');
const fs = require('fs');

class InvoiceController {
  /**
   * Create invoice from transaction
   */
  async createInvoice(req, res) {
    try {
      const { transactionId } = req.body;

      const transaction = await Transaction.findByPk(transactionId, {
        include: [{ model: UserSubscription, as: 'subscription' }],
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }

      // Prepare line items
      const lineItems = [
        {
          description: transaction.description || 'Service Payment',
          quantity: 1,
          unitPrice: transaction.amount,
          amount: transaction.amount,
        },
      ];

      // Create invoice
      const invoice = await Invoice.create({
        userId: transaction.userId,
        subscriptionId: transaction.subscriptionId,
        transactionId: transaction.id,
        amount: transaction.amount,
        tax: 0,
        discount: 0,
        total: transaction.amount,
        currency: transaction.currency,
        status: transaction.status === 'completed' ? 'paid' : 'issued',
        issuedAt: new Date(),
        paidAt: transaction.status === 'completed' ? new Date() : null,
        lineItems,
      });

      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create invoice',
      });
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: Transaction, as: 'transaction' },
          { model: UserSubscription, as: 'subscription' },
        ],
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoice',
      });
    }
  }

  /**
   * Get user's invoices
   */
  async getUserInvoices(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0, status } = req.query;

      const where = { userId };
      if (status) where.status = status;

      const invoices = await Invoice.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['issuedAt', 'DESC']],
        include: [{ model: Transaction, as: 'transaction' }],
      });

      res.status(200).json({
        success: true,
        data: invoices.rows,
        pagination: {
          total: invoices.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      console.error('Error fetching user invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoices',
      });
    }
  }

  /**
   * Generate and download invoice PDF
   */
  async downloadInvoicePDF(req, res) {
    try {
      const { invoiceId } = req.params;

      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: Transaction, as: 'transaction' },
          {
            model: UserSubscription,
            as: 'subscription',
            include: [{ model: SubscriptionPlan, as: 'plan' }],
          },
        ],
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      // Prepare invoice data for PDF
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        amount: invoice.amount,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        currency: invoice.currency,
        lineItems: invoice.lineItems,
        customerName: 'Customer', // TODO: Get from user service
        customerEmail: 'customer@email.com', // TODO: Get from user service
        billingAddress: invoice.billingAddress,
      };

      // Generate PDF buffer
      const pdfBuffer = await invoiceService.generateInvoiceBuffer(invoiceData);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`,
      );

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice PDF',
      });
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(req, res) {
    try {
      const { invoiceId } = req.params;
      const { status } = req.body;

      const invoice = await Invoice.findByPk(invoiceId);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      const updateData = { status };
      if (status === 'paid') {
        updateData.paidAt = new Date();
      }

      await invoice.update(updateData);

      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update invoice',
      });
    }
  }
}

module.exports = new InvoiceController();
