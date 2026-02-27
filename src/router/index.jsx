import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BarChart4 } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import AppShell from '@/components/layout/AppShell';
import Login from '@/modules/Login';
import ExpensesList from '@/modules/expenses/views/ExpensesList';
import ApprovalsList from '@/modules/expenses/views/ApprovalsList';
import OperationsExpenses from '@/modules/expenses/views/OperationsExpenses';
import ExpensesDashboard from '@/modules/expenses/views/ExpensesDashboard';
import OTDetail from '@/modules/ots/OTDetail';
import SupervisorOTs from '@/modules/ots/views/SupervisorOTs';
import TechnicianOTs from '@/modules/ots/views/TechnicianOTs';
import OTValidation from '@/modules/ots/views/OTValidation';
import DeliveryAct from '@/modules/ots/views/DeliveryAct';
import CourseCatalog from '@/modules/lms/views/CourseCatalog';
import CoursePlayer from '@/modules/lms/views/CoursePlayer';
import HRLayout from '@/modules/human-resources/components/HRLayout';
import HRDashboard from '@/modules/human-resources/views/HRDashboard';
import TimeOff from '@/modules/human-resources/views/TimeOff';
import HRDocuments from '@/modules/human-resources/views/HRDocuments';
import EmployeeDirectory from '@/modules/human-resources/views/EmployeeDirectory';
import EmployeeProfile from '@/modules/human-resources/views/EmployeeProfile';
import Attendance from '@/modules/human-resources/views/Attendance';
import OrgChart from '@/modules/human-resources/views/OrgChart';
import Recruitment from '@/modules/human-resources/views/Recruitment';
import Performance from '@/modules/human-resources/views/Performance';
import Assets from '@/modules/human-resources/views/Assets';
import Announcements from '@/modules/human-resources/views/Announcements';
import HRReports from '@/modules/human-resources/views/HRReports';
import HRSettings from '@/modules/human-resources/views/HRSettings';
import AcademyManager from '@/modules/human-resources/views/AcademyManager';
import SurveyManager from '@/modules/human-resources/views/SurveyManager';
import CRMLayout from '@/modules/crm/components/CRMLayout';
import SalesPipeline from '@/modules/crm/views/SalesPipeline';
import ClientsList from '@/modules/crm/views/ClientsList';
import QuotesList from '@/modules/crm/views/QuotesList';
import InvoicesOrders from '@/modules/crm/views/InvoicesOrders';
import AcademyHome from '@/modules/lms/views/AcademyHome';

// Vistas Temporales
const Dashboard = () => <div className="space-y-6 animate-in fade-in duration-500">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="text-gray-500 text-sm font-medium">OTs Pendientes</h3>
      <p className="text-3xl font-bold mt-2 text-gray-900">12</p>
    </div>
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="text-gray-500 text-sm font-medium">Gastos por Aprobar</h3>
      <p className="text-3xl font-bold mt-2 text-gray-900">$4,250.00</p>
    </div>
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="text-gray-500 text-sm font-medium">Próximas Capacitaciones</h3>
      <p className="text-3xl font-bold mt-2 text-gray-900">3</p>
    </div>
  </div>
  <div className="bg-white p-6 rounded-xl border shadow-sm h-64 flex flex-col items-center justify-center text-gray-400 border-dashed gap-4">
    <BarChart4 className="h-12 w-12 opacity-20" />
    <p className="italic font-medium text-sm">Resumen de Actividad Global (BI Integrado)</p>
  </div>
</div>;

// Selector de Dashboard por Cargo
const DashboardSelector = () => {
  const { user } = useAuth();
  
  switch(user?.role) {
    case 'ADMIN':
      return <Dashboard />; // Dashboard Global
    case 'OPERATIONS':
      return <SupervisorOTs />; // Portal de Supervisión de OTs
    case 'TECHNICIAN':
      return <TechnicianOTs />; // Portal de Trabajos de Campo
    case 'HR':
      return <HRDashboard />; // Portal de Gestión de Talento
    case 'SALES':
      return <SalesPipeline />; // Portal de Ventas / CRM
    default:
      return <Dashboard />;
  }
};

const ProtectedRoute = ({ children, noShell = false }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    
    if (noShell) return children;
    return <AppShell>{children}</AppShell>;
  };
    const OTViewSelector = () => {
    const { user } = useAuth();
    if (user?.role === 'TECHNICIAN') return <TechnicianOTs />;
    return <SupervisorOTs />;
  };
  
  export default function AppRouter() {
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><DashboardSelector /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ExpensesList /></ProtectedRoute>} />
        <Route path="/expenses/dashboard" element={<ProtectedRoute><ExpensesDashboard /></ProtectedRoute>} />
        <Route path="/ops/approvals/expenses" element={<ProtectedRoute><ApprovalsList /></ProtectedRoute>} />
        <Route path="/ops/expenses/control" element={<ProtectedRoute><OperationsExpenses /></ProtectedRoute>} />
        <Route path="/ots" element={<ProtectedRoute><OTViewSelector /></ProtectedRoute>} />
        <Route path="/ots/:id" element={<ProtectedRoute><OTDetail /></ProtectedRoute>} />
        <Route path="/ops/ots/validate/:id" element={<ProtectedRoute><OTValidation /></ProtectedRoute>} />
        <Route path="/ops/ots/delivery-act/:id" element={<ProtectedRoute><DeliveryAct /></ProtectedRoute>} />
        <Route path="/lms" element={<ProtectedRoute><CourseCatalog /></ProtectedRoute>} />
        <Route path="/lms/course/:id" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
        
        {/* Módulo RH - Rutas Anidadas */}
        <Route path="/hr" element={<ProtectedRoute><HRLayout /></ProtectedRoute>}>
          <Route index element={<HRDashboard />} />
          <Route path="directory" element={<EmployeeDirectory />} />
          <Route path="employee/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="time-off" element={<TimeOff />} />
          <Route path="documents" element={<HRDocuments />} />
          <Route path="org-chart" element={<OrgChart />} />
          <Route path="recruitment" element={<Recruitment />} />
          <Route path="performance" element={<Performance />} />
          <Route path="assets" element={<Assets />} />
          <Route path="academy-admin" element={<AcademyManager />} />
          <Route path="surveys" element={<SurveyManager />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<HRReports />} />
          <Route path="settings" element={<HRSettings />} />
          <Route path="*" element={<div className="p-10 text-center text-gray-400 font-bold italic">Sección en construcción para MVP</div>} />
        </Route>

        {/* Módulo CRM - Rutas Anidadas */}
        <Route path="/crm" element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
          <Route index element={<SalesPipeline />} />
          <Route path="leads" element={<SalesPipeline />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="quotes" element={<QuotesList />} />
          <Route path="orders" element={<InvoicesOrders />} />
          <Route path="invoices" element={<InvoicesOrders />} />
          <Route path="*" element={<div className="p-10 text-center text-gray-400 font-bold italic">Sección CRM en construcción</div>} />
        </Route>

        {/* Rama Olea Academy (Independiente) */}
        <Route path="/academy" element={<ProtectedRoute noShell><AcademyHome /></ProtectedRoute>} />
        <Route path="/academy/course/:id" element={<ProtectedRoute noShell><CoursePlayer /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
