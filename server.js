require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movie_booking',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log("Database connection pool created.");
} catch (err) {
    console.error("Error creating database pool:", err);
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ==========================================
// API ROUTES
// ==========================================

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, phone]
        );
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

// --- Movie Routes ---
app.get('/api/movies', async (req, res) => {
    try {
        const [movies] = await pool.execute('SELECT * FROM movies ORDER BY release_date DESC');
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/movies/:id', async (req, res) => {
    try {
        const [movies] = await pool.execute('SELECT * FROM movies WHERE id = ?', [req.params.id]);
        if (movies.length === 0) return res.status(404).json({ error: 'Movie not found' });
        res.json(movies[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Show & Theatre Routes ---
app.get('/api/movies/:id/shows', async (req, res) => {
    try {
        const movieId = req.params.id;
        const [shows] = await pool.execute(`
            SELECT s.id as show_id, s.show_date, s.show_time, s.price_regular, s.price_vip,
                   sc.id as screen_id, sc.name as screen_name,
                   t.id as theatre_id, t.name as theatre_name, t.location, t.city, t.facilities
            FROM shows s
            JOIN screens sc ON s.screen_id = sc.id
            JOIN theatres t ON sc.theatre_id = t.id
            WHERE s.movie_id = ? AND s.show_date >= CURDATE()
            ORDER BY s.show_date, s.show_time
        `, [movieId]);
        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Seat & Booking Routes ---
app.get('/api/shows/:id/seats', async (req, res) => {
    try {
        const showId = req.params.id;
        // Get show details to find screen_id
        const [shows] = await pool.execute('SELECT screen_id FROM shows WHERE id = ?', [showId]);
        if (shows.length === 0) return res.status(404).json({ error: 'Show not found' });
        const screenId = shows[0].screen_id;

        // Get all seats for the screen
        const [seats] = await pool.execute('SELECT * FROM seats WHERE screen_id = ? ORDER BY row_no, seat_no', [screenId]);

        // Get booked seats for this show
        const [bookedSeatsReq] = await pool.execute(`
            SELECT seat_id FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.show_id = ? AND b.status IN ('confirmed', 'pending')
        `, [showId]);

        const bookedSeatIds = bookedSeatsReq.map(bs => bs.seat_id);

        // Map status to seats
        const seatLayout = seats.map(seat => ({
            ...seat,
            status: bookedSeatIds.includes(seat.id) ? 'booked' : 'available'
        }));

        res.json(seatLayout);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { showId, seatIds, totalAmount } = req.body;
        const userId = req.user.id;

        // 1. Verify seats are still available
        const seatPlaceholders = seatIds.map(() => '?').join(',');
        const [booked] = await connection.execute(`
            SELECT seat_id FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.show_id = ? AND b.status IN ('confirmed', 'pending')
            AND bs.seat_id IN (${seatPlaceholders})
        `, [showId, ...seatIds]);

        if (booked.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'One or more selected seats are already booked' });
        }

        // 2. Create Booking
        const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
        const [bookingResult] = await connection.execute(
            'INSERT INTO bookings (user_id, show_id, total_amount, status, transaction_id) VALUES (?, ?, ?, ?, ?)',
            [userId, showId, totalAmount, 'confirmed', transactionId]
        );
        const bookingId = bookingResult.insertId;

        // 3. Insert Booked Seats
        for (const seatId of seatIds) {
            await connection.execute(
                'INSERT INTO booked_seats (booking_id, seat_id) VALUES (?, ?)',
                [bookingId, seatId]
            );
        }

        // 4. Create Payment entry (Simulated success)
        await connection.execute(
            'INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
            [bookingId, totalAmount, 'card', 'success']
        );

        await connection.commit();
        res.status(201).json({ message: 'Booking successful', bookingId, transactionId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const [bookings] = await pool.execute(`
            SELECT b.*, m.title, m.poster_url, s.show_date, s.show_time, 
                   t.name as theatre_name, sc.name as screen_name
            FROM bookings b
            JOIN shows s ON b.show_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN screens sc ON s.screen_id = sc.id
            JOIN theatres t ON sc.theatre_id = t.id
            WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')
        `, [bookingId, req.user.id, req.user.role]);

        if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

        const [seats] = await pool.execute(`
            SELECT s.row_no, s.seat_no, s.type
            FROM booked_seats bs
            JOIN seats s ON bs.seat_id = s.id
            WHERE bs.booking_id = ?
        `, [bookingId]);

        res.json({ ...bookings[0], seats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fallback for SPA (if we use client side routing later, else serve static html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
