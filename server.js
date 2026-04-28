const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const path = require('path');

// Models
const User = require('./models/User');
const Movie = require('./models/Movie');
const { Theatre, Screen, Seat, Show, Booking } = require('./models/BookingModels');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

// Middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }
  if (!token) res.status(401).json({ error: 'Not authorized, no token' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized as an admin' });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ==========================================
// ROUTES
// ==========================================

// --- Auth ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) return res.status(400).json({ error: 'User already exists' });
  
  const user = await User.create({ name, email, password, phone });
  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// --- Movies ---
app.get('/api/movies', async (req, res) => {
  const movies = await Movie.find({});
  res.json(movies);
});

app.get('/api/movies/:id', async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (movie) res.json(movie);
  else res.status(404).json({ error: 'Movie not found' });
});

// --- Shows ---
app.get('/api/movies/:id/shows', async (req, res) => {
  const shows = await Show.find({ movie: req.params.id })
    .populate({
      path: 'screen',
      populate: { path: 'theatre' }
    });
  res.json(shows);
});

// --- Seats ---
app.get('/api/shows/:id/seats', async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  
  const seats = await Seat.find({ screen: show.screen });
  const bookings = await Booking.find({ show: show._id, status: 'confirmed' });
  const bookedSeatIds = bookings.flatMap(b => b.seats.map(s => s.toString()));

  const seatLayout = seats.map(seat => ({
    ...seat.toObject(),
    status: bookedSeatIds.includes(seat._id.toString()) ? 'booked' : 'available'
  }));
  
  res.json(seatLayout);
});

// --- Bookings ---
app.post('/api/bookings', protect, async (req, res) => {
  const { showId, seatIds, totalAmount } = req.body;
  const booking = await Booking.create({
    user: req.user._id,
    show: showId,
    seats: seatIds,
    totalAmount,
    transactionId: 'BMS' + Date.now()
  });
  res.status(201).json(booking);
});

app.get('/api/bookings/my', protect, async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('show')
    .populate({
      path: 'show',
      populate: { path: 'movie' }
    });
  res.json(bookings);
});

// --- Admin ---
app.get('/api/admin/stats', protect, admin, async (req, res) => {
  const totalMovies = await Movie.countDocuments();
  const totalBookings = await Booking.countDocuments({ status: 'confirmed' });
  const totalUsers = await User.countDocuments({ role: 'user' });
  const revenue = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  res.json({
    totalMovies,
    totalBookings,
    totalUsers,
    totalRevenue: revenue[0] ? revenue[0].total : 0
  });
});

// Serve Frontend
app.use(express.static(path.join(__dirname, '/frontend/dist')));
app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'frontend', 'dist', 'index.html')));

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
