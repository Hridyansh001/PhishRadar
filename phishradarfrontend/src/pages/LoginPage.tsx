import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, ApiError } from '../services/api';
import { FishingRodAnimation } from '../components/FishingRodAnimation';

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFromExtension = new URLSearchParams(location.search).get('source') === 'extension';

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '40px 100px',
      maxWidth: '1360px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'transparent',
    }}>
      {/* Animated Fishing Rod and Hook on the left */}
      <FishingRodAnimation formRef={formRef} />

      {/* Form positioned directly over background without white box behind */}
      <div
        ref={formRef}
        style={{
          width: '100%',
          maxWidth: '380px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Error message */}
        {error && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(254, 242, 242, 0.85)',
            border: '1.5px solid #fecaca',
            borderRadius: '8px',
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

        {/* Login Form matching screenshot */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '1.15rem',
              fontWeight: 700,
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              color: '#111827',
              marginBottom: '8px',
            }}>
              Email or Badge
            </label>
            <input
              type="text"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter ur email or badge"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(225, 225, 225, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1.5px solid #111827',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '1rem',
                fontFamily: "'Times New Roman', Times, Georgia, serif",
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '1.15rem',
              fontWeight: 700,
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              color: '#111827',
              marginBottom: '8px',
            }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter ur password"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(225, 225, 225, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1.5px solid #111827',
                borderRadius: '8px',
                color: '#111827',
                fontSize: '1rem',
                fontFamily: "'Times New Roman', Times, Georgia, serif",
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
              padding: '12px',
              backgroundColor: 'rgba(215, 215, 215, 0.65)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#111827',
              fontWeight: 700,
              fontSize: '1.15rem',
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              border: '1.5px solid #111827',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              marginTop: '4px',
              transition: 'background-color 0.15s',
              textAlign: 'center',
            }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Center-aligned Register here link */}
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
