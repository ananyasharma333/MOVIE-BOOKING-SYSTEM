import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const { data } = await axios.get('/api/movies');
        setMovies(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) return <div className="container" style={{ padding: '100px', textAlign: 'center' }}>Loading Movies...</div>;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <h1 style={{ marginBottom: '32px' }}>Recommended Movies</h1>
      <div className="movies-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
        {movies.map(movie => (
          <Link to={`/movie/${movie._id}`} key={movie._id} className="movie-card">
            <div className="movie-poster-wrap">
              <img src={movie.posterUrl} alt={movie.title} className="movie-poster" />
            </div>
            <div className="movie-info">
              <h3 className="movie-title">{movie.title}</h3>
              <p style={{ color: '#71717a', fontSize: '0.85rem' }}>{movie.genre}</p>
              <div style={{ color: '#f5c842', fontWeight: 'bold', marginTop: '8px' }}>⭐ {movie.rating}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Home;
