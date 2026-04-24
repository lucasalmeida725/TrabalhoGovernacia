import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AssessmentWizardPage from './pages/AssessmentWizardPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import AssessmentsPage from './pages/AssessmentsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import CompaniesPage from './pages/CompaniesPage';
import QuestionsPage from './pages/QuestionsPage';
import RisksPage from './pages/RisksPage';
import ServicesPage from './pages/ServicesPage';

function UsersPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
      <p className="mt-2 text-slate-500">Gestão de usuários em construção.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/questions" element={<QuestionsPage />} />
              <Route path="/assessments" element={<AssessmentsPage />} />
              <Route path="/assessments/:id" element={<AssessmentWizardPage />} />
              <Route path="/risks" element={<RisksPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reports/:id" element={<ReportPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
