const specialityService = require('../services/speciality.service');

class SpecialitiesController {
  async getAllSpecialities(req, res) {
    const specialities = await specialityService.getAllSpecialities();
    res.status(200).json(specialities);
  }
}

module.exports = new SpecialitiesController();
