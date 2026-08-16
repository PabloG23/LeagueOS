
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';

interface StatsWidgetProps {
    data: {
        team: string;
        goals: number;
    }[];
}

export const StatsWidget = ({ data }: StatsWidgetProps) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    // Sort data descending by goals
    const sortedData = [...data].sort((a, b) => b.goals - a.goals).slice(0, 5);
    const maxGoals = Math.max(...sortedData.map(d => d.goals), 1);

    return (
        <div className={cn(
            "rounded-2xl border shadow-xl h-full flex flex-col transition-colors duration-300 overflow-hidden",
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
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn("w-5 h-5", isNuestroDeporte ? "text-blue-400" : "text-orange-500")}
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 7c-1.3 0-2.4.8-2.8 2h5.6c-.4-1.2-1.5-2-2.8-2z" />
                        <path d="M14.8 9L18 5" />
                        <path d="M9.2 9L6 5" />
                        <path d="M12 7V3" />
                        <path d="M16.5 14L21 16" />
                        <path d="M7.5 14L3 16" />
                        <path d="M12 21v-4" />
                    </svg>
                    Mejor Ofensiva
                </h3>
            </div>
            <div className="p-5 flex-1">
                <div className="space-y-5">
                    {sortedData.map((item, index) => (
                        <div key={item.team} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className={cn("font-mono font-bold w-4", isNuestroDeporte ? "text-slate-500" : "text-muted-foreground")}>
                                        {index + 1}
                                    </span>
                                    <span className={cn("font-semibold", isNuestroDeporte ? "text-slate-200" : "text-slate-700")}>
                                        {item.team}
                                    </span>
                                </div>
                                <span className={cn("font-black", isNuestroDeporte ? "text-blue-400" : "text-primary")}>
                                    {item.goals}
                                </span>
                            </div>
                            <div className={cn("h-2 w-full rounded-full overflow-hidden", isNuestroDeporte ? "bg-blue-950/60" : "bg-slate-100")}>
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", isNuestroDeporte ? "bg-gradient-to-r from-blue-600 to-blue-400" : "bg-orange-500")}
                                    style={{ width: `${(item.goals / maxGoals) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
