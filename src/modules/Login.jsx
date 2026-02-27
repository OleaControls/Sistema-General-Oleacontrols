import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '@/store/AuthContext';
import { ShieldCheck, User, HardHat, GraduationCap, ArrowRight, LayoutGrid, Users, Briefcase, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState('OPERATIONS');
  const [isLogginIn, setIsLoggingIn] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(null);

  const handleLogin = (opt) => {
    setIsLoggingIn(true);
    
    // Generar mensaje personalizado
    const messages = {
      ADMIN: `Bienvenido, Director. El panorama global de Olea te espera.`,
      HR: `Hola, Recursos Humanos. Listos para impulsar el talento hoy?`,
      OPERATIONS: `Supervisor, la cuadrilla técnica está lista para sus órdenes.`,
      TECHNICIAN: `¡A la carga! Tus OTs del día ya están sincronizadas.`,
      SALES: `Ventas, hoy es un gran día para cerrar nuevos contratos.`
    };

    setWelcomeMsg({
      text: portal === 'ACADEMY' ? `Entrando a Olea Academy... ¡Buen aprendizaje!` : messages[opt.role],
      color: opt.color
    });

    // Simular un pequeño delay de "Entrando..." para efecto visual premium
    setTimeout(() => {
      login(opt.role);
      if (portal === 'ACADEMY') {
        navigate('/academy');
      } else {
        navigate('/');
      }
    }, 1200);
  };

  const loginOptions = [
    { 
      role: ROLES.ADMIN, 
      label: 'Dirección General', 
      desc: 'Acceso total a finanzas, BI y supervisión global.',
      icon: ShieldCheck, 
      color: 'text-red-600',
      bg: 'hover:border-red-200 hover:bg-red-50/30'
    },
    { 
      role: ROLES.HR, 
      label: 'Recursos Humanos', 
      desc: 'Gestión de talento, expedientes y cultura.',
      icon: Users, 
      color: 'text-purple-600',
      bg: 'hover:border-purple-200 hover:bg-purple-50/30'
    },
    { 
      role: ROLES.OPS, 
      label: 'Operaciones / Supervisor', 
      desc: 'Control de cuadrillas y validación de OTs.',
      icon: HardHat, 
      color: 'text-blue-600',
      bg: 'hover:border-blue-200 hover:bg-blue-50/30'
    },
    { 
      role: ROLES.TECH, 
      label: 'Técnico de Campo', 
      desc: 'Ejecución de servicios y reporte de gastos.',
      icon: User, 
      color: 'text-emerald-600',
      bg: 'hover:border-emerald-200 hover:bg-emerald-50/30'
    },
    { 
      role: ROLES.SALES, 
      label: 'Ventas y CRM', 
      desc: 'Pipeline comercial y facturación.',
      icon: Briefcase, 
      color: 'text-orange-600',
      bg: 'hover:border-orange-200 hover:bg-orange-50/30'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-5 gap-0 bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-gray-100">
        
        {/* Left Side: Portal Selector (2 cols) */}
        <div className="lg:col-span-2 p-12 bg-gray-50 flex flex-col justify-between border-r border-gray-100">
          <div className="space-y-2">
            <div className="bg-primary text-white w-fit p-2 rounded-xl mb-4 shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">OLEA CONTROLS</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Platform 2026</p>
          </div>

          <div className="space-y-6 my-12">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Modo de Acceso</p>
            <div className="grid gap-4">
              <button 
                onClick={() => setPortal('OPERATIONS')}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group text-left",
                  portal === 'OPERATIONS' ? "border-primary bg-white shadow-xl ring-4 ring-primary/5" : "border-transparent bg-gray-100/50 hover:bg-white"
                )}
              >
                <div className={cn("p-3 rounded-2xl transition-colors", portal === 'OPERATIONS' ? "bg-primary text-white" : "bg-gray-200 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary")}>
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Portal Operativo</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Gestión de Negocio</p>
                </div>
              </button>

              <button 
                onClick={() => setPortal('ACADEMY')}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group text-left",
                  portal === 'ACADEMY' ? "border-primary bg-white shadow-xl ring-4 ring-primary/5" : "border-transparent bg-gray-100/50 hover:bg-white"
                )}
              >
                <div className={cn("p-3 rounded-2xl transition-colors", portal === 'ACADEMY' ? "bg-primary text-white" : "bg-gray-200 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary")}>
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Olea Academy</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Centro de Aprendizaje</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Enterprise Edition</p>
            <p className="text-[10px] font-medium text-gray-300 tracking-tighter">SISTEMA GENERAL DE CONTROL DE INSTALACIONES</p>
          </div>
        </div>

        {/* Right Side: Identity Selector (3 cols) */}
        <div className="lg:col-span-3 p-12 flex flex-col h-full bg-white">
          <div className="space-y-2 mb-10">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Bienvenido.</h2>
            <p className="text-gray-500 font-medium">Selecciona tu departamento para ingresar a {portal === 'ACADEMY' ? 'la Academia' : 'la Plataforma'}.</p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
            {loginOptions.map((opt) => (
              <button
                key={opt.role}
                disabled={isLogginIn}
                onClick={() => handleLogin(opt)}
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-[2rem] bg-white border border-gray-100 transition-all group text-left",
                  isLogginIn ? "opacity-50 cursor-wait" : opt.bg
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn("p-4 rounded-2xl bg-gray-50 group-hover:bg-white transition-colors shadow-sm", opt.color)}>
                    <opt.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 leading-none">{opt.label}</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1.5">{opt.desc}</p>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </button>
            ))}
          </div>

          {/* Welcome Overlay */}
          {isLogginIn && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
                <div className="relative">
                  <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className={cn("text-xl font-black", welcomeMsg?.color)}>{welcomeMsg?.text}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Iniciando sesión segura...</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-8 flex items-center justify-between border-t border-gray-50">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Olea Controls &copy; 2026</span>
            <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Soporte Técnico IT</button>
          </div>
        </div>
      </div>
    </div>
  );
}
