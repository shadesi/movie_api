const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret'; // Secure your JWT secret
const jwt = require('jsonwebtoken');
const passport = require('passport');

require('./passport'); // Ensure Passport strategies are loaded

let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username,
    expiresIn: '7d', // Token valid for 7 days
    algorithm: 'HS256' // Signing algorithm
  });
}

module.exports = (app) => {
  app.post('/auth/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: 'Something is not right',
          user: user
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
}
