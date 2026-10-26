import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Security Dashboard', icon: 'chart' },
    { path: '/', label: 'Live Scanner', icon: 'search' },
    { path: '/history', label: 'Detection Logs', icon: 'log' },
  ];

  const icons: Record<string, ReactNode> = {
    search: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    chart: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    log: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '32px',
        }}>
          {/* Brand */}
          <Link to={isAuthenticated ? '/dashboard' : '/login'} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#000000',
              letterSpacing: '0.02em',
            }}>
              PhishRadar
            </span>
          </Link>

          {/* Navigation - Only visible when authenticated */}
          {isAuthenticated ? (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '0.92rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#000000' : '#4b5563',
                      background: isActive ? '#f3f4f6' : 'transparent',
                      border: isActive ? '1px solid #e5e7eb' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      textDecoration: 'none',
                    }}
                  >
                    {icons[link.icon]}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {/* User Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}>
                    {user.uname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                      {user.uname}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      ID: #{user.userid}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  to="/login"
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'inline-block',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: '#000000',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'inline-block',
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAuthModalOpen && (
        <AuthModal onClose={() => setIsAuthModalOpen(false)} />
      )}
    </>
  );
}
