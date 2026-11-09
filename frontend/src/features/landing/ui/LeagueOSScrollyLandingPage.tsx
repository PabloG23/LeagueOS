import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import heroDashboardImg from '@/assets/marketing/hero_dashboard.jpg';
import { HeroScrollytellingStage } from './components/HeroScrollytellingStage';
import { PlayerRadar25DCard } from './components/Parallax25DCard';
import {
    Zap,
    Shield,
    Sparkles,
    CheckCircle2,
    XCircle,
    BarChart3,
    ArrowRight,
    MessageSquare,
    Sliders,
    TrendingUp,
    QrCode,
    Share2,
    Calendar,
} from 'lucide-react';

export const LeagueOSScrollyLandingPage: React.FC = () => {
    // ROI Calculator State
    const [numTeams, setNumTeams] = useState<number>(24);
    const [matchesPerWeek, setMatchesPerWeek] = useState<number>(12);

    // Active Feature Tab
    const [activeSportTab, setActiveSportTab] = useState<'f7' | 'rapido' | 'f11' | 'personalizado'>('f7');

    // Contact Form / WhatsApp State
    const [leagueNameInput, setLeagueNameInput] = useState('');
    const [contactNameInput, setContactNameInput] = useState('');
    const [sportTypeInput, setSportTypeInput] = useState('Fútbol 7');
    const [teamsCountInput] = useState('20');
    const [cityInput, setCityInput] = useState('');

    // Calculated ROI
    const hoursSavedMonth = Math.round(numTeams * 1.5 + matchesPerWeek * 2.2);
    const messagesAvoided = Math.round(numTeams * 18 + matchesPerWeek * 12);

    const handleWhatsAppSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let text = `Hola LeagueOS! ⚽ Me interesa digitalizar mi liga deportiva y agendar una demo interactiva.`;

        const details: string[] = [];
        if (contactNameInput.trim()) details.push(`*Contacto:* ${contactNameInput.trim()}`);
        if (leagueNameInput.trim()) details.push(`*Liga:* ${leagueNameInput.trim()}`);
        if (cityInput.trim()) details.push(`*Ciudad:* ${cityInput.trim()}`);
        if (sportTypeInput.trim()) details.push(`*Deporte:* ${sportTypeInput.trim()}`);
        if (teamsCountInput.trim()) details.push(`*Equipos aprox:* ${teamsCountInput.trim()}`);

        if (details.length > 0) {
            text += `%0A%0A` + details.join('%0A');
        }

        window.open(`https://wa.me/527221372365?text=${text}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-blue-500 selection:text-white relative overflow-x-clip">
            {/* Top Glowing Ambient Accents */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-[140px] pointer-events-none z-0" />
            <div className="fixed top-[40%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 blur-[160px] pointer-events-none z-0" />
            <div className="fixed bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[180px] pointer-events-none z-0" />

            {/* ========================================================================= */}
            {/* 1. TOP STICKY NAVBAR */}
            {/* ========================================================================= */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060913]/90 border-b border-white/10 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
                    {/* Brand Logotype */}
                    <div className="flex items-center shrink-0 mr-4 lg:mr-8">
                        <Link to="/landing" className="relative group flex items-center">
                            <span className="text-2xl sm:text-3xl font-black font-['Orbitron',sans-serif] tracking-wider text-white whitespace-nowrap group-hover:scale-105 transition-all duration-300">
                                League<span className="text-[#00e5ff] drop-shadow-[0_0_12px_rgba(0,229,255,0.65)]">OS</span>
                            </span>
                        </Link>
                    </div>

                    {/* Navigation Desktop Links */}
                    <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-slate-300 whitespace-nowrap">
                        <a href="#problemas-solucion" className="hover:text-blue-400 transition-colors whitespace-nowrap">
                            Soluciones
                        </a>
                        <a href="#estadisticas" className="hover:text-blue-400 transition-colors whitespace-nowrap">
                            Estadísticas
                        </a>
                        <a
                            href="#inteligencia-artificial"
                            className="hover:text-blue-400 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <Sparkles className="w-4 h-4 text-emerald-400" /> Suite IA
                        </a>
                        <a href="#ahorro-roi" className="hover:text-blue-400 transition-colors whitespace-nowrap">
                            Calculadora ROI
                        </a>
                        <a href="#clientes" className="hover:text-blue-400 transition-colors whitespace-nowrap">
                            Ligas Activas
                        </a>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3.5 pl-6 border-l border-white/10 shrink-0 ml-auto lg:ml-4">
                        <Link
                            to="/login"
                            className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-200 whitespace-nowrap"
                        >
                            Ingresar
                        </Link>
                        <a
                            href="#contacto"
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Digitaliza tu Liga</span>
                        </a>
                    </div>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* 2. SCROLLYTELLING 2.5D STICKY HERO SECTION */}
            {/* ========================================================================= */}
            <HeroScrollytellingStage heroDashboardImg={heroDashboardImg} />

            {/* ========================================================================= */}
            {/* 3. PAIN POINTS VS LEAGUEOS SOLUTIONS */}
            {/* ========================================================================= */}
            <section id="problemas-solucion" className="py-20 bg-[#080d1e] border-y border-white/10 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-widest border border-blue-500/20">
                            Transformación Total
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                            Basta de perder horas administrando tu liga a mano
                        </h2>
                        <p className="text-base sm:text-lg text-slate-400">
                            Comparamos la pesadilla de gestionar un torneo tradicional contra la eficiencia automatizada de LeagueOS.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* The Traditional Chaotic Way */}
                        <div className="p-8 rounded-3xl bg-red-950/20 border border-red-500/20 space-y-6 relative overflow-hidden">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                                    <XCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-red-300 uppercase tracking-wide">
                                    El Método Antiguo (Excel / Papel)
                                </h3>
                            </div>

                            <ul className="space-y-4 text-sm text-slate-300">
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Inscripciones eternas:</strong> Pasar horas pasando fotos de credenciales de WhatsApp a una hoja de Excel.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Cédulas perdidas o manchadas:</strong> Árbitros anotando en hojas mojadas con letra ilegible.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Reclamos constantes:</strong> Jugadores quejándose porque no se les contó un gol o la tabla tardó 3 días en publicarse.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Horarios conflictivos:</strong> Empalmes de canchas, equipos que juegan dos veces seguidas o descansos mal calculados.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* The LeagueOS Professional Way */}
                        <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-emerald-950/30 border border-emerald-500/30 space-y-6 relative overflow-hidden shadow-xl shadow-blue-500/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-emerald-300 tracking-wide">
                                    La Experiencia League<span className="text-blue-400">OS</span>
                                </h3>
                            </div>

                            <ul className="space-y-4 text-sm text-slate-200">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Auto-registro por QR:</strong> Cada capitán inscribe a sus jugadores con un link exclusivo. Todo validado al instante.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Cédula Arbitral Móvil:</strong> El árbitro marca goles, asistencias y tarjetas en vivo desde su smartphone.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Tablas al segundo:</strong> Termina el partido y automáticamente se actualizan posiciones, goleo y tarjetas.
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Generador de Fixture con IA:</strong> Distribución matemática de canchas y horarios sin empalmes en 1 click.
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 4. GRANULAR CUSTOM STATS (CON TARJETA 2.5D DEL JUGADOR) */}
            {/* ========================================================================= */}
            <section id="estadisticas" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                            Hiper-Personalización Deportiva
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                            Las Estadísticas Más Finas que Puedas Imaginar
                        </h2>
                        <p className="text-base sm:text-lg text-slate-400">
                            No nos limitamos a goles y puntos. Creamos y adaptamos métricas a la medida exacta de las reglas y formato de tu torneo.
                        </p>
                    </div>

                    {/* Sport Tabs */}
                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                        <button
                            onClick={() => setActiveSportTab('f7')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeSportTab === 'f7'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            ⚽ Fútbol 7
                        </button>
                        <button
                            onClick={() => setActiveSportTab('rapido')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeSportTab === 'rapido'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            ⚡ Fútbol Rápido / Sala
                        </button>
                        <button
                            onClick={() => setActiveSportTab('f11')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeSportTab === 'f11'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            🏟️ Fútbol 11
                        </button>
                        <button
                            onClick={() => setActiveSportTab('personalizado')}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                activeSportTab === 'personalizado'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            ✨ Tu Formato a la Medida
                        </button>
                    </div>

                    {/* Interactive Showcase Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
                        {/* Left Column: 2.5D Multi-Plane Player Radar Card */}
                        <div className="lg:col-span-5">
                            <PlayerRadar25DCard activeSportTab={activeSportTab} />
                        </div>

                        {/* Right Column: Custom Metrics Features */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-blue-500/40 transition-all">
                                <h4 className="text-lg font-black text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-400" />
                                    Métricas Específicas para Porteros y Defensas
                                </h4>
                                <p className="text-sm text-slate-300 mt-2">
                                    No solo premies a los goleadores. LeagueOS incluye porterías imbatidas (Clean Sheets), atajadas clave, promedio de gol recibido y coeficiente de efectividad bajo los tres palos.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/40 transition-all">
                                <h4 className="text-lg font-black text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                    Reglamento Disciplinario Automatizado
                                </h4>
                                <p className="text-sm text-slate-300 mt-2">
                                    Control automático de acumulación de tarjetas amarillas, suspensiones de partidos, multas económicas por equipo y tabla de Fair Play con puntos de castigo.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-purple-500/40 transition-all">
                                <h4 className="text-lg font-black text-white flex items-center gap-2">
                                    <Sliders className="w-5 h-5 text-purple-400" />
                                    Criterios de Desempate Configurables
                                </h4>
                                <p className="text-sm text-slate-300 mt-2">
                                    Diferencia de goles, duelo directo (Head to Head), goles a favor, tarjetas recibidas o shootouts. El sistema se amolda a tus estatutos oficiales.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 5. AI-POWERED CAPABILITIES SUITE */}
            {/* ========================================================================= */}
            <section id="inteligencia-artificial" className="py-24 bg-[#080d1e] border-y border-white/10 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                            <Sparkles className="w-3.5 h-3.5" /> Potenciado por Inteligencia Artificial
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                            Tu Asistente de Liga con IA Disponible 24/7
                        </h2>
                        <p className="text-base sm:text-lg text-slate-400">
                            Automatizaciones de nivel profesional para que el administrador sólo se preocupe por disfrutar del fútbol.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-blue-500/50 transition-all space-y-4 group">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-white">Smart Fixture & Roles</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Algoritmo inteligente que genera todo el calendario equilibrando horarios preferidos, canchas y descansos sin empalmar árbitros ni equipos.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/50 transition-all space-y-4 group">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Share2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-white">Crónicas para Instagram</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Redacta en segundos crónicas periodísticas y copys atractivos con emojis y estadísticas clave para publicar al instante en tus redes sociales.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/50 transition-all space-y-4 group">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-white">OCR de Identificaciones</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Sube la foto del INE o credencial del jugador y la IA extrae automáticamente nombre, fecha de nacimiento y CURP para darlo de alta en segundos.
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/50 transition-all space-y-4 group">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-white">Predicciones & MVP</h3>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Detección automática de rachas ganadoras, jugadores más determinantes y probabilidades estadísticas cara a cara antes de cada liguilla.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 6. INTERACTIVE ROI & TIME SAVER CALCULATOR */}
            {/* ========================================================================= */}
            <section id="ahorro-roi" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-widest border border-blue-500/20">
                            Calculadora de Productividad
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                            ¿Cuánto tiempo y dinero te ahorrará League<span className="text-blue-500">OS</span>?
                        </h2>
                        <p className="text-base sm:text-lg text-slate-400">
                            Mueve los selectores según el tamaño de tu liga y descubre el impacto inmediato.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Sliders */}
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-200">
                                            Equipos activos en tu liga:
                                        </label>
                                        <span className="text-2xl font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                                            {numTeams} equipos
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="6"
                                        max="64"
                                        value={numTeams}
                                        onChange={(e) => setNumTeams(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                                        <span>6 equipos</span>
                                        <span>64 equipos</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-slate-200">
                                            Partidos por fin de semana:
                                        </label>
                                        <span className="text-2xl font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                                            {matchesPerWeek} partidos
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="3"
                                        max="60"
                                        value={matchesPerWeek}
                                        onChange={(e) => setMatchesPerWeek(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                                        <span>3 partidos</span>
                                        <span>60 partidos</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-400">
                                    💡 <em>Estimación basada en datos de ligas reales: captura de cédulas, responder mensajes de horarios y actualización de tablas manuales.</em>
                                </div>
                            </div>

                            {/* ROI Results Card */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-950/60 via-indigo-950/40 to-slate-950 border border-blue-500/30 flex flex-col justify-between space-y-6">
                                <div>
                                    <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">
                                        Impacto Mensual Garantizado
                                    </div>
                                    <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                                        {hoursSavedMonth} hrs <span className="text-lg font-bold text-slate-400">/ mes</span>
                                    </div>
                                    <div className="text-sm font-semibold text-emerald-400 mt-1">
                                        Ahorro del 92% de tu tiempo administrativo
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-white/10 pt-4 text-sm text-slate-300">
                                    <div className="flex justify-between items-center">
                                        <span>Mensajes evitados en WhatsApp:</span>
                                        <strong className="text-white font-bold">~{messagesAvoided} msgs/mes</strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Errores en cédulas y actas:</span>
                                        <strong className="text-emerald-400 font-bold">0% de extravíos</strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Retención de equipos:</span>
                                        <strong className="text-blue-400 font-bold">+35% más leales</strong>
                                    </div>
                                </div>

                                <a
                                    href="#contacto"
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 text-center transition-all"
                                >
                                    Cotizar para {numTeams} equipos
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 7. CLIENTS & SOCIAL PROOF SHOWCASE */}
            {/* ========================================================================= */}
            <section id="clientes" className="py-24 bg-[#080d1e] border-y border-white/10 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-widest border border-amber-500/20">
                            Casos de Éxito Reales
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                            Ligas que crecen y juegan en equipo con League<span className="text-blue-500">OS</span>
                        </h2>
                        <p className="text-base sm:text-lg text-slate-400">
                            Conoce las ligas oficiales que confían su gestión deportiva diaria a LeagueOS.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Client 1: Liga Nuestro Deporte */}
                        <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/15 hover:border-blue-500/50 backdrop-blur-xl transition-all space-y-6 flex flex-col justify-between shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center">
                                        <img
                                            src="/nuestro_deporte_logo.png"
                                            alt="Liga Nuestro Deporte"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/30">
                                        ● En Vivo
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase">Liga Nuestro Deporte</h3>
                                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                                        Categorías Libre y Femenil
                                    </p>
                                </div>

                                <p className="text-sm text-slate-300 leading-relaxed">
                                    &ldquo;LeagueOS transformó por completo nuestra visibilidad. Los capitanes aman poder ver la tabla de goleo y el MVP de la jornada desde sus teléfonos nada más terminar el partido.&rdquo;
                                </p>
                            </div>

                            <a
                                href="https://www.nuestrodeporte.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-blue-600 text-white font-bold text-sm rounded-xl border border-white/10 hover:border-blue-500 transition-all"
                            >
                                <span>Explorar Portal en Vivo</span>
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Client 2: Liga San Lucas */}
                        <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/15 hover:border-emerald-500/50 backdrop-blur-xl transition-all space-y-6 flex flex-col justify-between shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center">
                                        <img
                                            src="/san_lucas_logo.png"
                                            alt="Liga San Lucas"
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/30">
                                        ● En Vivo
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase">Liga San Lucas</h3>
                                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                                        Torneo Dominical de más de 50 equipos
                                    </p>
                                </div>

                                <p className="text-sm text-slate-300 leading-relaxed">
                                    &ldquo;El ahorro en tiempo con las cédulas digitales y el sistema de árbitros nos permitió duplicar la cantidad de equipos inscritos sin contratar más personal de campo.&rdquo;
                                </p>
                            </div>

                            <a
                                href="https://league-os-weld.vercel.app/ligaSanLucas"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl border border-white/10 hover:border-emerald-500 transition-all"
                            >
                                <span>Explorar Portal en Vivo</span>
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Client 3: Liga Municipal Metepec */}
                        <div className="md:col-span-2 flex justify-center">
                            <div className="w-full md:max-w-[calc(50%-1rem)] p-8 rounded-3xl bg-slate-900/80 border border-white/15 hover:border-[#93C572]/60 backdrop-blur-xl transition-all space-y-6 flex flex-col justify-between shadow-xl">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center">
                                            <img
                                                src="/ligaMunicipalMetepec.png"
                                                alt="Liga Municipal de Fútbol de Metepec A.C."
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase border border-emerald-500/30">
                                            ● En Vivo
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase">Liga Municipal Metepec</h3>
                                        <p className="text-xs text-[#93C572] font-bold uppercase tracking-wider mt-0.5">
                                            Torneo con 3 Fuerzas y más de 60 equipos
                                        </p>
                                    </div>

                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        &ldquo;Gestionar múltiples fuerzas con estadísticas oficiales en tiempo real elevó la seriedad y el prestigio de nuestra liga en Metepec a un nivel profesional.&rdquo;
                                    </p>
                                </div>

                                <a
                                    href="https://league-os-weld.vercel.app/ligaMetepec"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-[#93C572] hover:text-black text-white font-bold text-sm rounded-xl border border-white/10 hover:border-[#93C572] transition-all"
                                >
                                    <span>Explorar Portal en Vivo</span>
                                    <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 9. CONTACT & LEAD GENERATION FORM */}
            {/* ========================================================================= */}
            <section id="contacto" className="py-24 bg-[#080d1e] border-t border-white/10 relative">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-4 mb-12">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                            Comienza Hoy
                        </div>
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight max-w-2xl mx-auto leading-tight">
                            Digitaliza tu Liga en Menos de 24 Horas
                        </h2>
                        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                            Completa los datos de tu torneo o haz clic directamente para recibir una propuesta y demo en vivo por WhatsApp.
                        </p>
                    </div>

                    <form
                        onSubmit={handleWhatsAppSubmit}
                        noValidate
                        className="p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl space-y-6"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Tu Nombre / Cargo
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nombre del responsable"
                                    value={contactNameInput}
                                    onChange={(e) => setContactNameInput(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Nombre de tu Liga / Torneo
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nombre de la liga"
                                    value={leagueNameInput}
                                    onChange={(e) => setLeagueNameInput(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Ciudad / Ubicación
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ciudad o Estado"
                                    value={cityInput}
                                    onChange={(e) => setCityInput(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-950 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Deporte / Formato
                                </label>
                                <select
                                    value={sportTypeInput}
                                    onChange={(e) => setSportTypeInput(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="Fútbol 7">Fútbol 7</option>
                                    <option value="Fútbol Rápido / Sala">Fútbol Rápido / Sala</option>
                                    <option value="Fútbol 11">Fútbol 11</option>
                                    <option value="Básquetbol / Voleibol">Básquetbol / Voleibol</option>
                                    <option value="Múltiples Formatos">Múltiples Formatos</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <MessageSquare className="w-5 h-5" />
                            <span>Solicitar Demo & Cotización por WhatsApp</span>
                        </button>
                    </form>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 10. GLOBAL LEAGUEOS BRAND FOOTER */}
            {/* ========================================================================= */}
            <footer className="py-14 bg-[#04060d] border-t border-white/10 text-slate-400 text-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 flex items-center justify-center border border-white/20">
                                    <img
                                        src="/league_logo_new.png"
                                        alt="LeagueOS"
                                        className="w-full h-full object-contain brightness-110"
                                    />
                                </div>
                                <span className="text-xl font-black font-['Orbitron',sans-serif] tracking-wider text-white">
                                    League<span className="text-[#00e5ff]">OS</span>
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                                El sistema operativo para ligas deportivas de nueva generación. Automatización, estadísticas avanzadas y presencia profesional para tus torneos.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Navegación</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <a href="#problemas-solucion" className="hover:text-white transition-colors">
                                        Soluciones
                                    </a>
                                </li>
                                <li>
                                    <a href="#estadisticas" className="hover:text-white transition-colors">
                                        Estadísticas
                                    </a>
                                </li>
                                <li>
                                    <a href="#inteligencia-artificial" className="hover:text-white transition-colors">
                                        Suite IA
                                    </a>
                                </li>
                                <li>
                                    <a href="#ahorro-roi" className="hover:text-white transition-colors">
                                        Calculadora ROI
                                    </a>
                                </li>
                                <li>
                                    <a href="#clientes" className="hover:text-white transition-colors">
                                        Ligas Activas
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Ligas & Redes</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <a
                                        href="https://www.nuestrodeporte.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        Liga Nuestro Deporte
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://league-os-weld.vercel.app/ligaSanLucas"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        Liga San Lucas
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://league-os-weld.vercel.app/ligaMetepec"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-white transition-colors"
                                    >
                                        Liga Municipal Metepec
                                    </a>
                                </li>
                                <li>
                                    <Link to="/login" className="hover:text-white transition-colors">
                                        Portal de Acceso
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                        <p>&copy; {new Date().getFullYear()} LeagueOS Platform. Todos los derechos reservados.</p>
                        <p className="text-slate-500">Potenciando el deporte amateur y semiprofesional con IA.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

