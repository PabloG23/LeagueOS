import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Plus, Check, ChevronDown, X, ExternalLink, Loader2 } from 'lucide-react';
import { SoccerField, leagueApi } from '@/shared/api/league-api';
import { FieldModal } from './FieldModal';

interface FieldComboboxProps {
    tenantId: string;
    value?: string; // fieldId
    customLocationName?: string; // fallback string name
    onChange: (field: SoccerField | null, locationName: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const FieldCombobox: React.FC<FieldComboboxProps> = ({
    tenantId,
    value,
    customLocationName = '',
    onChange,
    placeholder = 'Seleccionar cancha / ubicación',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [fields, setFields] = useState<SoccerField[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createInitialName, setCreateInitialName] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch fields on tenantId change
    const loadFields = async () => {
        if (!tenantId) return;
        setIsLoading(true);
        try {
            const res = await leagueApi.getFields(tenantId);
            setFields(res.data || []);
        } catch (error) {
            console.error('Error fetching fields in combobox:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFields();
    }, [tenantId]);

    useEffect(() => {
        if (isOpen && tenantId) {
            loadFields();
        }
    }, [isOpen]);

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setSearchQuery('');
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Current selected field
    const selectedField = useMemo(() => {
        if (value) {
            return fields.find(f => f.id === value) || null;
        }
        if (customLocationName) {
            return fields.find(f => f.name.toLowerCase() === customLocationName.toLowerCase()) || null;
        }
        return null;
    }, [fields, value, customLocationName]);

    // Filter fields by search query (O(N) in memory, insensitive to case & accents)
    const filteredFields = useMemo(() => {
        const cleanQuery = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!cleanQuery) return fields;

        return fields.filter(f => {
            const nameNorm = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return nameNorm.includes(cleanQuery);
        });
    }, [fields, searchQuery]);

    // Check if the typed query already exactly matches an existing field name
    const exactMatch = useMemo(() => {
        const cleanQuery = searchQuery.trim().toLowerCase();
        if (!cleanQuery) return true;
        return fields.some(f => f.name.trim().toLowerCase() === cleanQuery);
    }, [fields, searchQuery]);

    const handleSelectField = (field: SoccerField) => {
        onChange(field, field.name);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null, '');
    };

    const handleOpenCreateModal = (suggestedName: string) => {
        setCreateInitialName(suggestedName);
        setIsCreateModalOpen(true);
        setIsOpen(false);
    };

    const handleFieldCreated = (newField: SoccerField) => {
        setFields(prev => [newField, ...prev.filter(f => f.id !== newField.id)]);
        onChange(newField, newField.name);
    };

    // Label to show inside the trigger
    const displayLabel = selectedField ? selectedField.name : (customLocationName || '');

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }
                }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border rounded-xl cursor-pointer select-none transition-all shadow-xs ${
                    isOpen
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : 'border-slate-300 hover:border-slate-400'
                } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''}`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MapPin className={`w-4 h-4 shrink-0 ${displayLabel ? 'text-blue-600' : 'text-slate-400'}`} />
                    {displayLabel ? (
                        <span className="text-sm font-bold text-slate-900 truncate">
                            {displayLabel}
                        </span>
                    ) : (
                        <span className="text-sm font-normal text-slate-400 truncate">
                            {placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {displayLabel && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Limpiar selección"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
            </div>

            {/* GitHub-style Popover Dropdown */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Seleccionar Cancha
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-5 h-5 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Search Input Filter */}
                    <div className="p-2 border-b border-slate-100 bg-white">
                        <div className="relative flex items-center">
                            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (filteredFields.length > 0) {
                                            handleSelectField(filteredFields[0]);
                                        } else if (searchQuery.trim()) {
                                            handleOpenCreateModal(searchQuery.trim());
                                        }
                                    }
                                }}
                                placeholder="Buscar o crear una cancha..."
                                className="w-full pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {/* Fields List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100/80 bg-white">
                        {isLoading ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                <span>Cargando canchas...</span>
                            </div>
                        ) : filteredFields.length === 0 && exactMatch ? (
                            <div className="py-6 text-center text-slate-400 text-xs font-medium">
                                No se encontraron canchas registradas.
                            </div>
                        ) : (
                            filteredFields.map((field) => {
                                const isSelected = selectedField?.id === field.id || (!selectedField && customLocationName === field.name);
                                return (
                                    <div
                                        key={field.id}
                                        onClick={() => handleSelectField(field)}
                                        className={`px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors group ${
                                            isSelected ? 'bg-blue-50/70 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="w-4 flex items-center justify-center shrink-0">
                                                {isSelected ? (
                                                    <Check className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                                                ) : (
                                                    <MapPin className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs font-bold truncate leading-tight block">
                                                    {field.name}
                                                </span>
                                            </div>
                                        </div>

                                        {field.locationUrl && (
                                            <a
                                                href={field.locationUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shrink-0"
                                                title="Ver en Google Maps"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {/* GitHub-style "Create branch xxx" row */}
                        {!exactMatch && searchQuery.trim() && (
                            <>
                                <div
                                    onClick={() => handleOpenCreateModal(searchQuery.trim())}
                                    className="px-3.5 py-3 flex items-center gap-2.5 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 cursor-pointer transition-all border-t border-blue-100 font-bold text-xs"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                    <span className="truncate">
                                        Crear cancha <span className="underline font-black">"{searchQuery.trim()}"</span>
                                    </span>
                                </div>
                                <div
                                    onClick={() => {
                                        onChange(null, searchQuery.trim());
                                        setIsOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="px-3.5 py-2 flex items-center gap-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer text-[11px] font-medium transition-colors border-t border-slate-100"
                                >
                                    <span>Usar como texto simple: <strong className="text-slate-700">"{searchQuery.trim()}"</strong></span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Popover Footer */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => handleOpenCreateModal(searchQuery.trim())}
                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar nueva cancha</span>
                        </button>

                        <span className="text-[10px] font-semibold text-slate-400 px-2">
                            {fields.length} {fields.length === 1 ? 'cancha' : 'canchas'}
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Creation Modal */}
            <FieldModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                tenantId={tenantId}
                initialName={createInitialName}
                onSuccess={handleFieldCreated}
            />
        </div>
    );
};
