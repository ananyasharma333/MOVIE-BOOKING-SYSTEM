# Database Management Guide — BookMyShow Full-Stack

This project is now a complete **Full-Stack Database System**. You can access and update the database through three primary methods:

## 1. Web Admin Dashboard (UI)
The easiest way to manage your data is through the built-in Admin Dashboard.
- **URL**: `http://localhost:5000/admin.html`
- **Default Credentials**: 
  - **Email**: `admin@bookmyshow.com`
  - **Password**: `admin123`
- **Features**: Add/Edit/Delete movies, theatres, shows, and view all bookings/users.

## 2. Admin SQL Terminal (Interactive Web)
I have added a powerful **SQL Terminal** directly inside the Admin Dashboard.
1. Log in as an Admin.
2. Click on **"💻 SQL Terminal"** in the sidebar.
3. You can write and execute any SQL query (e.g., `UPDATE users SET role='admin' WHERE email='user@example.com'`).
4. View results in a real-time data table.

## 3. Backend CLI Manager (Terminal)
For direct backend access without running the web server, use the `db_manager.py` script.

### List all tables:
```powershell
python db_manager.py
```
Then select option `1`.

### Run a direct query from CMD:
```powershell
python db_manager.py "SELECT * FROM movies WHERE rating > 8.5"
```

## Database Schema Highlights
- **`users`**: Stores customer and admin accounts (passwords are BCrypt hashed).
- **`movies`**: The catalogue of films.
- **`shows`**: Links movies to screens with dates, times, and prices.
- **`bookings`**: Records of transactions.
- **`booked_seats`**: Maps specific seats to bookings to prevent double-booking.

---

### How to Run the Project
1. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
2. **Initialize Database** (if not already done):
   ```powershell
   python init_db.py
   ```
3. **Start the Backend**:
   ```powershell
   python app.py
   ```
4. **Access the App**:
   Open `http://localhost:5000` in your browser.
