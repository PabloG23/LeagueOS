import { useMemo, useState, useEffect, Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Trophy, Check, Minus, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { TeamLogo } from '@/shared/components/TeamLogo';

export type TeamStanding = {
    id: string;
    rank: number;
    team: string;
    logoUrl?: string;
    signedLogoUrl?: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    form: ('W' | 'D' | 'L')[];
};

interface StandingsTableProps {
    // Can receive flat array (legacy) or mapped divisions
    data: TeamStanding[] | Record<string, TeamStanding[]>;
}

const RecentFormCell = ({ form }: { form: ('W' | 'D' | 'L')[] }) => (
    <div className="flex gap-1.5 items-center justify-center">
        {form.map((result, i) => {
            let colorClass = 'bg-slate-400';
            let Icon = Minus;
            if (result === 'W') { colorClass = 'bg-emerald-500'; Icon = Check }
            if (result === 'L') { colorClass = 'bg-rose-500'; Icon = X }

            return (
                <div
                    key={i}
                    className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm", colorClass)}
                    title={result === 'W' ? 'Ganado' : result === 'L' ? 'Perdido' : 'Empatado'}
                >
                    <Icon className="w-3 h-3" strokeWidth={3} />
                </div>
            );
        })}
    </div>
);

export const StandingsTable = ({ data }: StandingsTableProps) => {
    const { leagueSlug } = useParams<{ leagueSlug: string }>();
    const { settings } = useTenantSettings();
    const primaryColorClass = settings?.matchTickerBackgroundClass || 'bg-slate-900';

    // Normalize Data
    const isMultiDivision = !Array.isArray(data);
    const divisions = isMultiDivision ? Object.keys(data as object) : ['General'];
    const [activeTab, setActiveTab] = useState(divisions[0] || 'General');

    // Reset tab if data changes completely (e.g. tenant switch)
    useEffect(() => {
        if (isMultiDivision && !divisions.includes(activeTab)) {
            setActiveTab(divisions[0]);
        }
    }, [isMultiDivision, divisions, activeTab]);

    const currentData = useMemo(() => {
        if (Array.isArray(data)) return data;
        return data[activeTab] || [];
    }, [data, activeTab]);

    const isNuestroDeporte = settings?.themeClass === 'theme-nuestro-deporte' || settings?.tenantId === '11111111-1111-1111-1111-111111111111';

    const columns = useMemo<ColumnDef<TeamStanding>[]>(
        () => [
            {
                accessorKey: 'rank',
                header: () => <div className="text-center w-8">#</div>,
                cell: (info) => (
                    <div className="flex justify-center items-center">
                        <span className={cn(
                            "w-7 h-7 flex items-center justify-center rounded-lg font-black text-sm",
                            info.getValue<number>() === 1
                                ? isNuestroDeporte ? "bg-red-600 text-white shadow-md shadow-red-500/30" : "bg-amber-100 text-amber-900 border border-amber-300"
                                : info.getValue<number>() <= 8
                                    ? isNuestroDeporte ? "bg-blue-950/60 text-blue-300 border border-blue-800/50" : "bg-slate-100 text-slate-700"
                                    : isNuestroDeporte ? "text-slate-500" : "text-slate-400"
                        )}>
                            {info.getValue<number>()}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: 'team',
                header: 'Equipo',
                cell: (info) => (
                    <div className="min-w-[200px] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/20">
                            <TeamLogo 
                                teamName={info.getValue<string>()} 
                                logoUrl={info.row.original.signedLogoUrl || info.row.original.logoUrl} 
                                fallbackClass={cn("text-xs font-bold", isNuestroDeporte ? "text-white" : "text-slate-500")}
                            />
                        </div>
                        <Link to={`/${leagueSlug || 'default'}/team/${info.row.original.id}`} className={cn(
                            "font-bold hover:underline transition-colors text-base whitespace-nowrap block truncate",
                            isNuestroDeporte ? "text-white hover:text-blue-400" : "text-slate-800 hover:text-blue-600"
                        )}>
                            {info.getValue<string>()}
                        </Link>
                    </div>
                ),
            },
            {
                accessorKey: 'played',
                header: () => <div className="text-center">JJ</div>,
                cell: (info) => <div className={cn("text-center font-medium whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'won',
                header: () => <div className="text-center">JG</div>,
                cell: (info) => <div className={cn("text-center font-medium whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'drawn',
                header: () => <div className="text-center">JE</div>,
                cell: (info) => <div className={cn("text-center font-medium whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'lost',
                header: () => <div className="text-center">JP</div>,
                cell: (info) => <div className={cn("text-center font-medium whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'goalsFor',
                header: () => <div className="text-center hidden md:block">GF</div>,
                cell: (info) => <div className={cn("text-center font-medium hidden md:block whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'goalsAgainst',
                header: () => <div className="text-center hidden md:block">GC</div>,
                cell: (info) => <div className={cn("text-center font-medium hidden md:block whitespace-nowrap", isNuestroDeporte ? "text-slate-400" : "text-slate-500")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'goalDifference',
                header: () => <div className="text-center hidden md:block">DG</div>,
                cell: (info) => {
                    const diff = info.getValue<number>();
                    return (
                        <div className={`text-center font-bold hidden md:block whitespace-nowrap ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : isNuestroDeporte ? 'text-slate-400' : 'text-slate-500'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'points',
                header: ({ column }) => {
                    return (
                        <div
                            className={cn("flex items-center justify-center font-black cursor-pointer select-none", isNuestroDeporte ? "text-red-400" : "text-slate-900")}
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            PTS
                            <ArrowUpDown className="ml-1 h-4 w-4 text-slate-400" />
                        </div>
                    )
                },
                cell: (info) => <div className={cn("text-center font-black text-xl whitespace-nowrap", isNuestroDeporte ? "text-red-400" : "text-slate-900")}>{info.getValue<number>()}</div>,
            },
            {
                accessorKey: 'form',
                header: () => <div className="text-center whitespace-nowrap">Últimos Partidos</div>,
                cell: (info) => <RecentFormCell form={info.getValue<('W' | 'D' | 'L')[]>()} />,
            },
        ],
        [leagueSlug, isNuestroDeporte]
    );

    const table = useReactTable({
        data: currentData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className={cn(
            "rounded-2xl border overflow-hidden flex flex-col transition-colors duration-300",
            isNuestroDeporte
                ? "border-blue-900/30 bg-[#0D1A3C] text-white shadow-2xl shadow-blue-950/50"
                : "border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/40"
        )}>
            {/* Top Toolbar: Title & Legends */}
            <div className={cn(
                "p-5 border-b flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4",
                isNuestroDeporte ? "bg-[#091030]/80 border-blue-900/30" : "bg-slate-50/50 border-slate-100"
            )}>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
                    <h3 className={cn(
                        "font-bold text-lg flex items-center gap-2 whitespace-nowrap",
                        isNuestroDeporte ? "text-white font-['Bebas_Neue'] tracking-wider text-xl" : "text-slate-800"
                    )}>
                        <Trophy className={cn("w-5 h-5 drop-shadow-sm", isNuestroDeporte ? "text-red-400" : "text-amber-500")} fill="currentColor" />
                        Tabla General
                    </h3>
                </div>

                <div className={cn(
                    "flex items-center gap-3 text-xs font-medium px-3 py-1.5 rounded-lg border shadow-sm",
                    isNuestroDeporte ? "bg-[#0D1A3C] border-blue-900/40 text-slate-400" : "bg-white border-slate-100 text-slate-500"
                )}>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-emerald-500" /> Ganado</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-slate-400" /> Empatado</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-rose-500" /> Perdido</span>
                </div>
            </div>

            {/* Header Tabs (Integrados a la tabla) */}
            {isMultiDivision && divisions.length > 1 && (
                <div className={cn(
                    "flex border-b px-4 scrollbar-hide overflow-x-auto w-full justify-center",
                    isNuestroDeporte ? "bg-[#091030] border-blue-900/30" : "bg-white border-slate-200"
                )}>
                    <div className="flex space-x-8 min-w-max">
                        {divisions.map(division => {
                            const isActive = activeTab === division;
                            return (
                                <button
                                    key={division}
                                    onClick={() => setActiveTab(division)}
                                    className={cn(
                                        "py-4 px-2 text-sm font-bold relative transition-colors duration-200 ease-out whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm",
                                        isActive
                                            ? isNuestroDeporte ? "text-red-400" : "text-slate-900"
                                            : isNuestroDeporte ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {division}
                                    {isActive && (
                                        <motion.div
                                            layoutId="headerTabUnderline"
                                            className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", isNuestroDeporte ? "bg-red-500" : primaryColorClass)}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table Area */}
            <div className="relative w-full overflow-auto flex-1">
                <table className="w-full caption-bottom text-sm">
                    <thead className={cn(
                        "[&_tr]:border-b",
                        isNuestroDeporte ? "bg-[#091030]/60" : "bg-slate-50/50"
                    )}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className={cn("border-b", isNuestroDeporte ? "border-blue-900/20" : "border-slate-200")}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className={cn(
                                        "h-10 px-3 text-left align-middle font-bold uppercase tracking-widest text-[11px]",
                                        isNuestroDeporte ? "text-slate-400" : "text-slate-500"
                                    )}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className={cn("[&_tr:last-child]:border-0 relative", isNuestroDeporte ? "bg-[#0D1A3C]" : "bg-white")}>
                        <AnimatePresence mode="wait">
                            <Fragment key={activeTab}>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row, i) => (
                                        <motion.tr
                                            key={row.original.id} // Essential for proper animation when data swaps
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5, transition: { duration: 0.1 } }}
                                            transition={{ delay: i * 0.02, duration: 0.15, ease: "easeOut" }}
                                            className={cn(
                                                "border-b transition-colors group",
                                                isNuestroDeporte
                                                    ? cn(
                                                        "border-blue-900/15 hover:bg-blue-950/30",
                                                        i < 8 && "bg-blue-950/20"
                                                    )
                                                    : cn(
                                                        "border-slate-50 hover:bg-slate-50",
                                                        i < 8 && "bg-emerald-100"
                                                    )
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-3 py-3 align-middle">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </motion.tr>
                                    ))
                                ) : (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="border-b"
                                    >
                                        <td colSpan={columns.length} className="p-8 align-middle h-32 text-center text-slate-400 font-medium">
                                            No hay equipos registrados en esta fuerza.
                                        </td>
                                    </motion.tr>
                                )}
                            </Fragment>
                        </AnimatePresence>
                    </tbody >
                </table>
            </div>
        </div>
    );
};
