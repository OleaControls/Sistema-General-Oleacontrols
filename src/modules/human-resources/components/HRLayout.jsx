import React from 'react';
import { Outlet } from 'react-router-dom';

// La navegación de RH ahora vive en la barra principal (AppShell), como un grupo
// "Recursos Humanos". Este layout ya no dibuja su propia barra; solo renderiza el
// contenido de cada sección para evitar tener dos barras de navegación.
export default function HRLayout() {
  return (
    <div className="w-full pb-20">
      <Outlet />
    </div>
  );
}
