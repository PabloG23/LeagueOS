
interface StatsWidgetProps {
    data: {
        team: string;
        goals: number;
    }[];
}

export const StatsWidget = ({ data }: StatsWidgetProps) => {
    // Sort data descending by goals
    const sortedData = [...data].sort((a, b) => b.goals - a.goals).slice(0, 5);
    const maxGoals = Math.max(...sortedData.map(d => d.goals));

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col bg-white">
            <div className="flex flex-col space-y-1.5 p-6 border-b">
                <h3 className="tracking-tight text-lg font-semibold flex items-center gap-2">
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
                        className="w-5 h-5 text-orange-500"
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
                                    {item.goals}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
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
