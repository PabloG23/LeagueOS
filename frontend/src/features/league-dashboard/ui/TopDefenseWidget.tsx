import { Shield } from 'lucide-react';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { cn } from '@/shared/lib/utils';

interface TopDefenseWidgetProps {
    data: {
        team: string;
        goalsAgainst: number;
    }[];
}

export const TopDefenseWidget = ({ data }: TopDefenseWidgetProps) => {
    const { settings } = useTenantSettings();
    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    // Sort data ascending by goals against (lower is better)
    const sortedData = [...data].sort((a, b) => a.goalsAgainst - b.goalsAgainst).slice(0, 5);
    const maxGoalsAgainst = Math.max(...sortedData.map(d => d.goalsAgainst), 1);

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
                    <Shield className={cn("w-5 h-5", isNuestroDeporte ? "text-emerald-400" : "text-green-500")} />
                    Mejor Defensiva
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
                                <span className={cn("font-black", isNuestroDeporte ? "text-emerald-400" : "text-primary")}>
                                    {item.goalsAgainst}
                                </span>
                            </div>
                            <div className={cn("h-2 w-full rounded-full overflow-hidden", isNuestroDeporte ? "bg-blue-950/60" : "bg-slate-100")}>
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", isNuestroDeporte ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-green-500")}
                                    style={{ width: `${(item.goalsAgainst / maxGoalsAgainst) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
