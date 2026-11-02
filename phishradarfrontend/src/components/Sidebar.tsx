import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Overview', icon: 'grid', matchPaths: ['/dashboard', '/'] },
    { path: '/scanner', label: 'Scanner', icon: 'scanner', matchPaths: ['/scanner'] },
    { path: '/detections', label: 'Detections', icon: 'detections', matchPaths: ['/detections', '/history'] },
    { path: '/reports', label: 'Reports', icon: 'reports', matchPaths: ['/reports'] },
    { path: '/settings', label: 'Settings', icon: 'settings', matchPaths: ['/settings'] },
  ];

  const icons: Record<string, ReactNode> = {
    grid: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    scanner: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="8" x2="12" y2="10" />
        <line x1="12" y1="14" x2="12" y2="16" />
        <line x1="8" y1="12" x2="10" y2="12" />
        <line x1="14" y1="12" x2="16" y2="12" />
      </svg>
    ),
    detections: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    reports: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    settings: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  };

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      backgroundColor: '#FAFAF9',
      borderRight: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      zIndex: 40,
    }}>
      {/* Top Brand & Navigation */}
      <div>
        {/* Brand Area */}
        <div style={{
          padding: '24px 20px 20px 20px',
        }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              backgroundColor: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#111827',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}>
                PhishRadar
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: '#6B7280',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginTop: '3px',
              }}>
                Threat Defense
              </div>
            </div>
          </Link>
        </div>

        {/* Section Label */}
        <div style={{
          padding: '16px 20px 8px 20px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#9CA3AF',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Navigation
        </div>

        {/* Navigation Items */}
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '0 12px',
        }}>
          {navLinks.map((link) => {
            const isActive = link.matchPaths.some((p) => {
              if (p === '/') return location.pathname === '/' || location.pathname === '/dashboard';
              return location.pathname === p;
            });

            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '7px',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : '#374151',
                  backgroundColor: isActive ? '#111827' : 'transparent',
                  textDecoration: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
              >
                {/* Active Green Vertical Pill Indicator on left edge */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    backgroundColor: '#16A34A',
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: isActive ? '#FFFFFF' : '#6B7280',
                }}>
                  {icons[link.icon]}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Pixel decoration, User Profile & Sign Out */}
      <div style={{
        position: 'relative',
        padding: '16px 18px',
        borderTop: '1px solid #E5E7EB',
        backgroundColor: 'transparent',
      }}>
        {/* Subtle Decorative Green Pixel Stepped Blocks */}
        <div style={{
          position: 'absolute',
          top: '-32px',
          left: '12px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}>
          <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
            <rect x="0" y="20" width="8" height="8" fill="#15803D" />
            <rect x="8" y="12" width="8" height="8" fill="#16A34A" />
            <rect x="16" y="4" width="8" height="8" fill="#22C55E" />
            <rect x="24" y="12" width="8" height="8" fill="#86EFAC" />
          </svg>
        </div>

        {/* User Card */}
        {user ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
            padding: '2px 0',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#111827',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.92rem',
              flexShrink: 0,
            }}>
              {(user.uname || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user.uname || user.email}
              </div>
              <div style={{
                fontSize: '0.74rem',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '1px',
              }}>
                <span>ID: #{user.userid}</span>
                <span>•</span>
                <span style={{ color: '#16A34A', fontWeight: 600 }}>Active</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            fontSize: '0.8rem',
            color: '#6B7280',
            marginBottom: '12px',
          }}>
            Guest Session
          </div>
        )}

        {/* Dedicated Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '7px 12px',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            color: '#4B5563',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
            e.currentTarget.style.borderColor = '#FCA5A5';
            e.currentTarget.style.color = '#DC2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.color = '#4B5563';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
