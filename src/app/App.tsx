import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { hasSupabaseConfig } from '../lib/supabase';
import type { AppRole } from '../types/database';
import { PublicLayout } from '../layouts/PublicLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { ParentLayout } from '../layouts/ParentLayout';
import { TeacherLayout } from '../layouts/TeacherLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../features/public/HomePage';
import { InformationPage } from '../features/public/InformationPage';
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, AuthCallbackPage } from '../features/auth/AuthPages';
import { RoleApplicationPage } from '../features/access/RoleApplicationPage';
import { OnboardingPage } from '../features/students/OnboardingPage';
import { StudentDashboard } from '../features/students/StudentDashboard';
import { StudentGuardianLinksPage, ParentDashboard, ParentChildrenPage, ParentProgressPage, ParentResultsPage, ParentNotificationsPage, ParentProfilePage } from '../features/parents/ParentPortal';
import { TeacherDashboard, TeacherProfilePage, TeacherSubmissionsPage, TeacherResourcesPage, TeacherCoursesPage, TeacherStatisticsPage } from '../features/teachers/TeacherPortal';
import { AdminDashboard, AdminUsersPage, AdminStudentsPage, AdminParentsPage, AdminTeachersPage, AdminContributionsPage, AdminNotificationsPage, AdminAuditPage } from '../features/administration/AdminPortal';
import { LearningCatalogPage, SubjectLearningPage, CourseLearningPage, ChapterLearningPage, LessonLearningPage, VideoLibraryPage, VideoWatchPage, ResourceLibraryPage, LearningFavoritesPage, LearningHistoryPage } from '../features/learning/StudentLearning';
import { CurriculumAdminPage, LearningContentAdminPage } from '../features/administration/LearningAdmin';
import { TeacherLearningSubmissionsPage } from '../features/teachers/TeacherLearningSubmissions';
import { ConfigNotice } from '../components/ConfigNotice';

function AccountGate({ required, studentFlow = false }: { required?: AppRole; studentFlow?: boolean }) {
  const { user, roles, studentProfile, loading, accountLoading, accountError, refreshAccount } = useAuth();
  const location = useLocation();
  if (!hasSupabaseConfig) return <ConfigNotice fullPage />;
  if (loading || (user && accountLoading)) return <div className="full-state"><span className="spinner" aria-hidden="true" />Chargement de ton espace…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (accountError) return <div className="full-state"><div className="state-card"><h1>Ton espace n’est pas encore prêt</h1><p>{accountError}</p><button className="button button-primary" onClick={() => void refreshAccount()} type="button">Réessayer</button></div></div>;
  if (required && !roles.includes(required)) return <div className="full-state"><div className="state-card"><h1>Accès indisponible</h1><p>Ce compte ne possède pas le rôle requis. Les accès parent et enseignant nécessitent une approbation, et aucun compte ne peut devenir administrateur depuis l’inscription publique.</p><a className="button button-outline" href="/access-request">Voir les demandes d’accès</a></div></div>;
  if (studentFlow && location.pathname !== '/onboarding' && !studentProfile) return <Navigate to="/onboarding" replace />;
  if (studentFlow && location.pathname === '/onboarding' && studentProfile) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function NotFound() {
  return <main className="not-found page-wrap"><span className="eyebrow">404 · page introuvable</span><h1>On ne trouve pas cette page.</h1><p>Le lien est peut-être incomplet ou la page a changé.</p><a className="button button-primary" href="/">Retour à l’accueil</a></main>;
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
          <Route element={<AccountGate />}><Route path="/access-request" element={<RoleApplicationPage />} /></Route>
          <Route element={<AccountGate required="student" studentFlow />}>
            <Route element={<StudentLayout />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/student/parent-links" element={<StudentGuardianLinksPage />} />
            <Route path="/catalog" element={<LearningCatalogPage />} />
            <Route path="/courses/:courseId" element={<CourseLearningPage />} />
            <Route path="/subjects/:subjectId" element={<SubjectLearningPage />} />
            <Route path="/chapters/:chapterId" element={<ChapterLearningPage />} />
              <Route path="/lessons/:lessonId" element={<LessonLearningPage />} />
              <Route path="/resources" element={<ResourceLibraryPage />} />
              <Route path="/videos" element={<VideoLibraryPage />} />
              <Route path="/videos/:videoId" element={<VideoWatchPage />} />
              <Route path="/favorites" element={<LearningFavoritesPage />} />
              <Route path="/history" element={<LearningHistoryPage />} />
            </Route>
          </Route>
          <Route element={<AccountGate required="parent" />}>
            <Route element={<ParentLayout />}>
              <Route path="/parent/dashboard" element={<ParentDashboard />} />
              <Route path="/parent/children" element={<ParentChildrenPage />} />
              <Route path="/parent/progress" element={<ParentProgressPage />} />
              <Route path="/parent/results" element={<ParentResultsPage />} />
              <Route path="/parent/notifications" element={<ParentNotificationsPage />} />
              <Route path="/parent/profile" element={<ParentProfilePage />} />
            </Route>
          </Route>
          <Route element={<AccountGate required="teacher" />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/profile" element={<TeacherProfilePage />} />
              <Route path="/teacher/contributions" element={<TeacherSubmissionsPage />} />
              <Route path="/teacher/resources" element={<TeacherResourcesPage />} />
              <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
              <Route path="/teacher/statistics" element={<TeacherStatisticsPage />} />
              <Route path="/teacher/learning-contributions" element={<TeacherLearningSubmissionsPage />} />
            </Route>
          </Route>
          <Route element={<AccountGate required="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/students" element={<AdminStudentsPage />} />
              <Route path="/admin/parents" element={<AdminParentsPage />} />
              <Route path="/admin/teachers" element={<AdminTeachersPage />} />
              <Route path="/admin/contributions" element={<AdminContributionsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="/admin/programme" element={<CurriculumAdminPage />} />
              <Route path="/admin/learning-content" element={<LearningContentAdminPage />} />
            </Route>
          </Route>
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
