const jwtSecret = 'your_jwt_secret'; // Ensure this matches the secret used in passport.js

const jwt = require('jsonwebtoken');
const passport = require('passport');

require('./passport'); // Import your passport strategies

let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // The username you’re encoding in the JWT
    expiresIn: '7d', // The token will expire in 7 days
    algorithm: 'HS256' // The algorithm used to “sign” or encode the values of the JWT
  });
}

/* POST login */
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
