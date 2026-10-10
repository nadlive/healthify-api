const { Chat, Practitioner, Patient } = require('../models');
const { notifyPractitioner, notifyPatient } = require('./fcm.service');
const inAppNotificationService = require('./inAppNotification.service');

class ChatService {
  async getChatById(id) {
    const chat = await Chat.findOne({
      where: { id },
      include: [
        {
          model: Practitioner,
          as: 'practitioner',
          attributes: ['practitioner_id', 'prefix', 'firstName', 'lastName'],
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['patient_id', 'firstName', 'lastName'],
        },
      ],
    });
    return chat;
  }
  async searchChats({ chatId, userId, status }) {
    const where = {};
    if (userId != null) where.userId = userId;
    if (status != null) where.status = status;
    if (chatId != null) where.chatId = chatId;
    const chats = await Chat.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        {
          model: Practitioner,
          as: 'practitioner',
        },
      ],
    });
    return chats;
  }

  async requestChat(chatId, userId) {
    const chat = await Chat.findOne({ where: { id: chatId } });
    if (!chat) return { error: 'not_found' };
    if (String(chat.userId) !== String(userId)) return { error: 'forbidden' };
    if (chat.status === 'completed' || chat.status === 'rejected') {
      return { error: 'closed' };
    }

    const patient = await Patient.findOne({
      where: { patient_id: chat.patientId },
      attributes: ['firstName'],
    });
    const practitioner = await Practitioner.findOne({
      where: { practitioner_id: chat.practitionerId },
      attributes: ['userId'],
    });
    const firstName = String(patient?.firstName || '').trim();
    const personName = firstName || 'A patient';
    const pushBody =
      firstName && firstName.length <= 20
        ? `${firstName} is ready to chat`
        : 'A patient is ready to chat';

    await notifyPractitioner(chat.practitionerId, pushBody);
    await inAppNotificationService
      .create({
        userId: practitioner?.userId,
        chatId: chat.id,
        title: 'Chat request',
        body: `${personName} would like to chat`,
        personName,
      })
      .catch((error) => {
        console.warn('[Notifications] Could not store chat request', error?.message);
      });
    return { ok: true, firstName };
  }

  async readyForChat(chatId, userId) {
    const chat = await Chat.findOne({ where: { id: chatId } });
    if (!chat) return { error: 'not_found' };
    if (chat.status === 'completed' || chat.status === 'rejected') {
      return { error: 'closed' };
    }

    const practitioner = await Practitioner.findOne({
      where: { practitioner_id: chat.practitionerId },
      attributes: ['userId', 'firstName'],
    });
    if (!practitioner || String(practitioner.userId) !== String(userId)) {
      return { error: 'forbidden' };
    }

    const firstName = String(practitioner.firstName || '').trim();
    const personName = firstName || 'Your doctor';
    const pushBody =
      firstName && firstName.length <= 20
        ? `${firstName} is ready to chat`
        : 'Your doctor is ready to chat';
    const patient = await Patient.findOne({
      where: { patient_id: chat.patientId },
      attributes: ['userId'],
    });

    await notifyPatient(chat.patientId, pushBody);
    await inAppNotificationService
      .create({
        userId: patient?.userId,
        chatId: chat.id,
        title: 'Ready to chat',
        body: `${personName} is ready to chat`,
        personName,
      })
      .catch((error) => {
        console.warn('[Notifications] Could not store ready notice', error?.message);
      });
    return { ok: true, firstName };
  }
}

module.exports = new ChatService();
