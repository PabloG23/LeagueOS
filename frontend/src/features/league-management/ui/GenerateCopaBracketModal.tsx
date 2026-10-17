import { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Sparkles, Shuffle, ArrowRight, ArrowLeft, Check, Shield, ArrowLeftRight, CheckCircle2, Search, Users, AlertCircle } from 'lucide-react';
import { leagueApi, Team } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { SecureImage } from '@/features/team-management/ui/SecureImage';

interface GenerateCopaBracketModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    seasonId: string;
    onGenerated: () => void;
}

export type CopaRoundType = 'FINAL' | 'SEMI_FINALS' | 'QUARTER_FINALS' | 'ROUND_OF_16' | 'ROUND_OF_32';

interface MatchupSlot {
    homeId: string;
    awayId: string;
}

const SEED_INDICES: Record<CopaRoundType, number[][]> = {
    FINAL: [[0, 1]],
    SEMI_FINALS: [[0, 3], [1, 2]],
    QUARTER_FINALS: [[0, 7], [3, 4], [1, 6], [2, 5]],
    ROUND_OF_16: [
        [0, 15], [7, 8], [3, 12], [4, 11],
        [1, 14], [6, 9], [2, 13], [5, 10]
    ],
    ROUND_OF_32: [
        [0, 31], [15, 16], [7, 24], [8, 23], [3, 28], [12, 19], [4, 27], [11, 20],
        [1, 30], [14, 17], [6, 25], [9, 22], [2, 29], [13, 18], [5, 26], [10, 21]
    ]
};

const ROUND_DETAILS: Record<CopaRoundType, { label: string; shortLabel: string; count: number; desc: string }> = {
    QUARTER_FINALS: { label: 'Cuartos de Final (4os)', shortLabel: 'Cuartos', count: 8, desc: '8 equipos en 4 llaves directas' },
    ROUND_OF_16: { label: 'Octavos de Final (8vos)', shortLabel: 'Octavos', count: 16, desc: '16 equipos en 8 llaves directas' },
    ROUND_OF_32: { label: 'Dieciseisavos (16vos)', shortLabel: '16vos', count: 32, desc: '32 equipos en 16 llaves directas' },
    SEMI_FINALS: { label: 'Semifinales', shortLabel: 'Semifinales', count: 4, desc: '4 equipos en 2 llaves directas' },
    FINAL: { label: 'Final Directa', shortLabel: 'Final', count: 2, desc: '2 equipos en 1 partido por el título' }
};

