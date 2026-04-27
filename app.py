from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import bcrypt
import jwt
import datetime
import time
import os
import re

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

SECRET_KEY = 'supersecretkey_change_me_in_production'
DB_PATH = 'movie_booking.db'

# ==========================================
# DB HELPER
# ==========================================
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# ==========================================
# AUTH MIDDLEWARE
# ==========================================
def token_required(f):
    def decorator(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            kwargs['current_user'] = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 403

        return f(*args, **kwargs)

    decorator.__name__ = f.__name__
    return decorator

def admin_required(f):
    def decorator(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            if data.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            kwargs['current_user'] = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 403

        return f(*args, **kwargs)

    decorator.__name__ = f.__name__
    return decorator

# ==========================================
# STATIC FILES (FRONTEND)
# ==========================================
@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('public', path)):
        return send_from_directory('public', path)
    return send_from_directory('public', 'index.html')

# ==========================================
# AUTH ROUTES
# ==========================================
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    phone = data.get('phone', '').strip()

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'error': 'Invalid email format'}), 400

    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
            (name, email, hashed_pw, phone)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({'message': 'Account created successfully', 'userId': user_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'No account found with this email'}), 404

    if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        token = jwt.encode({
            'id': user['id'],
            'role': user['role'],
            'name': user['name'],
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")

        if isinstance(token, bytes):
            token = token.decode('utf-8')

        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'phone': user['phone'],
                'role': user['role']
            }
        })
    else:
        return jsonify({'error': 'Incorrect password'}), 401

@app.route('/api/auth/me', methods=['GET'])
@token_required
def me(current_user):
    conn = get_db_connection()
    user = conn.execute('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', (current_user['id'],)).fetchone()
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(dict(user))

@app.route('/api/auth/update-profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.json
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    conn = get_db_connection()
    conn.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?',
                 (name, phone, current_user['id']))
    conn.commit()
    user = conn.execute('SELECT id, name, email, phone, role FROM users WHERE id = ?', (current_user['id'],)).fetchone()
    conn.close()
    return jsonify({'message': 'Profile updated', 'user': dict(user)})

# ==========================================
# MOVIE ROUTES (Public)
# ==========================================
@app.route('/api/movies', methods=['GET'])
def get_movies():
    search = request.args.get('search', '').strip()
    genre = request.args.get('genre', '').strip()
    language = request.args.get('language', '').strip()
    sort = request.args.get('sort', 'release_date')

    query = 'SELECT * FROM movies WHERE 1=1'
    params = []

    if search:
        query += ' AND (title LIKE ? OR cast LIKE ? OR genre LIKE ?)'
        like = f'%{search}%'
        params.extend([like, like, like])

    if genre:
        query += ' AND genre LIKE ?'
        params.append(f'%{genre}%')

    if language:
        query += ' AND language = ?'
        params.append(language)

    allowed_sort = ['release_date', 'rating', 'title', 'duration_minutes']
    if sort in allowed_sort:
        query += f' ORDER BY {sort} DESC'
    else:
        query += ' ORDER BY release_date DESC'

    conn = get_db_connection()
    movies = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(row) for row in movies])

@app.route('/api/movies/<int:movie_id>', methods=['GET'])
def get_movie(movie_id):
    conn = get_db_connection()
    movie = conn.execute('SELECT * FROM movies WHERE id = ?', (movie_id,)).fetchone()
    conn.close()

    if movie is None:
        return jsonify({'error': 'Movie not found'}), 404

    return jsonify(dict(movie))

@app.route('/api/movies/<int:movie_id>/shows', methods=['GET'])
def get_shows(movie_id):
    date_filter = request.args.get('date', None)

    query = '''
        SELECT s.id as show_id, s.show_date, s.show_time, s.price_regular, s.price_vip,
               sc.id as screen_id, sc.name as screen_name,
               t.id as theatre_id, t.name as theatre_name, t.location, t.city, t.facilities
        FROM shows s
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        WHERE s.movie_id = ? AND s.show_date >= date('now')
    '''
    params = [movie_id]

    if date_filter:
        query += ' AND s.show_date = ?'
        params.append(date_filter)

    query += ' ORDER BY s.show_date, s.show_time'

    conn = get_db_connection()
    shows = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(row) for row in shows])

