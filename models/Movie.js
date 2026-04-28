const mongoose = require('mongoose');

const movieSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  posterUrl: { type: String },
  trailerUrl: { type: String },
  duration: { type: Number, required: true },
  language: { type: String, required: true },
  genre: { type: String, required: true },
  rating: { type: Number, default: 0 },
  releaseDate: { type: Date, required: true },
  cast: [String]
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
