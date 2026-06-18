const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../controllers/subscriptionPlan.controller');

// Get all active subscription plans
router.get('/', subscriptionPlanController.getAllPlans);

// Get single plan by ID
router.get('/:id', subscriptionPlanController.getPlanById);

// Create new plan (Admin only)
router.post('/', subscriptionPlanController.createPlan);

// Update plan (Admin only)
router.put('/:id', subscriptionPlanController.updatePlan);

// Delete/deactivate plan (Admin only)
router.delete('/:id', subscriptionPlanController.deletePlan);

module.exports = router;
