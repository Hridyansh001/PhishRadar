import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, ApiError } from '../services/api';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email, password });
      setUser(user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to sign in. Please verify your credentials.');
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
        <div style={{ marginBottom: '28px', textAlign: 'left' }}>
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
            Sign In to PhishRadar
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#4b5563',
            fontStyle: 'italic',
            marginTop: '8px',
            lineHeight: 1.5,
          }}>
            Access threat analysis records and live URL scanner telemetry
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
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontWeight: 700 }}>Notice:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '12px 14px',
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
                padding: '12px 14px',
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
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Left-Aligned Footer Link */}
        <div style={{ marginTop: '24px', textAlign: 'left' }}>
          <p style={{ fontSize: '0.92rem', color: '#4b5563', margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{ color: '#000000', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
