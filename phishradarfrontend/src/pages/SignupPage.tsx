import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, ApiError } from '../services/api';

/**
 * Technical Radar & Topographic Linework Graphic
 * Matches the editorial identity established on the login page.
 */
function TechnicalRadarVisual() {
  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', position: 'relative' }}>
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-hidden="true"
      >
        {/* Fine coordinate dot matrix */}
        <defs>
          <pattern id="radar-grid-dots-signup" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="18" cy="18" r="0.75" fill="#172B4D" fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect width="500" height="500" fill="url(#radar-grid-dots-signup)" />

        {/* Technical Corner Framing Brackets */}
        <path d="M 16 36 L 16 16 L 36 16" stroke="#172B4D" strokeWidth="1" strokeOpacity="0.4" fill="none" />
        <path d="M 484 36 L 484 16 L 464 16" stroke="#172B4D" strokeWidth="1" strokeOpacity="0.4" fill="none" />
        <path d="M 16 464 L 16 484 L 36 484" stroke="#172B4D" strokeWidth="1" strokeOpacity="0.4" fill="none" />
        <path d="M 484 464 L 484 484 L 464 484" stroke="#172B4D" strokeWidth="1" strokeOpacity="0.4" fill="none" />

        {/* Concentric Radar Range Rings */}
        <circle cx="250" cy="225" r="48" stroke="#172B4D" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="3 4" />
        <circle cx="250" cy="225" r="105" stroke="#172B4D" strokeWidth="0.8" strokeOpacity="0.22" />
        <circle cx="250" cy="225" r="168" stroke="#172B4D" strokeWidth="0.8" strokeOpacity="0.18" strokeDasharray="4 4" />
        <circle cx="250" cy="225" r="225" stroke="#172B4D" strokeWidth="1" strokeOpacity="0.25" />

        {/* Radar Cardinal & Diagonal Axes */}
        <line x1="25" y1="225" x2="475" y2="225" stroke="#172B4D" strokeWidth="0.7" strokeOpacity="0.2" />
        <line x1="250" y1="15" x2="250" y2="455" stroke="#172B4D" strokeWidth="0.7" strokeOpacity="0.2" />
        <line x1="91" y1="66" x2="409" y2="384" stroke="#172B4D" strokeWidth="0.6" strokeOpacity="0.12" strokeDasharray="2 4" />
        <line x1="91" y1="384" x2="409" y2="66" stroke="#172B4D" strokeWidth="0.6" strokeOpacity="0.12" strokeDasharray="2 4" />

        {/* Topographic Elevation Contours */}
        <path
          d="M 245 125 C 235 120, 252 114, 258 122 C 265 130, 250 138, 245 125 Z"
          stroke="#172B4D"
          strokeWidth="1.2"
          strokeOpacity="0.75"
        />
        <path
          d="M 235 120 C 220 108, 268 104, 274 120 C 282 140, 248 152, 235 120 Z"
          stroke="#172B4D"
          strokeWidth="0.9"
          strokeOpacity="0.6"
        />
        <path
          d="M 220 114 C 200 92, 285 88, 292 116 C 302 154, 236 170, 220 114 Z"
          stroke="#172B4D"
          strokeWidth="1"
          strokeOpacity="0.65"
        />
        <path
          d="M 205 106 C 180 76, 305 70, 312 108 C 322 168, 225 188, 205 106 Z"
          stroke="#172B4D"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
        <path
          d="M 188 98 C 158 60, 325 52, 332 100 C 344 182, 212 206, 188 98 Z"
          stroke="#172B4D"
          strokeWidth="0.9"
          strokeOpacity="0.5"
        />

        <path
          d="M 25 105 C 85 80, 135 130, 185 130 C 245 130, 285 80, 345 100 C 405 120, 445 80, 485 90"
          stroke="#172B4D"
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />
        <path
          d="M 20 135 C 80 108, 128 156, 185 152 C 255 146, 292 98, 355 124 C 415 148, 452 108, 488 118"
          stroke="#172B4D"
          strokeWidth="0.85"
          strokeOpacity="0.38"
        />
        <path
          d="M 18 168 C 76 138, 122 186, 182 176 C 262 164, 300 118, 365 148 C 425 178, 460 136, 490 148"
          stroke="#172B4D"
          strokeWidth="1.1"
          strokeOpacity="0.7"
        />
        <path
          d="M 16 202 C 72 170, 118 218, 178 202 C 268 184, 308 138, 375 174 C 435 208, 468 166, 492 178"
          stroke="#172B4D"
          strokeWidth="0.85"
          strokeOpacity="0.4"
        />
        <path
          d="M 16 238 C 68 204, 114 252, 174 230 C 274 206, 314 160, 385 200 C 445 238, 474 196, 494 210"
          stroke="#172B4D"
          strokeWidth="0.9"
          strokeOpacity="0.45"
        />
        <path
          d="M 18 276 C 65 240, 110 286, 170 260 C 280 230, 320 184, 395 228 C 454 270, 480 228, 495 244"
          stroke="#172B4D"
          strokeWidth="1.2"
          strokeOpacity="0.75"
        />
        <path
          d="M 20 316 C 62 278, 106 322, 166 292 C 286 256, 326 210, 405 258 C 462 302, 484 262, 496 280"
          stroke="#172B4D"
          strokeWidth="0.85"
          strokeOpacity="0.4"
        />
        <path
          d="M 22 358 C 60 318, 102 360, 162 326 C 292 284, 332 238, 415 290 C 470 336, 488 298, 498 318"
          stroke="#172B4D"
          strokeWidth="0.9"
          strokeOpacity="0.45"
        />
        <path
          d="M 25 402 C 58 360, 98 400, 158 362 C 298 314, 338 268, 425 324 C 476 372, 490 336, 498 358"
          stroke="#172B4D"
          strokeWidth="1.1"
          strokeOpacity="0.65"
        />
        <path
          d="M 28 446 C 60 406, 95 442, 154 400 C 304 346, 344 300, 435 358 C 482 408, 492 376, 498 398"
          stroke="#172B4D"
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />

        {/* Radar Scanning Line / Target Vector with Restrained Brand Green Accent (#15803D) */}
        <line x1="250" y1="225" x2="355" y2="124" stroke="#15803D" strokeWidth="1.2" strokeOpacity="0.65" />
        <circle cx="355" cy="124" r="4" fill="#15803D" />
        <circle cx="355" cy="124" r="8.5" stroke="#15803D" strokeWidth="1" strokeOpacity="0.45" fill="none" />
        <circle cx="355" cy="124" r="14" stroke="#15803D" strokeWidth="0.75" strokeOpacity="0.25" strokeDasharray="2 3" fill="none" />

        {/* Small Technical Annotation Callouts */}
        <text x="372" y="122" fill="#172B4D" fontSize="8.5" fontFamily="monospace" letterSpacing="0.08em" opacity="0.8">
          VEC-01 // 34.2° N
        </text>
        <text x="372" y="133" fill="#15803D" fontSize="7.5" fontFamily="monospace" letterSpacing="0.06em" fontWeight="bold">
          HEURISTIC_PASS
        </text>

        {/* Perimeter Axis Readings */}
        <text x="254" y="26" fill="#172B4D" fontSize="8" fontFamily="monospace" opacity="0.5">000°</text>
        <text x="460" y="221" fill="#172B4D" fontSize="8" fontFamily="monospace" opacity="0.5">090°</text>
        <text x="254" y="452" fill="#172B4D" fontSize="8" fontFamily="monospace" opacity="0.5">180°</text>
        <text x="30" y="221" fill="#172B4D" fontSize="8" fontFamily="monospace" opacity="0.5">270°</text>

        {/* Coordinate Center Crosshair */}
        <circle cx="250" cy="225" r="2.5" fill="#172B4D" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

export function SignupPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State strictly matching the `users` SQL table (uname, email, password)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility & UI feedback
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Focus states for the expressive scribbled curve boxes
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);

  const isFromExtension = new URLSearchParams(location.search).get('source') === 'extension';

  // Hide the global background canvas so #FAFAF9 remains clean
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
    <>
      <style>{`
        .phishradar-signup-split {
          display: flex;
          flex-direction: row;
          min-height: 100vh;
          width: 100%;
          background-color: #FAFAF9;
        }
        .phishradar-signup-visual {
          flex: 0 0 46%;
          max-width: 620px;
          background-color: #FAFAF9;
          border-right: 1px solid #E5E7EB;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 48px;
          box-sizing: border-box;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
        }
        .phishradar-signup-auth {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 48px;
          box-sizing: border-box;
          background-color: #FAFAF9;
          overflow-y: auto;
          min-height: 100vh;
        }
        .phishradar-signup-wrapper {
          width: 100%;
          max-width: 400px;
          padding: 20px 0;
        }

        /* Ensure input elements never render any browser default box outlines or rings */
        .scribble-input {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          background: transparent !important;
        }
        .scribble-input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        @media (min-width: 1200px) {
          .phishradar-signup-auth {
            padding-left: 64px;
            padding-right: 80px;
          }
        }
        @media (max-width: 880px) {
          .phishradar-signup-split {
            flex-direction: column;
            min-height: 100vh;
          }
          .phishradar-signup-visual {
            flex: none;
            width: 100%;
            max-width: 100%;
            height: auto;
            position: relative;
            border-right: none;
            border-bottom: 1px solid #E5E7EB;
            padding: 28px 24px;
          }
          .phishradar-signup-visual-graphic {
            display: none;
          }
          .phishradar-signup-auth {
            padding: 40px 24px 60px 24px;
            min-height: auto;
          }
        }
      `}</style>

      <div className="phishradar-signup-split">
        {/* ── LEFT SECTION — PhishRadar Visual Identity (Clean, Text-only header) ── */}
        <section className="phishradar-signup-visual" aria-label="PhishRadar Visual Identity">
          {/* Header Brand Identity (Text only: PhishRadar) */}
          <div>
            <div
              style={{
                fontFamily: "'Times New Roman', Times, Georgia, serif",
                fontSize: '1.45rem',
                fontWeight: 700,
                color: '#172B4D',
                letterSpacing: '0.01em',
                lineHeight: 1.1,
              }}
            >
              PhishRadar
            </div>
          </div>

          {/* Technical Radar & Topographic Linework Graphic */}
          <div
            className="phishradar-signup-visual-graphic"
            style={{
              padding: '24px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <TechnicalRadarVisual />
          </div>
        </section>

        {/* ── RIGHT SECTION — Registration Form ── */}
        <section className="phishradar-signup-auth" aria-label="User Registration">
          <div className="phishradar-signup-wrapper">
            {/* Form Header */}
            <div style={{ marginBottom: '26px' }}>
              <h1
                style={{
                  fontSize: '2.15rem',
                  fontWeight: 700,
                  fontFamily: "'Times New Roman', Times, Georgia, serif",
                  color: '#111827',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                Create an account.
              </h1>
            </div>

            {/* Extension Banner (preserved) */}
            {isFromExtension && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '6px',
                  color: '#1D4ED8',
                  fontSize: '0.84rem',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  marginBottom: '18px',
                }}
              >
                <strong>Extension link:</strong> Creating this account will automatically link your PhishRadar browser extension.
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: 1.4,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form with Expressive Curvy Scribbled Shapes */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name Field */}
              <div>
                <label
                  htmlFor="signup-name"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#111827',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    marginBottom: '8px',
                  }}
                >
                  Full name
                </label>
                <div style={{ position: 'relative', width: '100%', height: '52px' }}>
                  <svg
                    viewBox="0 0 400 56"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M 18,12 
                         C 65,3 125,20 185,8 
                         C 245,-2 305,16 355,6 
                         C 382,0 398,12 393,28 
                         C 389,40 396,48 375,52 
                         C 315,58 255,44 195,54 
                         C 135,62 75,46 28,52 
                         C 8,54 4,40 8,26 
                         C 12,14 8,16 18,12 Z"
                      fill="#FFFFFF"
                      stroke={nameFocused ? '#15803D' : '#172B4D'}
                      strokeWidth={nameFocused ? 2.2 : 1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                    />
                  </svg>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    placeholder="enter ur name..."
                    className="scribble-input"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      padding: '0 24px',
                      color: '#111827',
                      fontSize: '0.94rem',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Email address */}
              <div>
                <label
                  htmlFor="signup-email"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#111827',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    marginBottom: '8px',
                  }}
                >
                  Email address
                </label>
                <div style={{ position: 'relative', width: '100%', height: '52px' }}>
                  <svg
                    viewBox="0 0 400 52"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M 14,8 
                         C 70,3 150,11 230,5 
                         C 290,1 350,9 388,6
                         C 394,6 397,12 396,22
                         C 394,32 397,42 392,46
                         C 388,48 340,45 260,49
                         C 180,52 100,46 40,48
                         C 18,49 10,48 8,44
                         C 6,38 9,28 7,18
                         C 6,10 9,7 14,8 Z"
                      fill="#FFFFFF"
                      stroke={emailFocused ? '#15803D' : '#172B4D'}
                      strokeWidth={emailFocused ? 2.2 : 1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                    />
                  </svg>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="enter ur email id..."
                    className="scribble-input"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      padding: '0 24px',
                      color: '#111827',
                      fontSize: '0.94rem',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#111827',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    marginBottom: '8px',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative', width: '100%', height: '52px' }}>
                  <svg
                    viewBox="0 0 400 56"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M 16,14 
                         C 72,20 132,6 202,17 
                         C 272,4 332,19 384,9 
                         C 401,17 393,35 387,47 
                         C 338,45 268,57 198,47 
                         C 138,55 68,43 16,49 
                         C 3,35 11,21 16,14 Z"
                      fill="#FFFFFF"
                      stroke={passwordFocused ? '#15803D' : '#172B4D'}
                      strokeWidth={passwordFocused ? 2.2 : 1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                    />
                  </svg>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="Enter your password (min 4 chars)"
                    className="scribble-input"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      padding: '0 50px 0 24px',
                      color: '#111827',
                      fontSize: '0.94rem',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      color: '#172B4D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="signup-confirm-password"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#111827',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    marginBottom: '8px',
                  }}
                >
                  Confirm password
                </label>
                <div style={{ position: 'relative', width: '100%', height: '52px' }}>
                  <svg
                    viewBox="0 0 400 52"
                    preserveAspectRatio="none"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    aria-hidden="true"
                  >
                    <path
                      d="M 12,8 
                         C 62,3 142,1 215,6 
                         C 285,10 350,4 390,6 
                         C 396,6 397,11 395,21 
                         C 394,31 397,41 392,45 
                         C 387,47 342,45 262,47 
                         C 182,50 102,46 42,46 
                         C 18,46 9,45 7,41 
                         C 4,35 6,24 5,15 
                         C 4,8 7,7 12,8 Z"
                      fill="#FFFFFF"
                      stroke={confirmFocused ? '#15803D' : '#172B4D'}
                      strokeWidth={confirmFocused ? 2.2 : 1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                    />
                  </svg>
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    placeholder="Re-enter your password"
                    className="scribble-input"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      width: '100%',
                      height: '100%',
                      padding: '0 50px 0 24px',
                      color: '#111827',
                      fontSize: '0.94rem',
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 2,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px',
                      color: '#172B4D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Primary button with Hand-Drawn Curvy Scribble Silhouette */}
              <button
                type="submit"
                disabled={isLoading}
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '54px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '0.96rem',
                  fontWeight: 600,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  letterSpacing: '0.01em',
                  marginTop: '8px',
                  padding: 0,
                }}
              >
                <svg
                  viewBox="0 0 400 56"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    overflow: 'visible',
                  }}
                  aria-hidden="true"
                >
                  <path
                    d="M 18,12 
                       C 65,3 125,20 185,8 
                       C 245,-2 305,16 355,6 
                       C 382,0 398,12 393,28 
                       C 389,40 396,48 375,52 
                       C 315,58 255,44 195,54 
                       C 135,62 75,46 28,52 
                       C 8,54 4,40 8,26 
                       C 12,14 8,16 18,12 Z"
                    fill={buttonHover && !isLoading ? '#1F3A68' : '#172B4D'}
                    stroke={buttonHover && !isLoading ? '#111827' : '#172B4D'}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: 'fill 0.18s ease, stroke 0.18s ease' }}
                  />
                </svg>
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {isLoading ? 'Creating account…' : 'Create Account'}
                </span>
              </button>
            </form>

            {/* Link to Login */}
            <div
              style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: '20px',
                marginTop: '28px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '0.86rem',
                  color: '#6B7280',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                Already have an account?{' '}
              </span>
              <Link
                to="/login"
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#172B4D',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Sign in here
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
