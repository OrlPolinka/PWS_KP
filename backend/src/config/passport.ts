import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    (accessToken, refreshToken, profile, done) => {
      if (!profile.emails?.[0]?.value) {
        return done(new Error('Google account did not provide an email address'));
      }
      return done(null, profile as unknown as Express.User);
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