export const GenerateCopaBracketModal = ({
    isOpen,
    onClose,
    tenantId,
    seasonId,
    onGenerated
}: GenerateCopaBracketModalProps) => {
    // Current wizard step: 1 (Fase inicial) | 2 (Selección de Equipos) | 3 (Cruces mano a mano)
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // All available teams in the tenant
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { showToast } = useToast();

    // Step 1: Format Config
    const [startingRound, setStartingRound] = useState<CopaRoundType>('QUARTER_FINALS');
    const [numLegs, setNumLegs] = useState<number>(1); // 1 = Partido Único, 2 = Ida y Vuelta

    // Step 2: Chosen Team IDs (must equal expectedTotalTeams)
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Step 3: Matchups
    const [matchups, setMatchups] = useState<MatchupSlot[]>([]);

    // Fetch catalog of teams and current enrolled teams when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setLoading(true);
        setSearchQuery('');

        Promise.all([
            leagueApi.getTeams(tenantId),
            leagueApi.getEnrolledTeams(tenantId, seasonId).catch(() => ({ data: [] }))
        ])
            .then(([allTeamsRes, enrolledRes]) => {
                const teamsList: Team[] = (allTeamsRes.data || [])
                    .filter((t: Team) => t.isActive !== false)
                    .sort((a: Team, b: Team) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
                setAllTeams(teamsList);

                // Pre-select already enrolled teams if any
                const enrolled = enrolledRes.data || [];
                const preselected = new Set<string>();
                enrolled.forEach((reg: any) => {
                    if (reg?.team?.id) preselected.add(reg.team.id);
                });
                setSelectedTeamIds(preselected);

                // Auto-suggest round if enrolled count matches
                const count = preselected.size;
                if (count >= 32) setStartingRound('ROUND_OF_32');
                else if (count >= 16) setStartingRound('ROUND_OF_16');
                else if (count >= 8) setStartingRound('QUARTER_FINALS');
                else if (count >= 4) setStartingRound('SEMI_FINALS');
                else if (count >= 2) setStartingRound('FINAL');
            })
            .catch(err => {
                console.error("Error loading teams:", err);
                showToast("Error al cargar el catálogo de equipos.", "error");
            })
            .finally(() => setLoading(false));
    }, [isOpen, tenantId, seasonId]);

    // Derived counts
    const expectedTotalTeams = ROUND_DETAILS[startingRound].count;
    const expectedTies = expectedTotalTeams / 2;

    // Initialize matchups whenever startingRound or selected teams change
    useEffect(() => {
        setMatchups(prev => {
            if (prev.length === expectedTies) return prev;
            return Array.from({ length: expectedTies }, () => ({ homeId: '', awayId: '' }));
        });
    }, [expectedTies, startingRound]);

    // Map for fast team lookup
    const allTeamsMap = useMemo(() => {
        const map = new Map<string, Team>();
        allTeams.forEach(t => map.set(t.id, t));
        return map;
    }, [allTeams]);

    // Filtered teams for Step 2 search
    const filteredTeams = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allTeams;
        return allTeams.filter(t => t.name.toLowerCase().includes(q));
    }, [allTeams, searchQuery]);

    // List of selected Team objects
    const selectedTeamsList = useMemo(() => {
        return Array.from(selectedTeamIds)
            .map(id => allTeamsMap.get(id))
            .filter((t): t is Team => Boolean(t));
    }, [selectedTeamIds, allTeamsMap]);

    // Verification of matchups in Step 3
    const matchupAssignedIds = useMemo(() => {
        const set = new Set<string>();
        matchups.forEach(m => {
            if (m.homeId) set.add(m.homeId);
            if (m.awayId) set.add(m.awayId);
        });
        return set;
    }, [matchups]);

    const isMatchupsComplete = useMemo(() => {
        return matchups.length === expectedTies &&
            matchups.every(m => m.homeId && m.awayId && m.homeId !== m.awayId) &&
            matchupAssignedIds.size === expectedTotalTeams;
    }, [matchups, expectedTies, matchupAssignedIds, expectedTotalTeams]);

    // CRITICAL: Hooks are all declared above. Early return here is completely safe.
    if (!isOpen) return null;

    // --- STEP 2 HANDLERS ---
    const handleToggleTeam = (teamId: string) => {
        const next = new Set(selectedTeamIds);
        if (next.has(teamId)) {
            next.delete(teamId);
            setSelectedTeamIds(next);
        } else {
            if (next.size >= expectedTotalTeams) {
                showToast(`Ya tienes los ${expectedTotalTeams} equipos seleccionados para ${ROUND_DETAILS[startingRound].shortLabel}. Desmarca uno si deseas cambiarlo.`, 'info');
                return;
            }
            next.add(teamId);
            setSelectedTeamIds(next);
        }
    };

    // --- STEP 3 HANDLERS ---
    const handleUpdateSlot = (tieIndex: number, role: 'homeId' | 'awayId', teamId: string) => {
        const updated = [...matchups];
        updated[tieIndex] = { ...updated[tieIndex], [role]: teamId };
        setMatchups(updated);
    };

    const handleSwapTie = (tieIndex: number) => {
        const updated = [...matchups];
        const current = updated[tieIndex];
        updated[tieIndex] = { homeId: current.awayId, awayId: current.homeId };
        setMatchups(updated);
    };

    const handleClearSlots = () => {
        setMatchups(Array.from({ length: expectedTies }, () => ({ homeId: '', awayId: '' })));
    };

    const handleRandomDraw = () => {
        if (selectedTeamIds.size < expectedTotalTeams) {
            showToast(`Debes tener ${expectedTotalTeams} equipos seleccionados.`, 'error');
            return;
        }

        const shuffled = [...selectedTeamsList].sort(() => Math.random() - 0.5);
        const newMatchups: MatchupSlot[] = [];

        for (let i = 0; i < expectedTies; i++) {
            newMatchups.push({
                homeId: shuffled[i * 2]?.id || '',
                awayId: shuffled[i * 2 + 1]?.id || ''
            });
        }
        setMatchups(newMatchups);
        showToast("¡Cruces sorteados aleatoriamente!", "success");
    };

    // --- FINAL CONFIRMATION ---
    const handleConfirmAndGenerate = async () => {
        if (!isMatchupsComplete) {
            showToast("Completa todos los enfrentamientos antes de generar las llaves.", "error");
            return;
        }

        setGenerating(true);
        try {
            // Step A: Ensure chosen teams are enrolled in this season
            await leagueApi.enrollTeamsToSeason(tenantId, seasonId, Array.from(selectedTeamIds));

            // Step B: Map matchups into backend seed array
            const indices = SEED_INDICES[startingRound];
            const seededTeamIds = new Array<string>(expectedTotalTeams);

            matchups.forEach((m, idx) => {
                if (indices[idx]) {
                    const [homeIdx, awayIdx] = indices[idx];
                    seededTeamIds[homeIdx] = m.homeId;
                    seededTeamIds[awayIdx] = m.awayId;
                }
            });

            // Step C: Generate playoff bracket in backend
            await leagueApi.generatePlayoffs(tenantId, seasonId, {
                startingRound,
                seededTeamIds,
                numLegs
            });

            onGenerated();
            onClose();
            showToast("¡Torneo de Copa y llaves configuradas exitosamente!", "success");
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.message || "No se pudieron generar las llaves. Revisa la configuración.";
            showToast(msg, "error");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                                Torneo de Copa
                                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Eliminación Directa
                                </span>
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5">
                                Paso {step} de 3 — {
                                    step === 1 ? '¿Desde qué fase comenzará?' :
                                    step === 2 ? `Seleccionar los ${expectedTotalTeams} equipos` :
                                    'Definir emparejamientos y cruces'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                        title="Cerrar ventana"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper Progress Bar */}
                <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                    <div className={`flex items-center gap-2 font-bold ${step === 1 ? 'text-amber-600' : 'text-slate-400'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-amber-500 text-slate-950 font-black' : step > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                            {step > 1 ? '✓' : '1'}
                        </span>
                        <span>Fase Inicial</span>
                    </div>
                    <div className="flex-1 h-0.5 mx-3 bg-slate-200">
                        <div className={`h-full bg-amber-500 transition-all ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`} />
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${step === 2 ? 'text-amber-600' : 'text-slate-400'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-amber-500 text-slate-950 font-black' : step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                            {step > 2 ? '✓' : '2'}
                        </span>
                        <span>Equipos ({selectedTeamIds.size}/{expectedTotalTeams})</span>
                    </div>
                    <div className="flex-1 h-0.5 mx-3 bg-slate-200">
                        <div className={`h-full bg-amber-500 transition-all ${step < 3 ? 'w-0' : 'w-full'}`} />
                    </div>
                    <div className={`flex items-center gap-2 font-bold ${step === 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200'}`}>
                            3
                        </span>
                        <span>Cruces</span>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-20 text-center text-slate-400">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm font-semibold">Cargando catálogo de equipos...</p>
                        </div>
                    ) : step === 1 ? (
                        /* STEP 1: ELEGIR RONDA DE INICIO */
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                    ¿Desde dónde comenzará la Copa?
                                </label>
                                <p className="text-xs text-slate-500 mb-3.5">
                                    Selecciona el nivel desde el que arrancarán los enfrentamientos directos.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(['QUARTER_FINALS', 'ROUND_OF_16', 'ROUND_OF_32', 'SEMI_FINALS', 'FINAL'] as CopaRoundType[]).map(roundKey => {
                                        const details = ROUND_DETAILS[roundKey];
                                        const isSelected = startingRound === roundKey;

                                        return (
                                            <button
                                                key={roundKey}
                                                type="button"
                                                onClick={() => {
                                                    setStartingRound(roundKey);
                                                }}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-slate-900">{details.label}</span>
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                        isSelected ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {details.count} Equipos
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500">{details.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sistema de eliminatoria */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Formato de Llave
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNumLegs(1)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                            numLegs === 1
                                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            <span className="font-bold text-slate-900">Partido Único</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Un solo juego por llave. En caso de empate se define en tanda de penales.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setNumLegs(2)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                            numLegs === 2
                                                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                            <span className="font-bold text-slate-900">Ida y Vuelta</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Dos partidos por llave definidos por marcador global.
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : step === 2 ? (
                        /* STEP 2: SELECCIÓN DE EQUIPOS PARTICIPANTES */
                        <div className="space-y-4">
                            {/* Counter Status Banner */}
                            <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                selectedTeamIds.size === expectedTotalTeams
                                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        selectedTeamIds.size === expectedTotalTeams
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-amber-500/20 text-amber-800'
                                    }`}>
                                        {selectedTeamIds.size === expectedTotalTeams ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <Users className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm">
                                                {selectedTeamIds.size} de {expectedTotalTeams} equipos seleccionados
                                            </span>
                                            {selectedTeamIds.size === expectedTotalTeams && (
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                                                    Completo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs opacity-80 mt-0.5">
                                            {selectedTeamIds.size === expectedTotalTeams
                                                ? `¡Perfecto! Tienes los ${expectedTotalTeams} equipos listos para definir los cruces.`
                                                : `Faltan ${expectedTotalTeams - selectedTeamIds.size} equipos para completar los ${expectedTotalTeams} de ${ROUND_DETAILS[startingRound].shortLabel}.`
                                            }
                                        </p>
                                    </div>
                                </div>

                                {selectedTeamIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTeamIds(new Set())}
                                        className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors shrink-0 px-2.5 py-1 rounded-lg hover:bg-white"
                                    >
                                        Limpiar selección
                                    </button>
                                )}
                            </div>

                            {/* Search bar */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar equipo por nombre..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-slate-50 focus:bg-white transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Teams Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                                {filteredTeams.map(team => {
                                    const isSelected = selectedTeamIds.has(team.id);
                                    const isLimitReached = selectedTeamIds.size >= expectedTotalTeams && !isSelected;

                                    return (
                                        <button
                                            key={team.id}
                                            type="button"
                                            onClick={() => handleToggleTeam(team.id)}
                                            className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 group ${
                                                isSelected
                                                    ? 'border-amber-500 bg-amber-50/70 shadow-2xs ring-1 ring-amber-500/20'
                                                    : isLimitReached
                                                    ? 'border-slate-200 bg-slate-50/50 opacity-60 hover:opacity-80'
                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                            }`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>

                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                                                <SecureImage
                                                    srcKey={team.signedLogoUrl || team.logoUrl}
                                                    fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(team.name)}`}
                                                    alt={team.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>

                                            <span className={`text-xs font-bold truncate flex-1 ${
                                                isSelected ? 'text-slate-950 font-black' : 'text-slate-700'
                                            }`}>
                                                {team.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* STEP 3: DEFINIR CRUCES MANO A MANO */
                        <div className="space-y-5">
                            {/* Action Bar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">
                                        Emparejamientos de {ROUND_DETAILS[startingRound].label}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Define las llaves mano a mano o genera el sorteo aleatorio rápido.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleClearSlots}
                                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
                                    >
                                        Limpiar Cruces
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRandomDraw}
                                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm hover:shadow transition-all"
                                    >
                                        <Shuffle className="w-3.5 h-3.5" />
                                        <span>🎲 Sorteo Aleatorio</span>
                                    </button>
                                </div>
                            </div>

                            {/* Progress counter */}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-slate-600">
                                    Llaves armadas: {matchups.filter(m => m.homeId && m.awayId).length} de {expectedTies}
                                </span>
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    isMatchupsComplete ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {matchupAssignedIds.size} / {expectedTotalTeams} equipos asignados
                                </span>
                            </div>

                            {/* Matchups list */}
                            <div className="space-y-3">
                                {matchups.map((tie, tieIdx) => {
                                    const isComplete = Boolean(tie.homeId && tie.awayId);
                                    const homeTeam = tie.homeId ? allTeamsMap.get(tie.homeId) : null;
                                    const awayTeam = tie.awayId ? allTeamsMap.get(tie.awayId) : null;

                                    return (
                                        <div
                                            key={tieIdx}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isComplete
                                                    ? 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                                                    : 'bg-slate-50/60 border-dashed border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center">
                                                        {tieIdx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 tracking-tight">
                                                        Llave {tieIdx + 1}
                                                    </span>
                                                </div>
                                                {isComplete ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Listo
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-slate-400">
                                                        Por definir
                                                    </span>
                                                )}
                                            </div>

                                            {/* Duel Card */}
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
                                                {/* Local */}
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            Local
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl px-2.5 py-1.5 transition-all shadow-2xs">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 p-0.5 shrink-0 mr-2 flex items-center justify-center overflow-hidden">
                                                            {homeTeam ? (
                                                                <SecureImage
                                                                    srcKey={homeTeam.signedLogoUrl || homeTeam.logoUrl}
                                                                    fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(homeTeam.name)}`}
                                                                    alt={homeTeam.name}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Shield className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <select
                                                            className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer truncate pr-1"
                                                            value={tie.homeId}
                                                            onChange={e => handleUpdateSlot(tieIdx, 'homeId', e.target.value)}
                                                        >
                                                            <option value="">Seleccionar local...</option>
                                                            {selectedTeamsList.map(t => {
                                                                const isUsedElsewhere = matchupAssignedIds.has(t.id) && t.id !== tie.homeId;
                                                                return (
                                                                    <option
                                                                        key={t.id}
                                                                        value={t.id}
                                                                        disabled={isUsedElsewhere}
                                                                    >
                                                                        {t.name} {isUsedElsewhere ? '(asignado)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Swap Control */}
                                                <div className="flex justify-center items-center pt-2 md:pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSwapTie(tieIdx)}
                                                        disabled={!tie.homeId && !tie.awayId}
                                                        title="Invertir localía (intercambiar)"
                                                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700 border border-slate-200 hover:border-amber-300 flex items-center justify-center transition-all shadow-2xs group disabled:opacity-30 disabled:hover:bg-slate-100"
                                                    >
                                                        <ArrowLeftRight className="w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-300" />
                                                    </button>
                                                </div>

                                                {/* Away */}
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            Visitante
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center bg-slate-50 hover:bg-white focus-within:bg-white border border-slate-200 hover:border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 rounded-xl px-2.5 py-1.5 transition-all shadow-2xs">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 p-0.5 shrink-0 mr-2 flex items-center justify-center overflow-hidden">
                                                            {awayTeam ? (
                                                                <SecureImage
                                                                    srcKey={awayTeam.signedLogoUrl || awayTeam.logoUrl}
                                                                    fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(awayTeam.name)}`}
                                                                    alt={awayTeam.name}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <Shield className="w-4 h-4 text-slate-300" />
                                                            )}
                                                        </div>
                                                        <select
                                                            className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer truncate pr-1"
                                                            value={tie.awayId}
                                                            onChange={e => handleUpdateSlot(tieIdx, 'awayId', e.target.value)}
                                                        >
                                                            <option value="">Seleccionar visitante...</option>
                                                            {selectedTeamsList.map(t => {
                                                                const isUsedElsewhere = matchupAssignedIds.has(t.id) && t.id !== tie.awayId;
                                                                return (
                                                                    <option
                                                                        key={t.id}
                                                                        value={t.id}
                                                                        disabled={isUsedElsewhere}
                                                                    >
                                                                        {t.name} {isUsedElsewhere ? '(asignado)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep((step - 1) as 1 | 2)}
                            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Atrás</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                        {step === 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all"
                            >
                                <span>Continuar a Selección de Equipos</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedTeamIds.size !== expectedTotalTeams) {
                                        showToast(`Debes seleccionar exactamente ${expectedTotalTeams} equipos para ${ROUND_DETAILS[startingRound].label}. Actualmente hay ${selectedTeamIds.size}.`, 'error');
                                        return;
                                    }
                                    setStep(3);
                                }}
                                disabled={selectedTeamIds.size !== expectedTotalTeams}
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <span>Avanzar a Definir Cruces</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                type="button"
                                onClick={handleConfirmAndGenerate}
                                disabled={generating || !isMatchupsComplete}
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {generating ? (
                                    <>
                                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                        <span>Generando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirmar y Crear Llaves</span>
                                        <Check className="w-4 h-4 stroke-[3]" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
