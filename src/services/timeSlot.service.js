const TimeSlot = require('../models/timeSlot');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const Practitioner = require('../models/practitioner.model.entity');
const Patient = require('../models/patient.identity.model');
const { fromZonedTime } = require('date-fns-tz');
const { startOfDay, format, parse } = require('date-fns');
const { formatDateToTimezone } = require('../utils/date');

const createTimeSlotService = async (timeSlotData) => {
  const { userId, start_time, end_time, is_booked } = timeSlotData;

  const provider = await Practitioner.findOne({ where: { userId } });

  const timeSlot = await TimeSlot.create({
    provider_id: provider.get('practitioner_id'),
    start_time,
    end_time,
    is_booked,
    appointment_type: 'Video',
  });
  return timeSlot;
};

const getAvailableTimeSlotsService = async (
  provider_id,
  userId,
  date,
  appointmentTypeId,
) => {
  const patient = await Patient.findOne({ where: { userId } });
  const timezone = patient?.get('timezone') || 'UTC';

  const dateString = format(startOfDay(new Date(date)), 'yyyy-MM-dd');

  const startLocal = `${dateString} 00:00:00`;
  const endLocal = `${dateString} 23:59:59.999`;

  const startLocalDate = parse(startLocal, 'yyyy-MM-dd HH:mm:ss', new Date());
  const endLocalDate = parse(endLocal, 'yyyy-MM-dd HH:mm:ss.SSS', new Date());

  const startOfDayUtc = fromZonedTime(startLocalDate, String(timezone));
  const endOfDayUtc = fromZonedTime(endLocalDate, String(timezone));

  const timeSlots = await TimeSlot.findAll({
    where: {
      provider_id: provider_id,
      appointment_type: appointmentTypeId,
      is_booked: false,
      start_time: {
        [Op.between]: [startOfDayUtc, endOfDayUtc],
      },
    },
    order: [['start_time', 'ASC']],
  });

  const formattedTimeSlots = timeSlots.map((slot) => {
    const slotData = slot.toJSON();

    return {
      ...slotData,
      // @ts-ignore
      start_time: formatDateToTimezone(slotData.start_time, String(timezone)),
      // @ts-ignore
      end_time: formatDateToTimezone(slotData.end_time, timezone),
    };
  });

  return formattedTimeSlots;
};

const updateTimeSlotService = async (time_slot_id, timeSlotData) => {
  await TimeSlot.update(timeSlotData, {
    where: { time_slot_id },
  });

  return await TimeSlot.findByPk(time_slot_id);
};
const bookTimeSlotService = async (time_slot_id) => {
  return await updateTimeSlotService(time_slot_id, { is_booked: true });
};

const releaseTimeSlotService = async (time_slot_id) => {
  return await updateTimeSlotService(time_slot_id, { is_booked: false });
};

const deleteTimeSlotService = async (time_slot_id) => {
  const timeSlot = await TimeSlot.findByPk(time_slot_id);
  // @ts-ignore
  if (!timeSlot || timeSlot.is_booked) {
    throw new Error('Time slot not found or already booked');
  }
  await timeSlot.destroy();
  return { message: 'Time slot deleted successfully' };
};

const getTimeSlotByIdService = async (time_slot_id) => {
  const timeSlot = await TimeSlot.findByPk(time_slot_id);
  return timeSlot;
};

// Atomic check and book operation to prevent race conditions (duplicate bookings)
const checkAndBookTimeSlot = async (timeSlotId, transaction = null) => {
  const transactionInstance = transaction || (await sequelize.transaction());
  const shouldCommit = !transaction;

  try {
    // Use lock to prevent concurrent modifications
    const timeSlot = await TimeSlot.findByPk(timeSlotId, {
      lock: true,
      transaction: transactionInstance,
    });

    if (!timeSlot) {
      throw new Error('Time slot not found');
    }

    if (timeSlot.is_booked) {
      return false; // Already booked
    }

    // Book the time slot
    await timeSlot.update(
      { is_booked: true },
      { transaction: transactionInstance },
    );

    if (shouldCommit) {
      await transactionInstance.commit();
    }

    return true; // Successfully booked
  } catch (error) {
    if (shouldCommit) {
      await transactionInstance.rollback();
    }
    console.error('Error in checkAndBookTimeSlot:', error);
    return false;
  }
};

const checkProviderAvailabilityService = async (
  providerId,
  startTime,
  endTime,
  transaction = null,
) => {
  const transactionOptions = transaction ? { transaction } : {};

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid startTime or endTime: ${startTime}, ${endTime}`);
  }

  // Check for overlapping booked time slots
  const overlappingSlots = await TimeSlot.findAll({
    where: {
      provider_id: providerId,
      is_booked: true,
      // Check for overlap: new appointment overlaps if it starts before existing ends and ends after existing starts
      [Op.and]: [
        {
          start_time: {
            [Op.lt]: end, // Existing starts before new ends
          },
        },
        {
          end_time: {
            [Op.gt]: start, // Existing ends after new starts
          },
        },
      ],
    },
    ...transactionOptions,
  });

  return overlappingSlots;
};

const searchTimeSlotsService = async (fromDate, toDate, userId) => {
  const fromDateUTC = new Date(`${fromDate}T00:00:00.000Z`);
  const toDateUTC = new Date(`${toDate}T23:59:59.999Z`);

  const provider = await Practitioner.findOne({ where: { userId } });
  const practitionerId = provider.get('practitioner_id');

  const timeSlots = await TimeSlot.findAll({
    where: {
      provider_id: practitionerId,
      start_time: {
        [Op.between]: [fromDateUTC, toDateUTC],
      },
    },
    attributes: ['time_slot_id', 'start_time', 'end_time', 'is_booked'],
  });

  return timeSlots;
};

module.exports = {
  createTimeSlotService,
  getAvailableTimeSlotsService,
  bookTimeSlotService,
  releaseTimeSlotService,
  getTimeSlotByIdService,
  deleteTimeSlotService,
  checkAndBookTimeSlot,
  checkProviderAvailabilityService,
  updateTimeSlotService,
  searchTimeSlotsService,
};
