import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ScannerPage } from './pages/ScannerPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ArchitecturePage } from './pages/ArchitecturePage';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />

          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<ScannerPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/architecture" element={<ArchitecturePage />} />
            </Routes>
          </main>

          <footer style={{
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(7, 9, 14, 0.95)',
            padding: '28px 24px',
            marginTop: 'auto',
          }}>
            <div style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>PhishRadar</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>&bull;</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Intelligent Phishing Detection & Response Framework
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--safe-green)' }} />
                  <span>Backend: Port 8080</span>
                </div>
                <Link to="/architecture" style={{ color: 'var(--radar-cyan)' }}>
                  Engine Specs &rarr;
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
