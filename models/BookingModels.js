const mongoose = require('mongoose');

// Theatre Model
const theatreSchema = mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  facilities: [String]
}, { timestamps: true });

const Theatre = mongoose.model('Theatre', theatreSchema);

// Screen Model
const screenSchema = mongoose.Schema({
  theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
  name: { type: String, required: true },
  totalSeats: { type: Number, required: true }
}, { timestamps: true });

const Screen = mongoose.model('Screen', screenSchema);

// Seat Model (Optional: could be part of screen or dynamic)
const seatSchema = mongoose.Schema({
  screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  row: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  type: { type: String, default: 'regular', enum: ['regular', 'vip'] }
});

const Seat = mongoose.model('Seat', seatSchema);

// Show Model
const showSchema = mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  priceRegular: { type: Number, required: true },
  priceVIP: { type: Number, required: true }
}, { timestamps: true });

const Show = mongoose.model('Show', showSchema);

// Booking Model
const bookingSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  seats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat' }],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'confirmed', enum: ['confirmed', 'cancelled', 'pending'] },
  transactionId: { type: String, unique: true }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Theatre, Screen, Seat, Show, Booking };
