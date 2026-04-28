import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{ background: '#09090b', borderBottom: '1px solid #1c1c1f', padding: '16px 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ fontSize: '1.5rem', fontWeight: '900', color: '#e50914' }}>
          BOOK<span>MY</span>SHOW
        </Link>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#71717a' }}>Home</Link>
          {user ? (
            <>
              {user.role === 'admin' && <Link to="/admin" style={{ color: '#f5c842' }}>Admin</Link>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e50914', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name}</span>
                <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
