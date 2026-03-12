import React, { useState, useEffect } from 'react';
import { leagueApi, Match } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import { parseISO, format } from 'date-fns';

interface EditMatchScheduleModalProps {
    match: Match;
    isOpen: boolean;
    onClose: () => void;
    onMatchUpdated: (updatedMatch: Match) => void;
}

export const EditMatchScheduleModal: React.FC<EditMatchScheduleModalProps> = ({ match, isOpen, onClose, onMatchUpdated }) => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && match) {
            setLocation(match.location || '');
            if (match.matchDate) {
                const parsedDate = parseISO(match.matchDate);
                setDate(format(parsedDate, 'yyyy-MM-dd'));
                setTime(format(parsedDate, 'HH:mm'));
            } else {
                setDate('');
                setTime('');
            }
        }
    }, [isOpen, match]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const tenantId = settings?.tenantId;
        if (!tenantId) return;

        setIsSubmitting(true);
        try {
            // Combine date and time
            let dateTimeStr: string | null = null;
            if (date && time) {
                dateTimeStr = `${date}T${time}:00`;
            } else if (date) {
                dateTimeStr = `${date}T00:00:00`;
            }

            const updatedMatch = await leagueApi.updateMatchSchedule(
                tenantId,
                match.id,
                dateTimeStr,
                location
            );
            
            showToast('Se han guardado los cambios del partido.', 'success');
            onMatchUpdated(updatedMatch.data);
            onClose();
        } catch (error) {
            console.error('Error updating match schedule:', error);
            showToast('No se pudo guardar el horario del partido.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black bg-opacity-50">
            <div className="relative w-full max-w-md mx-auto my-6">
                <div className="relative flex flex-col w-full bg-white border border-slate-200 shadow-2xl rounded-2xl">
                    <div className="flex items-start justify-between p-5 border-b border-slate-100 border-solid rounded-t">
                        <h3 className="text-xl font-bold text-slate-800">
                            Editar Horario
                        </h3>
                        <button
                            className="p-1 ml-auto bg-transparent border-0 text-slate-400 hover:text-slate-600 float-right text-3xl leading-none font-semibold outline-none focus:outline-none transition-colors"
                            onClick={onClose}
                        >
                            <span className="h-6 w-6 text-2xl block outline-none focus:outline-none">
                                ×
                            </span>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="relative p-6 flex-auto bg-slate-50/50">
                            <div className="mb-6 text-sm text-slate-600 bg-white p-4 border border-slate-100 rounded-xl shadow-sm">
                                <p className="font-bold text-slate-800 text-lg mb-1">{match.homeTeam?.name} vs {match.awayTeam?.name}</p>
                                <p className="font-medium text-blue-600">Jornada {match.matchday}</p>
                            </div>
                            
                            <div className="mb-5 flex gap-4">
                                <div className="w-1/2">
                                    <label className="block text-slate-700 text-sm font-bold mb-2">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-slate-700 text-sm font-bold mb-2">
                                        Hora
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="mb-2">
                                <label className="block text-slate-700 text-sm font-bold mb-2">
                                    Cancha / Ubicación
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    placeholder="Ej. Cancha Principal"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end p-5 border-t border-solid border-slate-100 rounded-b bg-white">
                            <button
                                className="px-5 py-2.5 mr-2 rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
