import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, ROLES } from '@/store/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Login from '@/modules/Login';

// ── Carga diferida de todos los módulos ───────────────────────────────────────
// Solo AppShell + Login se cargan de inmediato (siempre necesarios para auth).
// El resto se descarga en chunks bajo demanda al navegar a cada ruta.

// Expenses
const ExpensesList       = lazy(() => import('@/modules/expenses/views/ExpensesList'));
const ApprovalsList      = lazy(() => import('@/modules/expenses/views/ApprovalsList'));
const OperationsExpenses = lazy(() => import('@/modules/expenses/views/OperationsExpenses'));
const ExpensesDashboard  = lazy(() => import('@/modules/expenses/views/ExpensesDashboard'));

// OTs
const OTDetail         = lazy(() => import('@/modules/ots/OTDetail'));
const SupervisorOTs    = lazy(() => import('@/modules/ots/views/SupervisorOTs'));
const TechnicianOTs    = lazy(() => import('@/modules/ots/views/TechnicianOTs'));
const TechGamification = lazy(() => import('@/modules/ots/views/TechGamification'));
const OTValidation     = lazy(() => import('@/modules/ots/views/OTValidation'));
const OTCatalogs       = lazy(() => import('@/modules/ots/views/OTCatalogs'));
const DeliveryAct      = lazy(() => import('@/modules/ots/views/DeliveryAct'));
const OpsCalendar      = lazy(() => import('@/modules/ots/views/OpsCalendar'));

// HR
const HRLayout          = lazy(() => import('@/modules/human-resources/components/HRLayout'));
const HRDashboard       = lazy(() => import('@/modules/human-resources/views/HRDashboard'));
const TimeOff           = lazy(() => import('@/modules/human-resources/views/TimeOff'));
const HRDocuments       = lazy(() => import('@/modules/human-resources/views/HRDocuments'));
const EmployeeDirectory = lazy(() => import('@/modules/human-resources/views/EmployeeDirectory'));
const EmployeeProfile   = lazy(() => import('@/modules/human-resources/views/EmployeeProfile'));
const MyProfile         = lazy(() => import('@/modules/human-resources/views/MyProfile'));
const Attendance        = lazy(() => import('@/modules/human-resources/views/Attendance'));
const OrgChart          = lazy(() => import('@/modules/human-resources/views/OrgChart'));
const Recruitment       = lazy(() => import('@/modules/human-resources/views/Recruitment'));
const Performance       = lazy(() => import('@/modules/human-resources/views/Performance'));
const Assets            = lazy(() => import('@/modules/human-resources/views/Assets'));
const Announcements     = lazy(() => import('@/modules/human-resources/views/Announcements'));
const HRReports         = lazy(() => import('@/modules/human-resources/views/HRReports'));
const HRSettings        = lazy(() => import('@/modules/human-resources/views/HRSettings'));
const PerformanceDashboard = lazy(() => import('@/modules/human-resources/views/PerformanceDashboard'));
const AcademyManager    = lazy(() => import('@/modules/human-resources/views/AcademyManager'));
const RewardManager     = lazy(() => import('@/modules/human-resources/views/RewardManager'));
const SurveyManager     = lazy(() => import('@/modules/human-resources/views/SurveyManager'));

// CRM
const CRMLayout       = lazy(() => import('@/modules/crm/components/CRMLayout'));
const SalesPipeline   = lazy(() => import('@/modules/crm/views/SalesPipeline'));
const DealsKanban     = lazy(() => import('@/modules/crm/views/DealsKanban'));
const ClientsList     = lazy(() => import('@/modules/crm/views/ClientsList'));
const QuotesList      = lazy(() => import('@/modules/crm/views/QuotesList'));
const IndirectSales   = lazy(() => import('@/modules/crm/views/IndirectSales'));
const InvoicesOrders  = lazy(() => import('@/modules/crm/views/InvoicesOrders'));
const PipelineSettings  = lazy(() => import('@/modules/crm/views/PipelineSettings'));
const SalesMetrics      = lazy(() => import('@/modules/crm/views/SalesMetrics'));
const CRMActivityFeed   = lazy(() => import('@/modules/crm/views/CRMActivityFeed'));

// Academy / LMS
const AcademyHome  = lazy(() => import('@/modules/lms/views/AcademyHome'));
const CoursePlayer = lazy(() => import('@/modules/lms/views/CoursePlayer'));

// Métricas por rol
const OpsMetrics  = lazy(() => import('@/modules/ops/views/OpsMetrics'));
const TechMetrics = lazy(() => import('@/modules/ots/views/TechMetrics'));

// Misc
const FeedbackForm = lazy(() => import('@/modules/feedback/FeedbackForm'));
const ClientPortal = lazy(() => import('@/modules/ots/views/ClientPortal'));

// ── Fallback de carga ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando…</p>
      </div>
    </div>
  );
}

// ── Selectores condicionales ──────────────────────────────────────────────────
const OTSelector = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role];
  const isSupervisor = userRoles.includes(ROLES.ADMIN) || userRoles.includes(ROLES.OPS);
  return isSupervisor ? <SupervisorOTs /> : <TechnicianOTs />;
};

