import sqlite3
import bcrypt

def init_db():
    conn = sqlite3.connect('movie_booking.db')
    cursor = conn.cursor()

    # Drop existing tables if they exist to start fresh
    cursor.execute('DROP TABLE IF EXISTS payments')
    cursor.execute('DROP TABLE IF EXISTS booked_seats')
    cursor.execute('DROP TABLE IF EXISTS bookings')
    cursor.execute('DROP TABLE IF EXISTS seats')
    cursor.execute('DROP TABLE IF EXISTS shows')
    cursor.execute('DROP TABLE IF EXISTS screens')
    cursor.execute('DROP TABLE IF EXISTS theatres')
    cursor.execute('DROP TABLE IF EXISTS movies')
    cursor.execute('DROP TABLE IF EXISTS users')

    # Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Movies Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        poster_url TEXT,
        trailer_url TEXT,
        duration_minutes INTEGER,
        language TEXT,
        genre TEXT,
        rating REAL,
        release_date DATE,
        cast TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Theatres Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS theatres (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        city TEXT NOT NULL,
        facilities TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Screens Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS screens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theatre_id INTEGER,
        name TEXT NOT NULL,
        total_seats INTEGER NOT NULL,
        FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE
    )
    ''')

    # Shows Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS shows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER,
        screen_id INTEGER,
        show_date DATE NOT NULL,
        show_time TIME NOT NULL,
        price_regular REAL NOT NULL,
        price_vip REAL NOT NULL,
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
        FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
    )
    ''')

    # Seats Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS seats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        screen_id INTEGER,
        row_no TEXT NOT NULL,
        seat_no INTEGER NOT NULL,
        type TEXT DEFAULT 'regular',
        FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
        UNIQUE (screen_id, row_no, seat_no)
    )
    ''')

    # Bookings Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        show_id INTEGER,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'confirmed',
        transaction_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    )
    ''')

    # Booked Seats Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS booked_seats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        seat_id INTEGER,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
    )
    ''')

    # Payments Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'success',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
    ''')

    # ==========================================
    # DUMMY DATA INSERTION
    # ==========================================
    
    # Hash password 'admin123'
    hashed_pw = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    cursor.executemany('''
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
    ''', [
        ('Admin User', 'admin@bookmyshow.com', hashed_pw, 'admin'),
        ('Test User', 'test@example.com', hashed_pw, 'user')
    ])

    cursor.executemany('''
    INSERT INTO movies (title, description, poster_url, trailer_url, duration_minutes, language, genre, rating, release_date, cast) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', [
        ('Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge.', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2JGjjc9k.jpg', 'https://www.youtube.com/embed/Way9Dexny3w', 166, 'English', 'Sci-Fi, Adventure', 8.8, '2024-03-01', 'Timothée Chalamet, Zendaya, Rebecca Ferguson'),
        ('Oppenheimer', 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb.', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://www.youtube.com/embed/uYPbbksJxIg', 180, 'English', 'Biography, Drama', 8.4, '2023-07-21', 'Cillian Murphy, Emily Blunt, Matt Damon'),
        ('Spider-Man: Across the Spider-Verse', 'Miles Morales catapults across the Multiverse.', 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'https://www.youtube.com/embed/cqGjhVJWtEg', 140, 'English', 'Animation, Action', 8.7, '2023-06-02', 'Shameik Moore, Hailee Steinfeld'),
        ('The Dark Knight', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham.', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'https://www.youtube.com/embed/EXeTwQWrcwY', 152, 'English', 'Action, Crime', 9.0, '2008-07-18', 'Christian Bale, Heath Ledger')
    ])

    cursor.executemany('''
    INSERT INTO theatres (name, location, city, facilities) VALUES (?, ?, ?, ?)
    ''', [
        ('PVR Cinemas', 'Phoenix Mall, Wakad', 'Pune', 'Dolby Atmos, 4K, Recliner'),
        ('INOX', 'Amanora Mall, Hadapsar', 'Pune', 'Laser Projection, 7.1 Sound'),
        ('Cinepolis', 'Seasons Mall, Magarpatta', 'Pune', 'IMAX, Recliner')
    ])

    cursor.executemany('''
    INSERT INTO screens (theatre_id, name, total_seats) VALUES (?, ?, ?)
    ''', [
        (1, 'Screen 1 (IMAX)', 60),
        (1, 'Screen 2', 40),
        (2, 'Screen 1', 50)
    ])

    cursor.executemany('''
    INSERT INTO shows (movie_id, screen_id, show_date, show_time, price_regular, price_vip) VALUES (?, ?, date('now'), ?, ?, ?)
    ''', [
        (1, 1, '10:00:00', 250.00, 450.00),
        (1, 1, '14:30:00', 250.00, 450.00),
        (1, 1, '19:00:00', 300.00, 500.00),
        (2, 3, '11:00:00', 200.00, 400.00),
        (2, 3, '18:00:00', 250.00, 450.00)
    ])

    # Generate Seats for Screen 1 (6 rows, 10 seats) A-F
    seats_screen1 = []
    for r in range(6):
        row_char = chr(65 + r)
        seat_type = 'vip' if r >= 4 else 'regular'
        for c in range(1, 11):
            seats_screen1.append((1, row_char, c, seat_type))
            
    cursor.executemany('INSERT INTO seats (screen_id, row_no, seat_no, type) VALUES (?, ?, ?, ?)', seats_screen1)

    # Generate Seats for Screen 3 (5 rows, 10 seats) A-E
    seats_screen3 = []
    for r in range(5):
        row_char = chr(65 + r)
        seat_type = 'vip' if r >= 4 else 'regular'
        for c in range(1, 11):
            seats_screen3.append((3, row_char, c, seat_type))
            
    cursor.executemany('INSERT INTO seats (screen_id, row_no, seat_no, type) VALUES (?, ?, ?, ?)', seats_screen3)

    conn.commit()
    conn.close()
    print("Database initialized successfully with sample data!")

if __name__ == '__main__':
    init_db()
