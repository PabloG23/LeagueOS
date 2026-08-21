import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ExternalLink, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { leagueApi, SoccerField } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';

interface FieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    fieldToEdit?: SoccerField | null;
    initialName?: string;
    onSuccess: (field: SoccerField) => void;
}

export const FieldModal: React.FC<FieldModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    fieldToEdit,
    initialName = '',
    onSuccess,
}) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [locationUrl, setLocationUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (fieldToEdit) {
                setName(fieldToEdit.name || '');
                setLocationUrl(fieldToEdit.locationUrl || '');
            } else {
                setName(initialName || '');
                setLocationUrl('');
            }
        }
    }, [isOpen, fieldToEdit, initialName]);

    if (!isOpen) return null;

    const isValidUrl = (url: string) => {
        if (!url) return true;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('El nombre del campo es obligatorio.');
            return;
        }

        const trimmedUrl = locationUrl.trim();
        if (trimmedUrl && !isValidUrl(trimmedUrl)) {
            setError('Por favor ingresa una URL válida (ej. https://maps.app.goo.gl/...)');
            return;
        }

        setIsSubmitting(true);
        try {
            let savedField: SoccerField;
            if (fieldToEdit) {
                const res = await leagueApi.updateField(tenantId, fieldToEdit.id, {
                    name: trimmedName,
                    locationUrl: trimmedUrl || undefined,
                });
                savedField = res.data;
                showToast('Cancha actualizada exitosamente.', 'success');
            } else {
                const res = await leagueApi.createField(tenantId, {
                    name: trimmedName,
                    locationUrl: trimmedUrl || undefined,
                });
                savedField = res.data;
                showToast('Cancha registrada exitosamente.', 'success');
            }

            onSuccess(savedField);
            onClose();
        } catch (err: any) {
            console.error('Error saving field:', err);
            const msg = err.response?.data?.message || err.response?.data?.error || 'Error al guardar la cancha.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md mx-auto my-6 animate-in zoom-in-95 duration-200">
                <div className="relative flex flex-col w-full bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    {fieldToEdit ? 'Editar Cancha' : 'Nueva Cancha'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {fieldToEdit ? 'Modifica los datos del campo' : 'Registra un campo para asignar a los partidos'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="p-6 bg-slate-50/60 space-y-4">
                            {error && (
                                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs font-semibold">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-1.5">
                                    Nombre del Campo / Cancha <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej. Campo 1 - La Piedad"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-xs"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider">
                                        URL de Ubicación (Google Maps / Waze)
                                    </label>
                                    {locationUrl.trim() && isValidUrl(locationUrl.trim()) && (
                                        <a
                                            href={locationUrl.trim()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                        >
                                            <span>Probar mapa</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://maps.app.goo.gl/..."
                                    value={locationUrl}
                                    onChange={(e) => setLocationUrl(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-xs"
                                />
                                <p className="text-[11px] text-slate-500 font-medium mt-1">
                                    Pega el enlace compartido desde Google Maps o Waze para que los jugadores puedan abrir la ubicación en su GPS.
                                </p>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-white">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all text-sm disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>{fieldToEdit ? 'Guardar Cambios' : 'Registrar Cancha'}</span>
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
