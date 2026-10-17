import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, ApiError } from '../services/api';

export function SignupPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [uname, setUname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await register({ uname, email, password });
      setUser(user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please ensure your backend is reachable.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 140px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '40px 80px',
      maxWidth: '1360px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Fully Right-Aligned Form Without Surrounding Box */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#000000',
            marginBottom: '16px',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '2.1rem',
            fontWeight: 700,
            color: '#000000',
            margin: 0,
            letterSpacing: '0.01em',
            lineHeight: 1.2,
          }}>
            Create Account
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#4b5563',
            fontStyle: 'italic',
            marginTop: '8px',
            lineHeight: 1.5,
          }}>
            Register to receive a unique telemetry ID and record scans in MySQL
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.88rem',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontWeight: 700 }}>Notice:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}>
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={uname}
              onChange={(e) => setUname(e.target.value)}
              placeholder="e.g. kushal_sec"
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1.5px solid #111827',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1.5px solid #111827',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1.5px solid #111827',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#111827',
              marginBottom: '6px',
              letterSpacing: '0.02em',
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '11px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1.5px solid #111827',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: '#000000',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1rem',
              border: '1px solid #000000',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              marginTop: '4px',
              transition: 'background-color 0.15s',
              letterSpacing: '0.02em',
            }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div style={{ marginTop: '24px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.92rem', color: '#4b5563', margin: 0 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ color: '#000000', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
