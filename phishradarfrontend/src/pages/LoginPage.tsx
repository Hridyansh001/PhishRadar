import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, ApiError } from '../services/api';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Hide the global background canvas on the login page so logincover is clean
  useEffect(() => {
    const bgCanvas = document.getElementById('bg-fixed-canvas');
    if (bgCanvas) {
      const prevDisplay = bgCanvas.style.display;
      bgCanvas.style.display = 'none';
      return () => {
        bgCanvas.style.display = prevDisplay;
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await login({ email, password });
      setUser(user);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
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
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: "url('/logincover.png')",
      backgroundSize: 'contain',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#ffffff',
      position: 'relative',
      padding: '24px',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* ── Login Form between the 2 computers (No white card background) ── */}
      <div
        ref={formRef}
        style={{
          width: '100%',
          maxWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'relative',
          zIndex: 2,
          marginTop: '10px',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        {/* Title: PhishRadar (Static, clean) */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 3.8vw, 2.8rem)',
            fontWeight: 800,
            fontFamily: "'Times New Roman', Times, Georgia, serif",
            color: '#111827',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}>
            PhishRadar
          </h1>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(254, 242, 242, 0.95)',
            border: '1.5px solid #fecaca',
            borderRadius: '8px',
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              color: '#111827',
              marginBottom: '6px',
            }}>
              Email
            </label>
            <input
              type="text"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'rgba(235, 237, 240, 0.75)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                border: '1.5px solid #111827',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '0.98rem',
                fontFamily: "'Times New Roman', Times, Georgia, serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              color: '#111827',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'rgba(235, 237, 240, 0.75)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                border: '1.5px solid #111827',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '0.98rem',
                fontFamily: "'Times New Roman', Times, Georgia, serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: 'rgba(225, 228, 232, 0.85)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              color: '#111827',
              fontWeight: 700,
              fontSize: '1.05rem',
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              border: '1.5px solid #111827',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              marginTop: '2px',
              transition: 'background-color 0.15s',
            }}
          >
            {isLoading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <Link
            to="/signup"
            style={{
              color: '#111827',
              fontWeight: 700,
              fontSize: '1.05rem',
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
