require('module-alias/register');
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

require('./src/config/passport');
const sequelize = require('./src/config/sequelize');
const publicAuthRoutes = require('./src/routes/public.auth.routes');
const identityAuthRoutes = require('./src/routes/auth.routes');
const identityUserRoutes = require('./src/routes/user.routes');
const ehrPatientRoutes = require('./src/routes/patient.ehr.routes');
const ehrPractitionerRoutes = require('./src/routes/practitioner.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');
const specialitiesRoutes = require('./src/routes/specialities.routes');
const billingRoutes = require('./src/routes/bill.routes');
const patientFilesRoute = require('./src/routes/patientFiles.routes');
const practitionerFilesRoute = require('./src/routes/practitionerFiles.routes');
const prescriptionRoutes = require('./src/routes/prescription.routes');
const refundRoutes = require('./src/routes/refund.routes');
const chatRoutes = require('./src/routes/chat.routes');
const subscriptionPlanRoutes = require('./src/routes/subscriptionPlan.routes');
const userSubscriptionRoutes = require('./src/routes/userSubscription.routes');
const invoiceRoutes = require('./src/routes/invoice.routes');
const cronAppointmentsRoutes = require('@/routes/cron.appointments.routes');
const cronSubscriptionsRoutes = require('@/routes/cron.subscriptions.routes');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(morgan('dev'));

// @ts-ignore - express-rate-limit CommonJS require works correctly at runtime
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
  validate: {
    trustProxy: false,
  },
});

app.use(limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'default-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/health', (req, res) => {
  res.status(200).json({ message: 'api ok' });
});

app.use('/auth', publicAuthRoutes);
app.use('/auth', identityAuthRoutes);
app.use('/user', identityUserRoutes);
app.use('/patients', ehrPatientRoutes);
app.use('/practitioners', ehrPractitionerRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/plans', subscriptionPlanRoutes);
app.use('/subscriptions', userSubscriptionRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/specialities', specialitiesRoutes);
app.use('/bills', billingRoutes);
app.use('/patientFiles', patientFilesRoute);
app.use('/practitionerFiles', practitionerFilesRoute);
app.use('/prescriptions', prescriptionRoutes);
app.use('/refunds', refundRoutes);
app.use('/chat', chatRoutes);
app.use('/cron/appointments', cronAppointmentsRoutes);
app.use('/cron/subscriptions', cronSubscriptionsRoutes);
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(3010, '0.0.0.0', () => {
  console.log('🚀 API Consolidated Service running: http://localhost:3010');
  initializeDatabase();
});

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

module.exports = app;
