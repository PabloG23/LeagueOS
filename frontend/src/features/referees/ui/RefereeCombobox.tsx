import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, Search, Plus, Check, ChevronDown, X, User, Loader2 } from 'lucide-react';
import { Referee, leagueApi } from '@/shared/api/league-api';
import { RefereeModal } from './RefereeModal';

interface RefereeComboboxProps {
    tenantId: string;
    value?: string; // refereeId
    onChange: (referee: Referee | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const RefereeCombobox: React.FC<RefereeComboboxProps> = ({
    tenantId,
    value,
    onChange,
    placeholder = 'Seleccionar árbitro...',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [referees, setReferees] = useState<Referee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const loadReferees = async () => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            const res = await leagueApi.getReferees(tenantId);
            setReferees(res.data || []);
        } catch (error) {
            console.error('Error fetching referees in combobox:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReferees();
    }, [tenantId]);

    useEffect(() => {
        if (isOpen && tenantId) {
            loadReferees();
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedReferee = useMemo(() => {
        if (!value) return null;
        return referees.find((r) => r.id === value) || null;
    }, [value, referees]);

    const filteredReferees = useMemo(() => {
        const q = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!q) return referees;
        return referees.filter((r) => {
            const name = r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return name.includes(q);
        });
    }, [referees, searchQuery]);

    const handleSelectReferee = (referee: Referee | null) => {
        onChange(referee);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleCreatedSuccess = (newReferee: Referee) => {
        setReferees((prev) => [newReferee, ...prev.filter((r) => r.id !== newReferee.id)]);
        onChange(newReferee);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Input Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) {
                            setTimeout(() => inputRef.current?.focus(), 50);
                        }
                    }
                }}
                className={`w-full bg-white border ${
                    isOpen ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'
                } rounded-2xl px-4 py-3 text-left transition-all shadow-xs flex items-center justify-between group disabled:bg-slate-100 disabled:cursor-not-allowed`}
            >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                    {selectedReferee ? (
                        <>
                            <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center overflow-hidden shrink-0 text-[10px] font-bold text-blue-700">
                                {selectedReferee.signedPhotoUrl || selectedReferee.photoUrl ? (
                                    <img src={selectedReferee.signedPhotoUrl || selectedReferee.photoUrl} alt={selectedReferee.name} className="w-full h-full object-cover" />
                                ) : (
                                    selectedReferee.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-900 truncate">
                                {selectedReferee.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-400 font-medium truncate">
                                {placeholder}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-600">
                    {selectedReferee && !disabled && (
                        <span
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectReferee(null);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            title="Desasignar árbitro"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Input Header */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar árbitro por nombre..."
                            className="w-full bg-transparent border-none text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {/* Option: Sin árbitro asignado */}
                        <button
                            type="button"
                            onClick={() => handleSelectReferee(null)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                !selectedReferee
                                    ? 'bg-blue-50 text-blue-800 font-bold'
                                    : 'hover:bg-slate-50 text-slate-600 font-medium'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs truncate italic">Sin árbitro asignado</span>
                            </div>
                            {!selectedReferee && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                        </button>

                        {isLoading && referees.length === 0 ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                <span>Cargando árbitros...</span>
                            </div>
                        ) : filteredReferees.length > 0 ? (
                            filteredReferees.map((r) => {
                                const isSelected = selectedReferee?.id === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => handleSelectReferee(r)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                                            isSelected
                                                ? 'bg-blue-50 text-blue-900 font-bold'
                                                : 'hover:bg-slate-50 text-slate-800 font-semibold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center overflow-hidden shrink-0 text-xs font-bold text-blue-700">
                                                {r.signedPhotoUrl || r.photoUrl ? (
                                                    <img src={r.signedPhotoUrl || r.photoUrl} alt={r.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    r.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="truncate">
                                                <span className="text-xs block truncate">{r.name}</span>
                                                {r.phone && <span className="text-[10px] text-slate-400 font-normal">{r.phone}</span>}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-xs text-slate-500 font-medium">No se encontraron árbitros.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer: Register New Referee Button */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setIsCreateModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar Nuevo Árbitro</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal for creating a new referee */}
            <RefereeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                tenantId={tenantId}
                onSuccess={handleCreatedSuccess}
            />
        </div>
    );
};
