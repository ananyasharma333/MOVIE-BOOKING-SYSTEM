const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Movie = require('./models/Movie');
const { Theatre, Screen, Seat, Show } = require('./models/BookingModels');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Movie.deleteMany();
    await Theatre.deleteMany();
    await Screen.deleteMany();
    await Seat.deleteMany();
    await Show.deleteMany();

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@bookmyshow.com',
      password: 'admin123',
      role: 'admin'
    });

    // Create Movies
    const movies = await Movie.insertMany([
      {
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2JGjjc9k.jpg',
        trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
        duration: 166,
        language: 'English',
        genre: 'Sci-Fi, Adventure',
        rating: 8.8,
        releaseDate: new Date('2024-03-01'),
        cast: ['Timothée Chalamet', 'Zendaya']
      },
      {
        title: 'Oppenheimer',
        description: 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        trailerUrl: 'https://www.youtube.com/embed/uYPbbksJxIg',
        duration: 180,
        language: 'English',
        genre: 'Biography, Drama',
        rating: 8.4,
        releaseDate: new Date('2023-07-21'),
        cast: ['Cillian Murphy', 'Emily Blunt']
      }
    ]);

    // Create Theatre
    const theatre = await Theatre.create({
      name: 'PVR Cinemas',
      location: 'Phoenix Mall, Wakad',
      city: 'Pune',
      facilities: ['Dolby Atmos', 'Recliner']
    });

    // Create Screen
    const screen = await Screen.create({
      theatre: theatre._id,
      name: 'Screen 1 (IMAX)',
      totalSeats: 60
    });

    // Create Seats
    let seats = [];
    for (let r = 0; r < 6; r++) {
      const row = String.fromCharCode(65 + r);
      for (let s = 1; s <= 10; s++) {
        seats.push({
          screen: screen._id,
          row: row,
          seatNumber: s,
          type: r >= 4 ? 'vip' : 'regular'
        });
      }
    }
    await Seat.insertMany(seats);

    // Create Show
    await Show.create({
      movie: movies[0]._id,
      screen: screen._id,
      date: new Date(),
      time: '19:00',
      priceRegular: 250,
      priceVIP: 450
    });

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  // Add destroy function if needed
} else {
  importData();
}
