const Speciality = require('../models/speciality.model');
const { mapSpecialityResponse } = require('../constants/languages');

class SpecialityService {
  async getAllSpecialities() {
    const specialities = await Speciality.findAll();
    return specialities.map((row) => mapSpecialityResponse(row.toJSON()));
  }
}

module.exports = new SpecialityService();
