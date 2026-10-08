import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { PlayerYellowCardsDTO } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';

interface TopYellowCardsWidgetProps {
    data: PlayerYellowCardsDTO[];
    loading?: boolean;
}

export const TopYellowCardsWidget = ({ data = [], loading = false }: TopYellowCardsWidgetProps) => {
    const { settings } = useTenantSettings();
    const isMetepec = settings?.themeClass === 'theme-metepec' || settings?.tenantId === 'e39a6b17-5646-452d-929c-ca9a8dc4e44d';
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    const topList = data.slice(0, 5);

    return (
        <div className={cn(
            "rounded-2xl border shadow-xl h-full flex flex-col transition-colors duration-300 overflow-hidden",
            isNuestroDeporte
                ? "border-blue-900/30 bg-[#0A1224] text-white shadow-blue-950/40"
                : isMetepec
                    ? "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
                    : "border-slate-200 bg-white text-slate-900 shadow-slate-200/40"
        )}>
            <div className={cn(
                "flex items-center justify-between p-5 border-b",
                isNuestroDeporte
                    ? "bg-[#060B1A]/80 border-blue-900/30"
                    : isMetepec
                        ? "bg-slate-50/70 border-slate-100"
                        : "bg-slate-50/50 border-slate-100"
            )}>
                <h3 className={cn(
                    "tracking-tight text-lg font-bold flex items-center gap-2",
                    isNuestroDeporte ? "font-['Bebas_Neue'] tracking-wider text-xl text-white" : "text-slate-800"
                )}>
                    {/* Tarjeta Amarilla Visual */}
                    <div className="w-3.5 h-4.5 bg-amber-400 rounded-sm shadow-sm border border-amber-500/40 inline-block mr-1" />
                    Tarjetas Amarillas
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    5 = Suspensión
                </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
                {loading ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                        Cargando amonestaciones...
                    </div>
                ) : topList.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400 font-medium">
                        Sin tarjetas amarillas registradas.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {topList.map((item, index) => {
                            const playerName = item.playerName || item.name || '';
                            const teamName = item.teamName || item.team || '';
                            const count = item.yellowCards ?? item.redCards ?? 0;
                            const matchesSuspended = item.matchesSuspended ?? 0;
                            const cycleCount = count % 5 === 0 && count > 0 ? 5 : count % 5;
                            const progressPct = Math.min((cycleCount / 5) * 100, 100);
                            const isAtLimit = cycleCount >= 4;

                            return (
                                <div key={item.playerId || item.id || index} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={cn(
                                                "font-mono font-bold w-4 text-xs shrink-0",
                                                isNuestroDeporte ? "text-slate-500" : "text-slate-400"
                                            )}>
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <div className={cn(
                                                    "font-bold text-sm truncate",
                                                    isNuestroDeporte ? "text-slate-200" : "text-slate-800"
                                                )}>
                                                    {playerName}
                                                </div>
                                                <div className={cn(
                                                    "text-[11px] truncate",
                                                    isNuestroDeporte ? "text-slate-400" : "text-slate-500"
                                                )}>
                                                    {teamName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {matchesSuspended > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                                    <ShieldAlert className="w-3 h-3" /> Suspendido
                                                </span>
                                            )}
                                            <span className={cn(
                                                "font-black text-sm px-2 py-0.5 rounded-lg border",
                                                isAtLimit
                                                    ? "bg-amber-100 text-amber-900 border-amber-300"
                                                    : "bg-slate-100 text-slate-800 border-slate-200"
                                            )}>
                                                {count} 🟨
                                            </span>
                                        </div>
                                    </div>

                                    {/* Barra de progreso hacia las 5 amarillas */}
                                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isNuestroDeporte ? "bg-blue-950/60" : "bg-slate-100")}>
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                cycleCount >= 4 ? "bg-amber-500" : (isMetepec ? "bg-[#93C572]" : "bg-amber-400")
                                            )}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
