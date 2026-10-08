import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';
import { PlayerScorerDTO, leagueApi } from '@/shared/api/league-api';
import {
    ContainedPhoto,
    GoalsCounter,
    LeaderBadge,
    LeaderName,
    LeaderTeam,
    LeaderVariant,
    PlayerAvatar,
} from './top-scorers/LeaderParts';
import { ShareLeaderButton, ShareScorerDialog } from './top-scorers/ShareScorerDialog';
import type { ScorerShareCardData } from './top-scorers/scorerShareCard';

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

type Scorer = TopScorer | PlayerScorerDTO;

interface TopScorersWidgetProps {
    scorers: Scorer[];
    loading?: boolean;
}

const resolvePhotoUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    return leagueApi.getProxyUrl(url);
};

/** League logos may be public assets (e.g. "/nuestro_deporte_logo.png") or storage keys. */
const resolveLogoUrl = (url?: string) => (url?.startsWith('/') ? url : resolvePhotoUrl(url));

const getScorerPhoto = (scorer?: Scorer) =>
    resolvePhotoUrl(scorer?.profilePhotoUrl || (scorer as TopScorer | undefined)?.image);

export const TopScorersWidget = ({ scorers: rawScorers = [], loading = false }: TopScorersWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();

    // Layout is decided exclusively by the tenant theme (no hardcoded tenant IDs)
    const variant: LeaderVariant = settings?.themeClass === 'theme-nuestro-deporte' ? 'fut' : 'classic';
    const isFut = variant === 'fut';

    const [activeLeaderIdx, setActiveLeaderIdx] = useState(0);
    const [isAutoCycling, setIsAutoCycling] = useState(true);
    const [shareData, setShareData] = useState<ScorerShareCardData | null>(null);

    // Defensive ordering: never rely on the backend sending the list sorted
    const scorers = useMemo(
        () => [...rawScorers].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)),
        [rawScorers]
    );

    // Identify Co-Leaders (players sharing the maximum goals)
    const maxGoals = scorers[0]?.goals;
    const coLeaders = scorers.filter(s => s.goals === maxGoals);
    const hasMultipleLeaders = coLeaders.length > 1;

    const safeIndex = activeLeaderIdx < coLeaders.length ? activeLeaderIdx : 0;
    const currentLeader = coLeaders[safeIndex] || scorers[0];

    // Auto-cycle through co-leaders every 5 seconds so each gets their moment of glory
    useEffect(() => {
        if (!hasMultipleLeaders || !isAutoCycling || shareData) return;
        const interval = setInterval(() => {
            setActiveLeaderIdx(prev => (prev + 1) % coLeaders.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [hasMultipleLeaders, isAutoCycling, coLeaders.length, shareData]);

    // Runners up list: players that are not the currently shown leader (up to 9 items)
    const otherScorers = scorers.filter(s => s.id !== currentLeader?.id).slice(0, 9);

    const uniqueGoals = useMemo(
        () => Array.from(new Set(scorers.map(s => s.goals))).sort((a, b) => (b ?? 0) - (a ?? 0)),
        [scorers]
    );

    const getDenseRank = (scorer: Scorer, defaultIdx: number) => {
        if (scorer.rank != null && scorer.rank > 0) return scorer.rank;
        if (scorer.goals === maxGoals) return 1;
        const tier = uniqueGoals.indexOf(scorer.goals);
        return tier >= 0 ? tier + 1 : defaultIdx + 2;
    };

    const getTeamLink = (teamId?: string) => {
        if (!teamId) return undefined;
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId}`;
    };

    const leaderPhoto = getScorerPhoto(currentLeader);

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

    const getCleanDisplayUrl = (slug?: string, themeClass?: string) => {
        const hostname = window.location.hostname.toLowerCase();
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
        if (isLocal) {
            if (themeClass === 'theme-nuestro-deporte') return 'nuestrodeporte.com';
            if (slug === 'sanlucas' || slug === 'ligasanlucas') return 'ligasanlucas.com';
            return slug ? `${slug}.leagueos.app` : 'leagueos.app';
        }
        return hostname.replace(/^www\./, '');
    };

    const openShare = () => {
        if (!currentLeader) return;
        setIsAutoCycling(false);
        setShareData({
            playerName: currentLeader.name,
            teamName: currentLeader.team,
            goals: currentLeader.goals,
            isCoLeader: hasMultipleLeaders,
            photoUrl: leaderPhoto,
            leagueName: settings?.name || 'Liga',
            leagueLogoUrl: resolveLogoUrl(settings?.logoUrl),
            leagueUrl: getCleanDisplayUrl(leagueSlug, settings?.themeClass),
            variant,
        });
    };

    const closeShare = useCallback(() => setShareData(null), []);

    /* Shared leader info block (badge, name, team, goals, share) */
    const leaderInfo = currentLeader && (
        <>
            <LeaderBadge
                variant={variant}
                coLeaderIndex={safeIndex}
                coLeaderCount={coLeaders.length}
            />
            <LeaderName name={currentLeader.name} />
            <LeaderTeam variant={variant} team={currentLeader.team} to={getTeamLink(currentLeader.teamId)} />
            <GoalsCounter variant={variant} goals={currentLeader.goals} />
            <ShareLeaderButton variant={variant} onClick={openShare} />
        </>
    );

    return (
        <div 
            className={cn(
                "rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-300",
                isFut
                    ? "border-blue-900/40 bg-[#0D1A3C] text-white shadow-blue-950/50"
                    : "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
            )}
            onMouseEnter={() => setIsAutoCycling(false)}
            onMouseLeave={() => setIsAutoCycling(true)}
        >
            {/* Widget Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3.5 border-b",
                isFut ? "bg-[#091030]/95 border-red-900/30" : "bg-slate-50/80 border-slate-100"
            )}>
                <h3 className={cn(
                    "tracking-tight text-base font-bold flex items-center gap-2",
                    isFut ? "font-['Bebas_Neue'] tracking-wider text-xl text-white" : ""
                )}>
                    <Trophy className={cn("w-5 h-5", isFut ? "text-amber-400" : "text-amber-500")} />
                    Goleo Individual
                </h3>

                {hasMultipleLeaders && (
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isFut 
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
                            isFut ? "bg-blue-950/50 text-blue-400 border border-blue-800/30" : "bg-slate-100 text-slate-400"
                        )}>
                            <Trophy className="w-6 h-6 opacity-60" />
                        </div>
                        <p className={cn("text-xs font-bold", isFut ? "text-slate-300" : "text-slate-600")}>
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
                            "relative px-3 sm:px-5 pt-4 sm:pt-5 pb-4 text-center overflow-hidden transition-all",
                            isFut
                                ? "bg-gradient-to-br from-red-950/90 via-[#0D1A3C] to-[#091030] text-white border-b border-red-600/30"
                                : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700"
                        )}>
                            {/* Watermark / Ambient Lighting */}
                            {isFut ? (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                            ) : (
                                <div className="absolute top-2 right-2 p-1 opacity-10 pointer-events-none">
                                    <Trophy className="w-28 h-28 text-amber-400" />
                                </div>
                            )}

                            {/* Chevron Controls */}
                            {hasMultipleLeaders && (
                                <div className={cn(
                                    "absolute inset-x-1.5 sm:inset-x-3 flex items-center justify-between z-30 pointer-events-none",
                                    isFut ? "top-[40%] -translate-y-1/2" : "top-4"
                                )}>
                                    <button
                                        onClick={handlePrevLeader}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-lg backdrop-blur-sm"
                                        title="Líder anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleNextLeader}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center border border-white/20 transition-all pointer-events-auto shadow-lg backdrop-blur-sm"
                                        title="Siguiente líder"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col items-center">
                                {isFut ? (
                                    /* FUT / Trading Card Hero presentation (theme-nuestro-deporte) */
                                    <div className="relative w-full max-w-[240px] sm:max-w-[260px] mx-auto rounded-2xl p-[2px] bg-gradient-to-b from-amber-400 via-red-500/80 to-amber-500/40 shadow-[0_0_30px_rgba(232,35,26,0.35)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.45)] mb-3">
                                        <div className="relative w-full rounded-[14px] overflow-hidden bg-gradient-to-b from-[#141f48] via-[#0d163a] to-[#080d24] flex flex-col items-center p-3 text-center border border-white/10">
                                            {/* Diagonal glass sheen */}
                                            <div className="pointer-events-none absolute -top-12 -left-12 w-28 h-28 bg-white/5 rotate-45 blur-sm" />

                                            {/* Floating Crown in corner */}
                                            <div className="absolute top-2.5 right-2.5 z-20 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-amber-200">
                                                <Crown className="w-3.5 h-3.5 fill-current" />
                                            </div>

                                            {/* Photo Container: full photo over a blurred copy (no crop, no white bars) */}
                                            <div className="relative w-full h-52 sm:h-56 rounded-xl overflow-hidden mb-2.5 bg-[#060a1a] flex items-center justify-center">
                                                <ContainedPhoto key={currentLeader.id} src={leaderPhoto} alt={currentLeader.name} />

                                                {/* Dark gradient fade-out at bottom only (borde inferior / cuello) */}
                                                <div className="absolute inset-x-0 bottom-0 h-8 z-10 bg-gradient-to-t from-[#080d24] to-transparent pointer-events-none" />
                                            </div>

                                            {leaderInfo}
                                        </div>
                                    </div>
                                ) : (
                                    /* Standard Layout for other tenants */
                                    <>
                                        {/* Leader Photo with Gold Ring & Crown Badge */}
                                        <div className="relative mb-2">
                                            <div className="w-24 h-24 rounded-full p-[3px] shadow-2xl transition-transform duration-300 group-hover:scale-105 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                                                <PlayerAvatar
                                                    key={currentLeader.id}
                                                    src={leaderPhoto}
                                                    alt={currentLeader.name}
                                                    className="w-full h-full rounded-full bg-[#091030]"
                                                    fallbackIconClassName="w-10 h-10 text-white/80"
                                                />
                                            </div>
                                            
                                            {/* Floating Crown */}
                                            <div className="absolute -top-1.5 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-1.5 rounded-full shadow-lg border border-amber-200 animate-pulse">
                                                <Crown className="w-3.5 h-3.5 fill-current" />
                                            </div>
                                        </div>

                                        {leaderInfo}
                                    </>
                                )}

                                {/* Co-leaders Interactive Faces Bar (Podio compartido) */}
                                {hasMultipleLeaders && (
                                    <div className="mt-3 pt-2.5 border-t border-white/10 w-full flex flex-col items-center">
                                        <div className="flex items-center justify-center gap-2 flex-wrap px-2">
                                            {coLeaders.map((leader, idx) => {
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
                                                                ? isFut 
                                                                    ? "ring-2 ring-amber-400 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.6)]" 
                                                                    : "ring-2 ring-amber-400 scale-110 shadow-lg"
                                                                : "opacity-60 hover:opacity-100 hover:scale-105"
                                                        )}
                                                        title={`${leader.name} (${leader.team})`}
                                                    >
                                                        <PlayerAvatar
                                                            src={getScorerPhoto(leader)}
                                                            alt={leader.name}
                                                            className="w-8 h-8 rounded-full bg-slate-900 border border-white/20"
                                                            fallbackIconClassName="w-4 h-4 text-white"
                                                        />
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
                                "p-2.5 space-y-1",
                                isFut ? "bg-[#0D1A3C]" : "bg-white"
                            )}>
                                {otherScorers.map((scorer, idx) => {
                                    const rank = getDenseRank(scorer, idx);
                                    const isLeaderRank = rank === 1;

                                    return (
                                        <div 
                                            key={scorer.id || idx} 
                                            className={cn(
                                                "flex items-center justify-between px-2.5 py-2 rounded-xl transition-all group",
                                                isLeaderRank
                                                    ? isFut 
                                                        ? "bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/15" 
                                                        : "bg-amber-50/80 border border-amber-200"
                                                    : isFut
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
                                                        : isFut 
                                                            ? "text-slate-400 group-hover:text-red-400" 
                                                            : "text-slate-400 group-hover:text-primary"
                                                )}>
                                                    {rank}
                                                </span>

                                                {/* Player Mini Avatar */}
                                                <PlayerAvatar
                                                    src={getScorerPhoto(scorer)}
                                                    alt={scorer.name}
                                                    className={cn(
                                                        "w-7 h-7 rounded-full shrink-0 border",
                                                        isLeaderRank
                                                            ? "border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)] bg-slate-900"
                                                            : isFut
                                                                ? "border-blue-800/40 bg-blue-950/60"
                                                                : "border-slate-200 bg-slate-100"
                                                    )}
                                                    fallbackIconClassName={cn(
                                                        "w-3.5 h-3.5",
                                                        isLeaderRank ? "text-amber-300" : "text-slate-400"
                                                    )}
                                                />

                                                {/* Name & Team */}
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <p className={cn(
                                                        "text-xs font-bold leading-tight line-clamp-2 break-words",
                                                        isLeaderRank 
                                                            ? "text-amber-200 font-extrabold" 
                                                            : isFut ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                                                    )}>
                                                        {scorer.name}
                                                    </p>
                                                    <Link 
                                                        to={getTeamLink(scorer.teamId) || '#'} 
                                                        className={cn(
                                                            "text-[11px] font-medium truncate hover:underline block",
                                                            isFut ? "text-slate-400 group-hover:text-blue-300" : "text-slate-500 group-hover:text-primary"
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
                                                    : isFut
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

            <ShareScorerDialog data={shareData} onClose={closeShare} />
        </div>
    );
};