# ==========================================
# SEAT / BOOKING ROUTES
# ==========================================
@app.route('/api/shows/<int:show_id>', methods=['GET'])
def get_show(show_id):
    query = '''
        SELECT s.id, s.show_date, s.show_time, s.price_regular, s.price_vip,
               m.id as movie_id, m.title as movie_title, m.poster_url, m.duration_minutes, m.genre,
               sc.id as screen_id, sc.name as screen_name,
               t.id as theatre_id, t.name as theatre_name, t.location, t.city
        FROM shows s
        JOIN movies m ON s.movie_id = m.id
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        WHERE s.id = ?
    '''
    conn = get_db_connection()
    show = conn.execute(query, (show_id,)).fetchone()
    conn.close()

    if not show:
        return jsonify({'error': 'Show not found'}), 404

    return jsonify(dict(show))

@app.route('/api/shows/<int:show_id>/seats', methods=['GET'])
def get_seats(show_id):
    conn = get_db_connection()

    show = conn.execute('SELECT screen_id FROM shows WHERE id = ?', (show_id,)).fetchone()
    if not show:
        conn.close()
        return jsonify({'error': 'Show not found'}), 404

    screen_id = show['screen_id']

    seats = conn.execute('SELECT * FROM seats WHERE screen_id = ? ORDER BY row_no, seat_no', (screen_id,)).fetchall()

    booked_req = conn.execute('''
        SELECT seat_id FROM booked_seats bs
        JOIN bookings b ON bs.booking_id = b.id
        WHERE b.show_id = ? AND b.status IN ('confirmed', 'pending')
    ''', (show_id,)).fetchall()

    booked_seat_ids = {row['seat_id'] for row in booked_req}

    seat_layout = []
    for seat in seats:
        seat_dict = dict(seat)
        seat_dict['status'] = 'booked' if seat['id'] in booked_seat_ids else 'available'
        seat_layout.append(seat_dict)

    conn.close()
    return jsonify(seat_layout)

