// controllers/practitioner.controller.js
const practitionerService = require('../services/practitioner.service');
class PractitionerController {
  async getActivePractitioners(req, res) {
    const userId = req.user.userId;
    const practitioners =
      await practitionerService.getActivePractitioners(userId);

    res.status(200).json(practitioners);
  }

  async createPractitioner(req, res) {
    try {
      const practitioner = await practitionerService.createPractitioner(
        req.body,
      );
      res.status(201).json({
        success: true,
        message: 'Practitioner created successfully',
        data: practitioner,
      });
    } catch (error) {
      res.status(error.message.includes('Validation') ? 400 : 500).json({
        success: false,
        message: error.message.includes('Validation')
          ? 'Validation error'
          : 'Error creating practitioner',
        error: error.message,
      });
    }
  }

  async getPractitioner(req, res) {
    try {
      const practitioner = await practitionerService.getPractitioner(
        req.params.id,
      );

      res.json({
        success: true,
        data: practitioner,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Error occurred while getting practitioner',
      });
    }
  }

  async updatePractitioner(req, res) {
    try {
      const practitioner = await practitionerService.updatePractitioner(
        req.params.id,
        req.body,
      );
      res.json({
        success: true,
        message: 'Practitioner updated successfully',
        data: practitioner,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating practitioner',
        error: error.message,
      });
    }
  }

  async searchPractitioners(req, res) {
    try {
      const results = await practitionerService.searchPractitioners(req.query);
      res.json({
        success: true,
        data: results,
        count: results.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error searching practitioners',
        error: error.message,
      });
    }
  }

  async deletePractitioner(req, res) {
    const { id } = req.params;
    await practitionerService.deletePractitioner(id);
    res.status(200).json({ message: 'successfully' });
  }

  async upsertWorkingHours(req, res) {
    const { id } = req.params;
    const workingHoursArray = req.body.map((item) => ({
      dayOfWeek: item.dayOfWeek,
      start_time: item.start_time,
      end_time: item.end_time,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    }));

    await practitionerService.upsertProviderWorkingHours(id, workingHoursArray);

    res.status(200).json({
      success: true,
      message: 'Provider working hours updated successfully',
    });
  }

  async getProviderWorkingHours(req, res) {
    const { id } = req.params;
    const workingHours = await practitionerService.getProviderWorkingHours(id);
    res.json(workingHours);
  }
}

module.exports = new PractitionerController();
