# Movie Booking Website (BookMyShow Clone)

A beautiful, professional, cinema-style movie booking website with full backend and MySQL database integration.

## Features
- Stylish homepage with banner slider, featured movies, and genre filters.
- Secure login and signup with JWT session management.
- Detailed movie pages with poster, rating, cast, and trailer link.
- Theatre and showtime selection based on the movie.
- Interactive seat arrangement UI (available, selected, booked, VIP).
- Dynamic ticket price calculation based on seat type.
- Booking confirmation and ticket generation.
- Admin dashboard for managing movies, shows, theatres, and seats.

## Technical Stack
- **Frontend**: HTML5, Vanilla CSS (Dark theme, Red/Gold cinema colors), Vanilla JS.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL.

## Setup Instructions

### 1. Database Setup
1. Install MySQL if you haven't already and start the MySQL server.
2. Open your MySQL client (e.g., MySQL Workbench, phpMyAdmin, or command line).
3. Create a new database named `movie_booking`.
4. Run the queries inside `database.sql` to create all tables and insert sample data.
   - Command line: `mysql -u root -p movie_booking < database.sql`

### 2. Backend Setup
1. Create a `.env` file in the root directory and add your MySQL credentials and JWT secret:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=movie_booking
   JWT_SECRET=supersecretkey_change_me_in_production
   PORT=3000
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

### 3. Usage
1. Open your browser and go to `http://localhost:3000`.
2. Browse movies, sign up for a user account, select seats, and book tickets.
3. Access the admin panel (concept) by logging in with admin credentials (created via SQL seed).

## License
MIT
