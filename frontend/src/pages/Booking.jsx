import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Booking = () => {
  const { showId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate('/login');
    const fetchSeats = async () => {
      try {
        const { data } = await axios.get(`/api/shows/${showId}/seats`);
        setSeats(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchSeats();
  }, [showId, user, navigate]);

  const toggleSeat = (seatId) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleBooking = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post('/api/bookings', {
        showId,
        seatIds: selectedSeats,
        totalAmount: selectedSeats.length * 250 // Simplified
      }, config);
      alert('Booking Successful!');
      navigate('/');
    } catch (err) {
      alert('Booking failed: ' + err.response?.data?.error);
    }
  };

  if (loading) return <div className="container">Loading Seats...</div>;

  return (
    <div className="container" style={{ padding: '40px 0', textAlign: 'center' }}>
      <h1>Select Your Seats</h1>
      <p style={{ color: '#71717a', marginBottom: '40px' }}>Click on seats to select them</p>

      <div style={{ marginBottom: '40px', background: '#1c1c1f', padding: '10px', borderRadius: '4px', maxWidth: '400px', margin: '0 auto 40px' }}>
        SCREEN THIS WAY
      </div>

      <div className="seat-grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '10px', maxWidth: '400px', margin: '0 auto' }}>
          {seats.map(seat => (
            <div
              key={seat._id}
              className={`seat ${seat.status} ${selectedSeats.includes(seat._id) ? 'selected' : ''}`}
              onClick={() => seat.status === 'available' && toggleSeat(seat._id)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                background: seat.status === 'booked' ? '#111113' : (selectedSeats.includes(seat._id) ? '#e50914' : '#27272a'),
                cursor: seat.status === 'booked' ? 'not-allowed' : 'pointer',
                border: seat.type === 'vip' ? '1px solid #f5c842' : 'none'
              }}
            ></div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '60px' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Selected: {selectedSeats.length} Seats | Total: ₹{selectedSeats.length * 250}</p>
        <button
          className="btn btn-primary btn-lg"
          disabled={selectedSeats.length === 0}
          onClick={handleBooking}
        >
          Proceed to Pay ₹{selectedSeats.length * 250}
        </button>
      </div>
    </div>
  );
};

export default Booking;
