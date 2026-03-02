import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '@/store/AuthContext';
import { 
  ShieldCheck, 
  User, 
  HardHat, 
  GraduationCap, 
  ArrowRight, 
  LayoutGrid, 
  Users, 
  Briefcase, 
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const { login, loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState('OPERATIONS');
  const [step, setStep] = useState(1); 
  const [isLogginIn, setIsLoggingIn] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(null);
  
  // Credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handlePortalSelect = (p) => {
    setPortal(p);
    if (window.innerWidth < 1024) {
      setStep(2);
    }
  };

  const handleCredentialLogin = (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    setTimeout(() => {
        const success = loginWithCredentials(email, password, portal);
        if (success) {
            setWelcomeMsg({
                text: `Acceso concedido. Cargando tu perfil personalizado...`,
                color: 'text-primary'
            });
            setTimeout(() => {
                if (portal === 'ACADEMY') {
                    navigate('/academy');
                } else if (portal === 'COLLABORATOR') {
                    navigate('/profile');
                } else {
                    navigate('/');
                }
            }, 1000);
        } else {
            setIsLoggingIn(false);
            setError('Credenciales inválidas. Por favor verifique su correo y contraseña.');
        }
    }, 800);
  };

  const handleQuickLogin = (opt) => {
    setIsLoggingIn(true);
    
    const messages = {
      ADMIN: `Bienvenido, Director. El panorama global de Olea te espera.`,
      HR: `Hola, Recursos Humanos. Listos para impulsar el talento hoy?`,
      OPERATIONS: `Supervisor, la cuadrilla técnica está lista para sus órdenes.`,
      TECHNICIAN: `¡A la carga! Tus OTs del día ya están sincronizadas.`,
      SALES: `Ventas, hoy es un gran día para cerrar nuevos contratos.`,
      COLLABORATOR: `Hola, Colaborador. Gestiona tus solicitudes de RH aquí.`
    };

    setWelcomeMsg({
      text: portal === 'ACADEMY' ? `Entrando a Olea Academy... ¡Buen aprendizaje!` : messages[opt.role],
      color: opt.color
    });

    setTimeout(() => {
      login(opt.role);
      if (portal === 'ACADEMY') {
        navigate('/academy');
      } else if (portal === 'COLLABORATOR' || opt.role === ROLES.COLLABORATOR) {
        navigate('/profile');
      } else {
        navigate('/');
      }
    }, 1200);
  };

  const quickOptions = [
    { role: ROLES.ADMIN, icon: ShieldCheck, color: 'text-red-600', label: 'Admin' },
    { role: ROLES.HR, icon: Users, color: 'text-purple-600', label: 'RH' },
    { role: ROLES.OPS, icon: HardHat, color: 'text-blue-600', label: 'Ops' },
    { role: ROLES.TECH, icon: User, color: 'text-emerald-600', label: 'Tech' },
    { role: ROLES.SALES, icon: Briefcase, color: 'text-orange-600', label: 'Ventas' },
    { role: ROLES.COLLABORATOR, icon: User, color: 'text-gray-600', label: 'Colab' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-5 gap-0 bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-gray-100">
        
        {/* Left Side: Portal Selector */}
        <div className={cn(
          "lg:col-span-2 p-12 bg-gray-50 flex flex-col justify-between border-r border-gray-100 transition-all duration-500",
          step === 2 ? "hidden lg:flex" : "flex"
        )}>
          <div className="space-y-2">
            <div className="bg-primary text-white w-fit p-2 rounded-xl mb-4 shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">OLEA CONTROLS</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Platform 2026</p>
          </div>

          <div className="space-y-6 my-12">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Selecciona Portal</p>
            <div className="grid gap-4">
              <button 
                onClick={() => handlePortalSelect('OPERATIONS')}
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
                onClick={() => handlePortalSelect('COLLABORATOR')}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group text-left",
                  portal === 'COLLABORATOR' ? "border-primary bg-white shadow-xl ring-4 ring-primary/5" : "border-transparent bg-gray-100/50 hover:bg-white"
                )}
              >
                <div className={cn("p-3 rounded-2xl transition-colors", portal === 'COLLABORATOR' ? "bg-primary text-white" : "bg-gray-200 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary")}>
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Portal Colaborador</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Mi Perfil RH y Solicitudes</p>
                </div>
              </button>

              <button 
                onClick={() => handlePortalSelect('ACADEMY')}
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

        {/* Right Side: Login Form */}
        <div className={cn(
          "lg:col-span-3 p-12 flex flex-col h-full bg-white transition-all duration-500",
          step === 1 ? "hidden lg:flex" : "flex"
        )}>
          <div className="space-y-2 mb-10">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)}
                className="lg:hidden text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-1"
              >
                <ArrowRight className="h-3 w-3 rotate-180" /> Volver
              </button>
            )}
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Acceso Individual</h2>
            <p className="text-gray-500 font-medium">Ingresa tus credenciales de Capital Humano.</p>
          </div>

          <form onSubmit={handleCredentialLogin} className="space-y-5">
            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Correo Corporativo</label>
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="email" 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                        placeholder="ejemplo@oleacontrols.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-[1.5rem] outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLogginIn}
                className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
                Entrar a la Plataforma <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="h-px bg-gray-100 flex-1" /> O Entrar como invitado (QA) <span className="h-px bg-gray-100 flex-1" />
            </p>
            <div className="grid grid-cols-3 gap-2">
                {quickOptions.map(opt => (
                    <button
                        key={opt.role}
                        onClick={() => handleQuickLogin(opt)}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                    >
                        <opt.icon className={cn("h-5 w-5 mb-1 transition-transform group-hover:scale-110", opt.color)} />
                        <span className="text-[9px] font-black text-gray-400 uppercase">{opt.label}</span>
                    </button>
                ))}
            </div>
          </div>

          {/* Welcome Overlay */}
          {isLogginIn && welcomeMsg && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
                <div className="relative">
                  <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className={cn("text-xl font-black px-8 max-w-sm", welcomeMsg?.color)}>{welcomeMsg?.text}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Iniciando sesión segura...</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-auto pt-8 flex items-center justify-between border-t border-gray-50">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Olea Controls &copy; 2026</span>
            <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest">Soporte IT</button>
          </div>
        </div>
      </div>
    </div>
  );
}
