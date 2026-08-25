import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    ChevronLeft, 
    ChevronRight, 
    Check, 
    X, 
    Sparkles, 
    CalendarDays
} from 'lucide-react';
import { leagueApi, Match } from '@/shared/api/league-api';
import { useTenantSettings } from '@/shared/hooks/useTenantSettings';
import { useToast } from '@/shared/components/ui/ToastContext';
import { parseISO, format, addDays, isWeekend, startOfWeek, nextSaturday, nextSunday, isSameDay, isToday } from 'date-fns';
import { FieldCombobox } from '@/features/fields/ui/FieldCombobox';
import { RefereeCombobox } from '@/features/referees/ui/RefereeCombobox';

interface EditMatchScheduleModalProps {
    match: Match;
    isOpen: boolean;
    onClose: () => void;
    onMatchUpdated: (updatedMatch: Match) => void;
}

const SPANISH_MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SPANISH_DAYS_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const SPANISH_DAYS_LONG = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const COMMON_TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'
];

export const EditMatchScheduleModal: React.FC<EditMatchScheduleModalProps> = ({ match, isOpen, onClose, onMatchUpdated }) => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const tenantId = settings?.tenantId || (match as any)?.tenantId || '';

    const [date, setDate] = useState<string>(''); // Format: yyyy-MM-dd
    const [time, setTime] = useState<string>(''); // Format: HH:mm (24h)
    const [location, setLocation] = useState<string>('');
    const [fieldId, setFieldId] = useState<string | undefined>(undefined);
    const [refereeId, setRefereeId] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Popover states
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isTimeOpen, setIsTimeOpen] = useState(false);

    // Calendar view state (year & month displayed in calendar)
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());

    const datePickerRef = useRef<HTMLDivElement>(null);
    const timePickerRef = useRef<HTMLDivElement>(null);

    // Initialize state on open
    useEffect(() => {
        if (isOpen && match) {
            setLocation(match.location || match.field?.name || '');
            setFieldId(match.fieldId || match.field?.id || undefined);
            setRefereeId(match.refereeId || match.referee?.id || undefined);
            if (match.matchDate) {
                const parsedDate = parseISO(match.matchDate);
                setDate(format(parsedDate, 'yyyy-MM-dd'));
                setTime(format(parsedDate, 'HH:mm'));
                setCalendarDate(parsedDate);
            } else {
                setDate('');
                setTime('');
                setCalendarDate(new Date());
            }
            setIsDateOpen(false);
            setIsTimeOpen(false);
        }
    }, [isOpen, match]);

    // Close popovers on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
                setIsDateOpen(false);
            }
            if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
                setIsTimeOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Format selected date for display
    const formattedDateLabel = useMemo(() => {
        if (!date) return null;
        try {
            const [y, m, d] = date.split('-').map(Number);
            const dObj = new Date(y, m - 1, d);
            const dayName = SPANISH_DAYS_LONG[dObj.getDay()];
            const monthName = SPANISH_MONTHS[dObj.getMonth()];
            return `${dayName}, ${d} de ${monthName} ${y}`;
        } catch {
            return date;
        }
    }, [date]);

    // Format selected time for display (12h with AM/PM)
    const formattedTimeLabel = useMemo(() => {
        if (!time) return null;
        const [hStr, mStr] = time.split(':');
        const h = parseInt(hStr, 10);
        if (isNaN(h)) return time;
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${String(h12).padStart(2, '0')}:${mStr} ${period}`;
    }, [time]);

    // Time picker parts (12h system)
    const timeParts = useMemo((): { hour12: number; minute: number; period: 'AM' | 'PM' } => {
        if (!time) return { hour12: 10, minute: 0, period: 'AM' };
        const [hStr, mStr] = time.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        return { hour12, minute: m, period };
    }, [time]);

    const setTimeFromParts = (h12: number, min: number, period: 'AM' | 'PM') => {
        let h24 = h12 % 12;
        if (period === 'PM') h24 += 12;
        const formatted = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        setTime(formatted);
    };

    const handleQuickDate = (targetDate: Date) => {
        setDate(format(targetDate, 'yyyy-MM-dd'));
        setCalendarDate(targetDate);
        setIsDateOpen(false);
    };

    const adjustMinutes = (delta: number) => {
        const [hStr, mStr] = (time || '10:00').split(':');
        let totalMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
        totalMinutes = (totalMinutes + delta + 1440) % 1440;
        const newH = Math.floor(totalMinutes / 60);
        const newM = totalMinutes % 60;
        setTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    };

    // Calendar grid calculation
    const calendarDays = useMemo(() => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const days = [];
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday

        // Days from previous month
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        // Days of current month
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Days from next month to fill grid (up to 42 items for 6 rows)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [calendarDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveTenantId = tenantId || settings?.tenantId;
        if (!effectiveTenantId) return;

        setIsSubmitting(true);
        try {
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
                fieldId,
                refereeId
            );
            
            showToast('Horario, cancha y árbitro actualizados con éxito ✓', 'success');
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

    const today = new Date();
    const thisSaturday = isWeekend(today) && today.getDay() === 6 ? today : nextSaturday(today);
    const thisSunday = isWeekend(today) && today.getDay() === 0 ? today : nextSunday(today);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg mx-auto my-6 animate-in zoom-in-95 duration-200">
                <div className="relative flex flex-col w-full bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-visible">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white rounded-t-3xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    Programar Partido
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Asigna fecha, hora de juego y cancha asignada.
                                </p>
                            </div>
                        </div>
                        <button
                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                            onClick={onClose}
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="p-6 bg-slate-50/60 space-y-6">
                            
                            {/* Match Details Pill */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                                        Jornada {match.matchday || 1}
                                    </span>
                                    {match.status === 'FINISHED' && (
                                        <span className="text-xs font-bold text-slate-500">Finalizado</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-base font-black text-slate-900 mt-2">
                                    <span className="truncate">{match.homeTeam?.name || 'Equipo Local'}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/80 text-slate-400 shrink-0">VS</span>
                                    <span className="truncate">{match.awayTeam?.name || 'Equipo Visitante'}</span>
                                </div>
                            </div>
                            
                            {/* Interactive Date & Time Pickers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                
                                {/* 1. Custom Interactive Date Picker */}
                                <div className="relative" ref={datePickerRef}>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                                        Fecha de Juego
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDateOpen(!isDateOpen);
                                            setIsTimeOpen(false);
                                        }}
                                        className={`w-full bg-white border ${isDateOpen ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'} rounded-2xl px-4 py-3 text-left transition-all shadow-xs flex items-center justify-between group`}
                                    >
                                        <div className="truncate">
                                            {formattedDateLabel ? (
                                                <span className="text-sm font-bold text-slate-900 block truncate">
                                                    {formattedDateLabel}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400 font-medium">
                                                    Seleccionar fecha
                                                </span>
                                            )}
                                        </div>
                                        <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                                    </button>

                                    {/* Date Picker Popover */}
                                    {isDateOpen && (
                                        <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
                                            {/* Quick Weekend Shortcut Pills */}
                                            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDate(today)}
                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 shrink-0 transition-colors"
                                                >
                                                    Hoy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDate(thisSaturday)}
                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 shrink-0 transition-colors"
                                                >
                                                    Este Sábado
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickDate(thisSunday)}
                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 shrink-0 transition-colors"
                                                >
                                                    Este Domingo
                                                </button>
                                            </div>

                                            {/* Calendar Month & Navigation */}
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <span className="text-sm font-black text-slate-900">
                                                    {SPANISH_MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Weekday Headers */}
                                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                                {SPANISH_DAYS_SHORT.map((d, i) => (
                                                    <span key={d} className={`text-[10px] font-black uppercase ${i === 0 || i === 6 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Day Grid */}
                                            <div className="grid grid-cols-7 gap-1">
                                                {calendarDays.map((item, idx) => {
                                                    const itemStr = format(item.date, 'yyyy-MM-dd');
                                                    const isSelected = date === itemStr;
                                                    const isDayToday = isToday(item.date);
                                                    const isWeekendDay = item.date.getDay() === 0 || item.date.getDay() === 6;

                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => {
                                                                setDate(itemStr);
                                                                setIsDateOpen(false);
                                                            }}
                                                            className={`
                                                                h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-xs font-bold transition-all relative
                                                                ${isSelected 
                                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                                                                    : item.isCurrentMonth
                                                                        ? isWeekendDay 
                                                                            ? 'text-blue-900 bg-blue-50/40 hover:bg-blue-100'
                                                                            : 'text-slate-700 hover:bg-slate-100'
                                                                        : 'text-slate-300 hover:bg-slate-50'}
                                                            `}
                                                        >
                                                            {item.date.getDate()}
                                                            {isDayToday && !isSelected && (
                                                                <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Custom Interactive Time Picker */}
                                <div className="relative" ref={timePickerRef}>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        Horario
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsTimeOpen(!isTimeOpen);
                                            setIsDateOpen(false);
                                        }}
                                        className={`w-full bg-white border ${isTimeOpen ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'} rounded-2xl px-4 py-3 text-left transition-all shadow-xs flex items-center justify-between group`}
                                    >
                                        <div className="truncate">
                                            {formattedTimeLabel ? (
                                                <span className="text-sm font-bold text-slate-900 font-mono block truncate">
                                                    {formattedTimeLabel}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400 font-medium">
                                                    Seleccionar hora
                                                </span>
                                            )}
                                        </div>
                                        <Clock className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                                    </button>

                                    {/* Time Picker Popover */}
                                    {isTimeOpen && (
                                        <div className="absolute top-full right-0 mt-2 z-50 w-72 sm:w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
                                            
                                            {/* Header with Quick Adjust Steppers */}
                                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                    Ajuste Rápido
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => adjustMinutes(-15)}
                                                        className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                    >
                                                        -15m
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => adjustMinutes(15)}
                                                        className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                    >
                                                        +15m
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Custom Hour, Minute & AM/PM Selector */}
                                            <div className="flex items-center justify-center gap-2 mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                                                {/* Hour Select */}
                                                <select
                                                    value={timeParts.hour12}
                                                    onChange={(e) => setTimeFromParts(parseInt(e.target.value), timeParts.minute, timeParts.period)}
                                                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-base font-black text-slate-800 font-mono outline-none shadow-xs"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                                                        <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                                                    ))}
                                                </select>

                                                <span className="font-bold text-slate-400 font-mono">:</span>

                                                {/* Minute Select */}
                                                <select
                                                    value={timeParts.minute}
                                                    onChange={(e) => setTimeFromParts(timeParts.hour12, parseInt(e.target.value), timeParts.period)}
                                                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-base font-black text-slate-800 font-mono outline-none shadow-xs"
                                                >
                                                    {[0, 15, 30, 45].map(m => (
                                                        <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                                                    ))}
                                                </select>

                                                {/* AM/PM Toggle */}
                                                <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs font-black">
                                                    <button
                                                        type="button"
                                                        onClick={() => setTimeFromParts(timeParts.hour12, timeParts.minute, 'AM')}
                                                        className={`px-2 py-1 rounded-lg transition-all ${timeParts.period === 'AM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                                    >
                                                        AM
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTimeFromParts(timeParts.hour12, timeParts.minute, 'PM')}
                                                        className={`px-2 py-1 rounded-lg transition-all ${timeParts.period === 'PM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                                    >
                                                        PM
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Common Match Slots Chips */}
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                                    Horarios Frecuentes
                                                </span>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {COMMON_TIME_SLOTS.map((slot) => {
                                                        const isSelected = time === slot;
                                                        const [hStr, mStr] = slot.split(':');
                                                        const h = parseInt(hStr, 10);
                                                        const period = h >= 12 ? 'PM' : 'AM';
                                                        const h12 = h % 12 === 0 ? 12 : h % 12;
                                                        const label = `${h12}:${mStr} ${period}`;

                                                        return (
                                                            <button
                                                                key={slot}
                                                                type="button"
                                                                onClick={() => {
                                                                    setTime(slot);
                                                                    setIsTimeOpen(false);
                                                                }}
                                                                className={`
                                                                    px-2 py-1.5 rounded-xl text-xs font-bold font-mono transition-all text-center
                                                                    ${isSelected 
                                                                        ? 'bg-blue-600 text-white shadow-sm' 
                                                                        : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'}
                                                                `}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* 3. Field / Location Combobox */}
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

                            {/* 4. Referee Combobox */}
                            <div>
                                <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2">
                                    Árbitro Asignado
                                </label>
                                <RefereeCombobox
                                    tenantId={tenantId}
                                    value={refereeId}
                                    onChange={(selectedRef) => {
                                        setRefereeId(selectedRef ? selectedRef.id : undefined);
                                    }}
                                />
                            </div>
                        </div>
                        
                        {/* Modal Footer */}
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
                                className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Guardar Cambios</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};
