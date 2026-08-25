import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Search, ExternalLink, Edit2, Trash2, AlertCircle, Loader2, X } from 'lucide-react';
import { leagueApi, SoccerField } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { useToast } from '@/shared/components/ui/ToastContext';
import { FieldModal } from './FieldModal';

export const FieldsManagementView = () => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const [fields, setFields] = useState<SoccerField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fieldToEdit, setFieldToEdit] = useState<SoccerField | null>(null);
    const [fieldToDelete, setFieldToDelete] = useState<SoccerField | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const tenantId = settings?.tenantId;

    const loadFields = async (isInitial = false) => {
        if (!tenantId) return;
        if (isInitial) setIsLoading(true);
        try {
            const res = await leagueApi.getFields(tenantId);
            setFields(res.data || []);
        } catch (error) {
            console.error('Error fetching fields:', error);
            showToast('Error al cargar las canchas.', 'error');
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFields(true);
    }, [tenantId]);

    const filteredFields = useMemo(() => {
        const q = searchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!q) return fields;
        return fields.filter(f => {
            const name = (f.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const address = (f.address || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return name.includes(q) || address.includes(q);
        });
    }, [fields, searchQuery]);

    const handleOpenCreate = () => {
        setFieldToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (field: SoccerField) => {
        setFieldToEdit(field);
        setIsModalOpen(true);
    };

    const handleSaveSuccess = () => {
        loadFields(false);
    };

    const handleDeleteConfirm = async () => {
        if (!tenantId || !fieldToDelete) return;
        setIsDeleting(true);
        try {
            await leagueApi.deleteField(tenantId, fieldToDelete.id);
            showToast('Cancha eliminada exitosamente.', 'success');
            setFieldToDelete(null);
            loadFields(false);
        } catch (error) {
            console.error('Error deleting field:', error);
            showToast('No se pudo eliminar la cancha.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                        <MapPin className="w-4 h-4" />
                        <span>Sedes y Canchas</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Catálogo de Campos de Fútbol
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Administra las ubicaciones y canchas donde se celebran los partidos de la liga.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all text-sm shrink-0"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Nueva Cancha</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                            title="Limpiar búsqueda"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <span className="text-xs font-bold text-slate-500 shrink-0">
                    {filteredFields.length} {filteredFields.length === 1 ? 'cancha' : 'canchas'}
                </span>
            </div>

            {/* List / Cards */}
            {isLoading ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-semibold">Cargando catálogo de canchas...</p>
                </div>
            ) : filteredFields.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        {searchQuery ? 'No se encontraron canchas' : 'Aún no hay canchas registradas'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        {searchQuery
                            ? `No hay resultados que coincidan con "${searchQuery}".`
                            : 'Agrega las canchas de tu liga para asignarlas fácilmente al crear o editar el horario de los partidos.'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 text-xs shadow-sm mt-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Registrar primera cancha</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFields.map((field) => (
                        <div
                            key={field.id}
                            className="bg-white rounded-3xl p-5 border border-slate-200/90 transition-all duration-200 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-black text-slate-900 truncate leading-tight" title={field.name}>
                                                {field.name}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                {field.locationUrl ? (
                                    <a
                                        href={field.locationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-bold transition-colors w-max"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Abrir en Google Maps</span>
                                    </a>
                                ) : (
                                    <span className="text-[11px] text-slate-400 font-medium italic">
                                        Sin enlace de Google Maps asignado
                                    </span>
                                )}
                            </div>

                            {/* Card Actions */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => handleOpenEdit(field)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Editar</span>
                                </button>
                                <button
                                    onClick={() => setFieldToDelete(field)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Field Create/Edit Modal */}
            <FieldModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setFieldToEdit(null);
                }}
                tenantId={tenantId || ''}
                fieldToEdit={fieldToEdit}
                onSuccess={handleSaveSuccess}
            />

            {/* Confirm Delete Modal */}
            {fieldToDelete && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-black text-slate-900">
                                ¿Eliminar cancha?
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Se eliminará la cancha <span className="font-bold text-slate-800">"{fieldToDelete.name}"</span> del catálogo.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setFieldToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Eliminando...</span>
                                    </>
                                ) : (
                                    <span>Sí, eliminar</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
