import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { leagueApi, Match } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import { parseISO, format } from 'date-fns';
import { FieldCombobox } from '@/features/fields/ui/FieldCombobox';

interface EditMatchScheduleModalProps {
    match: Match;
    isOpen: boolean;
    onClose: () => void;
    onMatchUpdated: (updatedMatch: Match) => void;
}

export const EditMatchScheduleModal: React.FC<EditMatchScheduleModalProps> = ({ match, isOpen, onClose, onMatchUpdated }) => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const tenantId = settings?.tenantId || (match as any)?.tenantId || '';
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [fieldId, setFieldId] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && match) {
            setLocation(match.location || match.field?.name || '');
            setFieldId(match.fieldId || match.field?.id || undefined);
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
        const effectiveTenantId = tenantId || settings?.tenantId;
        if (!effectiveTenantId) return;

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
                effectiveTenantId,
                match.id,
                dateTimeStr,
                location || undefined,
                fieldId
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

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md mx-auto my-6 animate-in zoom-in-95 duration-200">
                <div className="relative flex flex-col w-full bg-white border border-slate-200 shadow-2xl rounded-3xl">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white rounded-t-3xl">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            Editar Horario
                        </h3>
                        <button
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                            onClick={onClose}
                            aria-label="Cerrar"
                        >
                            <span className="text-xl font-bold leading-none">×</span>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="p-6 bg-slate-50/60 space-y-5">
                            <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                                <p className="font-black text-slate-900 text-base mb-0.5">
                                    {match.homeTeam?.name} <span className="text-slate-400 font-normal">vs</span> {match.awayTeam?.name}
                                </p>
                                <p className="font-bold text-xs text-blue-600 uppercase tracking-wider">Jornada {match.matchday}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-xs"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2">
                                        Hora
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-xs"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2">
                                    Cancha / Ubicación
                                </label>
                                <FieldCombobox
                                    tenantId={tenantId}
                                    value={fieldId}
                                    customLocationName={location}
                                    onChange={(selectedField, locName) => {
                                        setFieldId(selectedField ? selectedField.id : undefined);
                                        setLocation(locName);
                                    }}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-white rounded-b-3xl">
                            <button
                                className="px-5 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};
