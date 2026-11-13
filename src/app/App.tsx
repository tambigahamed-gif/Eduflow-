import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { hasSupabaseConfig } from '../lib/supabase';
import { PublicLayout } from '../layouts/PublicLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { HomePage } from '../features/public/HomePage';
import { InformationPage } from '../features/public/InformationPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, AuthCallbackPage } from '../features/auth/AuthPages';
import { OnboardingPage } from '../features/students/OnboardingPage';
import { StudentDashboard } from '../features/students/StudentDashboard';
import { ConfigNotice } from '../components/ConfigNotice';

function RequireStudent() {
  const { user, role, studentProfile, loading, accountLoading, accountError, refreshAccount } = useAuth();
  const location = useLocation();

  if (!hasSupabaseConfig) return <ConfigNotice fullPage />;
  if (loading || (user && accountLoading)) {
    return <div className="full-state"><span className="spinner" aria-hidden="true" />Chargement de ton espace…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (accountError) {
    return (
      <div className="full-state">
        <div className="state-card">
          <h1>Ton espace n’est pas encore prêt</h1>
          <p>{accountError}</p>
          <button className="button button-primary" onClick={() => void refreshAccount()} type="button">Réessayer</button>
        </div>
      </div>
    );
  }
  if (role !== 'student') {
    return (
      <div className="full-state">
        <div className="state-card">
          <h1>Accès indisponible</h1>
          <p>Ce compte n’a pas de rôle étudiant actif. Aucun rôle privilégié ne peut être attribué depuis l’inscription publique.</p>
        </div>
      </div>
    );
  }
  if (location.pathname === '/dashboard' && !studentProfile) return <Navigate to="/onboarding" replace />;
  if (location.pathname === '/onboarding' && studentProfile) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function NotFound() {
  return (
    <main className="not-found page-wrap">
      <span className="eyebrow">404 · page introuvable</span>
      <h1>On ne trouve pas cette page.</h1>
      <p>Le lien est peut-être incomplet ou la page a changé.</p>
      <a className="button button-primary" href="/">Retour à l’accueil</a>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<InformationPage page="about" />} />
            <Route path="/features" element={<InformationPage page="features" />} />
            <Route path="/pricing" element={<InformationPage page="pricing" />} />
            <Route path="/faq" element={<InformationPage page="faq" />} />
            <Route path="/contact" element={<InformationPage page="contact" />} />
            <Route path="/privacy" element={<InformationPage page="privacy" />} />
            <Route path="/terms" element={<InformationPage page="terms" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Route>
          <Route element={<RequireStudent />}>
            <Route element={<StudentLayout />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<StudentDashboard />} />
            </Route>
          </Route>
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
