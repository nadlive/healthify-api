const admin = require('firebase-admin');

let ready = false;
let disabled = false;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');

  return JSON.parse(jsonText);
}

function init() {
  if (ready || disabled) return ready;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    disabled = true;
    console.warn(
      '[FCM] Set FIREBASE_SERVICE_ACCOUNT_JSON to the Firebase service account JSON. Push send skipped.',
    );
    return false;
  }

  try {
    const serviceAccount = loadServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    ready = true;
    return true;
  } catch (error) {
    disabled = true;
    console.warn('[FCM] Service account could not be loaded', error?.message);
    return false;
  }
}

function tokenPrefix(token) {
  return token ? `${String(token).slice(0, 12)}…` : '(none)';
}

async function sendPush(token, body, meta = {}) {
  if (!token || !init()) {
    console.log(
      `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'}`,
    );
    console.log(
      `[FCM] Send to: SKIPPED token=${tokenPrefix(token)} reason=${!token ? 'no-token' : 'fcm-not-init'}`,
    );
    return;
  }

  console.log(
    `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'} body=${body}`,
  );
  console.log(
    `[FCM] Send to: role=${meta.role || '?'} userId=${meta.userId || '-'} token=${tokenPrefix(token)}`,
  );

  try {
    await admin.messaging().send({
      token,
      notification: {
        title: 'Healthify',
        body,
      },
    });
    console.log('[FCM] Push sent OK');
  } catch (error) {
    console.warn(
      `[FCM] Push failed code=${error?.code || '?'} message=${error?.message}`,
    );
  }
}

async function notifyPractitioner(practitionerId, body, meta = {}) {
  const Practitioner = require('../models/practitioner.model.entity');
  const User = require('../models/user.model');
  const practitioner = await Practitioner.findOne({
    where: { practitioner_id: practitionerId },
  });
  if (!practitioner?.userId) {
    console.log(
      `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'}`,
    );
    console.log(
      `[FCM] Send to: role=practitioner practitionerId=${practitionerId} SKIPPED (no userId)`,
    );
    return;
  }

  const recipient = await User.unscoped().findOne({
    where: { id: practitioner.userId },
    attributes: ['fcmToken'],
  });
  if (!recipient?.fcmToken) {
    console.log(
      `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'}`,
    );
    console.log(
      `[FCM] Send to: role=practitioner userId=${practitioner.userId} SKIPPED (no saved token)`,
    );
    return;
  }

  await sendPush(recipient.fcmToken, body, {
    ...meta,
    role: 'practitioner',
    userId: practitioner.userId,
  });
}

async function notifyPatient(patientId, body, meta = {}) {
  const Patient = require('../models/patient.identity.model');
  const User = require('../models/user.model');
  const patient = await Patient.findOne({
    where: { patient_id: patientId },
  });
  if (!patient?.userId) {
    console.log(
      `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'}`,
    );
    console.log(
      `[FCM] Send to: role=patient patientId=${patientId} SKIPPED (no userId)`,
    );
    return;
  }

  const recipient = await User.unscoped().findOne({
    where: { id: patient.userId },
    attributes: ['fcmToken'],
  });
  if (!recipient?.fcmToken) {
    console.log(
      `[FCM] This: event=${meta.event || '?'} chatId=${meta.chatId || '-'} fromUserId=${meta.fromUserId || '-'}`,
    );
    console.log(
      `[FCM] Send to: role=patient userId=${patient.userId} SKIPPED (no saved token)`,
    );
    return;
  }

  await sendPush(recipient.fcmToken, body, {
    ...meta,
    role: 'patient',
    userId: patient.userId,
  });
}

module.exports = { notifyPractitioner, notifyPatient };
