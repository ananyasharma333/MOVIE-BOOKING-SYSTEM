-- Create Database
CREATE DATABASE IF NOT EXISTS movie_booking;
USE movie_booking;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movies Table
CREATE TABLE IF NOT EXISTS movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    poster_url VARCHAR(255),
    trailer_url VARCHAR(255),
    duration_minutes INT,
    language VARCHAR(50),
    genre VARCHAR(100),
    rating DECIMAL(3, 1),
    release_date DATE,
    cast TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Theatres Table
CREATE TABLE IF NOT EXISTS theatres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    facilities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screens Table
CREATE TABLE IF NOT EXISTS screens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    theatre_id INT,
    name VARCHAR(50) NOT NULL, -- e.g., Screen 1, Screen 2
    total_seats INT NOT NULL,
    FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE
);

-- Shows Table
CREATE TABLE IF NOT EXISTS shows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT,
    screen_id INT,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    price_regular DECIMAL(10, 2) NOT NULL,
    price_vip DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
);

-- Seats Table (Layout configuration for a screen)
CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    screen_id INT,
    row_no VARCHAR(5) NOT NULL, -- A, B, C...
    seat_no INT NOT NULL, -- 1, 2, 3...
    type ENUM('regular', 'vip') DEFAULT 'regular',
    FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
    UNIQUE KEY (screen_id, row_no, seat_no)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    show_id INT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
);

-- Booked Seats Table (Specific seats for a booking)
CREATE TABLE IF NOT EXISTS booked_seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    seat_id INT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('card', 'upi', 'netbanking'),
    payment_status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ==========================================
-- DUMMY DATA INSERTION
-- ==========================================

-- Admin User (password is 'admin123' hashed with bcrypt)
-- Using a plain hash here for testing: $2a$10$wN1R./wL7l1.vY3.h0J6r.y.Qxz8/s/r.u.9J3C.l./q.Z1fO3/R6
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@bookmyshow.com', '$2a$10$wN1R./wL7l1.vY3.h0J6r.y.Qxz8/s/r.u.9J3C.l./q.Z1fO3/R6', 'admin'),
('Test User', 'test@example.com', '$2a$10$wN1R./wL7l1.vY3.h0J6r.y.Qxz8/s/r.u.9J3C.l./q.Z1fO3/R6', 'user');

-- Movies
INSERT INTO movies (title, description, poster_url, trailer_url, duration_minutes, language, genre, rating, release_date, cast) VALUES
('Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge.', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2JGjjc9k.jpg', 'https://www.youtube.com/embed/Way9Dexny3w', 166, 'English', 'Sci-Fi, Adventure', 8.8, '2024-03-01', 'Timothée Chalamet, Zendaya, Rebecca Ferguson'),
('Oppenheimer', 'The story of J. Robert Oppenheimer\'s role in the development of the atomic bomb.', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://www.youtube.com/embed/uYPbbksJxIg', 180, 'English', 'Biography, Drama', 8.4, '2023-07-21', 'Cillian Murphy, Emily Blunt, Matt Damon'),
('Spider-Man: Across the Spider-Verse', 'Miles Morales catapults across the Multiverse.', 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'https://www.youtube.com/embed/cqGjhVJWtEg', 140, 'English', 'Animation, Action', 8.7, '2023-06-02', 'Shameik Moore, Hailee Steinfeld'),
('The Dark Knight', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham.', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'https://www.youtube.com/embed/EXeTwQWrcwY', 152, 'English', 'Action, Crime', 9.0, '2008-07-18', 'Christian Bale, Heath Ledger');

-- Theatres
INSERT INTO theatres (name, location, city, facilities) VALUES
('PVR Cinemas', 'Phoenix Mall, Wakad', 'Pune', 'Dolby Atmos, 4K, Recliner'),
('INOX', 'Amanora Mall, Hadapsar', 'Pune', 'Laser Projection, 7.1 Sound'),
('Cinepolis', 'Seasons Mall, Magarpatta', 'Pune', 'IMAX, Recliner');

-- Screens
INSERT INTO screens (theatre_id, name, total_seats) VALUES
(1, 'Screen 1 (IMAX)', 60),
(1, 'Screen 2', 40),
(2, 'Screen 1', 50);

-- Shows for Dune: Part Two at PVR Screen 1
INSERT INTO shows (movie_id, screen_id, show_date, show_time, price_regular, price_vip) VALUES
(1, 1, CURDATE(), '10:00:00', 250.00, 450.00),
(1, 1, CURDATE(), '14:30:00', 250.00, 450.00),
(1, 1, CURDATE(), '19:00:00', 300.00, 500.00),
-- Shows for Oppenheimer at INOX Screen 1
(2, 3, CURDATE(), '11:00:00', 200.00, 400.00),
(2, 3, CURDATE(), '18:00:00', 250.00, 450.00);

-- Generate Seats for Screen 1 (PVR) - 6 rows of 10 seats
DELIMITER $$
CREATE PROCEDURE InsertSeatsForScreen1()
BEGIN
    DECLARE r INT DEFAULT 0;
    DECLARE c INT DEFAULT 1;
    DECLARE row_char CHAR(1);
    DECLARE seat_type VARCHAR(10);
    
    WHILE r < 6 DO
        SET row_char = CHAR(65 + r); -- A, B, C, D, E, F
        SET c = 1;
        
        -- Last 2 rows are VIP
        IF r >= 4 THEN
            SET seat_type = 'vip';
        ELSE
            SET seat_type = 'regular';
        END IF;

        WHILE c <= 10 DO
            INSERT INTO seats (screen_id, row_no, seat_no, type) VALUES (1, row_char, c, seat_type);
            SET c = c + 1;
        END WHILE;
        
        SET r = r + 1;
    END WHILE;
END$$
DELIMITER ;

CALL InsertSeatsForScreen1();
DROP PROCEDURE InsertSeatsForScreen1;

-- Generate Seats for Screen 3 (INOX) - 5 rows of 10 seats
DELIMITER $$
CREATE PROCEDURE InsertSeatsForScreen3()
BEGIN
    DECLARE r INT DEFAULT 0;
    DECLARE c INT DEFAULT 1;
    DECLARE row_char CHAR(1);
    DECLARE seat_type VARCHAR(10);
    
    WHILE r < 5 DO
        SET row_char = CHAR(65 + r); -- A, B, C, D, E
        SET c = 1;
        
        -- Last 1 row is VIP
        IF r >= 4 THEN
            SET seat_type = 'vip';
        ELSE
            SET seat_type = 'regular';
        END IF;

        WHILE c <= 10 DO
            INSERT INTO seats (screen_id, row_no, seat_no, type) VALUES (3, row_char, c, seat_type);
            SET c = c + 1;
        END WHILE;
        
        SET r = r + 1;
    END WHILE;
END$$
DELIMITER ;

CALL InsertSeatsForScreen3();
DROP PROCEDURE InsertSeatsForScreen3;
