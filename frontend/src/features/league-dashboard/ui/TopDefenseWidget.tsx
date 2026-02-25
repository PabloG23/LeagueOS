import { Shield } from 'lucide-react';

interface TopDefenseWidgetProps {
    data: {
        team: string;
        goalsAgainst: number;
    }[];
}

export const TopDefenseWidget = ({ data }: TopDefenseWidgetProps) => {
    // Sort data ascending by goals against (lower is better)
    const sortedData = [...data].sort((a, b) => a.goalsAgainst - b.goalsAgainst).slice(0, 5);
    // For defense bar, maybe we want relative to max, or inverse? 
    // Let's just show relative to max goals against in this set for scale.
    const maxGoalsAgainst = Math.max(...sortedData.map(d => d.goalsAgainst));

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col bg-white">
            <div className="flex flex-col space-y-1.5 p-6 border-b">
                <h3 className="tracking-tight text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Mejor Defensiva
                </h3>
            </div>
            <div className="p-6 flex-1">
                <div className="space-y-5">
                    {sortedData.map((item, index) => (
                        <div key={item.team} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-muted-foreground w-4">
                                        {index + 1}
                                    </span>
                                    <span className="font-semibold text-slate-700">
                                        {item.team}
                                    </span>
                                </div>
                                <span className="font-bold text-primary">
                                    {item.goalsAgainst}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
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
