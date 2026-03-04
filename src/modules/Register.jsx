import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  Building,
  MapPin,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

export default function Register() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    department: 'Nuevo Ingreso',
    position: 'Colaborador',
    role: 'COLLABORATOR'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    
    try {
      await hrService.saveEmployee(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Error in registration:', error);
      setIsRegistering(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl text-center space-y-6">
          <div className="bg-emerald-100 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">¡Registro Exitoso!</h2>
          <p className="text-gray-500 font-medium">Tu perfil ha sido creado en Olea Controls. Ahora puedes iniciar sesión con tu correo y contraseña.</p>
          <div className="pt-4">
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[progress_3s_ease-in-out]" style={{ width: '100%' }} />
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase mt-4">Redirigiendo al login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-gray-100">
        
        {/* Left Side: Info */}
        <div className="p-12 bg-gray-900 text-white flex flex-col justify-between hidden lg:flex">
          <div className="space-y-4">
            <div className="bg-primary text-white w-fit p-3 rounded-2xl shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Únete a <br />Olea Controls</h1>
            <p className="text-gray-400 font-medium text-lg">Crea tu cuenta corporativa para acceder a la plataforma de gestión más avanzada.</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">Acceso Seguro</p>
                <p className="text-xs text-gray-500 font-medium">Encriptación de grado industrial.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm">Perfil RH</p>
                <p className="text-xs text-gray-500 font-medium">Gestiona tu expediente desde el primer día.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Olea Controls &copy; 2026</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 flex flex-col">
          <div className="mb-8">
            <Link to="/login" className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-6 hover:translate-x-[-4px] transition-transform w-fit">
              <ArrowLeft className="h-3 w-3" /> Volver al Inicio
            </Link>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Registro de Colaborador</h2>
            <p className="text-gray-500 font-medium text-sm">Ingresa tus datos para darte de alta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    required
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-xs transition-all"
                    placeholder="Juan Pérez"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    required
                    type="email" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-xs transition-all"
                    placeholder="juan@oleacontrols.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    required
                    type={showPassword ? "text" : "password"} 
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-xs transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Teléfono</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="tel" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-xs transition-all"
                    placeholder="+52 ..."
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ubicación / Ciudad</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-xs transition-all"
                    placeholder="Ej. Querétaro, MX"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              {isRegistering ? 'Procesando...' : 'Completar Registro'} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-gray-400">
            ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:underline">Inicia Sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
