import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkBackendStatus, clearDetectionHistory } from '../services/api';

export function SettingsPage() {
  const { user } = useAuth();

  // Local Preferences (stored in localStorage)
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('phishradar_density') as 'comfortable' | 'compact') || 'comfortable';
  });

  const [timeFormat, setTimeFormat] = useState<'absolute' | 'relative'>(() => {
    return (localStorage.getItem('phishradar_time_format') as 'absolute' | 'relative') || 'absolute';
  });

  const [autoHttps, setAutoHttps] = useState<boolean>(() => {
    return localStorage.getItem('phishradar_auto_https') !== 'false';
  });

  // System Diagnostics State
  const [backendStatus, setBackendStatus] = useState<{ checking: boolean; online: boolean | null; message?: string }>({
    checking: false,
    online: null,
  });

  const [extensionStatus, setExtensionStatus] = useState<boolean>(false);
  const [cacheClearedNotice, setCacheClearedNotice] = useState<string | null>(null);

  // Check extension activity
  useEffect(() => {
    const isExtActive =
      document.documentElement.getAttribute('data-phishradar-extension-active') === 'true' ||
      Boolean((window as unknown as { __PHISHRADAR_EXT__?: boolean }).__PHISHRADAR_EXT__);
    setExtensionStatus(isExtActive);
  }, []);

  const handleTestBackend = async () => {
    setBackendStatus({ checking: true, online: null });
    const res = await checkBackendStatus();
    setBackendStatus({ checking: false, online: res.online, message: res.message });
  };

  const handleDensityChange = (d: 'comfortable' | 'compact') => {
    setTableDensity(d);
    localStorage.setItem('phishradar_density', d);
  };

  const handleTimeFormatChange = (f: 'absolute' | 'relative') => {
    setTimeFormat(f);
    localStorage.setItem('phishradar_time_format', f);
  };

  const handleAutoHttpsChange = (checked: boolean) => {
    setAutoHttps(checked);
    localStorage.setItem('phishradar_auto_https', String(checked));
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear your local scan telemetry? This cannot be undone.')) {
      clearDetectionHistory();
      setCacheClearedNotice('Local scan history cache successfully cleared.');
      setTimeout(() => setCacheClearedNotice(null), 4000);
    }
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#15803D',
          marginBottom: '6px',
        }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#15803D', borderRadius: '1px' }} />
          <span>System Settings</span>
        </div>

        <h1 style={{
          fontSize: '2.05rem',
          fontWeight: 800,
          color: '#111827',
          letterSpacing: '-0.02em',
          margin: 0,
          lineHeight: 1.2,
        }}>
          Preferences & Environment
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.92rem', marginTop: '4px', marginBottom: 0 }}>
          Manage client workspace preferences and inspect backend connection telemetry.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
        {/* Section 1: Backend Account Identity (Frameless & Open) */}
        <div style={{ paddingBottom: '32px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Backend Account Profile
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '3px 0 0 0' }}>
              Authenticated user credentials retrieved from the Spring Boot MySQL database.
            </p>
          </div>

          {user ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  User ID
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  #{user.userid}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Username
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  {user.uname || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Email Address
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  {user.email || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>
                  Account Status
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803D', marginTop: '3px' }}>
                  {user.ustatus || 'Active'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6B7280', fontSize: '0.9rem' }}>
              No authenticated user session active. Operating in guest context.
            </div>
          )}

          <div style={{
            marginTop: '20px',
            fontSize: '0.8rem',
            color: '#6B7280',
          }}>
            Note: User credentials and role policies are managed by the Spring Boot backend. Account modifications are not exposed in the current API specification.
          </div>
        </div>

        {/* Section 2: Local Client Preferences (Frameless & Open) */}
        <div style={{ paddingBottom: '32px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Client Workspace Preferences
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '3px 0 0 0' }}>
              Configured locally on this browser. These preferences do not modify backend records.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Table Density */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.92rem' }}>
                  Table Row Density
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Adjust padding height for the detection logs and recent activity tables.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleDensityChange('comfortable')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    backgroundColor: tableDensity === 'comfortable' ? '#111827' : '#F3F4F6',
                    color: tableDensity === 'comfortable' ? '#FFFFFF' : '#374151',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  onClick={() => handleDensityChange('compact')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    backgroundColor: tableDensity === 'compact' ? '#111827' : '#F3F4F6',
                    color: tableDensity === 'compact' ? '#FFFFFF' : '#374151',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Compact
                </button>
              </div>
            </div>

            {/* Time Format */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.92rem' }}>
                  Timestamp Representation
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Display scan times as exact timestamps or relative time elapsed.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleTimeFormatChange('absolute')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    backgroundColor: timeFormat === 'absolute' ? '#111827' : '#F3F4F6',
                    color: timeFormat === 'absolute' ? '#FFFFFF' : '#374151',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Absolute (Date & Time)
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeFormatChange('relative')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    backgroundColor: timeFormat === 'relative' ? '#111827' : '#F3F4F6',
                    color: timeFormat === 'relative' ? '#FFFFFF' : '#374151',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Relative (e.g. 5m ago)
                </button>
              </div>
            </div>

            {/* Auto-prepend HTTPS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.92rem' }}>
                  Auto-Normalize Protocols
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Automatically prepend https:// to domain-only inputs in the scanner.
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoHttps}
                  onChange={(e) => handleAutoHttpsChange(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#15803D' }}
                />
              </label>
            </div>

            {/* Clear Telemetry Cache */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid #F3F4F6',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#DC2626', fontSize: '0.92rem' }}>
                  Clear Local Telemetry Cache
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                  Remove all cached scan evaluations stored in this browser session.
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear Local Scans
              </button>
            </div>

            {cacheClearedNotice && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#F0FDF4',
                color: '#15803D',
                borderRadius: '6px',
                fontSize: '0.84rem',
              }}>
                {cacheClearedNotice}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: System Health Diagnostics (Frameless & Open) */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px',
          }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                System Diagnostics
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '3px 0 0 0' }}>
                Verify active runtime communication with the Spring Boot server and extension relay.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestBackend}
              disabled={backendStatus.checking}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                backgroundColor: '#111827',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {backendStatus.checking ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #F3F4F6',
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                Spring Boot Server (port 8080)
              </span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: backendStatus.online === true ? '#15803D' : backendStatus.online === false ? '#DC2626' : '#6B7280',
              }}>
                {backendStatus.online === true ? 'Connected (200 OK)' : backendStatus.online === false ? 'Unreachable' : 'Ready to Test'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid #F3F4F6',
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                Chrome MV3 Extension Relay
              </span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: extensionStatus ? '#15803D' : '#9CA3AF',
              }}>
                {extensionStatus ? 'Active & Synced' : 'Extension Not Detected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
