import React, { useEffect } from 'react';
import { AuthProvider } from './store/AuthContext';
import { TenantProvider } from './store/TenantContext';
import { socket } from './services/realtime';
import { iniciarOutbox } from './lib/outbox';
import AppRouter from './router';
import './App.css';

function App() {
  // Prueba de conexión real-time: confirma en consola que la app alcanza el
  // servidor Socket.IO de la oficina. Temporal — se quita cuando ya haya
  // eventos reales (OT actualizada, GPS de técnicos, etc.).
  // La cola de pendientes arranca con la app: reintenta al volver la red, al
  // volver a la pestaña y cada minuto. Va aquí y no en una vista porque el
  // técnico puede cerrar la pantalla donde capturó y la cola debe seguir viva.
  useEffect(() => { iniciarOutbox(); }, []);

  useEffect(() => {
    const handleConnect = () => {
      console.log('Servidor real-time conectado');
    };

    socket.on('connect', handleConnect);

    // Si el socket ya estaba conectado antes de montar App (el módulo se
    // conecta al importarse), el evento 'connect' no vuelve a dispararse.
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
    };
  }, []);

  return (
    <AuthProvider>
      <TenantProvider>
        <AppRouter />
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
