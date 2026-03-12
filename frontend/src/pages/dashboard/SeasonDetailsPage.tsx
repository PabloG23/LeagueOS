import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueApi, Season, TeamRegistration } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { EnrollTeamsModal } from '@/features/admin/ui/EnrollTeamsModal';
import { GeneratePlayoffsModal } from '@/features/league-management/ui/GeneratePlayoffsModal';
import { PlayoffsBracketView } from '@/features/league-management/ui/PlayoffsBracketView';
import { useToast } from '@/shared/components/ui/ToastContext';
import { UserPlus, Trash2, Lock, CheckCircle2, ArrowRight, UploadCloud, FileSpreadsheet, Download, AlertCircle, AlertTriangle, X, Trophy } from 'lucide-react';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { settings } = useTenantSettings();
    const tenantId = settings?.tenantId;
    const { showToast, showConfirm } = useToast();

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

    const handleAutoGenerate = async () => {
        if (!seasonId || !tenantId) return;
        try {
            await leagueApi.generateRoundRobinFixtures(tenantId, seasonId);
            showToast("Calendario generado exitosamente!", "success");
            // Reload or switch view
        } catch (error) {
            console.error(error);
            showToast("Error generando calendario. Revisa que haya al menos 2 equipos aprobados.", "error");
        }
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
                        <h1 className="text-3xl font-bold">{baseName}</h1>
                        {season.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">EN BORRADOR</span>}
                        {season.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">REGISTROS CERRADOS</span>}
                        {season.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">EN CURSO</span>}
                        {season.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">CONCLUIDO</span>}
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
                    <div className="border border-slate-200 rounded-3xl p-8 md:p-16 flex flex-col items-center justify-center text-center bg-white shadow-sm relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-green-50/50 to-transparent"></div>
                        <div className="absolute -left-10 -top-10 w-40 h-40 bg-green-400/5 rounded-full blur-3xl"></div>
                        <div className="absolute -right-10 top-20 w-32 h-32 bg-blue-400/5 rounded-full blur-3xl"></div>

                        <div className="max-w-lg relative z-10 w-full">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                                <FileSpreadsheet className="w-10 h-10" />
                            </div>

                            <h3 className="text-3xl font-black mb-3 text-slate-800 tracking-tight">Cargar Calendario</h3>
                            <p className="text-slate-500 mb-10 text-lg leading-relaxed">
                                Importa tu calendario de juegos desde un archivo Excel. El sistema validará automáticamente que los equipos coincidan.
                            </p>

                            <div className="w-full">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />

                                {uploadError && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-left animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                        <div className="bg-red-100 p-2 rounded-full shrink-0 mt-0.5">
                                            <AlertCircle className="w-5 h-5 text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-900 text-lg mb-1 tracking-tight">Carga Interrumpida</h4>
                                            <p className="text-red-700 text-sm leading-relaxed mb-4">
                                                {uploadError}
                                            </p>
                                            <div className="bg-white/60 rounded-lg p-3 border border-red-100/50 flex flex-col gap-1.5 shadow-sm">
                                                <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                    Estado del Sistema
                                                </p>
                                                <p className="text-xs font-medium text-slate-600 leading-tight">
                                                    No te preocupes, <strong className="text-slate-800">ningún partido fue guardado</strong> para proteger la integridad de los datos. Por favor, corrige el error en el Excel o inscribe al equipo faltante y vuelve a intentarlo.
                                                </p>
                                            </div>
                                        </div>
                                </div>
                                )}

                                {uploadSuccess && (
                                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left animate-in fade-in slide-in-from-top-4 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                        <div className="bg-green-100 p-2 rounded-full shrink-0 mt-0.5 hidden sm:block">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-green-900 text-lg mb-1 tracking-tight">¡Calendario Importado!</h4>
                                            <p className="text-green-700 text-sm leading-relaxed mb-4">
                                                Los partidos han sido programados correctamente en el sistema.
                                            </p>
                                            
                                            {season.status === 'DRAFT' && (
                                                <div className="bg-white/60 rounded-xl p-4 border border-green-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Paso Final</p>
                                                        <p className="text-sm font-medium text-slate-700 leading-tight">Activa el torneo para publicar el calendario y abrir el tablero de posiciones.</p>
                                                    </div>
                                                    <button
                                                        onClick={handleActivateSeason}
                                                        disabled={isActivating}
                                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white hover:bg-green-700 font-bold rounded-xl transition-all shadow-md shadow-green-500/20 disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
                                                    >
                                                        {isActivating ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        Activar Torneo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className={`w-full group relative flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed rounded-2xl transition-all duration-500 ease-out overflow-hidden ${uploading ? 'border-green-400 bg-green-50/50' : 'border-slate-300 hover:border-green-500 hover:bg-green-50/80 hover:shadow-2xl hover:shadow-green-500/10'}`}
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center animate-in fade-in duration-300">
                                            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
                                            <span className="font-bold text-green-700 text-lg">Procesando archivo...</span>
                                            <span className="text-green-600/70 text-sm mt-1">Espera un momento</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            <div className="bg-white p-4 rounded-full shadow-md mb-5 group-hover:-translate-y-2 transition-transform duration-500 group-hover:shadow-lg">
                                                <UploadCloud className="w-8 h-8 text-green-500" />
                                            </div>

                                            <span className="font-bold text-slate-700 text-xl mb-2 group-hover:text-green-700 transition-colors duration-300">
                                                Seleccionar Archivo Excel
                                            </span>
                                            <span className="text-sm font-medium text-slate-400 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm mt-2">
                                                Formatos soportados: .xlsx, .xls
                                            </span>
                                        </>
                                    )}
                                </button>

                                {!uploading && (
                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                        <span className="text-sm font-medium text-slate-500">¿No tienes la plantilla de la liga?</span>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Descargar Formato Base
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'teams' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Equipos Inscritos ({enrolledTeams.length})</h2>
                            <button
                                onClick={() => setIsEnrollModalOpen(true)}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
                            >
                                <UserPlus className="w-5 h-5" />
                                Añadir Equipos
                            </button>
                        </div>

                        {enrolledTeams.length === 0 ? (
                            <div className="border border-dashed rounded-xl p-12 text-center text-slate-500 bg-slate-50">
                                Aún no hay equipos inscritos en este torneo.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {enrolledTeams.map((reg) => (
                                    <div key={reg.id} className="p-4 border rounded-xl flex items-center justify-between bg-white hover:border-slate-300 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full border bg-slate-50 flex items-center justify-center overflow-hidden">
                                                {reg.team.logoUrl ? (
                                                    <img src={reg.team.logoUrl} alt={reg.team.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-bold text-slate-500">{reg.team.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{reg.team.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">ESTADO: {reg.status}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnenrollClick(reg.team.id, reg.team.name)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Quitar equipo"
                                        >
                                            <Trash2 className="w-5 h-5" />
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

                        <div className="bg-white border rounded-3xl p-6 shadow-sm overflow-hidden">
                            <PlayoffsBracketView tenantId={tenantId || ''} seasonId={seasonId || ''} refreshTrigger={bracketRefreshTrigger} />
                        </div>

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
        </div>
    );
};
