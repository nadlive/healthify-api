const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');

// Create invoice
router.post('/', invoiceController.createInvoice);

// Get invoice by ID
router.get('/:invoiceId', invoiceController.getInvoice);

// Get user's invoices
router.get('/user/:userId', invoiceController.getUserInvoices);

// Download invoice PDF
router.get('/:invoiceId/pdf', invoiceController.downloadInvoicePDF);

// Update invoice status
router.patch('/:invoiceId/status', invoiceController.updateInvoiceStatus);

module.exports = router;
