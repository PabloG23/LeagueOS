import { useState, useEffect, useMemo } from 'react';
import { 
    Users, 
    Search, 
    Trophy, 
    CheckCircle2, 
    Clock, 
    ArrowUpDown, 
    Save, 
    Loader2, 
    Eye, 
    AlertCircle, 
    Filter,
    Shield,
    ChevronDown
} from 'lucide-react';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { leagueApi, AdminPlayerDirectoryDTO } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { SecureImage } from '@/features/team-management/ui/SecureImage';
import { PlayerProfileModal } from '@/features/team-management/ui/PlayerProfileModal';

export const PlayersDirectoryView = () => {
    const { settings, updateSettings } = useTenantSettings();
    const { showToast } = useToast();

    const [players, setPlayers] = useState<AdminPlayerDirectoryDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingMinMatches, setIsSavingMinMatches] = useState(false);

    // Min matches editable state
    const [minMatchesInput, setMinMatchesInput] = useState<number>(settings?.minMatchesForPlayoffs || 0);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
    const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE' | 'PENDING'>('ALL');
    const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'MATCHES_DESC' | 'GOALS_DESC' | 'CARDS_DESC'>('NAME_ASC');

    // Modal state
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

    // Synchronize local input with settings when settings load
    useEffect(() => {
        if (settings?.minMatchesForPlayoffs !== undefined) {
            setMinMatchesInput(settings.minMatchesForPlayoffs);
        }
    }, [settings?.minMatchesForPlayoffs]);

    const fetchPlayers = async () => {
        if (!settings?.tenantId) return;
        setIsLoading(true);
        try {
            const res = await leagueApi.getPlayersDirectory(settings.tenantId);
            setPlayers(res.data || []);
        } catch (error) {
            console.error("Error loading players directory:", error);
            showToast("Error al cargar la lista de jugadores", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, [settings?.tenantId]);

    const handleSaveMinMatches = async () => {
        if (!settings?.tenantId) return;
        const parsed = Math.max(0, Number(minMatchesInput) || 0);
        setIsSavingMinMatches(true);
        try {
            await leagueApi.updateMinMatchesForPlayoffs(settings.tenantId, parsed);
            updateSettings({ minMatchesForPlayoffs: parsed });
            showToast(`Partidos mínimos para liguilla actualizados a ${parsed}.`, "success");
        } catch (error: any) {
            console.error("Failed to update min matches:", error);
            showToast(error.response?.data?.message || "Error al actualizar partidos mínimos", "error");
        } finally {
            setIsSavingMinMatches(false);
        }
    };

    // Extract unique team list for filter
    const uniqueTeams = useMemo(() => {
        const teamMap = new Map<string, string>();
        players.forEach(p => {
            if (p.teamName) {
                teamMap.set(p.teamName, p.teamName);
            }
        });
        return Array.from(teamMap.values()).sort();
    }, [players]);

    // Current min matches evaluated live
    const activeMinMatches = Number(minMatchesInput) >= 0 ? Number(minMatchesInput) : (settings?.minMatchesForPlayoffs || 0);

    // KPI Metrics
    const totalPlayers = players.length;
    const eligibleCount = useMemo(() => {
        if (activeMinMatches === 0) return totalPlayers;
        return players.filter(p => p.matchesPlayed >= activeMinMatches).length;
    }, [players, activeMinMatches, totalPlayers]);

    const pendingCount = totalPlayers - eligibleCount;
    const eligiblePercentage = totalPlayers > 0 ? Math.round((eligibleCount / totalPlayers) * 100) : 0;

    // Filter & Sort Logic
    const filteredPlayers = useMemo(() => {
        return players
            .filter(p => {
                // Text Search
                const matchesSearch = 
                    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.curp && p.curp.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (p.jerseyNumber !== undefined && String(p.jerseyNumber).includes(searchTerm));

                if (!matchesSearch) return false;

                // Team Filter
                if (selectedTeam !== 'ALL' && p.teamName !== selectedTeam) {
                    return false;
                }

                // Eligibility Filter
                const isEligible = activeMinMatches === 0 || p.matchesPlayed >= activeMinMatches;
                if (eligibilityFilter === 'ELIGIBLE' && !isEligible) return false;
                if (eligibilityFilter === 'PENDING' && isEligible) return false;

                return true;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'NAME_ASC':
                        return a.fullName.localeCompare(b.fullName);
                    case 'NAME_DESC':
                        return b.fullName.localeCompare(a.fullName);
                    case 'MATCHES_DESC':
                        return b.matchesPlayed - a.matchesPlayed;
                    case 'GOALS_DESC':
                        return b.goals - a.goals;
                    case 'CARDS_DESC':
                        return (b.yellowCards + b.redCards * 2) - (a.yellowCards + a.redCards * 2);
                    default:
                        return 0;
                }
            });
    }, [players, searchTerm, selectedTeam, eligibilityFilter, sortBy, activeMinMatches]);

    const calculateAge = (birthDateString?: string) => {
        if (!birthDateString) return null;
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 sm:gap-3">
                        <Users className="w-7 h-7 sm:w-8 h-8 text-blue-600 shrink-0" />
                        <span>Directorio de Jugadores</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        Control global de jugadores, asistencias y cálculo en tiempo real de elegibilidad para liguilla.
                    </p>
                </div>
                <button
                    onClick={fetchPlayers}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-all w-full sm:w-auto disabled:opacity-50"
                >
                    <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                    <span>Actualizar Lista</span>
                </button>
            </div>

            {/* Playoff Configuration & KPI Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
                    {/* Left: Min Matches Setting Form */}
                    <div className="lg:col-span-5 space-y-3 sm:space-y-4 pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-slate-700/60 pb-5 lg:pb-0">
                        <div className="flex items-center gap-2.5 text-amber-400">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                            <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase">
                                Regla de Liguilla
                            </h2>
                        </div>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                            Define el número de partidos que un jugador debe haber jugado en la temporada regular para tener derecho a jugar las finales.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-2xl p-1 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setMinMatchesInput(prev => Math.max(0, prev - 1))}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-700 text-white flex items-center justify-center font-black text-lg transition-colors"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={minMatchesInput}
                                    onChange={(e) => setMinMatchesInput(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-14 sm:w-16 bg-transparent text-center font-mono font-black text-lg sm:text-xl text-amber-400 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMinMatchesInput(prev => prev + 1)}
                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-700 text-white flex items-center justify-center font-black text-lg transition-colors"
                                >
                                    +
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveMinMatches}
                                disabled={isSavingMinMatches || minMatchesInput === settings?.minMatchesForPlayoffs}
                                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-initial"
                            >
                                {isSavingMinMatches ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                                ) : (
                                    <><Save className="w-4 h-4" /> Guardar Regla</>
                                )}
                            </button>
                        </div>
                        {minMatchesInput !== settings?.minMatchesForPlayoffs && (
                            <p className="text-xs text-amber-300 font-medium animate-pulse">
                                💡 Calculando con {minMatchesInput} partidos (haz clic en Guardar para aplicar a toda la liga).
                            </p>
                        )}
                    </div>

                    {/* Right: Quick KPI Badges */}
                    <div className="lg:col-span-7 grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center backdrop-blur-sm flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5 sm:mb-1 truncate">Jugadores</span>
                            <span className="text-xl sm:text-3xl font-black text-white">{totalPlayers}</span>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center backdrop-blur-sm flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5 sm:mb-1 truncate">
                                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" /> Cumplen
                            </span>
                            <span className="text-xl sm:text-3xl font-black text-emerald-400">{eligibleCount}</span>
                            <span className="text-[10px] sm:text-[11px] text-emerald-400/80 block mt-0.5">{eligiblePercentage}%</span>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center backdrop-blur-sm flex flex-col justify-center">
                            <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1 mb-0.5 sm:mb-1 truncate">
                                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline" /> Pendientes
                            </span>
                            <span className="text-xl sm:text-3xl font-black text-amber-400">{pendingCount}</span>
                            <span className="text-[10px] sm:text-[11px] text-amber-400/80 block mt-0.5">{100 - eligiblePercentage}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between">
                {/* Search */}
                <div className="relative w-full lg:w-80 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, CURP o dorsal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                    {/* Team Filter */}
                    <div className="relative w-full sm:w-auto sm:min-w-[200px] flex-1">
                        <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
                        >
                            <option value="ALL">Todos los equipos ({uniqueTeams.length})</option>
                            {uniqueTeams.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Eligibility Filter */}
                    <div className="relative w-full sm:w-auto sm:min-w-[190px] flex-1">
                        <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={eligibilityFilter}
                            onChange={(e) => setEligibilityFilter(e.target.value as any)}
                            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
                        >
                            <option value="ALL">Todos los estados</option>
                            <option value="ELIGIBLE">✓ Solo Elegibles</option>
                            <option value="PENDING">⏳ Solo Pendientes</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Sort By */}
                    <div className="relative w-full sm:w-auto sm:min-w-[190px] flex-1">
                        <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs appearance-none"
                        >
                            <option value="NAME_ASC">Nombre (A-Z)</option>
                            <option value="NAME_DESC">Nombre (Z-A)</option>
                            <option value="MATCHES_DESC">Más partidos jugados</option>
                            <option value="GOALS_DESC">Más goles</option>
                            <option value="CARDS_DESC">Más tarjetas</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Players Content */}
            {isLoading ? (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-bold">Cargando directorio de jugadores...</p>
                </div>
            ) : filteredPlayers.length === 0 ? (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-16 text-center text-slate-400 space-y-3">
                    <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No se encontraron jugadores</p>
                    <p className="text-xs text-slate-400">Intenta ajustar los filtros de búsqueda o el equipo seleccionado.</p>
                </div>
            ) : (
                <>
                    {/* Mobile Player Cards (< md) */}
                    <div className="md:hidden space-y-3.5">
                        {filteredPlayers.map((player, index) => {
                            const isEligible = activeMinMatches === 0 || player.matchesPlayed >= activeMinMatches;
                            const missingMatches = Math.max(0, activeMinMatches - player.matchesPlayed);
                            const progress = activeMinMatches > 0 ? Math.min(100, Math.round((player.matchesPlayed / activeMinMatches) * 100)) : 100;
                            const age = calculateAge(player.birthDate);

                            const playerModalData = {
                                id: player.id,
                                name: player.fullName,
                                photoUrl: player.profilePhotoUrl || player.signedPhotoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`,
                                isActive: player.isActive,
                                jerseyNumber: player.jerseyNumber,
                                curp: player.curp,
                                birthDate: player.birthDate,
                                teamName: player.teamName,
                                teamLogo: player.signedTeamLogoUrl || player.teamLogoUrl,
                                stats: {
                                    matchesPlayed: player.matchesPlayed,
                                    goals: player.goals,
                                    yellowCards: player.yellowCards,
                                    redCards: player.redCards,
                                    suspendedUntilMatchday: player.suspendedUntilMatchday
                                }
                            };

                            return (
                                <div
                                    key={player.id}
                                    onClick={() => setSelectedPlayer(playerModalData)}
                                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm active:border-blue-300 hover:shadow-md transition-all space-y-3"
                                >
                                    {/* Player Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                                <SecureImage
                                                    srcKey={player.profilePhotoUrl}
                                                    fallbackSrc={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`}
                                                    alt={player.fullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 text-sm leading-snug truncate">
                                                    {player.fullName}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                                    {age !== null && <span>{age} años</span>}
                                                    {player.curp && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono text-[11px] truncate max-w-[120px]">{player.curp}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-2">
                                            {player.jerseyNumber !== undefined && player.jerseyNumber !== null ? (
                                                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black font-mono text-slate-700">
                                                    #{player.jerseyNumber}
                                                </span>
                                            ) : null}
                                            <span className="text-[10px] font-mono text-slate-400 font-semibold">#{index + 1}</span>
                                        </div>
                                    </div>

                                    {/* Team */}
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                        {player.signedTeamLogoUrl || player.teamLogoUrl ? (
                                            <div className="w-5 h-5 rounded-md bg-white border border-slate-200/80 p-0.5 overflow-hidden shrink-0 flex items-center justify-center">
                                                <SecureImage
                                                    srcKey={player.teamLogoUrl}
                                                    fallbackSrc="/league_logo_new.png"
                                                    alt={player.teamName}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                                        )}
                                        <span className="font-semibold text-slate-700 text-xs truncate">
                                            {player.teamName}
                                        </span>
                                    </div>

                                    {/* Playoff Status */}
                                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-semibold">Estatus Liguilla</span>
                                            {activeMinMatches === 0 ? (
                                                <span className="font-bold text-slate-600 text-[11px]">Sin mínimo</span>
                                            ) : isEligible ? (
                                                <span className="inline-flex items-center gap-1 font-black text-emerald-600 text-[11px]">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    CUMPLE ({player.matchesPlayed}/{activeMinMatches})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-[11px]">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Faltan {missingMatches} ({player.matchesPlayed}/{activeMinMatches})
                                                </span>
                                            )}
                                        </div>
                                        {activeMinMatches > 0 && (
                                            <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isEligible ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Grid & Action */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl py-2">
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Juegos</span>
                                            <span className="font-black text-slate-800 text-sm font-mono">{player.matchesPlayed}</span>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl py-2">
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Goles</span>
                                            <span className={`font-black text-sm font-mono ${player.goals > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {player.goals}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 flex flex-col items-center justify-center">
                                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tarjetas</span>
                                            <div className="inline-flex items-center gap-1 mt-0.5">
                                                {player.yellowCards > 0 && (
                                                    <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1 rounded font-mono">🟨{player.yellowCards}</span>
                                                )}
                                                {player.redCards > 0 && (
                                                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1 rounded font-mono">🟥{player.redCards}</span>
                                                )}
                                                {player.yellowCards === 0 && player.redCards === 0 && (
                                                    <span className="text-slate-400 text-xs font-semibold">0</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* View Profile Button */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlayer(playerModalData);
                                        }}
                                        className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold rounded-xl border border-slate-200/80 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Ver Ficha Completa</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop Players Table (>= md) */}
                    <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-4 w-12 text-center">#</th>
                                        <th className="py-4 px-4">Jugador</th>
                                        <th className="py-4 px-4">Equipo</th>
                                        <th className="py-4 px-4 text-center">Dorsal</th>
                                        <th className="py-4 px-4 text-center">Juegos</th>
                                        <th className="py-4 px-4 text-center">Goles</th>
                                        <th className="py-4 px-4 text-center">Disciplina</th>
                                        <th className="py-4 px-4 text-center">Estatus Liguilla</th>
                                        <th className="py-4 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredPlayers.map((player, index) => {
                                        const isEligible = activeMinMatches === 0 || player.matchesPlayed >= activeMinMatches;
                                        const missingMatches = Math.max(0, activeMinMatches - player.matchesPlayed);
                                        const progress = activeMinMatches > 0 ? Math.min(100, Math.round((player.matchesPlayed / activeMinMatches) * 100)) : 100;
                                        const age = calculateAge(player.birthDate);

                                        const playerModalData = {
                                            id: player.id,
                                            name: player.fullName,
                                            photoUrl: player.profilePhotoUrl || player.signedPhotoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`,
                                            isActive: player.isActive,
                                            jerseyNumber: player.jerseyNumber,
                                            curp: player.curp,
                                            birthDate: player.birthDate,
                                            teamName: player.teamName,
                                            teamLogo: player.signedTeamLogoUrl || player.teamLogoUrl,
                                            stats: {
                                                matchesPlayed: player.matchesPlayed,
                                                goals: player.goals,
                                                yellowCards: player.yellowCards,
                                                redCards: player.redCards,
                                                suspendedUntilMatchday: player.suspendedUntilMatchday
                                            }
                                        };

                                        return (
                                            <tr 
                                                key={player.id}
                                                onClick={() => setSelectedPlayer(playerModalData)}
                                                className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                            >
                                                {/* Index */}
                                                <td className="py-3 px-4 text-center text-xs font-mono text-slate-400">
                                                    {index + 1}
                                                </td>

                                                {/* Player Identity */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                                                            <SecureImage
                                                                srcKey={player.profilePhotoUrl}
                                                                fallbackSrc={`https://api.dicebear.com/7.x/initials/svg?seed=${player.fullName}`}
                                                                alt={player.fullName}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                {player.fullName}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                                                                {age !== null && <span>{age} años</span>}
                                                                {player.curp && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="font-mono">{player.curp}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Team */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        {player.signedTeamLogoUrl || player.teamLogoUrl ? (
                                                            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 p-0.5 overflow-hidden shrink-0 flex items-center justify-center">
                                                                <SecureImage
                                                                    srcKey={player.teamLogoUrl}
                                                                    fallbackSrc="/league_logo_new.png"
                                                                    alt={player.teamName}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                                                        )}
                                                        <span className="font-semibold text-slate-700 text-xs sm:text-sm truncate max-w-[150px]">
                                                            {player.teamName}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Jersey Number */}
                                                <td className="py-3 px-4 text-center">
                                                    {player.jerseyNumber !== undefined && player.jerseyNumber !== null ? (
                                                        <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black font-mono text-slate-700">
                                                            #{player.jerseyNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono text-xs">--</span>
                                                    )}
                                                </td>

                                                {/* Matches Played */}
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-black text-slate-800 text-base font-mono">
                                                            {player.matchesPlayed}
                                                        </span>
                                                        {activeMinMatches > 0 && (
                                                            <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${isEligible ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Goals */}
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`font-black text-base font-mono ${player.goals > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {player.goals}
                                                    </span>
                                                </td>

                                                {/* Discipline */}
                                                <td className="py-3 px-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        {player.yellowCards > 0 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-bold font-mono" title={`${player.yellowCards} Tarjetas Amarillas`}>
                                                                🟨 {player.yellowCards}
                                                            </span>
                                                        )}
                                                        {player.redCards > 0 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-xs font-bold font-mono" title={`${player.redCards} Tarjetas Rojas`}>
                                                                🟥 {player.redCards}
                                                            </span>
                                                        )}
                                                        {player.yellowCards === 0 && player.redCards === 0 && (
                                                            <span className="text-xs text-slate-300 font-medium">Limpio</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Playoff Status */}
                                                <td className="py-3 px-4 text-center">
                                                    {activeMinMatches === 0 ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                                            Sin mínimo
                                                        </span>
                                                    ) : isEligible ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-black shadow-sm">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            CUMPLE ({player.matchesPlayed}/{activeMinMatches})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                            Faltan {missingMatches} ({player.matchesPlayed}/{activeMinMatches})
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPlayer(playerModalData);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-bold transition-all shadow-sm group-hover:border-blue-200"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Ver Ficha</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modal for full player card */}
            {selectedPlayer && (
                <PlayerProfileModal
                    isOpen={!!selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    player={selectedPlayer}
                />
            )}
        </div>
    );
};
