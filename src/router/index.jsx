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
import TechGamification from '@/modules/ots/views/TechGamification';
import OTValidation from '@/modules/ots/views/OTValidation';
import OTCatalogs from '@/modules/ots/views/OTCatalogs';
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
import RewardManager from '@/modules/human-resources/views/RewardManager';
import SurveyManager from '@/modules/human-resources/views/SurveyManager';
import CRMLayout from '@/modules/crm/components/CRMLayout';
import SalesPipeline from '@/modules/crm/views/SalesPipeline';
import ClientsList from '@/modules/crm/views/ClientsList';
import QuotesList from '@/modules/crm/views/QuotesList';
import InvoicesOrders from '@/modules/crm/views/InvoicesOrders';
import AcademyHome from '@/modules/lms/views/AcademyHome';

// Selector de Dashboard por Cargo
const DashboardSelector = () => {
  const { user } = useAuth();
  
  switch(user?.role) {
    case 'ADMIN':
      return <SupervisorOTs />;
    case 'OPERATIONS':
      return <SupervisorOTs />;
    case 'TECHNICIAN':
      return <TechnicianOTs />;
    case 'HR':
      return <HRDashboard />;
    case 'SALES':
      return <SalesPipeline />;
    default:
      return <TechnicianOTs />;
  }
};

const ProtectedRoute = ({ children, noShell = false }) => {
    const { user, loading } = useAuth();
    
    if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;
    
    if (noShell) return children;
    return <AppShell>{children}</AppShell>;
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
        <Route path="/ots" element={<ProtectedRoute><TechnicianOTs /></ProtectedRoute>} />
        <Route path="/ots/leaderboard" element={<ProtectedRoute><TechGamification /></ProtectedRoute>} />
        <Route path="/ots/:id" element={<ProtectedRoute><OTDetail /></ProtectedRoute>} />
        <Route path="/ops/ots/validate/:id" element={<ProtectedRoute><OTValidation /></ProtectedRoute>} />
        <Route path="/ops/ots/catalogs" element={<ProtectedRoute><OTCatalogs /></ProtectedRoute>} />
        <Route path="/ops/ots/delivery-act/:id" element={<ProtectedRoute><DeliveryAct /></ProtectedRoute>} />
        
        {/* Módulo RH */}
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
          <Route path="rewards" element={<RewardManager />} />
          <Route path="assets" element={<Assets />} />
          <Route path="academy-admin" element={<AcademyManager />} />
          <Route path="surveys" element={<SurveyManager />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<HRReports />} />
          <Route path="settings" element={<HRSettings />} />
        </Route>

        {/* Módulo CRM */}
        <Route path="/crm" element={<ProtectedRoute><CRMLayout /></ProtectedRoute>}>
          <Route index element={<SalesPipeline />} />
          <Route path="leads" element={<SalesPipeline />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="quotes" element={<QuotesList />} />
          <Route path="orders" element={<InvoicesOrders />} />
          <Route path="invoices" element={<InvoicesOrders />} />
        </Route>

        {/* Olea Academy */}
        <Route path="/academy" element={<ProtectedRoute noShell><AcademyHome /></ProtectedRoute>} />
        <Route path="/academy/course/:id" element={<ProtectedRoute noShell><CoursePlayer /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
