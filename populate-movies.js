const mongoose = require("mongoose");
const axios = require("axios");

// MongoDB connection URL
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/movieDB";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_API_KEY"; // Replace with your actual TMDb API key

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

// Define the movie schema
let movieSchema = mongoose.Schema({
  Title: { type: String, required: true },
  Description: { type: String, required: true },
  Genre: {
    Name: String,
    Description: String,
  },
  Director: {
    Name: String,
    Bio: String,
  },
  Actors: [String],
  ImagePath: String,
  Featured: Boolean,
});

const Movie = mongoose.model("Movie", movieSchema);

// Function to fetch the movie credits (director and actors)
async function fetchMovieCredits(movieId) {
  const creditsResponse = await axios.get(
    `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
  );

  const credits = creditsResponse.data;

  // Extract the director
  const director = credits.crew.find((member) => member.job === "Director") || {
    name: "Unknown",
  };

  // Extract actor names (limit to 5 actors for simplicity)
  const actors = credits.cast.slice(0, 5).map((actor) => actor.name);

  return { director: director.name, actors };
}

// Function to populate movies
async function populateMovies() {
  try {
    // Fetch popular movies from TMDb
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );

    const movies = response.data.results;

    // Process and save at least 30 movies to the database
    let savedMovies = [];
    for (let i = 0; Math.min(30, movies.length); i++) {
      let movieData = movies[i];

      // Fetch director and actors
      const credits = await fetchMovieCredits(movieData.id);

      // Extract genre (we'll pick the first genre for simplicity)
      const genre = movieData.genre_ids[0]
        ? await fetchGenre(movieData.genre_ids[0])
        : { name: "N/A", description: "N/A" };

      // Create a new movie document
      let newMovie = new Movie({
        Title: movieData.title,
        Description: movieData.overview,
        Genre: {
          Name: genre.name, // Genre name
          Description: genre.description, // You can provide a description or leave it 'N/A'
        },
        Director: {
          Name: credits.director,
          Bio: "N/A", // No director bio from TMDb directly, but you can extend this
        },
        Actors: credits.actors,
        ImagePath: `https://image.tmdb.org/t/p/w500${movieData.poster_path}`,
        Featured: false,
      });

      // Save the movie to the database
      let savedMovie = await newMovie.save();
      savedMovies.push(savedMovie);
    }

    console.log(
      `${savedMovies.length} movies have been populated successfully!`
    );
    mongoose.connection.close(); // Close the connection when done
  } catch (error) {
    console.error("An error occurred while fetching and saving movies:", error);
    mongoose.connection.close(); // Ensure the connection is closed in case of an error
  }
}

// Function to fetch genre details from TMDb
async function fetchGenre(genreId) {
  const genreResponse = await axios.get(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
  );
  const genres = genreResponse.data.genres;
  const genre = genres.find((g) => g.id === genreId) || {
    name: "N/A",
    description: "N/A",
  };
  return { name: genre.name, description: "N/A" }; // Add genre description if available
}

// Run the populateMovies function
populateMovies();
