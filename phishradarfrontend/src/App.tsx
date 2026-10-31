import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PixelTransition } from './components/PixelTransition';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { ScannerPage } from './pages/ScannerPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

function AppLayout() {
  const { isAuthenticated } = useAuth();

  // Public/Unauthenticated Layout (Sign In, Sign Up) - Clean full-screen without header or footer
  if (!isAuthenticated) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signin"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <SignupPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    );
  }

  // Authenticated Enterprise Layout with Dedicated Sidebar
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent' }}>
      {/* Sidebar with all options on the side */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Content View with Generous Margins & No Clustering */}
        <main style={{
          flex: 1,
          padding: '36px 40px 60px 40px',
          maxWidth: '1440px',
          width: '100%',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            {/* Architecture tab removed and redirected to dashboard */}
            <Route path="/architecture" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <PixelTransition />
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
