const Speciality = require('../models/speciality.model');

class SpecialityService {
  async getAllSpecialities() {
    const specialities = await Speciality.findAll();
    return specialities;
  }
}

module.exports = new SpecialityService();