@app.route('/api/bookings', methods=['POST'])
@token_required
def book_seats(current_user):
    data = request.json
    show_id = data.get('showId')
    seat_ids = data.get('seatIds', [])
    total_amount = data.get('totalAmount')
    user_id = current_user['id']

    if not show_id or not seat_ids or total_amount is None:
        return jsonify({'error': 'Missing booking data'}), 400

    if len(seat_ids) > 10:
        return jsonify({'error': 'Maximum 10 seats per booking'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify show exists
        show = cursor.execute('SELECT id FROM shows WHERE id = ?', (show_id,)).fetchone()
        if not show:
            return jsonify({'error': 'Show not found'}), 404

        # Verify seats are available
        placeholders = ','.join(['?'] * len(seat_ids))
        booked = cursor.execute(f'''
            SELECT seat_id FROM booked_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.show_id = ? AND b.status IN ('confirmed', 'pending')
            AND bs.seat_id IN ({placeholders})
        ''', [show_id] + list(seat_ids)).fetchall()

        if len(booked) > 0:
            return jsonify({'error': 'One or more selected seats are already booked'}), 400

        # Create booking
        transaction_id = f'BMS{int(time.time())}{int(time.time() * 1000) % 10000:04d}'
        cursor.execute(
            'INSERT INTO bookings (user_id, show_id, total_amount, status, transaction_id) VALUES (?, ?, ?, ?, ?)',
            (user_id, show_id, total_amount, 'confirmed', transaction_id)
        )
        booking_id = cursor.lastrowid

        # Insert booked seats
        for seat_id in seat_ids:
            cursor.execute(
                'INSERT INTO booked_seats (booking_id, seat_id) VALUES (?, ?)',
                (booking_id, seat_id)
            )

        # Create payment entry
        cursor.execute(
            'INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
            (booking_id, total_amount, 'card', 'success')
        )

        conn.commit()
        return jsonify({
            'message': 'Booking confirmed!',
            'bookingId': booking_id,
            'transactionId': transaction_id
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/bookings/<int:booking_id>', methods=['GET'])
@token_required
def get_booking(booking_id, current_user):
    conn = get_db_connection()

    booking_query = '''
        SELECT b.*, m.title, m.poster_url, m.genre, m.language,
               s.show_date, s.show_time, s.price_regular, s.price_vip,
               t.name as theatre_name, t.location, t.city,
               sc.name as screen_name,
               u.name as user_name, u.email as user_email
        FROM bookings b
        JOIN shows s ON b.show_id = s.id
        JOIN movies m ON s.movie_id = m.id
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')
    '''

    booking_raw = conn.execute(booking_query, (booking_id, current_user['id'], current_user['role'])).fetchone()

    if not booking_raw:
        conn.close()
        return jsonify({'error': 'Booking not found or unauthorized'}), 404

    booking = dict(booking_raw)

    seats_raw = conn.execute('''
        SELECT s.row_no, s.seat_no, s.type
        FROM booked_seats bs
        JOIN seats s ON bs.seat_id = s.id
        WHERE bs.booking_id = ?
    ''', (booking_id,)).fetchall()

    booking['seats'] = [dict(row) for row in seats_raw]

    conn.close()
    return jsonify(booking)

@app.route('/api/bookings/my', methods=['GET'])
@token_required
def my_bookings(current_user):
    conn = get_db_connection()
    bookings = conn.execute('''
        SELECT b.id, b.booking_date, b.total_amount, b.status, b.transaction_id,
               m.title, m.poster_url, m.genre,
               s.show_date, s.show_time,
               t.name as theatre_name, t.city,
               sc.name as screen_name,
               GROUP_CONCAT(se.row_no || se.seat_no, ', ') as seats
        FROM bookings b
        JOIN shows s ON b.show_id = s.id
        JOIN movies m ON s.movie_id = m.id
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        LEFT JOIN booked_seats bs ON bs.booking_id = b.id
        LEFT JOIN seats se ON bs.seat_id = se.id
        WHERE b.user_id = ?
        GROUP BY b.id
        ORDER BY b.booking_date DESC
    ''', (current_user['id'],)).fetchall()
    conn.close()
    return jsonify([dict(row) for row in bookings])

@app.route('/api/bookings/<int:booking_id>/cancel', methods=['PUT'])
@token_required
def cancel_booking(booking_id, current_user):
    conn = get_db_connection()
    booking = conn.execute('SELECT * FROM bookings WHERE id = ? AND user_id = ?',
                           (booking_id, current_user['id'])).fetchone()

    if not booking:
        conn.close()
        return jsonify({'error': 'Booking not found'}), 404

    if booking['status'] == 'cancelled':
        conn.close()
        return jsonify({'error': 'Booking is already cancelled'}), 400

    conn.execute('UPDATE bookings SET status = ? WHERE id = ?', ('cancelled', booking_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Booking cancelled successfully'})

# ==========================================
# THEATRES
# ==========================================
@app.route('/api/theatres', methods=['GET'])
def get_theatres():
    city = request.args.get('city', '').strip()
    conn = get_db_connection()
    if city:
        theatres = conn.execute('SELECT * FROM theatres WHERE city LIKE ? ORDER BY name', (f'%{city}%',)).fetchall()
    else:
        theatres = conn.execute('SELECT * FROM theatres ORDER BY city, name').fetchall()
    conn.close()
    return jsonify([dict(row) for row in theatres])

@app.route('/api/theatres/<int:theatre_id>', methods=['GET'])
def get_theatre(theatre_id):
    conn = get_db_connection()
    theatre = conn.execute('SELECT * FROM theatres WHERE id = ?', (theatre_id,)).fetchone()
    conn.close()
    if not theatre:
        return jsonify({'error': 'Theatre not found'}), 404
    return jsonify(dict(theatre))

# ==========================================
# ADMIN ROUTES
# ==========================================

# --- Admin: Stats ---
@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats(current_user):
    conn = get_db_connection()

    total_movies = conn.execute('SELECT COUNT(*) as count FROM movies').fetchone()['count']
    total_theatres = conn.execute('SELECT COUNT(*) as count FROM theatres').fetchone()['count']
    total_users = conn.execute("SELECT COUNT(*) as count FROM users WHERE role = 'user'").fetchone()['count']
    total_bookings = conn.execute("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'").fetchone()['count']
    today_bookings = conn.execute(
        "SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed' AND DATE(booking_date) = DATE('now')"
    ).fetchone()['count']
    total_revenue = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'success'"
    ).fetchone()['total']
    today_revenue = conn.execute(
        "SELECT COALESCE(SUM(p.amount), 0) as total FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.payment_status = 'success' AND DATE(b.booking_date) = DATE('now')"
    ).fetchone()['total']

    conn.close()
    return jsonify({
        'totalMovies': total_movies,
        'totalTheatres': total_theatres,
        'totalUsers': total_users,
        'totalBookings': total_bookings,
        'todayBookings': today_bookings,
        'totalRevenue': total_revenue,
        'todayRevenue': today_revenue
    })

# --- Admin: All Bookings ---
@app.route('/api/admin/bookings', methods=['GET'])
@admin_required
def admin_get_bookings(current_user):
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    status_filter = request.args.get('status', '')

    query = '''
        SELECT b.id, b.booking_date, b.total_amount, b.status, b.transaction_id,
               u.name as user_name, u.email as user_email,
               m.title as movie_title,
               s.show_date, s.show_time,
               t.name as theatre_name,
               COUNT(bs.seat_id) as seat_count
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN shows s ON b.show_id = s.id
        JOIN movies m ON s.movie_id = m.id
        JOIN screens sc ON s.screen_id = sc.id
        JOIN theatres t ON sc.theatre_id = t.id
        LEFT JOIN booked_seats bs ON bs.booking_id = b.id
        WHERE 1=1
    '''
    params = []

    if status_filter:
        query += ' AND b.status = ?'
        params.append(status_filter)

    query += ' GROUP BY b.id ORDER BY b.booking_date DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])

    conn = get_db_connection()
    bookings = conn.execute(query, params).fetchall()
    total = conn.execute("SELECT COUNT(*) as count FROM bookings" + (" WHERE status = ?" if status_filter else ""),
                         ([status_filter] if status_filter else [])).fetchone()['count']
    conn.close()
    return jsonify({'bookings': [dict(row) for row in bookings], 'total': total})

# --- Admin: Movies CRUD ---
@app.route('/api/admin/movies', methods=['POST'])
@admin_required
def admin_add_movie(current_user):
    data = request.json
    required = ['title', 'duration_minutes', 'language', 'genre', 'rating', 'release_date']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO movies (title, description, poster_url, trailer_url, duration_minutes, language, genre, rating, release_date, cast)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('title'),
            data.get('description', ''),
            data.get('poster_url', ''),
            data.get('trailer_url', ''),
            data.get('duration_minutes'),
            data.get('language'),
            data.get('genre'),
            data.get('rating'),
            data.get('release_date'),
            data.get('cast', '')
        ))
        conn.commit()
        movie_id = cursor.lastrowid
        movie = conn.execute('SELECT * FROM movies WHERE id = ?', (movie_id,)).fetchone()
        return jsonify(dict(movie)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/movies/<int:movie_id>', methods=['PUT'])
@admin_required
def admin_update_movie(movie_id, current_user):
    data = request.json
    conn = get_db_connection()
    movie = conn.execute('SELECT id FROM movies WHERE id = ?', (movie_id,)).fetchone()
    if not movie:
        conn.close()
        return jsonify({'error': 'Movie not found'}), 404

    try:
        conn.execute('''
            UPDATE movies SET title=?, description=?, poster_url=?, trailer_url=?,
            duration_minutes=?, language=?, genre=?, rating=?, release_date=?, cast=?
            WHERE id=?
        ''', (
            data.get('title'),
            data.get('description', ''),
            data.get('poster_url', ''),
            data.get('trailer_url', ''),
            data.get('duration_minutes'),
            data.get('language'),
            data.get('genre'),
            data.get('rating'),
            data.get('release_date'),
            data.get('cast', ''),
            movie_id
        ))
        conn.commit()
        updated = conn.execute('SELECT * FROM movies WHERE id = ?', (movie_id,)).fetchone()
        return jsonify(dict(updated))
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/movies/<int:movie_id>', methods=['DELETE'])
@admin_required
def admin_delete_movie(movie_id, current_user):
    conn = get_db_connection()
    movie = conn.execute('SELECT id FROM movies WHERE id = ?', (movie_id,)).fetchone()
    if not movie:
        conn.close()
        return jsonify({'error': 'Movie not found'}), 404

    conn.execute('DELETE FROM movies WHERE id = ?', (movie_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Movie deleted successfully'})

# --- Admin: Shows ---
@app.route('/api/admin/shows', methods=['POST'])
@admin_required
def admin_add_show(current_user):
    data = request.json
    required = ['movie_id', 'screen_id', 'show_date', 'show_time', 'price_regular', 'price_vip']
    for field in required:
        if data.get(field) is None:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO shows (movie_id, screen_id, show_date, show_time, price_regular, price_vip)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['movie_id'], data['screen_id'], data['show_date'],
            data['show_time'], data['price_regular'], data['price_vip']
        ))
        conn.commit()
        show_id = cursor.lastrowid

        # Auto-create seats for the screen if not already seeded
        screen = conn.execute('SELECT * FROM screens WHERE id = ?', (data['screen_id'],)).fetchone()
        existing_seats = conn.execute('SELECT COUNT(*) as count FROM seats WHERE screen_id = ?', (data['screen_id'],)).fetchone()['count']
        
        if existing_seats == 0 and screen:
            rows_count = max(5, screen['total_seats'] // 10)
            seats_per_row = 10
            seats_to_insert = []
            for r in range(rows_count):
                row_char = chr(65 + r)
                seat_type = 'vip' if r >= rows_count - 2 else 'regular'
                for c in range(1, seats_per_row + 1):
                    seats_to_insert.append((data['screen_id'], row_char, c, seat_type))
            cursor.executemany('INSERT OR IGNORE INTO seats (screen_id, row_no, seat_no, type) VALUES (?, ?, ?, ?)', seats_to_insert)
            conn.commit()

        return jsonify({'message': 'Show added', 'showId': show_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/shows/<int:show_id>', methods=['DELETE'])
@admin_required
def admin_delete_show(show_id, current_user):
    conn = get_db_connection()
    show = conn.execute('SELECT id FROM shows WHERE id = ?', (show_id,)).fetchone()
    if not show:
        conn.close()
        return jsonify({'error': 'Show not found'}), 404

    conn.execute('DELETE FROM shows WHERE id = ?', (show_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Show deleted'})

# --- Admin: Theatres CRUD ---
@app.route('/api/admin/theatres', methods=['POST'])
@admin_required
def admin_add_theatre(current_user):
    data = request.json
    if not data.get('name') or not data.get('city') or not data.get('location'):
        return jsonify({'error': 'Name, city and location are required'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO theatres (name, location, city, facilities) VALUES (?, ?, ?, ?)',
            (data['name'], data['location'], data['city'], data.get('facilities', ''))
        )
        conn.commit()
        theatre_id = cursor.lastrowid
        theatre = conn.execute('SELECT * FROM theatres WHERE id = ?', (theatre_id,)).fetchone()
        return jsonify(dict(theatre)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/theatres/<int:theatre_id>', methods=['PUT'])
@admin_required
def admin_update_theatre(theatre_id, current_user):
    data = request.json
    conn = get_db_connection()
    theatre = conn.execute('SELECT id FROM theatres WHERE id = ?', (theatre_id,)).fetchone()
    if not theatre:
        conn.close()
        return jsonify({'error': 'Theatre not found'}), 404

    conn.execute('UPDATE theatres SET name=?, location=?, city=?, facilities=? WHERE id=?',
                 (data.get('name'), data.get('location'), data.get('city'), data.get('facilities', ''), theatre_id))
    conn.commit()
    updated = conn.execute('SELECT * FROM theatres WHERE id = ?', (theatre_id,)).fetchone()
    conn.close()
    return jsonify(dict(updated))

@app.route('/api/admin/theatres/<int:theatre_id>', methods=['DELETE'])
@admin_required
def admin_delete_theatre(theatre_id, current_user):
    conn = get_db_connection()
    theatre = conn.execute('SELECT id FROM theatres WHERE id = ?', (theatre_id,)).fetchone()
    if not theatre:
        conn.close()
        return jsonify({'error': 'Theatre not found'}), 404

    conn.execute('DELETE FROM theatres WHERE id = ?', (theatre_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Theatre deleted'})

# --- Admin: Users ---
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_get_users(current_user):
    conn = get_db_connection()
    users = conn.execute('''
        SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
               COUNT(b.id) as booking_count
        FROM users u
        LEFT JOIN bookings b ON b.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(row) for row in users])

# --- Admin: Screens ---
@app.route('/api/admin/screens', methods=['GET'])
@admin_required
def admin_get_screens(current_user):
    theatre_id = request.args.get('theatre_id', type=int)
    conn = get_db_connection()
    if theatre_id:
        screens = conn.execute('SELECT * FROM screens WHERE theatre_id = ?', (theatre_id,)).fetchall()
    else:
        screens = conn.execute('''
            SELECT sc.*, t.name as theatre_name, t.city
            FROM screens sc
            JOIN theatres t ON sc.theatre_id = t.id
            ORDER BY t.name, sc.name
        ''').fetchall()
    conn.close()
    return jsonify([dict(row) for row in screens])

@app.route('/api/admin/screens', methods=['POST'])
@admin_required
def admin_add_screen(current_user):
    data = request.json
    if not data.get('theatre_id') or not data.get('name') or not data.get('total_seats'):
        return jsonify({'error': 'theatre_id, name and total_seats are required'}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO screens (theatre_id, name, total_seats) VALUES (?, ?, ?)',
            (data['theatre_id'], data['name'], data['total_seats'])
        )
        conn.commit()
        screen_id = cursor.lastrowid
        screen = conn.execute('SELECT * FROM screens WHERE id = ?', (screen_id,)).fetchone()
        return jsonify(dict(screen)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# ==========================================
# HEALTH CHECK
# ==========================================
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'version': '2.0.0'
    })

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        try:
            import init_db
            init_db.init_db()
            print("Database initialized.")
        except Exception as e:
            print("Could not auto-initialize DB:", e)

    print("=" * 50)
    print("  BOOKMYSHOW Full-Stack App v2.0")
    print("  Running at: http://localhost:5000")
    print("=" * 50)
    app.run(port=5000, debug=True)
