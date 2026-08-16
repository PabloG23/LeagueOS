
import { User, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';

interface TopScorer {
    id: string;
    name: string;
    team: string;
    teamId?: string;
    goals: number;
    rank: number;
    image?: string;
}

interface TopScorersWidgetProps {
    scorers: TopScorer[];
}

export const TopScorersWidget = ({ scorers }: TopScorersWidgetProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    const leader = scorers[0];
    const runnersUp = scorers.slice(1);

    const getTeamLink = (teamId?: string) => {
        return `/${leagueSlug || 'ligaNuestroDeporte'}/team/${teamId || '1'}`;
    };

    return (
        <div className={cn(
            "rounded-2xl border shadow-xl overflow-hidden h-full flex flex-col transition-colors duration-300",
            isNuestroDeporte
                ? "border-blue-900/30 bg-[#0A1224] text-white shadow-blue-950/40"
                : "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
        )}>
            <div className={cn(
                "flex flex-col space-y-1.5 p-5 border-b",
                isNuestroDeporte ? "bg-[#060B1A]/80 border-blue-900/30" : "bg-slate-50/50 border-slate-100"
            )}>
                <h3 className={cn(
                    "tracking-tight text-lg font-bold flex items-center gap-2",
                    isNuestroDeporte ? "font-['Bebas_Neue'] tracking-wider text-xl text-white" : ""
                )}>
                    <Trophy className={cn("w-5 h-5", isNuestroDeporte ? "text-blue-400" : "text-amber-500")} />
                    Goleo Individual
                </h3>
            </div>

            <div className="p-0 flex-1 flex flex-col">
                {/* Hero Leader Section */}
                {leader && (
                    <div className={cn(
                        "relative p-6 text-center overflow-hidden",
                        isNuestroDeporte
                            ? "bg-gradient-to-br from-blue-900 via-blue-950 to-[#040812] text-white border-b border-blue-500/20"
                            : "bg-gradient-to-br from-sidebar via-sidebar/90 to-sidebar text-sidebar-foreground"
                    )}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className={cn(
                                "w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-xl backdrop-blur",
                                isNuestroDeporte
                                    ? "bg-blue-500/20 border-2 border-blue-400/40"
                                    : "bg-white/10 border-4 border-white/20"
                            )}>
                                <User className="w-10 h-10 text-white" />
                            </div>

                            <div className={cn(
                                "inline-flex items-center gap-1 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2",
                                isNuestroDeporte
                                    ? "bg-blue-500/20 border border-blue-400/40 text-blue-300"
                                    : "bg-yellow-400/20 border border-yellow-400/30 text-yellow-300"
                            )}>
                                #1 Líder de Goleo
                            </div>

                            <h4 className="text-xl font-bold tracking-tight mb-1">{leader.name}</h4>
                            <Link to={getTeamLink(leader.teamId)} className="text-white/70 text-sm font-medium mb-3 hover:text-white hover:underline transition-colors block">
                                {leader.team}
                            </Link>

                            <div className={cn(
                                "text-4xl font-black drop-shadow-sm",
                                isNuestroDeporte ? "text-blue-400" : "text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70"
                            )}>
                                {leader.goals}
                                <span className="text-base font-medium text-white/50 ml-1 align-baseline">Goles</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Runners Up List */}
                <div className={cn(
                    "p-4 space-y-1 flex-1",
                    isNuestroDeporte ? "bg-[#0A1224]" : "bg-white"
                )}>
                    {runnersUp.map((scorer) => (
                        <div key={scorer.id} className={cn(
                            "flex items-center justify-between p-3 rounded-xl transition-colors group",
                            isNuestroDeporte
                                ? "hover:bg-blue-950/30 border border-transparent hover:border-blue-900/30"
                                : "hover:bg-slate-50"
                        )}>
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "font-mono text-sm font-bold w-4 transition-colors",
                                    isNuestroDeporte ? "text-slate-500 group-hover:text-blue-400" : "text-slate-400 group-hover:text-primary"
                                )}>
                                    {scorer.rank}
                                </span>
                                <div>
                                    <p className={cn(
                                        "text-sm font-semibold leading-tight",
                                        isNuestroDeporte ? "text-slate-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                                    )}>
                                        {scorer.name}
                                    </p>
                                    <Link to={getTeamLink(scorer.teamId)} className={cn(
                                        "text-xs hover:underline block",
                                        isNuestroDeporte ? "text-slate-400 group-hover:text-blue-400" : "text-slate-500 group-hover:text-primary"
                                    )}>
                                        {scorer.team}
                                    </Link>
                                </div>
                            </div>
                            <span className={cn(
                                "font-bold px-2.5 py-1 rounded-lg text-xs transition-colors",
                                isNuestroDeporte
                                    ? "bg-blue-950/80 text-blue-300 border border-blue-800/40 group-hover:bg-blue-600 group-hover:text-white"
                                    : "bg-slate-100 text-slate-900 group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                                {scorer.goals}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

