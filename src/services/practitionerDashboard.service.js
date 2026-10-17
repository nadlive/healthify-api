const { Op } = require('sequelize');
const Appointment = require('../models/appointmentModel');
const TimeSlot = require('../models/timeSlot');
const Practitioner = require('../models/practitioner.model.entity');
const Patient = require('../models/patient.identity.model');
const InAppNotification = require('../models/inAppNotification.model');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');
const {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
} = require('date-fns');

function startOfDayInTz(date, timeZone) {
  const zoned = toZonedTime(date, timeZone);
  return fromZonedTime(startOfDay(zoned), timeZone);
}

function endOfDayInTz(date, timeZone) {
  const zoned = toZonedTime(date, timeZone);
  return fromZonedTime(endOfDay(zoned), timeZone);
}

function startOfWeekInTz(date, timeZone) {
  const zoned = toZonedTime(date, timeZone);
  return fromZonedTime(startOfWeek(zoned, { weekStartsOn: 1 }), timeZone);
}

function endOfWeekInTz(date, timeZone) {
  const zoned = toZonedTime(date, timeZone);
  return fromZonedTime(endOfWeek(zoned, { weekStartsOn: 1 }), timeZone);
}

function normalizeMode(mode) {
  const m = String(mode || '').toLowerCase();
  if (m === 'chat') return 'chat';
  if (m === 'video') return 'video';
  return m || 'video';
}

function mapNextUp(appointment) {
  if (!appointment) return null;
  const json = appointment.toJSON ? appointment.toJSON() : appointment;
  const patient = json.patient || {};
  return {
    appointmentId: json.appointment_id,
    mode: normalizeMode(json.appointment_mode),
    status: json.status,
    scheduledTime: json.scheduled_time,
    endTime: json.end_time,
    patient: {
      id: patient.patient_id || null,
      firstName: patient.firstName || null,
      lastName: patient.lastName || null,
      name: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || null,
    },
  };
}

class PractitionerDashboardService {
  async getDashboard(practitionerId, options = {}) {
    const timeZone = options.timezone || 'UTC';
    const userId = options.userId || null;
    const now = new Date();

    const todayStart = startOfDayInTz(now, timeZone);
    const todayEnd = endOfDayInTz(now, timeZone);
    const weekStart = startOfWeekInTz(now, timeZone);
    const weekEnd = endOfWeekInTz(now, timeZone);
    const slotsFrom = todayStart;
    const slotsTo = fromZonedTime(
      endOfDay(addDays(toZonedTime(now, timeZone), 6)),
      timeZone,
    );

    const appointments = await Appointment.findAll({
      where: { practitioner_id: practitionerId },
      order: [['scheduled_time', 'ASC']],
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['patient_id', 'firstName', 'lastName'],
        },
      ],
    });

    let needsAction = 0;
    let todayCount = 0;
    let completedThisWeek = 0;
    let cancelledThisWeek = 0;
    let bookedCount = 0;
    let confirmedCount = 0;
    const patientIds = new Set();
    let nextUp = null;

    for (const row of appointments) {
      const a = row.toJSON();
      const status = String(a.status || '');
      const scheduled = a.scheduled_time ? new Date(a.scheduled_time) : null;

      if (a.patient_id) patientIds.add(a.patient_id);

      if (status === 'Booked') {
        needsAction += 1;
        bookedCount += 1;
      }
      if (status === 'Confirmed' || status === 'In Progress') {
        confirmedCount += 1;
      }

      if (
        scheduled &&
        scheduled >= todayStart &&
        scheduled <= todayEnd &&
        (status === 'Confirmed' ||
          status === 'In Progress' ||
          status === 'Booked')
      ) {
        todayCount += 1;
      }

      if (scheduled && scheduled >= weekStart && scheduled <= weekEnd) {
        if (status === 'Completed') completedThisWeek += 1;
        if (status === 'Cancelled') cancelledThisWeek += 1;
      }

      if (
        !nextUp &&
        scheduled &&
        scheduled >= now &&
        (status === 'Booked' ||
          status === 'Confirmed' ||
          status === 'In Progress')
      ) {
        nextUp = mapNextUp(row);
      }
    }

    const [slots, unreadAlerts, recentAlerts] = await Promise.all([
      TimeSlot.findAll({
        where: {
          provider_id: practitionerId,
          start_time: { [Op.between]: [slotsFrom, slotsTo] },
        },
        attributes: ['time_slot_id', 'is_booked'],
      }),
      userId
        ? InAppNotification.count({
            where: { userId, isRead: false },
          })
        : Promise.resolve(0),
      userId
        ? InAppNotification.findAll({
            where: { userId },
            order: [['created_at', 'DESC']],
            limit: 5,
          })
        : Promise.resolve([]),
    ]);

    const openSlots = slots.filter((s) => !s.is_booked).length;
    const bookedSlots = slots.filter((s) => s.is_booked).length;

    const practitioner = await Practitioner.findOne({
      where: { practitioner_id: practitionerId },
      attributes: ['practitioner_id', 'prefix', 'firstName', 'lastName', 'email'],
    });

    return {
      timezone: timeZone,
      practitioner: practitioner
        ? {
            id: practitioner.practitioner_id,
            name: [practitioner.prefix, practitioner.firstName, practitioner.lastName]
              .filter(Boolean)
              .join(' '),
            email: practitioner.email,
          }
        : null,
      counts: {
        needsAction,
        today: todayCount,
        completedThisWeek,
        cancelledThisWeek,
        booked: bookedCount,
        confirmed: confirmedCount,
        uniquePatients: patientIds.size,
        unreadAlerts,
      },
      availability: {
        openSlotsNext7Days: openSlots,
        bookedSlotsNext7Days: bookedSlots,
      },
      nextUp,
      recentAlerts: recentAlerts.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        personName: n.personName,
        chatId: n.chatId,
        isRead: n.isRead,
        createdAt: n.created_at || n.createdAt,
      })),
    };
  }

  async getDashboardForUser(userId, options = {}) {
    const practitioner = await Practitioner.findOne({ where: { userId } });
    if (!practitioner) {
      const err = new Error('Practitioner profile not found for user');
      err.status = 404;
      throw err;
    }
    return this.getDashboard(practitioner.practitioner_id, {
      ...options,
      userId,
    });
  }
}

module.exports = new PractitionerDashboardService();
