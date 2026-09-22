import React, { useState, useEffect } from 'react';
import { User, Trophy, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
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
    const [isAutoCycling, setIsAutoCycling] = useState(true);

    // Identify Co-Leaders (players sharing the maximum goals)
    const maxGoals = scorers[0]?.goals;
    const coLeaders = scorers.filter(s => s.goals === maxGoals);
    const hasMultipleLeaders = coLeaders.length > 1;

    const safeIndex = activeLeaderIdx < coLeaders.length ? activeLeaderIdx : 0;
    const currentLeader = coLeaders[safeIndex] || scorers[0];

    // Auto-cycle through co-leaders every 5 seconds so each gets their moment of glory
    useEffect(() => {
        if (!hasMultipleLeaders || !isAutoCycling) return;
        const interval = setInterval(() => {
            setActiveLeaderIdx(prev => (prev + 1) % coLeaders.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [hasMultipleLeaders, isAutoCycling, coLeaders.length]);

    // Runners up list: players that are not the currently shown leader (up to 9 items)
    const otherScorers = scorers.filter(s => s.id !== currentLeader?.id).slice(0, 9);

    const getDenseRank = (scorer: TopScorer | PlayerScorerDTO, defaultIdx: number) => {
        if (scorer.rank != null && scorer.rank > 0) return scorer.rank;
        if (scorer.goals === maxGoals) return 1;
        const uniqueGoals = Array.from(new Set(scorers.map(s => s.goals))).sort((a, b) => (b ?? 0) - (a ?? 0));
        const tier = uniqueGoals.indexOf(scorer.goals);
        return tier >= 0 ? tier + 1 : defaultIdx + 2;
    };

    const getTeamLink = (teamId?: string) => {
        if (!teamId) return undefined;
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId}`;
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
        setIsAutoCycling(false);
        setActiveLeaderIdx(prev => (prev > 0 ? prev - 1 : coLeaders.length - 1));
    };

    const handleNextLeader = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAutoCycling(false);
        setActiveLeaderIdx(prev => (prev < coLeaders.length - 1 ? prev + 1 : 0));
    };

    return (
        <div 
            className={cn(
                "rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-300",
                isNuestroDeporte
                    ? "border-blue-900/40 bg-[#0D1A3C] text-white shadow-blue-950/50"
                    : "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
            )}
            onMouseEnter={() => setIsAutoCycling(false)}
            onMouseLeave={() => setIsAutoCycling(true)}
        >
            {/* Widget Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3.5 border-b",
                isNuestroDeporte ? "bg-[#091030]/95 border-red-900/30" : "bg-slate-50/80 border-slate-100"
            )}>
                <h3 className={cn(
                    "tracking-tight text-base font-bold flex items-center gap-2",
                    isNuestroDeporte ? "font-['Bebas_Neue'] tracking-wider text-xl text-white" : ""
                )}>
                    <Trophy className={cn("w-5 h-5", isNuestroDeporte ? "text-amber-400" : "text-amber-500")} />
                    Goleo Individual
                </h3>

                {hasMultipleLeaders && (
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isNuestroDeporte 
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm" 
                            : "bg-amber-100 text-amber-800"
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
                        {/* Hero Leader Section (Podio Dorado & Rojo Copa) */}
                        <div className={cn(
                            "relative px-5 pt-5 pb-4 text-center overflow-hidden transition-all",
                            isNuestroDeporte
                                ? "bg-gradient-to-br from-red-950/90 via-[#0D1A3C] to-[#091030] text-white border-b border-red-600/30"
                                : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700"
                        )}>
                            {/* Watermark Trophy */}
                            <div className="absolute top-2 right-2 p-1 opacity-10 pointer-events-none">
                                <Trophy className="w-28 h-28 text-amber-400" />
                            </div>

                            {/* Chevron Controls */}
                            {hasMultipleLeaders && (
                                <div className="absolute top-4 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
                                    <button
                                        onClick={handlePrevLeader}
                                        className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-md"
                                        title="Líder anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextLeader}
                                        className="w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-md"
                                        title="Siguiente líder"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col items-center">
                                {/* Leader Photo with Gold/Red Ring & Crown Badge */}
                                <div className="relative mb-2">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full p-[3px] shadow-2xl transition-transform duration-300 group-hover:scale-105",
                                        isNuestroDeporte
                                            ? "bg-gradient-to-tr from-red-600 via-amber-400 to-red-500 shadow-[0_0_25px_rgba(232,35,26,0.35)]"
                                            : "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)]"
                                    )}>
                                        <div className="w-full h-full rounded-full overflow-hidden bg-[#091030] flex items-center justify-center">
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
                                                <User className="w-10 h-10 text-white/80" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Floating Crown */}
                                    <div className="absolute -top-1.5 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-amber-200 animate-pulse">
                                        <Crown className="w-3.5 h-3.5 fill-current" />
                                    </div>
                                </div>

                                {/* Prestige Badge */}
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-sm",
                                    hasMultipleLeaders
                                        ? "bg-amber-400/25 border border-amber-400/50 text-amber-300"
                                        : isNuestroDeporte
                                            ? "bg-red-500/25 border border-red-400/50 text-red-200"
                                            : "bg-yellow-400/25 border border-yellow-400/50 text-yellow-300"
                                Flaming text or badge */}
                                    <Crown className="w-3 h-3 text-amber-300" />
                                    {hasMultipleLeaders 
                                        ? `#1 Co-Líder (${safeIndex + 1} de ${coLeaders.length})`
                                        : '#1 Líder de Goleo'}
                                </div>

                                <h4 className="text-lg font-black tracking-tight mb-0.5 leading-tight text-white uppercase drop-shadow-sm max-w-[260px] truncate">
                                    {currentLeader.name}
                                </h4>
                                <Link 
                                    to={getTeamLink(currentLeader.teamId) || '#'} 
                                    className={cn(
                                        "text-xs font-semibold mb-2 transition-colors block uppercase tracking-wider",
                                        isNuestroDeporte ? "text-slate-300 hover:text-red-400" : "text-white/70 hover:text-white"
                                    )}
                                >
                                    {currentLeader.team}
                                </Link>

                                {/* Goles Counter */}
                                <div className="flex items-baseline justify-center gap-1.5">
                                    <span className={cn(
                                        "font-black tracking-tight leading-none drop-shadow-md",
                                        isNuestroDeporte 
                                            ? "font-['Bebas_Neue'] text-4xl text-red-400 tracking-wider" 
                                            : "text-3xl text-amber-400"
                                    )}>
                                        {currentLeader.goals}
                                    </span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                        {currentLeader.goals === 1 ? 'Gol' : 'Goles'}
                                    </span>
                                </div>

                                {/* Co-leaders Interactive Faces Bar (Podio compartido) */}
                                {hasMultipleLeaders && (
                                    <div className="mt-3 pt-2.5 border-t border-white/10 w-full flex flex-col items-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {coLeaders.map((leader, idx) => {
                                                const photo = resolvePhotoUrl(leader.profilePhotoUrl || (leader as any)?.image);
                                                const isSelected = idx === safeIndex;
                                                return (
                                                    <button
                                                        key={leader.id || idx}
                                                        onClick={() => {
                                                            setActiveLeaderIdx(idx);
                                                            setIsAutoCycling(false);
                                                        }}
                                                        className={cn(
                                                            "relative rounded-full transition-all duration-200 p-[2px] group",
                                                            isSelected
                                                                ? isNuestroDeporte 
                                                                    ? "ring-2 ring-amber-400 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
                                                                    : "ring-2 ring-amber-400 scale-110 shadow-lg"
                                                                : "opacity-60 hover:opacity-100 hover:scale-105"
                                                        )}
                                                        title={`${leader.name} (${leader.team})`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-900 border border-white/20 flex items-center justify-center">
                                                            {photo && !imgErrorMap[leader.id] ? (
                                                                <img
                                                                    src={photo}
                                                                    alt={leader.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={() => setImgErrorMap(prev => ({ ...prev, [leader.id]: true }))}
                                                                />
                                                            ) : (
                                                                <User className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scorers List */}
                        {otherScorers.length > 0 && (
                            <div className={cn(
                                "p-2.5 space-y-1 max-h-[440px] overflow-y-auto scrollbar-thin",
                                isNuestroDeporte ? "bg-[#0D1A3C]" : "bg-white"
                            )}>
                                {otherScorers.map((scorer, idx) => {
                                    const rank = getDenseRank(scorer, idx);
                                    const isLeaderRank = rank === 1;
                                    const photo = resolvePhotoUrl(scorer.profilePhotoUrl || (scorer as any)?.image);
                                    const hasScorerImgError = !!imgErrorMap[scorer.id];

                                    return (
                                        <div 
                                            key={scorer.id || idx} 
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-xl transition-all group",
                                                isLeaderRank
                                                    ? isNuestroDeporte 
                                                        ? "bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/15" 
                                                        : "bg-amber-50/80 border border-amber-200"
                                                    : isNuestroDeporte
                                                        ? "hover:bg-blue-950/50 border border-transparent hover:border-blue-900/30"
                                                        : "hover:bg-slate-50 border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                {/* Rank Number */}
                                                <span className={cn(
                                                    "font-mono text-xs font-black w-4 text-center shrink-0",
                                                    isLeaderRank
                                                        ? "text-amber-400"
                                                        : isNuestroDeporte 
                                                            ? "text-slate-400 group-hover:text-red-400" 
                                                            : "text-slate-400 group-hover:text-primary"
                                                )}>
                                                    {rank}
                                                </span>

                                                {/* Player Mini Avatar */}
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center border",
                                                    isLeaderRank
                                                        ? "border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)] bg-slate-900"
                                                        : isNuestroDeporte
                                                            ? "border-blue-800/40 bg-blue-950/60"
                                                            : "border-slate-200 bg-slate-100"
                                                )}>
                                                    {photo && !hasScorerImgError ? (
                                                        <img
                                                            src={photo}
                                                            alt={scorer.name}
                                                            className="w-full h-full object-cover"
                                                            onError={() => setImgErrorMap(prev => ({ ...prev, [scorer.id]: true }))}
                                                        />
                                                    ) : (
                                                        <User className={cn(
                                                            "w-3.5 h-3.5",
                                                            isLeaderRank ? "text-amber-300" : "text-slate-400"
                                                        )} />
                                                    )}
                                                </div>

                                                {/* Name & Team */}
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <p className={cn(
                                                        "text-xs font-bold truncate leading-snug",
                                                        isLeaderRank 
                                                            ? "text-amber-200 font-extrabold" 
                                                            : isNuestroDeporte ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                                                    )}>
                                                        {scorer.name}
                                                    </p>
                                                    <Link 
                                                        to={getTeamLink(scorer.teamId) || '#'} 
                                                        className={cn(
                                                            "text-[11px] font-medium truncate hover:underline block",
                                                            isNuestroDeporte ? "text-slate-400 group-hover:text-blue-300" : "text-slate-500 group-hover:text-primary"
                                                        )}
                                                    >
                                                        {scorer.team}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Goals Pill */}
                                            <span className={cn(
                                                "font-black px-2.5 py-0.5 rounded-lg text-xs shrink-0 transition-colors",
                                                isLeaderRank
                                                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 font-black"
                                                    : isNuestroDeporte
                                                        ? "bg-red-950/90 text-red-300 border border-red-800/40 group-hover:bg-red-600 group-hover:text-white"
                                                        : "bg-slate-100 text-slate-900 group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                {scorer.goals}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
