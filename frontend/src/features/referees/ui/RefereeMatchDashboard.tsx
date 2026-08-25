import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Calendar, MapPin, Camera, Upload, CheckCircle2, AlertCircle, Loader2, LogOut, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { leagueApi, RefereeMatch } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { useToast } from '@/shared/components/ui/ToastContext';
import { useLocation } from 'react-router-dom';

export const RefereeMatchDashboard: React.FC = () => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const location = useLocation();

    const [matches, setMatches] = useState<RefereeMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingMatchId, setUploadingMatchId] = useState<string | null>(null);
    const [selectedMatchForUpload, setSelectedMatchForUpload] = useState<RefereeMatch | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Slug calculation for header logout
    const pathParts = location.pathname.split('/');
    const leagueSlug = pathParts[1] && pathParts[1] !== 'referee' ? pathParts[1] : 'ligaNuestroDeporte';

    const storedTenant = localStorage.getItem('tenantId');
    const effectiveTenantId = (storedTenant && storedTenant !== '00000000-0000-0000-0000-000000000000')
        ? storedTenant
        : (settings?.tenantId && settings.tenantId !== '00000000-0000-0000-0000-000000000000' ? settings.tenantId : '11111111-1111-1111-1111-111111111111');

    const loadMatches = async (isInitial = false) => {
        if (!effectiveTenantId) return;
        if (isInitial) setIsLoading(true);
        try {
            const res = await leagueApi.getMyMatches(effectiveTenantId);
            setMatches(res.data || []);
        } catch (error) {
            console.error('Error fetching referee matches:', error);
            showToast('Error al cargar tus partidos asignados.', 'error');
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMatches(true);
    }, [effectiveTenantId]);

    const handleTriggerUpload = (match: RefereeMatch) => {
        setSelectedMatchForUpload(match);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedMatchForUpload || !effectiveTenantId) return;

        if (file.size > 15 * 1024 * 1024) {
            showToast('La imagen es demasiado pesada (máximo 15MB).', 'error');
            return;
        }

        setUploadingMatchId(selectedMatchForUpload.id);

        try {
            const res = await leagueApi.uploadMatchReportPhoto(effectiveTenantId, selectedMatchForUpload.id, file);
            showToast('¡Cédula arbitral subida con éxito! El administrador podrá revisarla.', 'success');
            
            // Update local state
            setMatches(prev => prev.map(m => m.id === selectedMatchForUpload.id ? res.data : m));
        } catch (error: any) {
            console.error('Error uploading match report photo:', error);
            showToast(error.response?.data?.message || 'Error al subir la foto de la cédula.', 'error');
        } finally {
            setUploadingMatchId(null);
            setSelectedMatchForUpload(null);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = `/${leagueSlug}/login`;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Hidden camera / file picker */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept="image/*"
                capture="environment"
                className="hidden"
            />

            {/* Top Navigation Bar */}
            <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-white tracking-tight">
                                Panel de Árbitro
                            </h1>
                            <span className="text-[11px] font-semibold text-slate-400 block -mt-0.5">
                                {settings?.name || 'LeagueOS'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs transition-colors border border-red-500/20"
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Cerrar Sesión</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
                {/* Welcome Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider mb-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Partidos Asignados
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            Tus Partidos de la Liga
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Consulta la fecha, cancha y equipos. Al finalizar el encuentro, toma o sube una foto de la cédula arbitral oficial firmada.
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-center sm:text-right shrink-0">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">Total Asignados</span>
                        <span className="text-2xl font-black text-blue-600 font-mono">{matches.length}</span>
                    </div>
                </div>

                {/* Matches List */}
                {isLoading ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm font-semibold">Cargando tus partidos asignados...</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            No tienes partidos asignados
                        </h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Cuando la administración de la liga te asigne a un encuentro, aparecerá aquí con los detalles de fecha y cancha.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map((match) => {
                            const isUploading = uploadingMatchId === match.id;
                            const hasPhoto = match.hasReportPhoto;

                            const formattedDate = match.matchDate
                                ? new Date(match.matchDate).toLocaleDateString('es-MX', {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : 'Fecha y hora por definir';

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    {/* Match Info Column */}
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider">
                                                Jornada {match.matchday || 1}
                                            </span>
                                            {match.seasonName && (
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                                                    {match.seasonName}
                                                </span>
                                            )}
                                            {match.status === 'FINISHED' && (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                    Finalizado
                                                </span>
                                            )}
                                        </div>

                                        {/* Teams */}
                                        <div className="flex items-center gap-3 text-lg sm:text-xl font-black text-slate-900">
                                            <span className="truncate">{match.homeTeamName}</span>
                                            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md shrink-0">
                                                VS
                                            </span>
                                            <span className="truncate">{match.awayTeamName}</span>
                                        </div>

                                        {/* Meta: Date & Field */}
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-semibold text-slate-500">
                                            <div className="flex items-center gap-1.5 capitalize text-slate-700">
                                                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                <span>{formattedDate}</span>
                                            </div>
                                            {(match.fieldName || match.location) && (
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                    <span>{match.fieldName || match.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Upload / View Column */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        {hasPhoto && match.reportPhotoSignedUrl && (
                                            <a
                                                href={match.reportPhotoSignedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors shadow-2xs"
                                                title="Ver foto de la cédula subida"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                <span>Ver Cédula Subida</span>
                                                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                                            </a>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleTriggerUpload(match)}
                                            disabled={isUploading}
                                            className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                                                hasPhoto
                                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
                                            }`}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Subiendo Cédula...</span>
                                                </>
                                            ) : hasPhoto ? (
                                                <>
                                                    <Camera className="w-4 h-4 text-slate-600" />
                                                    <span>Tomar / Reemplazar Foto</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-4.5 h-4.5" />
                                                    <span>Subir Foto de Cédula</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
