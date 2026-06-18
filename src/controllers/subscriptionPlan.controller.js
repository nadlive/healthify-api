const { SubscriptionPlan } = require('../models');

class SubscriptionPlanController {
  /**
   * Get all subscription plans
   */
  async getAllPlans(req, res) {
    try {
      const plans = await SubscriptionPlan.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC']],
      });

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription plans',
      });
    }
  }

  /**
   * Get a single subscription plan by ID
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;

      const plan = await SubscriptionPlan.findByPk(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Subscription plan not found',
        });
      }

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscription plan',
      });
    }
  }

  /**
   * Create a new subscription plan (Admin only)
   */
  async createPlan(req, res) {
    try {
      const planData = req.body;

      const plan = await SubscriptionPlan.create(planData);

      res.status(201).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription plan',
      });
    }
  }

  /**
   * Update a subscription plan (Admin only)
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const plan = await SubscriptionPlan.findByPk(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Subscription plan not found',
        });
      }

      await plan.update(updateData);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription plan',
      });
    }
  }

  /**
   * Delete a subscription plan (Admin only - soft delete)
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;

      const plan = await SubscriptionPlan.findByPk(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Subscription plan not found',
        });
      }

      // Soft delete - just mark as inactive
      await plan.update({ isActive: false });

      res.status(200).json({
        success: true,
        message: 'Subscription plan deactivated successfully',
      });
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete subscription plan',
      });
    }
  }
}

module.exports = new SubscriptionPlanController();
