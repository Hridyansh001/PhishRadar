import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, ApiError } from '../services/api';
import registerBanner from '../assets/register-banner.png';

export function SignupPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State strictly matching the `users` SQL table (uname, email, upassword)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility & UI feedback
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isFromExtension = new URLSearchParams(location.search).get('source') === 'extension';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

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
      // Maps directly to backend `users` entity: uname, email, password
      const user = await register({ uname: name.trim(), email: email.trim(), password });
      setUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create account. Please ensure the backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      width: '100%',
      backgroundColor: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px 80px 32px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1320px',
        backgroundColor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '40px 48px',
        border: '1px solid rgba(229, 231, 235, 0.85)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '48px',
      }}>
        {/* Left Side: Register Here Graphic */}
        <div style={{
          flex: '1 1 420px',
          maxWidth: '540px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img
            src={registerBanner}
            alt="Register Here"
            style={{
              width: '100%',
              maxWidth: '500px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Right Side: Registration Form */}
        <div style={{
          flex: '1.2 1 540px',
          maxWidth: '680px',
        }}>
          {/* Title in Serif Font */}
          <h1 style={{
            fontSize: '2.4rem',
            fontWeight: 600,
            fontFamily: "'Times New Roman', Times, Georgia, serif",
            color: '#111827',
            margin: '0 0 28px 0',
            letterSpacing: '0.01em',
          }}>
            User Registration
          </h1>

          {/* Extension Banner */}
          {isFromExtension && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              color: '#1d4ed8',
              fontSize: '0.88rem',
              marginBottom: '20px',
            }}>
              <strong>Extension link:</strong> Creating this account will automatically link your PhishRadar browser extension.
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '0.9rem',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* 2-Column Inputs Grid */}
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '28px',
              alignItems: 'start',
            }}>
              {/* Left Column: Name & Email + Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '6px',
                  }}>
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '0.95rem',
                      border: '1px solid #6b7280',
                      borderRadius: '6px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '6px',
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '0.95rem',
                      border: '1px solid #6b7280',
                      borderRadius: '6px',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Action Buttons: Register & Back placed beneath Email */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px',
                }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: '#71717a',
                      color: '#ffffff',
                      border: '1px solid #52525b',
                      padding: '9px 28px',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) e.currentTarget.style.backgroundColor = '#52525b';
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) e.currentTarget.style.backgroundColor = '#71717a';
                    }}
                  >
                    {isLoading ? 'Registering...' : 'Register'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      border: '1px solid #6b7280',
                      padding: '9px 28px',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* Right Column: Password & Confirm Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '6px',
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 14px',
                        fontSize: '0.95rem',
                        border: '1px solid #6b7280',
                        borderRadius: '6px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '6px',
                  }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 14px',
                        fontSize: '0.95rem',
                        border: '1px solid #6b7280',
                        borderRadius: '6px',
                        outline: 'none',
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
