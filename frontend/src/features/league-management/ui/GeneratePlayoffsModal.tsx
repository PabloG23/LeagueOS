import { useState, useEffect } from 'react';
import { X, Trophy, AlertTriangle, ArrowRight } from 'lucide-react';
import { leagueApi, TeamRegistration } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';

interface GeneratePlayoffsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    seasonId: string;
    onGenerated: () => void;
}

export const GeneratePlayoffsModal = ({ isOpen, onClose, tenantId, seasonId, onGenerated }: GeneratePlayoffsModalProps) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [teams, setTeams] = useState<TeamRegistration[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { showToast } = useToast();

    // Form config
    const [startingRound, setStartingRound] = useState<'FINAL' | 'SEMI_FINALS' | 'QUARTER_FINALS' | 'ROUND_OF_16'>('QUARTER_FINALS');
    const [numLegs, setNumLegs] = useState<number>(2);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setLoading(true);
        leagueApi.getEnrolledTeams(tenantId, seasonId)
            .then(res => {
                setTeams(res.data);
                // Pre-select based on round
                const maxTeams = startingRound === 'FINAL' ? 2 : startingRound === 'SEMI_FINALS' ? 4 : startingRound === 'QUARTER_FINALS' ? 8 : 16;
                setSelectedTeamIds(res.data.slice(0, maxTeams).map(t => t.team.id));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isOpen, tenantId, seasonId]);

    // Recalculate selected teams when round changes
    useEffect(() => {
        const maxTeams = startingRound === 'FINAL' ? 2 : startingRound === 'SEMI_FINALS' ? 4 : startingRound === 'QUARTER_FINALS' ? 8 : 16;
        setSelectedTeamIds(teams.slice(0, maxTeams).map(t => t.team.id));
    }, [startingRound, teams]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await leagueApi.generatePlayoffs(tenantId, seasonId, {
                startingRound,
                seededTeamIds: selectedTeamIds,
                numLegs
            });
            onGenerated();
            onClose();
            showToast("Liguilla generada correctamente.", "success");
        } catch (error) {
            console.error(error);
            showToast("Error generando liguilla. Revisa el número de clasificados.", "error");
        } finally {
            setGenerating(false);
        }
    };

    const toggleTeamSelection = (teamId: string) => {
        const next = [...selectedTeamIds];
        if (next.includes(teamId)) {
            next.splice(next.indexOf(teamId), 1);
        } else {
            next.push(teamId);
        }
        setSelectedTeamIds(next);
    }

    const expectedCount = startingRound === 'FINAL' ? 2 : startingRound === 'SEMI_FINALS' ? 4 : startingRound === 'QUARTER_FINALS' ? 8 : 16;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Generar Liguilla (Fase Final)</h2>
                            <p className="text-xs text-slate-500 font-medium">Paso {step} de 2</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-2">Formato de la Liguilla</h3>
                                <p className="text-sm text-slate-500 mb-4">¿Desde qué ronda empezará la fase final?</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'FINAL', label: 'Final Directa', desc: 'Clasifican 2 equipos' },
                                        { id: 'SEMI_FINALS', label: 'Semifinales', desc: 'Clasifican 4 equipos' },
                                        { id: 'QUARTER_FINALS', label: 'Cuartos de Final', desc: 'Clasifican 8 equipos' },
                                        { id: 'ROUND_OF_16', label: 'Octavos de Final', desc: 'Clasifican 16 equipos' },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setStartingRound(f.id as any)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${startingRound === f.id ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="font-bold text-slate-800">{f.label}</div>
                                            <div className="text-xs text-slate-500 mt-1">{f.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <h3 className="font-bold text-slate-800 mb-2">Formato de Partido</h3>
                                <div className="flex gap-4">
                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${numLegs === 1 ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="radio" checked={numLegs === 1} onChange={() => setNumLegs(1)} className="text-purple-600 focus:ring-purple-600" />
                                            <div>
                                                <div className="font-bold text-slate-800">Partido Único</div>
                                                <div className="text-xs text-slate-500">Un solo juego por llave</div>
                                            </div>
                                        </div>
                                    </label>
                                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${numLegs === 2 ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="radio" checked={numLegs === 2} onChange={() => setNumLegs(2)} className="text-purple-600 focus:ring-purple-600" />
                                            <div>
                                                <div className="font-bold text-slate-800">Ida y Vuelta</div>
                                                <div className="text-xs text-slate-500">Dos juegos (marcador global)</div>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Confirma los {expectedCount} equipos clasificados</h4>
                                    <p className="text-xs text-blue-700 mt-1">El sistema ha pre-seleccionado a los mejores posicionados. Puedes modificarlos si hay sanciones administrativas. El orden en que los selecciones definirá su posición en la tabla para armar los cruces (1ro vs 8vo, etc).</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center px-1">
                                <span className="text-sm font-bold text-slate-700">Equipos Seleccionados:</span>
                                <span className={`text-sm font-bold px-2 py-1 rounded-md ${selectedTeamIds.length === expectedCount ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {selectedTeamIds.length} / {expectedCount}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {teams.map((reg, idx) => {
                                    const isSelected = selectedTeamIds.includes(reg.team.id);
                                    const seedIdx = selectedTeamIds.indexOf(reg.team.id);

                                    return (
                                        <div
                                            key={reg.team.id}
                                            onClick={() => toggleTeamSelection(reg.team.id)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300 opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 flex items-center justify-center font-bold text-xs text-slate-400">
                                                    #{idx + 1}
                                                </div>
                                                <div className="w-8 h-8 rounded-full border bg-white overflow-hidden">
                                                    {reg.team.logoUrl ? (
                                                        <img src={reg.team.logoUrl} alt={reg.team.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                                            {reg.team.name.substring(0, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-800">{reg.team.name}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="bg-purple-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    Posición <span className="text-xs">{seedIdx + 1}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md flex items-center gap-2 transition-colors"
                            >
                                Siguiente paso
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">
                                Atrás
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={generating || selectedTeamIds.length !== expectedCount}
                                className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {generating ? 'Generando llaves...' : 'Confirmar y Generar Liguilla'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
