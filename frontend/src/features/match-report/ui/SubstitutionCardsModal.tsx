import React, { useState } from 'react';
import { X, Shield, ArrowLeftRight, Files, Loader2, Download } from 'lucide-react';
import { Match } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import {
    generateTeamSubstitutionCardsPDF,
    generateMatchSubstitutionCardsPDF,
} from '../services/substitutionCardsPdf';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface SubstitutionCardsModalProps {
    match: Match & { home: string; away: string };
    isOpen: boolean;
    onClose: () => void;
    leagueLogoUrl?: string;
    leagueName?: string;
}

export const SubstitutionCardsModal: React.FC<SubstitutionCardsModalProps> = ({
    match,
    isOpen,
    onClose,
    leagueLogoUrl,
    leagueName,
}) => {
    const [downloadingType, setDownloadingType] = useState<'home' | 'away' | 'both' | null>(null);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const homeName = match.home || match.homeTeam?.name || 'Equipo Local';
    const awayName = match.away || match.awayTeam?.name || 'Equipo Visitante';
    const matchday = match.matchday || 1;

    const handleDownloadHome = async () => {
        setDownloadingType('home');
        try {
            await generateTeamSubstitutionCardsPDF({
                team: {
                    id: match.homeTeam?.id || match.homeTeamId,
                    name: homeName,
                    logoUrl: match.homeTeam?.logoUrl,
                    signedLogoUrl: match.homeTeam?.signedLogoUrl,
                },
                matchday,
                leagueLogoUrl,
                leagueName,
            });
            showToast(`Tarjetas de ${homeName} descargadas con éxito.`, 'success');
            onClose();
        } catch (err) {
            console.error('Error generating home team cards:', err);
            showToast('Error al generar las tarjetas de cambio.', 'error');
        } finally {
            setDownloadingType(null);
        }
    };

    const handleDownloadAway = async () => {
        setDownloadingType('away');
        try {
            await generateTeamSubstitutionCardsPDF({
                team: {
                    id: match.awayTeam?.id || match.awayTeamId,
                    name: awayName,
                    logoUrl: match.awayTeam?.logoUrl,
                    signedLogoUrl: match.awayTeam?.signedLogoUrl,
                },
                matchday,
                leagueLogoUrl,
                leagueName,
            });
            showToast(`Tarjetas de ${awayName} descargadas con éxito.`, 'success');
            onClose();
        } catch (err) {
            console.error('Error generating away team cards:', err);
            showToast('Error al generar las tarjetas de cambio.', 'error');
        } finally {
            setDownloadingType(null);
        }
    };

    const handleDownloadBoth = async () => {
        setDownloadingType('both');
        try {
            await generateMatchSubstitutionCardsPDF({
                match,
                homeTeamName: homeName,
                awayTeamName: awayName,
                leagueLogoUrl,
                leagueName,
            });
            showToast(`Tarjetas de ambos equipos descargadas con éxito.`, 'success');
            onClose();
        } catch (err) {
            console.error('Error generating both teams cards:', err);
            showToast('Error al generar las tarjetas de cambio.', 'error');
        } finally {
            setDownloadingType(null);
        }
    };

    const isBusy = downloadingType !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg">Descargar Tarjetas de Cambio</h3>
                            <p className="text-xs text-slate-500">
                                Jornada {matchday} • Formato oficial de 8 tarjetas por hoja
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isBusy}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Match Banner preview */}
                <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-center gap-4 text-xs font-semibold text-slate-700">
                    <span className="truncate max-w-[140px] text-right font-bold text-slate-900">{homeName}</span>
                    <span className="text-slate-400 font-light text-sm">vs</span>
                    <span className="truncate max-w-[140px] text-left font-bold text-slate-900">{awayName}</span>
                </div>

                {/* Options List */}
                <div className="p-6 space-y-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Selecciona el equipo o paquete a generar:
                    </p>

                    {/* Option 1: Home Team */}
                    <button
                        onClick={handleDownloadHome}
                        disabled={isBusy}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                <TeamLogo
                                    teamName={homeName}
                                    logoUrl={match.homeTeam?.signedLogoUrl || match.homeTeam?.logoUrl}
                                    fallbackClass="text-xs font-bold text-indigo-600"
                                />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Local</span>
                                <h4 className="font-bold text-slate-800 text-sm truncate">{homeName}</h4>
                                <span className="text-[11px] text-slate-500">1 hoja con 8 tarjetas y escudo en marca de agua</span>
                            </div>
                        </div>
                        <div className="shrink-0 pl-3">
                            {downloadingType === 'home' ? (
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            )}
                        </div>
                    </button>

                    {/* Option 2: Away Team */}
                    <button
                        onClick={handleDownloadAway}
                        disabled={isBusy}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition-all text-left group disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                                <TeamLogo
                                    teamName={awayName}
                                    logoUrl={match.awayTeam?.signedLogoUrl || match.awayTeam?.logoUrl}
                                    fallbackClass="text-xs font-bold text-purple-600"
                                />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block">Visitante</span>
                                <h4 className="font-bold text-slate-800 text-sm truncate">{awayName}</h4>
                                <span className="text-[11px] text-slate-500">1 hoja con 8 tarjetas y escudo en marca de agua</span>
                            </div>
                        </div>
                        <div className="shrink-0 pl-3">
                            {downloadingType === 'away' ? (
                                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                            )}
                        </div>
                    </button>

                    {/* Option 3: Both Teams */}
                    <button
                        onClick={handleDownloadBoth}
                        disabled={isBusy}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/80 transition-all text-left group disabled:opacity-50 disabled:pointer-events-none mt-2"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
                                <Files className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Paquete Completo</span>
                                <h4 className="font-bold text-slate-900 text-sm">Ambos Equipos (Local + Visitante)</h4>
                                <span className="text-[11px] text-slate-500">Documento PDF de 2 páginas listo para imprimir</span>
                            </div>
                        </div>
                        <div className="shrink-0 pl-3">
                            {downloadingType === 'both' ? (
                                <Loader2 className="w-5 h-5 text-slate-800 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                            )}
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
