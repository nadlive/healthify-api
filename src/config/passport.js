const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

// Create a new Google Strategy instance (only if credentials are provided)
const googleClientID = process.env.GOOGLE_AUTH_CLIENTID;
const googleClientSecret = process.env.GOOGLE_AUTH_CLIENTSECRET;

if (googleClientID && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({
            where: { email: profile.emails[0].value },
          });

          if (!user) {
            user = await User.create({
              username: profile.displayName,
              email: profile.emails[0].value,
              password: '',
            });
          }
          // if auth successful, return the user
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );
  console.log('✓ Google OAuth strategy configured');
} else {
  console.log('⚠ Google OAuth not configured (credentials missing)');
}

// Serialize user to store user id in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// deserialize user from session to get user object in subsequent requests

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
