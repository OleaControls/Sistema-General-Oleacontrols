import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList, MapPin, Clock, ArrowRight, CheckCircle2,
  Store, Calendar, AlertTriangle, Trophy, User, Zap,
  Circle, Filter, RefreshCw, ChevronRight, Star, Navigation, Navigation2, WifiOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { otService } from '@/api/otService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

// ── Leaflet icons ──────────────────────────────────────────────────────────────
const otIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const techIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 400); }, [map]);
  return null;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  PENDING:     { label: 'Pendiente',    short: 'PEND',    stripe: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
  UNASSIGNED:  { label: 'Sin Asignar',  short: 'S/A',     stripe: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500 border-gray-200',        dot: 'bg-gray-300' },
  ASSIGNED:    { label: 'Asignada',     short: 'ASIG',    stripe: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600 border-blue-200',         dot: 'bg-blue-500' },
  ACCEPTED:    { label: 'Orden Aceptada', short: 'ACEP',   stripe: 'bg-sky-500',    badge: 'bg-sky-50 text-sky-700 border-sky-200',            dot: 'bg-sky-500' },
  IN_PROGRESS: { label: 'En Ejecución', short: 'ACTIVA',  stripe: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-600 border-amber-200',      dot: 'bg-amber-500', pulse: true },
  COMPLETED:   { label: 'Completada',   short: 'COMP',    stripe: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',dot: 'bg-emerald-500' },
  VALIDATED:   { label: 'Validada',     short: 'VAL',     stripe: 'bg-green-600',  badge: 'bg-green-50 text-green-700 border-green-200',      dot: 'bg-green-600' },
  CANCELLED:   { label: 'Cancelada',    short: 'CANC',    stripe: 'bg-red-400',    badge: 'bg-red-50 text-red-500 border-red-200',            dot: 'bg-red-400' },
};

const PRIORITY = {
  HIGH:   { label: 'Alta',   color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-200' },
  MEDIUM: { label: 'Media',  color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  LOW:    { label: 'Baja',   color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
  URGENT: { label: 'Urgente',color: 'text-red-600',   bg: 'bg-red-100',  border: 'border-red-300' },
};

const FILTERS = [
  { id: 'all',      label: 'Todas' },
  { id: 'active',   label: 'Activas',    statuses: ['PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS'] },
  { id: 'done',     label: 'Completadas',statuses: ['COMPLETED','VALIDATED'] },
];

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
      <div className="h-1 bg-gray-200 w-full" />
      <div className="p-5">
        <div className="flex justify-between mb-4">
          <div className="h-3 bg-gray-100 rounded-full w-24" />
          <div className="h-5 bg-gray-100 rounded-full w-16" />
        </div>
        <div className="h-5 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-gray-50 rounded-xl" />
          <div className="h-12 bg-gray-50 rounded-xl" />
          <div className="h-12 bg-gray-50 rounded-xl" />
          <div className="h-12 bg-gray-50 rounded-xl" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between">
          <div className="h-6 bg-gray-100 rounded-full w-24" />
          <div className="h-6 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

// ── OT Card ────────────────────────────────────────────────────────────────────
function OTCard({ ot, userId, index, navigate }) {
  const s = STATUS[ot.status] || STATUS.PENDING;
  const p = PRIORITY[ot.priority] || PRIORITY.MEDIUM;
  const isLead    = ot.leadTechId === userId;
  const techName  = ot.leadTechName || ot.technician?.name || null;
  const supportCount = (ot.supportTechs?.length || 0) + (ot.assistantTechs?.length || 0);
  const isDone    = ot.status === 'COMPLETED' || ot.status === 'VALIDATED';

  return (
    <div
      onClick={() => navigate(`/ots/${ot.id}`)}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Status stripe — top color bar */}
      <div className={cn('h-1 w-full', s.stripe, s.pulse && 'animate-pulse')} />

      <div className="p-5">
        {/* Top row: OT number + priority + status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
              {ot.id}
            </span>
            {ot.priority === 'HIGH' || ot.priority === 'URGENT' ? (
              <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border', p.color, p.bg, p.border)}>
                <AlertTriangle className="h-2.5 w-2.5" />
                {p.label}
              </span>
            ) : null}
          </div>
          <span className={cn(
            'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border',
            s.badge
          )}>
            {s.short}
          </span>
        </div>

        {/* Title */}
        <h3 className={cn(
          'text-base font-black leading-snug mb-1 group-hover:text-primary transition-colors',
          isDone ? 'text-gray-400 line-through-[0.5px]' : 'text-gray-900'
        )}>
          {ot.title}
        </h3>

        {/* Rol badge */}
        <div className="mb-4">
          <span className={cn(
            'inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md',
            isLead ? 'bg-primary/8 text-primary' : 'bg-amber-50 text-amber-600'
          )}>
            {isLead ? <Star className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
            {isLead ? 'Técnico Líder' : 'Técnico de Apoyo'}
          </span>
        </div>

        {/* Info grid — 2 cols */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Establecimiento */}
          <div className="col-span-2 flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <Store className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Establecimiento</p>
              <p className="text-xs font-bold text-gray-700 truncate mt-0.5">{ot.storeName || ot.client || '—'}</p>
            </div>
          </div>

          {/* Hora */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Hora</p>
              <p className="text-xs font-bold text-gray-700 mt-0.5">{ot.arrivalTime || '—'}</p>
            </div>
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Fecha</p>
              <p className="text-xs font-bold text-gray-700 mt-0.5">
                {ot.scheduledDate
                  ? new Date(ot.scheduledDate.split('T')[0] + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Técnico líder */}
          <div className="col-span-2 flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Técnico Líder</p>
              <p className="text-xs font-bold text-gray-700 truncate mt-0.5">{techName || 'Sin asignar'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          {/* Team avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <div className="h-7 w-7 rounded-full border-2 border-white bg-primary/90 flex items-center justify-center text-[8px] font-black text-white shadow-sm">
                {(techName || 'T').charAt(0).toUpperCase()}
              </div>
              {supportCount > 0 && (
                <div className="h-7 w-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-500 shadow-sm">
                  +{supportCount}
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold text-gray-400">
              {supportCount > 0 ? `${1 + supportCount} técnicos` : 'Solo líder'}
            </span>
          </div>

          {/* CTA */}
          <span className={cn(
            'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all',
            isDone
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-primary bg-primary/8 group-hover:bg-primary group-hover:text-white'
          )}>
            {isDone ? 'Ver detalle' : 'Gestionar'}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TechnicianOTs() {
  const { user } = useAuth();
  const [ots, setOts] = useState([]);
  const [techLocation, setTechLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [filter, setFilter] = useState('all');
  // 'idle' | 'requesting' | 'active' | 'denied'
  const [locationStatus, setLocationStatus] = useState('idle');
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(null);
  const navigate = useNavigate();

  // ── Verificar permiso al montar ────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') setLocationStatus('active');
      else if (result.state === 'denied') setLocationStatus('denied');
      result.addEventListener('change', () => {
        if (result.state === 'granted') setLocationStatus('active');
        else if (result.state === 'denied') setLocationStatus('denied');
        else setLocationStatus('idle');
      });
    });
  }, []);

  // ── Enviar ubicación al servidor ───────────────────────────────────────────
  const sendLocationToServer = useCallback(async (lat, lng) => {
    const now = Date.now();
    if (lastSentRef.current && now - lastSentRef.current < 290000) return; // throttle 5 min
    try {
      await otService.updateTechnicianLocation(user.id, user.name, lat, lng);
      lastSentRef.current = now;
      setTechLocation({ lat, lng, lastUpdate: new Date().toISOString() });
    } catch (err) {
      console.error('[ubicación] Error al enviar:', err);
    }
  }, [user]);

  // ── Activar ubicación (botón) ──────────────────────────────────────────────
  const handleEnableLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationStatus('active');
        const { latitude: lat, longitude: lng } = pos.coords;
        setTechLocation({ lat, lng, lastUpdate: new Date().toISOString() });
        // Enviar inmediatamente ignorando el throttle
        lastSentRef.current = null;
        await sendLocationToServer(lat, lng);

        // Iniciar watchPosition para actualizaciones automáticas
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => sendLocationToServer(p.coords.latitude, p.coords.longitude),
          () => {},
          { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
        );
      },
      () => setLocationStatus('denied')
    );
  }, [sendLocationToServer]);

  // ── Limpiar watcher al desmontar ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
    const pollLocation = async () => {
      const locs = await otService.getTechnicianLocations();
      if (locs[user.id]) setTechLocation(locs[user.id]);
    };
    pollLocation();
    const interval = setInterval(pollLocation, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    const data = await otService.getOTs({ techId: user.id });
    setOts(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total     = ots.length;
  const active    = ots.filter(o => ['PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS'].includes(o.status)).length;
  const completed = ots.filter(o => ['COMPLETED','VALIDATED'].includes(o.status)).length;
  const inProgress = ots.filter(o => o.status === 'IN_PROGRESS').length;

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = filter === 'all' ? ots
    : ots.filter(o => FILTERS.find(f => f.id === filter)?.statuses?.includes(o.status));

  return (
    <div className="max-w-xl mx-auto pb-28 px-3 md:px-0 space-y-5">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white px-6 py-7 shadow-2xl shadow-gray-900/20">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-emerald-400">Operativo Activo</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter leading-none">Mi Jornada</h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
              {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Botón ubicación */}
            <button
              onClick={locationStatus === 'active' ? undefined : handleEnableLocation}
              disabled={locationStatus === 'requesting'}
              title={
                locationStatus === 'active' ? 'Ubicación activa' :
                locationStatus === 'denied' ? 'Permiso denegado — toca para reintentar' :
                locationStatus === 'requesting' ? 'Obteniendo ubicación…' :
                'Activar ubicación'
              }
              className={cn(
                'relative p-2.5 rounded-xl border text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all',
                locationStatus === 'active'  && 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 cursor-default',
                locationStatus === 'denied'  && 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
                locationStatus === 'requesting' && 'bg-white/10 border-white/10 text-white opacity-60 cursor-wait',
                locationStatus === 'idle'    && 'bg-white/10 border-white/10 text-white hover:bg-white/20',
              )}
            >
              {locationStatus === 'active' && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
              {locationStatus === 'denied'
                ? <WifiOff className="h-4 w-4" />
                : locationStatus === 'requesting'
                ? <Navigation className="h-4 w-4 animate-pulse" />
                : <Navigation2 className={cn('h-4 w-4', locationStatus === 'active' && 'fill-emerald-400')} />
              }
              GPS
            </button>

            <button
              onClick={() => setShowMap(v => !v)}
              className={cn(
                'p-2.5 rounded-xl border text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all',
                showMap ? 'bg-primary border-primary text-white' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              )}
            >
              <MapPin className="h-4 w-4" />
              Mapa
            </button>
            <button
              onClick={() => navigate('/ots/leaderboard')}
              className="p-2.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-[8px] font-black uppercase flex flex-col items-center gap-1 transition-all"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              Ranking
            </button>
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 transition-all"
              title="Actualizar"
            >
              <RefreshCw className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: total, color: 'text-white' },
            { label: 'Activas', value: active, color: 'text-amber-400' },
            { label: 'Completadas', value: completed, color: 'text-emerald-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/8 rounded-2xl px-3 py-3 text-center border border-white/10">
              <p className={cn('text-2xl font-black leading-none', stat.color)}>{stat.value}</p>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        {showMap && (
          <div className="mt-4 rounded-2xl overflow-hidden h-56 border border-white/10">
            <MapContainer
              center={
                techLocation?.lat
                  ? [techLocation.lat, techLocation.lng]
                  : ots[0]?.lat ? [ots[0].lat, ots[0].lng] : [19.4326, -99.1332]
              }
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapResizer />
              {ots.filter(o => !['COMPLETED','VALIDATED'].includes(o.status) && o.lat && o.lng).map(o => (
                <Marker key={o.id} position={[o.lat, o.lng]} icon={otIcon}>
                  <Popup>
                    <p className="font-black text-[10px] text-primary uppercase">{o.id}</p>
                    <p className="font-bold text-xs">{o.title}</p>
                  </Popup>
                </Marker>
              ))}
              {techLocation?.lat && (
                <Marker position={[techLocation.lat, techLocation.lng]} icon={techIcon}>
                  <Popup><p className="font-black text-[10px]">Mi posición</p></Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        )}

        {/* Banner: permiso denegado */}
        {locationStatus === 'denied' && (
          <div className="relative mt-3 flex items-start gap-2.5 bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3">
            <WifiOff className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-red-300 uppercase tracking-wider">Permiso de ubicación denegado</p>
              <p className="text-[9px] text-red-400/80 mt-0.5">
                Ve a Configuración del navegador → Permisos de sitio → Ubicación → Permitir para este sitio.
              </p>
            </div>
          </div>
        )}

        {/* Banner: ubicación activa — recordatorio de mantener app abierta */}
        {locationStatus === 'active' && (
          <div className="relative mt-3 flex items-start gap-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-4 py-2.5">
            <Navigation2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 fill-emerald-400/30" />
            <div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                Ubicación activa · se actualiza cada 5 min
              </p>
              <p className="text-[9px] text-emerald-400/70 mt-0.5">
                Mantén esta pantalla abierta para que el supervisor vea tu posición en tiempo real.
              </p>
            </div>
          </div>
        )}

        {/* Banner: idle — invitar a activar */}
        {locationStatus === 'idle' && (
          <button
            onClick={handleEnableLocation}
            className="relative mt-3 w-full flex items-center gap-2.5 bg-white/8 border border-white/15 rounded-2xl px-4 py-2.5 hover:bg-white/15 transition-colors text-left"
          >
            <Navigation2 className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-wider">
              Toca para activar tu ubicación
            </p>
          </button>
        )}

        {/* In-progress alert */}
        {inProgress > 0 && (
          <div className="relative mt-3 flex items-center gap-2.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl px-4 py-2.5">
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
              {inProgress} orden{inProgress > 1 ? 'es' : ''} en ejecución ahora
            </p>
          </div>
        )}
      </div>

      {/* ── FILTROS ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
              filter === f.id
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
            )}
          >
            {f.label}
            {f.id !== 'all' && (
              <span className={cn(
                'ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full',
                filter === f.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
              )}>
                {f.id === 'active' ? active : completed}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── LISTA DE OTs ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-14 text-center">
            <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
              {filter === 'all' ? 'Sin órdenes asignadas' : 'No hay órdenes en esta categoría'}
            </p>
          </div>
        ) : (
          filtered.map((ot, i) => (
            <OTCard key={ot.id} ot={ot} userId={user.id} index={i} navigate={navigate} />
          ))
        )}
      </div>
    </div>
  );
}
