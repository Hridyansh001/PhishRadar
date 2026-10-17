import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ScannerPage } from './pages/ScannerPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signin" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/register" element={<SignupPage />} />
            </Routes>
          </main>

          <footer style={{
            borderTop: '1px solid #e5e7eb',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '20px 24px',
            marginTop: 'auto',
          }}>
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <span style={{ fontWeight: 700, color: '#000000', fontSize: '1rem', letterSpacing: '0.02em' }}>
                PhishRadar
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4b5563' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#15803d', display: 'inline-block' }} />
                <span>Backend Connected (Port 8080)</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
