import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieRes, showsRes] = await Promise.all([
          axios.get(`/api/movies/${id}`),
          axios.get(`/api/movies/${id}/shows`)
        ]);
        setMovie(movieRes.data);
        setShows(showsRes.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="container">Loading Movie Details...</div>;
  if (!movie) return <div className="container">Movie not found</div>;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '60px' }}>
        <img src={movie.posterUrl} alt={movie.title} style={{ width: '300px', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
        <div>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>{movie.title}</h1>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <span className="badge badge-rating">⭐ {movie.rating}</span>
            <span className="badge">{movie.language}</span>
            <span className="badge">{movie.duration} min</span>
          </div>
          <p style={{ color: '#71717a', fontSize: '1.1rem', maxWidth: '600px' }}>{movie.description}</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '24px', borderBottom: '2px solid #e50914', display: 'inline-block', paddingBottom: '8px' }}>Available Shows</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {shows.length === 0 ? <p>No shows available for this movie.</p> : shows.map(show => (
          <div key={show._id} className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginBottom: '4px' }}>{show.screen.theatre.name}</h3>
              <p style={{ color: '#71717a' }}>{show.screen.name} • {show.screen.theatre.city}</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to={`/booking/${show._id}`} className="btn btn-primary">
                {show.time} - Book Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieDetail;
