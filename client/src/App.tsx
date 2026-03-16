import { useEffect, useState, type ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from './components/layout/AuthLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { SkillCheck } from './pages/SkillCheck';
import SkillSessionRecordings from './pages/SkillSessionRecordings';
import SkillSessionAttempts from './pages/SkillSessionAttempts';
import GitHubVerification from './pages/GitHubVerification';
import VerifySkill from './pages/VerifySkill';
import { Profile } from './pages/Profile';
import { ManageAccount } from './pages/ManageAccount';
import { AllSessions } from './pages/AllSessions';
import { ThemeProvider } from './components/theme-provider';

import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from '@/store';
import { setUser, logout } from './store/slices/authSlice';
import api from './lib/api';

import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: ReactElement }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicAuthRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: ReactElement }) {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppContent() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [initializing, setInitializing] = useState(!!token);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/users/me');
          if (res.data.success) {
            dispatch(setUser(res.data.data.user || res.data.user));
          } else {
            dispatch(logout());
          }
        } catch (error) {
          console.error('Failed to fetch user', error);
          dispatch(logout());
        }
      }
      setInitializing(false);
    };

    initAuth();
  }, [token, dispatch]);

  if (initializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route
          path="/"
          element={
            <PublicAuthRoute isAuthenticated={isAuthenticated}>
              <AuthLayout />
            </PublicAuthRoute>
          }
        >
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="skillcraft" element={<SkillCheck />} />
          <Route path="sessions" element={<AllSessions />} />
          <Route path="session/:id" element={<SkillSessionAttempts />} />
          <Route path="session/:id/record" element={<SkillSessionRecordings />} />
          <Route path="session/:id/attempts" element={<SkillSessionAttempts />} />
          <Route path="github-verification" element={<GitHubVerification />} />
          <Route path="profile" element={<Profile />} />
          <Route path="manage-account" element={<ManageAccount />} />
        </Route>

        <Route path="/verify/:username/:skill" element={<VerifySkill />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="skillcraft-theme" attribute="class">
      <Provider store={store}>
        <AppContent />
      </Provider>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          className:
            "rounded-xl border backdrop-blur-md shadow-lg",
        }}
      />
    </ThemeProvider>
  );
}

export default App;
