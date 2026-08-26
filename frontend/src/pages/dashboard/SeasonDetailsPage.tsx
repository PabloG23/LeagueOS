import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueApi, Season, TeamRegistration, MatchPreviewDTO } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { EnrollTeamsModal } from '@/features/admin/ui/EnrollTeamsModal';
import { GeneratePlayoffsModal } from '@/features/league-management/ui/GeneratePlayoffsModal';
import { PlayoffsBracketView } from '@/features/league-management/ui/PlayoffsBracketView';
import { CalendarMethodSelectorModal } from '@/features/fixture-generator/ui/CalendarMethodSelectorModal';
import { RoundRobinPreviewModal } from '@/features/fixture-generator/ui/RoundRobinPreviewModal';
import { useToast } from '@/shared/components/ui/ToastContext';
import { SecureImage } from '@/features/team-management/ui/SecureImage';
import { UserPlus, Trash2, Lock, CheckCircle2, ArrowRight, UploadCloud, FileSpreadsheet, Download, AlertCircle, AlertTriangle, X, Trophy, Shield, CalendarDays, Shuffle, Sparkles, Loader2, ArrowUpRight, CalendarCheck } from 'lucide-react';

export const SeasonDetailsPage = () => {
    const { leagueSlug, seasonId } = useParams();
    const navigate = useNavigate();
    const [season, setSeason] = useState<Season | null>(null);
    const [allSeasons, setAllSeasons] = useState<Season[]>([]);
    const [activeTab, setActiveTab] = useState<'teams' | 'calendar' | 'liguilla'>('teams');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [teamToUnenroll, setTeamToUnenroll] = useState<{ id: string, name: string } | null>(null);
    const [isUnenrolling, setIsUnenrolling] = useState(false);
    const [enrolledTeams, setEnrolledTeams] = useState<TeamRegistration[]>([]);
    const [isGeneratePlayoffsModalOpen, setIsGeneratePlayoffsModalOpen] = useState(false);
    const [bracketRefreshTrigger, setBracketRefreshTrigger] = useState(0);
    const [isDeletingSeason, setIsDeletingSeason] = useState(false);
    const [showDeleteSeasonModal, setShowDeleteSeasonModal] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [hasCalendar, setHasCalendar] = useState<boolean | null>(null); // null = not yet checked
    const [isMethodSelectorOpen, setIsMethodSelectorOpen] = useState(false);
    const [isRoundRobinPreviewOpen, setIsRoundRobinPreviewOpen] = useState(false);
    const [roundRobinPreviews, setRoundRobinPreviews] = useState<MatchPreviewDTO[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { settings } = useTenantSettings();
    const tenantId = settings?.tenantId;
    const { showToast, showConfirm } = useToast();
    const enableRoundRobin = settings?.enableRoundRobinFixtures ?? true;

    useEffect(() => {
        if (!seasonId || !tenantId) return;
        setLoading(true);
        Promise.all([
            leagueApi.getSeasons(tenantId),
            leagueApi.getEnrolledTeams(tenantId, seasonId)
        ])
            .then(([seasonRes, teamsRes]) => {
                setAllSeasons(seasonRes.data);
                const found = seasonRes.data.find(s => s.id === seasonId);
                setSeason(found || null);
                setEnrolledTeams(teamsRes.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [seasonId, tenantId]);

    // Check whether a calendar already exists for this season when the calendar tab is opened.
    // O(1) — single API call, result stored as a boolean flag.
    useEffect(() => {
        if (activeTab !== 'calendar' || !seasonId || !tenantId) return;
        leagueApi.getSeasonMatches(tenantId, seasonId)
            .then(res => setHasCalendar(res.data.length > 0))
            .catch(() => setHasCalendar(false));
    }, [activeTab, seasonId, tenantId]);


    const loadTeams = async () => {
        if (!seasonId || !tenantId) return;
        try {
            const res = await leagueApi.getEnrolledTeams(tenantId, seasonId);
            setEnrolledTeams(res.data);
        } catch (e) {
            console.error("Error loading teams", e);
        }
    };

    const handleActivateSeason = async () => {
        if (!seasonId || !tenantId) return;
        
        showConfirm(
            "¿Estás seguro de activar el torneo?\n\nUna vez activo, el calendario y los equipos serán visibles al público de la liga, y ya no podrás eliminar el torneo.",
            async () => {
        setIsActivating(true);
        try {
            await leagueApi.activateSeason(tenantId, seasonId);
            
            const [seasonRes] = await Promise.all([
                leagueApi.getSeasons(tenantId)
            ]);
            setAllSeasons(seasonRes.data);
            const found = seasonRes.data.find(s => s.id === seasonId);
            setSeason(found || null);
            showToast("¡Torneo activado exitosamente! Los partidos ahora serán públicos en el portal.", "success");
        } catch (error) {
            console.error("Error activating season", error);
            showToast("No se pudo activar el torneo.", "error");
        } finally {
            setIsActivating(false);
        }
        }, "Sí, activar", "Cancelar");
    };

    const handleUnenrollClick = (teamId: string, teamName: string) => {
        setTeamToUnenroll({ id: teamId, name: teamName });
    };

    const confirmUnenroll = async () => {
        if (!seasonId || !tenantId || !teamToUnenroll) return;

        setIsUnenrolling(true);
        try {
            await leagueApi.unenrollTeam(tenantId, seasonId, teamToUnenroll.id);
            await loadTeams();
            setTeamToUnenroll(null);
            showToast("Equipo eliminado del torneo.", "success");
        } catch (e) {
            console.error("Error quitando equipo", e);
            showToast("No se pudo quitar al equipo del torneo.", "error");
        } finally {
            setIsUnenrolling(false);
        }
    };

    const handleOpenRoundRobin = async () => {
        if (!seasonId || !tenantId) return;
        if (enrolledTeams.length < 2) {
            showToast("Se necesitan al menos 2 equipos inscritos para generar el calendario.", "error");
            return;
        }
        setIsLoadingPreview(true);
        try {
            const res = await leagueApi.previewRoundRobinFixtures(tenantId, seasonId);
            setRoundRobinPreviews(res.data);
            setIsRoundRobinPreviewOpen(true);
        } catch (err: any) {
            console.error("Error fetching round robin preview:", err);
            const msg = err.response?.data?.error || "No se pudo generar la vista previa. Revisa que haya al menos 2 equipos aprobados.";
            showToast(msg, "error");
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleRoundRobinConfirmed = () => {
        setIsRoundRobinPreviewOpen(false);
        setHasCalendar(true);
        setUploadSuccess(true);
        showToast("¡Calendario Round Robin generado y guardado exitosamente!", "success");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !seasonId || !tenantId) return;

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);
        try {
            await leagueApi.importCalendar(tenantId, seasonId, file);
            setUploadSuccess(true);
            // TODO: Reload calendar view
        } catch (error: any) {
            console.error("Error importing calendar:", error);
            const msg = error.response?.data?.error || "Revisa el formato del archivo.";
            setUploadError(msg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await leagueApi.downloadCalendarTemplate();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'plantilla_calendario.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading template", error);
            showToast("No se pudo descargar la plantilla.", "error");
        }
    };

    if (loading) return <div className="p-8">Cargando detalles del torneo...</div>;
    if (!season) return <div className="p-8">Torneo no encontrado.</div>;

    const baseName = season.name.split(' - ')[0];
    const siblingSeasons = [...allSeasons.filter(s => s.name.startsWith(baseName + ' - ') || s.name === baseName)].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{baseName}</h1>
                        {season.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">EN BORRADOR</span>}
                        {season.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">REGISTROS CERRADOS</span>}
                        {season.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">EN CURSO</span>}
                        {season.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">CONCLUIDO</span>}
                    </div>
                    {season.status === 'DRAFT' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleActivateSeason}
                                disabled={isActivating}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white hover:bg-green-600 font-bold rounded-lg transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
                            >
                                {isActivating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Activar Torneo
                            </button>
                            <button
                                onClick={() => setShowDeleteSeasonModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                            </button>
                        </div>
                    )}
                </div>

                {siblingSeasons.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {siblingSeasons.map(s => {
                            const parts = s.name.split(' - ');
                            const catName = parts.length > 1 ? parts[1] : 'Única';
                            const isActive = s.id === seasonId;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => navigate(`/${leagueSlug}/admin/seasons/${s.id}`)}
                                    className={`px-4 py-2 flex items-center gap-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${isActive ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                                >
                                    {catName}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex gap-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'teams' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'teams' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>1</span>
                    Equipos Inscritos
                    {enrolledTeams.length > 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {activeTab === 'teams' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                </button>

                <button
                    onClick={() => enrolledTeams.length > 0 && setActiveTab('calendar')}
                    disabled={enrolledTeams.length === 0}
                    className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${enrolledTeams.length === 0 ? 'opacity-50 cursor-not-allowed text-slate-400' : activeTab === 'calendar' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    title={enrolledTeams.length === 0 ? 'Debes inscribir al menos 1 equipo primero' : ''}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${enrolledTeams.length === 0 ? 'bg-slate-100 text-slate-400' : activeTab === 'calendar' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>2</span>
                    Calendario de Juegos
                    {enrolledTeams.length === 0 && <Lock className="w-4 h-4 text-slate-400" />}
                    {activeTab === 'calendar' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>}
                </button>

                <button
                    onClick={() => setActiveTab('liguilla')}
                    className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === 'liguilla' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeTab === 'liguilla' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}><Trophy className="w-3.5 h-3.5" /></span>
                    Fase Final (Liguilla)
                    {activeTab === 'liguilla' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></span>}
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'calendar' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Hidden file input for Excel upload */}
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />

                        {/* If calendar is already loaded / generated */}
                        {hasCalendar === true && (
                            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                        <CalendarCheck className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Calendario Configurado</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Activo</span>
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Los enfrentamientos de este torneo ya han sido programados. Puedes consultar o editar las fechas, horarios y sedes en la sección de Partidos.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                                    <button
                                        onClick={() => navigate(`/${leagueSlug}/admin/matches`)}
                                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md w-full md:w-auto"
                                    >
                                        Ver y Gestionar Partidos
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                    {season?.status === 'DRAFT' && (
                                        <button
                                            onClick={handleActivateSeason}
                                            disabled={isActivating}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 w-full md:w-auto"
                                        >
                                            {isActivating ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            Activar Torneo
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {uploadError && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-left animate-in fade-in relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                                <div className="bg-red-100 p-2 rounded-full shrink-0 mt-0.5">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-900 text-base mb-1">Error al importar calendario</h4>
                                    <p className="text-red-700 text-sm leading-relaxed mb-3">{uploadError}</p>
                                    <div className="bg-white/70 rounded-xl p-3 border border-red-100 text-xs text-slate-600">
                                        Ningún partido fue guardado. Por favor corrige el archivo o utiliza la generación Round Robin automática.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success Alert */}
                        {uploadSuccess && hasCalendar !== true && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-emerald-900 font-bold text-sm">
                                        ¡Calendario generado y guardado exitosamente!
                                    </p>
                                </div>
                                {season?.status === 'DRAFT' && (
                                    <button
                                        onClick={handleActivateSeason}
                                        disabled={isActivating}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                                    >
                                        Activar Torneo Ahora
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Method Selection Cards (when hasCalendar is not yet confirmed true) */}
                        {hasCalendar !== true && (
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-xs space-y-8">
                                <div className="text-center max-w-2xl mx-auto">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Paso 2: Generación de Enfrentamientos
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                        Elige el Método para tu Calendario
                                    </h3>
                                    <p className="text-slate-500 text-sm md:text-base mt-2">
                                        Selecciona cómo deseas armar los partidos entre los <strong className="text-slate-700">{enrolledTeams.length} equipos inscritos</strong>.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Option 1: Round Robin Aleatorio */}
                                    <div className="group relative bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border-2 border-indigo-200/80 hover:border-indigo-500 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10">
                                        <div>
                                            <div className="mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                                                    <Shuffle className="w-7 h-7" />
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
                                                Round Robin Aleatorio
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                                Genera automáticamente todas las jornadas con vista previa antes de guardar.
                                            </p>
                                        </div>

                                        <button
                                            id="btn-generate-round-robin"
                                            onClick={handleOpenRoundRobin}
                                            disabled={isLoadingPreview || enrolledTeams.length < 2}
                                            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoadingPreview ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Calculando jornadas...
                                                </>
                                            ) : (
                                                <>
                                                    <Shuffle className="w-5 h-5" />
                                                    Generar con Round Robin
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Option 2: Carga Masiva con Excel */}
                                    <div className="group relative bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 border-2 border-emerald-200/80 hover:border-emerald-500 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
                                        <div>
                                            <div className="mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-300">
                                                    <FileSpreadsheet className="w-7 h-7" />
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-emerald-600 transition-colors">
                                                Carga Masiva Excel
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                                Importa tu rol de juegos directamente desde la plantilla Excel de la liga.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <button
                                                id="btn-upload-excel"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Procesando archivo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UploadCloud className="w-5 h-5" />
                                                        Subir Archivo Excel
                                                    </>
                                                )}
                                            </button>

                                            <div className="text-center">
                                                <button
                                                    onClick={handleDownloadTemplate}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Descargar plantilla oficial de la liga (.xlsx)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'teams' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Equipos Inscritos</h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700">
                                        {enrolledTeams.length}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Planteles confirmados y listos para competir en este torneo
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEnrollModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all transform hover:scale-[1.02]"
                            >
                                <UserPlus className="w-4 h-4" />
                                Añadir Equipos
                            </button>
                        </div>

                        {enrolledTeams.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                                    <Shield className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Aún no hay equipos inscritos</h3>
                                <p className="text-sm text-slate-500 max-w-sm mb-6">
                                    Inscribe a los equipos del catálogo general para comenzar a armar el torneo y su calendario.
                                </p>
                                <button
                                    onClick={() => setIsEnrollModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Inscribir Primeros Equipos
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {enrolledTeams.map((reg) => (
                                    <div
                                        key={reg.id}
                                        className="p-4 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {/* Team Shield / Logo */}
                                            <div className="w-11 h-11 rounded-2xl p-1 bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0 group-hover:border-blue-300 group-hover:shadow-md transition-all duration-200 overflow-hidden">
                                                <SecureImage
                                                    srcKey={reg.team.signedLogoUrl || reg.team.logoUrl}
                                                    fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(reg.team.name)}`}
                                                    alt={reg.team.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-900 transition-colors">
                                                    {reg.team.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Confirmado
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleUnenrollClick(reg.team.id, reg.team.name)}
                                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0 opacity-80 group-hover:opacity-100"
                                            title="Dar de baja del torneo"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <EnrollTeamsModal
                            isOpen={isEnrollModalOpen}
                            onClose={() => setIsEnrollModalOpen(false)}
                            tenantId={tenantId || ''}
                            seasonId={seasonId || ''}
                            alreadyEnrolledTeamIds={enrolledTeams.map(reg => reg.team.id)}
                            onSaved={loadTeams}
                        />

                        {enrolledTeams.length > 0 && (
                            <div className="mt-8 pt-6 border-t flex justify-end animate-in fade-in duration-300">
                                <button
                                    onClick={() => setActiveTab('calendar')}
                                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl group"
                                >
                                    Siguiente: Configurar Calendario
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}

                        {/* Custom Confirmation Modal for Unenrolling */}
                        {teamToUnenroll && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-6 pb-0 flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 mb-4">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                        <button
                                            onClick={() => setTeamToUnenroll(null)}
                                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                            disabled={isUnenrolling}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="px-6 pb-6">
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                                            ¿Dar de baja al equipo?
                                        </h3>
                                        <p className="text-slate-500 mb-6 leading-relaxed">
                                            Estás a punto de eliminar a <strong className="text-slate-800">{teamToUnenroll.name}</strong> de este torneo. Esto no borrará al equipo del directorio general, pero perderá su lugar en la competencia actual.
                                        </p>

                                        <div className="flex gap-3 justify-end mt-8">
                                            <button
                                                onClick={() => setTeamToUnenroll(null)}
                                                disabled={isUnenrolling}
                                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={confirmUnenroll}
                                                disabled={isUnenrolling}
                                                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isUnenrolling ? (
                                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Eliminando...</>
                                                ) : (
                                                    'Sí, dar de baja'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'liguilla' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Fase Final</h2>
                                <p className="text-sm text-slate-500">Árbol de competición de la liguilla</p>
                            </div>
                            <button
                                onClick={() => setIsGeneratePlayoffsModalOpen(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20"
                            >
                                <Trophy className="w-4 h-4" />
                                Generar Liguilla
                            </button>
                        </div>

                        <PlayoffsBracketView tenantId={tenantId || ''} seasonId={seasonId || ''} refreshTrigger={bracketRefreshTrigger} />

                        <GeneratePlayoffsModal
                            isOpen={isGeneratePlayoffsModalOpen}
                            onClose={() => setIsGeneratePlayoffsModalOpen(false)}
                            tenantId={tenantId || ''}
                            seasonId={seasonId || ''}
                            onGenerated={() => {
                                setActiveTab('liguilla');
                                setBracketRefreshTrigger(prev => prev + 1);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Custom Confirmation Modal for Deleting Season */}
            {showDeleteSeasonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <button
                                onClick={() => setShowDeleteSeasonModal(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                disabled={isDeletingSeason}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                ¿Eliminar Torneo?
                            </h3>
                            <p className="text-slate-500 mb-6 leading-relaxed">
                                Estás a punto de eliminar definitivamente el torneo <strong className="text-slate-800">{season.name}</strong>. Esta acción no se puede deshacer.
                            </p>

                            <div className="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={() => setShowDeleteSeasonModal(false)}
                                    disabled={isDeletingSeason}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        setIsDeletingSeason(true);
                                        try {
                                            await leagueApi.deleteSeason(tenantId as string, season.id);
                                            showToast("Torneo eliminado definitivamente.", "success");
                                            navigate(`/${leagueSlug}/admin/seasons`);
                                        } catch (error) {
                                            console.error("Error deleting season", error);
                                            showToast("No se pudo eliminar el torneo.", "error");
                                            setIsDeletingSeason(false);
                                        }
                                    }}
                                    disabled={isDeletingSeason}
                                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeletingSeason ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Eliminando...</>
                                    ) : (
                                        'Sí, eliminar torneo'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Method Selector Modal — optional helper if opened */}
            {isMethodSelectorOpen && seasonId && tenantId && (
                <CalendarMethodSelectorModal
                    tenantId={tenantId}
                    seasonId={seasonId}
                    onSelectExcel={() => {
                        setIsMethodSelectorOpen(false);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                    }}
                    onClose={() => setIsMethodSelectorOpen(false)}
                    onConfirmed={() => {
                        setIsMethodSelectorOpen(false);
                        setHasCalendar(true);
                        setUploadSuccess(true);
                    }}
                />
            )}

            {/* Round Robin Preview Modal */}
            {isRoundRobinPreviewOpen && seasonId && tenantId && (
                <RoundRobinPreviewModal
                    tenantId={tenantId}
                    seasonId={seasonId}
                    initialPreviews={roundRobinPreviews}
                    onClose={() => setIsRoundRobinPreviewOpen(false)}
                    onConfirmed={handleRoundRobinConfirmed}
                />
            )}
        </div>
    );
};
