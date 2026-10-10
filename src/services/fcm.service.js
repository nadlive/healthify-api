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

async function sendPush(token, body) {
  if (!token || !init()) return;

  await admin.messaging().send({
    token,
    notification: {
      title: 'Healthify',
      body,
    },
  });
  console.log('[FCM] Push sent:', body);
}

async function notifyPractitioner(practitionerId, body) {
  const Practitioner = require('../models/practitioner.model.entity');
  const User = require('../models/user.model');
  const practitioner = await Practitioner.findOne({
    where: { practitioner_id: practitionerId },
  });
  if (!practitioner?.userId) {
    console.log('[FCM] No practitioner user for chat', practitionerId);
    return;
  }

  const recipient = await User.unscoped().findOne({
    where: { id: practitioner.userId },
    attributes: ['fcmToken'],
  });
  if (!recipient?.fcmToken) {
    console.log('[FCM] Practitioner has no saved token', practitioner.userId);
    return;
  }

  console.log('[FCM] Sending push to practitioner', practitioner.userId, body);
  await sendPush(recipient.fcmToken, body);
}

async function notifyPatient(patientId, body) {
  const Patient = require('../models/patient.identity.model');
  const User = require('../models/user.model');
  const patient = await Patient.findOne({
    where: { patient_id: patientId },
  });
  if (!patient?.userId) {
    console.log('[FCM] No patient user for chat', patientId);
    return;
  }

  const recipient = await User.unscoped().findOne({
    where: { id: patient.userId },
    attributes: ['fcmToken'],
  });
  if (!recipient?.fcmToken) {
    console.log('[FCM] Patient has no saved token', patient.userId);
    return;
  }

  console.log('[FCM] Sending push to patient', patient.userId, body);
  await sendPush(recipient.fcmToken, body);
}

module.exports = { notifyPractitioner, notifyPatient };
