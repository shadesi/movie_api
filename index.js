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

// List of All users
app.get("/users", (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error: " + err);
    });
});


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
            Password: Users.hashPassword(req.body.Password),
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

// List Of all movies
app.get("/movies", passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});


// Get a single movie
app.get("/movies/:Title", passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

//  add movies to favourites
app.post("/users/:Username/movies/:MovieID", passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $push: { FavoriteMovies: req.params.MovieID },
    },
    { new: true },
    // callback
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error: " + err);
      } else {
        res.json(updatedUser);
      }
    }
  );
});

// ?? remove movies from favourites
app.delete("/users/:Username/movies/:MovieID", passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate(
    { Username: req.params.Username },
    {
      $pull: { FavoriteMovies: req.params.MovieID },
    },
    { new: true },
    // callback
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error: " + err);
      } else {
        res.json(updatedUser);
      }
    }
  );
});

// Get  Single Director
app.get("/directors/:Name", passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.findOne({ "Director.Name": req.params.Name })
    .then((movie) => {
      res.json(movie.Director);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

// Get  Single Genre
app.get("/genres/:Name", passport.authenticate('jwt', { session: false }), (req, res) => {
  Movie.findOne({ "Genre.Name": req.params.Name })
    .then((movie) => {
      res.json(movie.Genre);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

// Documentation route
app.get("/documentation", (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
})

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
