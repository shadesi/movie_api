const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const passport = require('passport');
//require('dotenv').config(); // Load environment variables from .env
require('./passport'); // Passport configuration
const { check, validationResult } = require('express-validator');

// Initialize Express
const app = express();

// Suppress Mongoose strictQuery warning
mongoose.set('strictQuery', false);

// MongoDB connection using environment variables
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/movieDB";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(cors());
app.use(passport.initialize());

// Models
const Models = require("./models");
const Movie = Models.Movie;
const Users = Models.User;

// Authentication routes
require('./auth')(app); // Include the authentication routes

// User Routes with Validation
app.post('/users',
  [
    check('Username', 'Username is required and should be at least 5 characters long').isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          })
          .then((user) => { res.status(201).json(user); })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  }
);

// Update User
app.put('/users/:Username',
  passport.authenticate('jwt', { session: false }),
  [
    check('Username', 'Username is required and should be at least 5 characters long').optional().isLength({ min: 5 }),
    check('Username', 'Username contains non-alphanumeric characters - not allowed.').optional().isAlphanumeric(),
    check('Password', 'Password is required').optional().not().isEmpty(),
    check('Email', 'Email does not appear to be valid').optional().isEmail()
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    if (req.user.Username !== req.params.Username) {
      return res.status(400).send('Permission denied');
    }

    try {
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.Username },
        {
          $set: {
            Username: req.body.Username,
            Password: req.body.Password,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          },
        },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }
      res.json(updatedUser);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error: " + err);
    }
  }
);

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to MyFlix!");
});

// Documentation route
app.use("/documentation", express.static("public"));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Error");
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Your app is listening on port ' + port);
});

module.exports = app;
