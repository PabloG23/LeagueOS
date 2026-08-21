import React, { useState } from 'react';
import { User, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';
import { PlayerScorerDTO, leagueApi } from '@/shared/api/league-api';

interface TopScorer {
    id: string;
    name: string;
    team: string;
    teamId?: string;
    goals: number;
    rank: number;
    image?: string;
    profilePhotoUrl?: string;
}

interface TopScorersWidgetProps {
    scorers: (TopScorer | PlayerScorerDTO)[];
    loading?: boolean;
}

export const TopScorersWidget = ({ scorers = [], loading = false }: TopScorersWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    const [activeLeaderIdx, setActiveLeaderIdx] = useState(0);
    const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

    // Strategy A: Identify Co-Leaders (players sharing the maximum goals)
    const maxGoals = scorers[0]?.goals;
    const coLeaders = scorers.filter(s => s.goals === maxGoals);
    const hasMultipleLeaders = coLeaders.length > 1;

    const safeIndex = activeLeaderIdx < coLeaders.length ? activeLeaderIdx : 0;
    const currentLeader = coLeaders[safeIndex] || scorers[0];

    // Runners up list: players that are not the currently shown leader (up to 9 items)
    const otherScorers = scorers.filter(s => s.id !== currentLeader?.id).slice(0, 9);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId || '1'}`;
    };

    const resolvePhotoUrl = (url?: string) => {
        if (!url) return undefined;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return leagueApi.getProxyUrl(url);
    };

    const leaderPhoto = resolvePhotoUrl(currentLeader?.profilePhotoUrl || (currentLeader as any)?.image);
    const hasImgError = currentLeader ? !!imgErrorMap[currentLeader.id] : false;

    const handlePrevLeader = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveLeaderIdx(prev => (prev > 0 ? prev - 1 : coLeaders.length - 1));
    };

    const handleNextLeader = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveLeaderIdx(prev => (prev < coLeaders.length - 1 ? prev + 1 : 0));
    };

    return (
        <div className={cn(
            "rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-300",
            isNuestroDeporte
                ? "border-blue-900/30 bg-[#0A1224] text-white shadow-blue-950/40"
                : "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
        )}>
            {/* Widget Header */}
            <div className={cn(
                "flex items-center justify-between p-4 border-b",
                isNuestroDeporte ? "bg-[#060B1A]/90 border-blue-900/40" : "bg-slate-50/70 border-slate-100"
            )}>
                <h3 className={cn(
                    "tracking-tight text-lg font-bold flex items-center gap-2",
                    isNuestroDeporte ? "font-['Bebas_Neue'] tracking-wider text-xl text-white" : ""
                )}>
                    <Trophy className={cn("w-5 h-5", isNuestroDeporte ? "text-blue-400" : "text-amber-500")} />
                    Goleo Individual
                </h3>

                {hasMultipleLeaders && (
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                        isNuestroDeporte ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800"
                    )}>
                        Empate en la cima
                    </span>
                )}
            </div>

            <div className="p-0 flex flex-col">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                        Cargando estadísticas de goleo...
                    </div>
                ) : !currentLeader ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                            isNuestroDeporte ? "bg-blue-950/50 text-blue-400 border border-blue-800/30" : "bg-slate-100 text-slate-400"
                        )}>
                            <Trophy className="w-6 h-6 opacity-60" />
                        </div>
                        <p className={cn("text-xs font-bold", isNuestroDeporte ? "text-slate-300" : "text-slate-600")}>
                            Sin goles registrados aún
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Las anotaciones aparecerán conforme se capturen las cédulas arbitrales.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Hero Leader Section */}
                        <div className={cn(
                            "relative px-5 py-5 text-center overflow-hidden transition-all",
                            isNuestroDeporte
                                ? "bg-gradient-to-br from-blue-900/90 via-blue-950 to-[#040812] text-white border-b border-blue-500/20"
                                : "bg-gradient-to-br from-sidebar via-sidebar/90 to-sidebar text-sidebar-foreground"
                        )}>
                            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                <Trophy className="w-24 h-24" />
                            </div>

                            {/* Co-Leaders Navigation Controls (if empate) */}
                            {hasMultipleLeaders && (
                                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
                                    <button
                                        onClick={handlePrevLeader}
                                        className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-md"
                                        title="Líder anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextLeader}
                                        className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-md"
                                        title="Siguiente líder"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col items-center">
                                {/* Leader Photo Thumbnail with R2 photo support */}
                                <div className={cn(
                                    "w-20 h-20 rounded-full flex items-center justify-center mb-2.5 shadow-xl backdrop-blur overflow-hidden transition-all duration-300",
                                    isNuestroDeporte
                                        ? "bg-blue-500/20 border-2 border-blue-400/50 shadow-blue-500/20"
                                        : "bg-white/10 border-4 border-white/20"
                                )}>
                                    {leaderPhoto && !hasImgError ? (
                                        <img
                                            src={leaderPhoto}
                                            alt={currentLeader.name}
                                            className="w-full h-full object-cover"
                                            onError={() => {
                                                if (currentLeader?.id) {
                                                    setImgErrorMap(prev => ({ ...prev, [currentLeader.id]: true }));
                                                }
                                            }}
                                        />
                                    ) : (
                                        <User className="w-9 h-9 text-white" />
                                    )}
                                </div>

                                {/* Dynamic Badge: Líder vs Co-Líder */}
                                <div className={cn(
                                    "inline-flex items-center gap-1 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5",
                                    hasMultipleLeaders
                                        ? "bg-amber-400/20 border border-amber-400/40 text-amber-300"
                                        : isNuestroDeporte
                                            ? "bg-blue-500/20 border border-blue-400/40 text-blue-300"
                                            : "bg-yellow-400/20 border border-yellow-400/30 text-yellow-300"
                                )}>
                                    {hasMultipleLeaders 
                                        ? `#1 Co-Líder (${safeIndex + 1} de ${coLeaders.length})`
                                        : '#1 Líder de Goleo'}
                                </div>

                                <h4 className="text-lg font-black tracking-tight mb-0.5 leading-tight">{currentLeader.name}</h4>
                                <Link to={getTeamLink(currentLeader.teamId)} className="text-white/70 text-xs font-semibold mb-2 hover:text-white hover:underline transition-colors block">
                                    {currentLeader.team}
                                </Link>

                                <div className={cn(
                                    "text-3xl font-black drop-shadow-sm flex items-baseline justify-center gap-1",
                                    isNuestroDeporte ? "text-blue-400" : "text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
                                )}>
                                    <span>{currentLeader.goals}</span>
                                    <span className="text-xs font-bold text-white/50">{currentLeader.goals === 1 ? 'Gol' : 'Goles'}</span>
                                </div>

                                {/* Co-leaders indicator dots */}
                                {hasMultipleLeaders && (
                                    <div className="flex items-center gap-1.5 mt-2">
                                        {coLeaders.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveLeaderIdx(idx)}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-all",
                                                    idx === safeIndex
                                                        ? "bg-amber-400 w-4"
                                                        : "bg-white/30 hover:bg-white/60"
                                                )}
                                                title={`Ver líder ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Other Scorers List (Top 2 to 10) */}
                        {otherScorers.length > 0 && (
                            <div className={cn(
                                "p-3 space-y-1.5 max-h-[440px] overflow-y-auto scrollbar-thin",
                                isNuestroDeporte ? "bg-[#0A1224]" : "bg-white"
                            )}>
                                {otherScorers.map((scorer, idx) => (
                                    <div key={scorer.id || idx} className={cn(
                                        "flex items-center justify-between px-3 py-2 rounded-xl transition-all group",
                                        isNuestroDeporte
                                            ? "hover:bg-blue-950/40 border border-transparent hover:border-blue-900/30"
                                            : "hover:bg-slate-50"
                                    )}>
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className={cn(
                                                "font-mono text-xs font-black w-4 text-center shrink-0 transition-colors",
                                                scorer.goals === maxGoals
                                                    ? "text-amber-400 font-black"
                                                    : isNuestroDeporte 
                                                        ? "text-slate-500 group-hover:text-blue-400" 
                                                        : "text-slate-400 group-hover:text-primary"
                                            )}>
                                                {scorer.rank || (scorer.goals === maxGoals ? 1 : idx + 2)}
                                            </span>

                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className={cn(
                                                    "text-xs font-bold truncate leading-snug",
                                                    isNuestroDeporte ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                                                )}>
                                                    {scorer.name}
                                                </p>
                                                <Link to={getTeamLink(scorer.teamId)} className={cn(
                                                    "text-[11px] font-medium truncate hover:underline block",
                                                    isNuestroDeporte ? "text-slate-400 group-hover:text-blue-400" : "text-slate-500 group-hover:text-primary"
                                                )}>
                                                    {scorer.team}
                                                </Link>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "font-black px-2.5 py-0.5 rounded-lg text-xs shrink-0 transition-colors",
                                            scorer.goals === maxGoals
                                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                : isNuestroDeporte
                                                    ? "bg-blue-950/90 text-blue-300 border border-blue-800/40 group-hover:bg-blue-600 group-hover:text-white"
                                                    : "bg-slate-100 text-slate-900 group-hover:bg-primary/10 group-hover:text-primary"
                                        )}>
                                            {scorer.goals}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
