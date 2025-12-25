const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./database');
const logger = require('./logger');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://api.crova.in/api/auth/google/callback'
        : '/api/auth/google/callback',
      scope: ['profile', 'email'],
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by googleId
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (user) {
          return done(null, user);
        }

        // Check if user exists by email
        const email = profile.emails[0].value;
        user = await prisma.user.findUnique({
          where: { email },
        });

        if (user) {
          // Update user with googleId if they exist by email but not linked
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              provider: 'GOOGLE', // Optional: Allow multiple providers logic if needed, simplify for now
              isEmailVerified: true, // Google verified
            },
          });
          return done(null, user);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            provider: 'GOOGLE',
            isEmailVerified: true,
          },
        });

        done(null, user);
      } catch (error) {
        logger.error('Google Auth Error:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;