const DashboardSelector = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case ROLES.ADMIN:  return <SalesMetrics />;
    case ROLES.OPS:    return <OpsMetrics />;
    case ROLES.TECH:   return <TechMetrics />;
    case ROLES.HR:     return <HRDashboard />;
    case ROLES.SALES:  return <DealsKanban />;
    default:           return <MyProfile />;
  }
};

// ── Ruta protegida ────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, noShell = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (noShell) return children;
  return <AppShell>{children}</AppShell>;
};

// ── Router principal ──────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas Públicas - Deben ir primero */}
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/feedback/:type/:otId" element={<FeedbackForm />} />

          <Route path="/"           element={<ProtectedRoute><DashboardSelector /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><PerformanceDashboard /></ProtectedRoute>} />

          {/* Gastos */}
          <Route path="/expenses"                  element={<ProtectedRoute><ExpensesList /></ProtectedRoute>} />
          <Route path="/expenses/dashboard"        element={<ProtectedRoute><ExpensesDashboard /></ProtectedRoute>} />
          <Route path="/ops/approvals/expenses"    element={<ProtectedRoute><ApprovalsList /></ProtectedRoute>} />
          <Route path="/ops/expenses/control"      element={<ProtectedRoute><OperationsExpenses /></ProtectedRoute>} />

          {/* OTs */}
          <Route path="/ots"                         element={<ProtectedRoute><OTSelector /></ProtectedRoute>} />
          <Route path="/ops/calendar"                element={<ProtectedRoute><OpsCalendar /></ProtectedRoute>} />
          <Route path="/ots/leaderboard"             element={<ProtectedRoute><TechGamification /></ProtectedRoute>} />
          <Route path="/ots/:id"                     element={<ProtectedRoute><OTDetail /></ProtectedRoute>} />
          <Route path="/ops/ots/validate/:id"        element={<ProtectedRoute><OTValidation /></ProtectedRoute>} />
          <Route path="/ops/ots/catalogs"            element={<ProtectedRoute><OTCatalogs /></ProtectedRoute>} />
          <Route path="/ops/ots/delivery-act/:id"    element={<ProtectedRoute><DeliveryAct /></ProtectedRoute>} />

          {/* Módulo RH */}
          <Route path="/hr" element={<ProtectedRoute><HRLayout /></ProtectedRoute>}>
            <Route index                        element={<HRDashboard />} />
            <Route path="directory"             element={<EmployeeDirectory />} />
            <Route path="employee/:id"          element={<EmployeeProfile />} />
            <Route path="attendance"            element={<Attendance />} />
            <Route path="time-off"              element={<TimeOff />} />
            <Route path="documents"             element={<HRDocuments />} />
            <Route path="org-chart"             element={<OrgChart />} />
            <Route path="recruitment"           element={<Recruitment />} />
            <Route path="performance"           element={<Performance />} />
            <Route path="rewards"               element={<RewardManager />} />
            <Route path="assets"                element={<Assets />} />
            <Route path="academy-admin"         element={<AcademyManager />} />
            <Route path="surveys"               element={<SurveyManager />} />
            <Route path="announcements"         element={<Announcements />} />
            <Route path="reports"               element={<HRReports />} />
            <Route path="settings"              element={<HRSettings />} />
          </Route>

          {/* Módulo CRM */}
          <Route path="/crm" element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
            <Route index                element={<DealsKanban />} />
            <Route path="deals"         element={<DealsKanban />} />
            <Route path="leads"         element={<SalesPipeline />} />
            <Route path="clients"       element={<ClientsList />} />
            <Route path="quotes"        element={<QuotesList />} />
            <Route path="indirect-sales" element={<IndirectSales />} />
            <Route path="orders"        element={<InvoicesOrders />} />
            <Route path="invoices"      element={<InvoicesOrders />} />
            <Route path="settings"      element={<PipelineSettings />} />
            <Route path="activity"      element={<CRMActivityFeed />} />
          </Route>

          {/* Ventas – acceso directo SALES */}
          <Route path="/sales/metricas" element={<ProtectedRoute><SalesMetrics /></ProtectedRoute>} />
          <Route path="/sales/datos"    element={<ProtectedRoute><HRDashboard defaultTab="datos" onlyTabs={['datos']} /></ProtectedRoute>} />

          {/* Métricas por rol */}
          <Route path="/ops/metricas"  element={<ProtectedRoute><OpsMetrics /></ProtectedRoute>} />
          <Route path="/tech/metricas" element={<ProtectedRoute><TechMetrics /></ProtectedRoute>} />

          {/* Olea Academy */}
          <Route path="/academy"             element={<ProtectedRoute noShell><AcademyHome /></ProtectedRoute>} />
          <Route path="/academy/course/:id"  element={<ProtectedRoute noShell><CoursePlayer /></ProtectedRoute>} />

          {/* Feedback público */}
          <Route path="/feedback/:type/:otId" element={<FeedbackForm />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
