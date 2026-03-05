import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '@/store/AuthContext';
import { 
  ShieldCheck, 
  User, 
  ArrowRight, 
  LayoutGrid, 
  Users, 
  Briefcase, 
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState('SUPERVISOR');
  const [step, setStep] = useState(1); 
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);

    try {
        const success = await loginWithCredentials(email, password, portal);
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
    } catch (err) {
        setIsLoggingIn(false);
        setError('Error de conexión al intentar iniciar sesión.');
    }
  };

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
          <div className="space-y-10 flex flex-col items-center text-center">
            <div className="transform hover:scale-110 transition-transform duration-700 ease-in-out">
              <img src="/img/Insignia.png" className="h-48 w-48 object-contain" alt="Olea Insignia" />
            </div>
            <div className="space-y-3 flex flex-col items-center">
              <img src="/img/OLEACONTROLS.png" className="h-12 object-contain" alt="Olea Controls" />
              <p className="text-[13px] font-black text-gray-400 uppercase tracking-[0.6em]">Global Platform 2026</p>
            </div>
          </div>

          <div className="space-y-6 my-12">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Selecciona Portal de Acceso</p>
            <div className="grid gap-4">
              <button 
                onClick={() => handlePortalSelect('SUPERVISOR')}
                className={cn(
                  "flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group text-left",
                  portal === 'SUPERVISOR' ? "border-primary bg-white shadow-xl ring-4 ring-primary/5" : "border-transparent bg-gray-100/50 hover:bg-white"
                )}
              >
                <div className={cn("p-3 rounded-2xl transition-colors", portal === 'SUPERVISOR' ? "bg-primary text-white" : "bg-gray-200 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary")}>
                  <LayoutGrid className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Portal de Operaciones</p>
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
          "lg:col-span-3 p-12 lg:p-20 flex flex-col h-full bg-white transition-all duration-500",
          step === 1 ? "hidden lg:flex" : "flex"
        )}>
          {/* Back button for mobile */}
          {step === 2 && (
            <button 
              onClick={() => setStep(1)}
              className="lg:hidden text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2 hover:translate-x-[-4px] transition-transform"
            >
              <ArrowRight className="h-4 w-4 rotate-180" /> Volver a Portales
            </button>
          )}

          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
            <div className="space-y-3 mb-12">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-12 bg-primary rounded-full" />
                <span className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">Seguridad Biométrica</span>
              </div>
              <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-none">Acceso Seguro</h2>
              <p className="text-gray-400 font-medium text-lg">Bienvenido de nuevo. Por favor, identifícate.</p>
            </div>

            <form onSubmit={handleCredentialLogin} className="space-y-8">
              {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-2xl flex items-center gap-4 text-red-700 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="bg-red-100 p-2 rounded-xl">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      {error}
                  </div>
              )}

              <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em] ml-2">ID de Usuario o Correo</label>
                  <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-xl group-focus-within:bg-primary/10 group-focus-within:text-primary transition-all duration-300 text-gray-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input 
                          type="email" 
                          required
                          className="w-full pl-16 pr-6 py-5 bg-gray-50/50 border-2 border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 font-bold text-gray-700 transition-all shadow-sm"
                          placeholder="usuario@oleacontrols.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                      />
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-[0.2em]">Contraseña Encriptada</label>
                    <button type="button" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">¿Olvidaste la clave?</button>
                  </div>
                  <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-xl group-focus-within:bg-primary/10 group-focus-within:text-primary transition-all duration-300 text-gray-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input 
                          type={showPassword ? "text" : "password"} 
                          required
                          className="w-full pl-16 pr-16 py-5 bg-gray-50/50 border-2 border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 font-bold text-gray-700 transition-all shadow-sm"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                  </div>
              </div>

              <div className="flex items-center gap-3 ml-2">
                <input type="checkbox" className="w-5 h-5 rounded-lg border-2 border-gray-200 text-primary focus:ring-primary" id="remember" />
                <label htmlFor="remember" className="text-sm font-bold text-gray-500 cursor-pointer select-none">Mantener sesión activa</label>
              </div>

              <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-primary text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-primary/30 hover:bg-primary/90 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4 group disabled:opacity-50"
              >
                  {isLoggingIn ? (
                    <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Validar Credenciales
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
              </button>
            </form>
          </div>

          {/* Welcome Overlay */}
          {isLoggingIn && welcomeMsg && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
                <div className="relative">
                  <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className={cn("text-xl font-black px-8 max-w-sm text-primary")}>{welcomeMsg?.text}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Seguridad verificada • Cargando Entorno</p>
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
