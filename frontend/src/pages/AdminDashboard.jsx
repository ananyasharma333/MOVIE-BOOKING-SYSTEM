import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
    const fetchStats = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('/api/admin/stats', config);
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, navigate]);

  if (loading) return <div className="container">Loading Dashboard...</div>;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 style={{ marginBottom: '32px' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <h4 style={{ color: '#71717a' }}>Total Revenue</h4>
          <h2 style={{ fontSize: '2.5rem', color: '#f5c842' }}>₹{stats.totalRevenue}</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <h4 style={{ color: '#71717a' }}>Total Bookings</h4>
          <h2 style={{ fontSize: '2.5rem' }}>{stats.totalBookings}</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <h4 style={{ color: '#71717a' }}>Active Users</h4>
          <h2 style={{ fontSize: '2.5rem' }}>{stats.totalUsers}</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
          <h4 style={{ color: '#71717a' }}>Movies</h4>
          <h2 style={{ fontSize: '2.5rem' }}>{stats.totalMovies}</h2>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Management controls coming soon...</h3>
        <p style={{ color: '#71717a' }}>Use the SQL Terminal for direct database updates in the meantime.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
