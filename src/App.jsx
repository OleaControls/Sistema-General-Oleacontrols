import React from 'react';
import { AuthProvider } from './store/AuthContext';
import { TenantProvider } from './store/TenantContext';
import AppRouter from './router';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppRouter />
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
