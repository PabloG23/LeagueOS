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
import { ArrowUpDown, Trophy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';

export type TeamStanding = {
    id: string;
    rank: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    form: ('W' | 'D' | 'L')[];
};

interface StandingsTableProps {
    // Can receive flat array (legacy) or mapped divisions
    data: TeamStanding[] | Record<string, TeamStanding[]>;
}

const RecentFormCell = ({ form }: { form: ('W' | 'D' | 'L')[] }) => (
    <div className="flex gap-1 items-center justify-center">
        {form.map((result, i) => {
            let colorClass = 'bg-slate-400';
            let initial = 'E';
            if (result === 'W') { colorClass = 'bg-emerald-500'; initial = 'G' }
            if (result === 'L') { colorClass = 'bg-rose-500'; initial = 'P' }

            return (
                <div
                    key={i}
                    className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-sm", colorClass)}
                    title={result === 'W' ? 'Ganado' : result === 'L' ? 'Perdido' : 'Empatado'}
                >
                    {initial}
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

    const columns = useMemo<ColumnDef<TeamStanding>[]>(
        () => [
            {
                accessorKey: 'rank',
                header: '#',
                cell: (info) => (
                    <div className="font-bold flex items-center justify-center w-7 h-7 rounded-md bg-slate-100/80 text-slate-700 text-sm shadow-sm border border-slate-200">
                        {info.getValue<number>()}
                    </div>
                ),
            },
            {
                accessorKey: 'team',
                header: 'Equipo',
                cell: (info) => (
                    <div className="min-w-[200px]">
                        <Link to={`/${leagueSlug || 'default'}/team/${info.row.original.id}`} className="font-bold text-slate-800 hover:text-blue-600 hover:underline transition-colors text-base whitespace-nowrap block truncate">
                            {info.getValue<string>()}
                        </Link>
                    </div>
                ),
            },
            {
                accessorKey: 'played',
                header: 'JJ',
                cell: (info) => <span className="text-slate-500 font-medium whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'won',
                header: 'JG',
                cell: (info) => <span className="text-slate-500 font-medium whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'drawn',
                header: 'JE',
                cell: (info) => <span className="text-slate-500 font-medium whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'lost',
                header: 'JP',
                cell: (info) => <span className="text-slate-500 font-medium whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'goalsFor',
                header: 'GF',
                cell: (info) => <span className="text-slate-500 font-medium hidden md:table-cell whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'goalsAgainst',
                header: 'GC',
                cell: (info) => <span className="text-slate-500 font-medium hidden md:table-cell whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'points',
                header: ({ column }) => {
                    return (
                        <div
                            className="flex items-center cursor-pointer hover:text-slate-700 transition-colors font-bold text-slate-900 whitespace-nowrap"
                            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        >
                            PTS
                            <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400" />
                        </div>
                    )
                },
                cell: (info) => <span className="font-extrabold text-slate-900 text-lg whitespace-nowrap">{info.getValue<number>()}</span>,
            },
            {
                accessorKey: 'form',
                header: () => <div className="text-center whitespace-nowrap">Últimos Partidos</div>,
                cell: (info) => <RecentFormCell form={info.getValue<('W' | 'D' | 'L')[]>()} />,
            },
        ],
        [leagueSlug]
    );

    const table = useReactTable({
        data: currentData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
            {/* Top Toolbar: Title & Legends */}
            <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center bg-slate-50/50 gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
                    <h3 className="font-bold text-lg flex items-center gap-2 whitespace-nowrap text-slate-800">
                        <Trophy className="w-5 h-5 text-amber-500 drop-shadow-sm" fill="currentColor" />
                        Tabla General
                    </h3>
                </div>

                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-emerald-500" /> Ganado</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-slate-400" /> Empatado</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded shadow-sm bg-rose-500" /> Perdido</span>
                </div>
            </div>

            {/* Header Tabs (Integrados a la tabla) */}
            {isMultiDivision && divisions.length > 1 && (
                <div className="flex border-b border-slate-200 bg-white px-4 scrollbar-hide overflow-x-auto w-full justify-center">
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
                                            ? "text-slate-900"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {division}
                                    {isActive && (
                                        <motion.div
                                            layoutId="headerTabUnderline"
                                            className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", primaryColorClass)}
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
                    <thead className="[&_tr]:border-b bg-slate-50/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-slate-200">
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-10 px-3 text-left align-middle font-bold text-slate-500 uppercase tracking-widest text-[11px]">
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
                    <tbody className="[&_tr:last-child]:border-0 relative bg-white">
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
                                                "border-b border-slate-50 transition-colors hover:bg-slate-50 group",
                                                i === 0 && "bg-amber-50/30", // Highlight 1st place subtle
                                                i >= table.getRowModel().rows.length - 2 && "bg-rose-50/20" // Relegation zone subtle
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
