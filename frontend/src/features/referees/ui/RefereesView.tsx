import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Phone, MessageCircle, KeyRound, Copy, Check, User, Camera, Eye, EyeOff, Lock } from 'lucide-react';
import { leagueApi, Referee } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { useToast } from '@/shared/components/ui/ToastContext';
import { RefereeModal } from './RefereeModal';

export const RefereesView = () => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const [referees, setReferees] = useState<Referee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refereeToEdit, setRefereeToEdit] = useState<Referee | null>(null);
    const [refereeToDelete, setRefereeToDelete] = useState<Referee | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Password visibility state & timers (10 seconds)
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const passwordTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
    const [copiedMap, setCopiedMap] = useState<Record<string, 'user' | 'pass' | null>>({});

    // Reset password state
    const [refereeToReset, setRefereeToReset] = useState<Referee | null>(null);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [newTempPassword, setNewTempPassword] = useState<string | null>(null);
    const [copiedReset, setCopiedReset] = useState(false);

    const tenantId = settings?.tenantId;

    const loadReferees = async (isInitial = false) => {
        if (!tenantId) return;
        if (isInitial) setIsLoading(true);
        try {
            const res = await leagueApi.getReferees(tenantId);
            setReferees(res.data || []);
        } catch (error) {
            console.error('Error fetching referees:', error);
            showToast('Error al cargar los árbitros.', 'error');
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReferees(true);
        return () => {
            // Clean up password reveal timers on unmount
            Object.values(passwordTimersRef.current).forEach(t => clearTimeout(t));
        };
    }, [tenantId]);

    const filteredReferees = useMemo(() => {
        const q = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!q) return referees;
        return referees.filter((r) => {
            const name = r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const phone = (r.phone || '').toLowerCase();
            const username = (r.username || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || username.includes(q);
        });
    }, [referees, searchQuery]);

    const togglePasswordVisibility = (refereeId: string) => {
        setVisiblePasswords((prev) => {
            const isCurrentlyVisible = !!prev[refereeId];
            const nextState = !isCurrentlyVisible;

            if (passwordTimersRef.current[refereeId]) {
                clearTimeout(passwordTimersRef.current[refereeId]);
            }

            if (nextState) {
                // Auto hide after 10 seconds
                passwordTimersRef.current[refereeId] = setTimeout(() => {
                    setVisiblePasswords((current) => ({ ...current, [refereeId]: false }));
                }, 10000);
            }

            return { ...prev, [refereeId]: nextState };
        });
    };

    const handleCopyCredential = (refereeId: string, text: string, type: 'user' | 'pass') => {
        navigator.clipboard.writeText(text);
        setCopiedMap(prev => ({ ...prev, [refereeId]: type }));
        showToast(type === 'user' ? 'Usuario copiado' : 'Contraseña copiada', 'success');
        setTimeout(() => {
            setCopiedMap(prev => ({ ...prev, [refereeId]: null }));
        }, 2000);
    };

    const handleOpenCreate = () => {
        setRefereeToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (referee: Referee) => {
        setRefereeToEdit(referee);
        setIsModalOpen(true);
    };

    const handleSaveSuccess = () => {
        loadReferees(false);
    };

    const handleDeleteConfirm = async () => {
        if (!tenantId || !refereeToDelete) return;
        setIsDeleting(true);
        try {
            await leagueApi.deleteReferee(tenantId, refereeToDelete.id);
            showToast('Árbitro eliminado exitosamente.', 'success');
            setRefereeToDelete(null);
            loadReferees(false);
        } catch (error) {
            console.error('Error deleting referee:', error);
            showToast('No se pudo eliminar el árbitro.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleResetPassword = async () => {
        if (!tenantId || !refereeToReset) return;
        setResettingPassword(true);
        try {
            const res = await leagueApi.resetRefereePassword(tenantId, refereeToReset.id);
            const tempPass = res.data.tempPassword;
            setNewTempPassword(tempPass);
            // Actualizar en lista local
            setReferees(prev => prev.map(r => r.id === refereeToReset.id ? { ...r, rawPassword: tempPass } : r));
            showToast('Contraseña restablecida con éxito.', 'success');
        } catch (error) {
            console.error('Error resetting referee password:', error);
            showToast('No se pudo restablecer la contraseña.', 'error');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleCopyResetPassword = () => {
        if (!newTempPassword) return;
        navigator.clipboard.writeText(newTempPassword);
        setCopiedReset(true);
        showToast('Contraseña copiada al portapapeles', 'success');
        setTimeout(() => setCopiedReset(false), 2500);
    };

    const formatWhatsAppLink = (phone?: string) => {
        if (!phone) return null;
        const clean = phone.replace(/\D/g, '');
        // Si tiene 10 dígitos (México), anteponer 52
        const formatted = clean.length === 10 ? `52${clean}` : clean;
        return `https://wa.me/${formatted}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Cuerpo Arbitral</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Árbitros de la Liga
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Gestiona a los árbitros, sus cuentas de acceso, asignación a partidos y recepción de cédulas.
                    </p>
                </div>

                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all text-sm shrink-0"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Nuevo Árbitro</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, usuario o teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                </div>

                <span className="text-xs font-bold text-slate-500 shrink-0">
                    {filteredReferees.length} {filteredReferees.length === 1 ? 'árbitro' : 'árbitros'}
                </span>
            </div>

            {/* List / Cards */}
            {isLoading ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm font-semibold">Cargando árbitros...</p>
                </div>
            ) : filteredReferees.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        {searchQuery ? 'No se encontraron árbitros' : 'Aún no hay árbitros registrados'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        {searchQuery
                            ? `No hay resultados que coincidan con "${searchQuery}".`
                            : 'Registra a los árbitros de tu liga para asignarles partidos y permitirles subir sus reportes.'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs shadow-sm mt-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Registrar Primer Árbitro</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredReferees.map((referee) => {
                        const waLink = formatWhatsAppLink(referee.phone);
                        const isPasswordVisible = !!visiblePasswords[referee.id];
                        return (
                            <div
                                key={referee.id}
                                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Top Card: Photo & Actions */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                                {referee.signedPhotoUrl || referee.photoUrl ? (
                                                    <img
                                                        src={referee.signedPhotoUrl || referee.photoUrl}
                                                        alt={referee.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-lg font-black text-blue-700">
                                                        {referee.name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-black text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                                    {referee.name}
                                                </h3>
                                                {referee.username && (
                                                    <span className="inline-block mt-0.5 text-[11px] font-mono font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                                                        @{referee.username}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => {
                                                    setRefereeToReset(referee);
                                                    setNewTempPassword(null);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-amber-600 transition-colors"
                                                title="Restablecer contraseña"
                                            >
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(referee)}
                                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Editar árbitro"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setRefereeToDelete(referee)}
                                                className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                                                title="Eliminar árbitro"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Credentials Access Box */}
                                    <div className="mb-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Lock className="w-3 h-3 text-slate-400" />
                                                Acceso Plataforma
                                            </span>
                                            {isPasswordVisible && (
                                                <span className="text-[10px] text-amber-600 font-bold lowercase">
                                                    oculta en 10s
                                                </span>
                                            )}
                                        </div>

                                        {/* Username */}
                                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                                            <span className="text-slate-500 font-semibold">Usuario:</span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-mono font-bold text-slate-800 truncate text-[11px]">
                                                    {referee.username || 'sin usuario'}
                                                </span>
                                                {referee.username && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyCredential(referee.id, referee.username!, 'user')}
                                                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                        title="Copiar usuario"
                                                    >
                                                        {copiedMap[referee.id] === 'user' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Password with Eye toggle */}
                                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                                            <span className="text-slate-500 font-semibold">Contraseña:</span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`font-mono font-bold truncate text-[11px] ${
                                                    isPasswordVisible
                                                        ? referee.rawPassword
                                                            ? 'text-blue-700 tracking-normal'
                                                            : 'text-amber-600 tracking-normal italic'
                                                        : 'text-slate-400 tracking-widest'
                                                }`}>
                                                    {isPasswordVisible ? (referee.rawPassword || 'Sin contraseña (usa 🔑)') : '••••••••'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasswordVisibility(referee.id)}
                                                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                    title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña (10 seg)'}
                                                >
                                                    {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                {referee.rawPassword && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyCredential(referee.id, referee.rawPassword!, 'pass')}
                                                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                        title="Copiar contraseña"
                                                    >
                                                        {copiedMap[referee.id] === 'pass' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone / WhatsApp Section */}
                                    <div className="pt-3 border-t border-slate-100">
                                        {referee.phone ? (
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-mono">{referee.phone}</span>
                                                </div>
                                                {waLink && (
                                                    <a
                                                        href={waLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors shadow-2xs"
                                                        title="Enviar mensaje por WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>WhatsApp</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">
                                                Sin teléfono registrado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            <RefereeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tenantId={tenantId || ''}
                refereeToEdit={refereeToEdit}
                onSuccess={handleSaveSuccess}
            />

            {/* Reset Password Modal */}
            {refereeToReset && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    Restablecer Contraseña
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {refereeToReset.name} ({refereeToReset.username || 'sin usuario'})
                                </p>
                            </div>
                        </div>

                        {newTempPassword ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                    <p className="text-xs font-bold text-emerald-900">
                                        ✅ ¡Nueva contraseña temporal generada!
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Contraseña
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-base font-black text-blue-600 truncate tracking-wider">
                                            {newTempPassword}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyResetPassword}
                                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs"
                                        >
                                            {copiedReset ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiedReset ? 'Copiado' : 'Copiar'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRefereeToReset(null);
                                            setNewTempPassword(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs"
                                    >
                                        Listo y Cerrar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    ¿Estás seguro de generar una nueva contraseña temporal para <strong>{refereeToReset.name}</strong>? La contraseña anterior dejará de funcionar inmediatamente.
                                </p>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRefereeToReset(null)}
                                        disabled={resettingPassword}
                                        className="px-4 py-2 rounded-xl font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        disabled={resettingPassword}
                                        className="px-5 py-2 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-all text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                    >
                                        {resettingPassword ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Generando...</span>
                                            </>
                                        ) : (
                                            <span>Generar Nueva Contraseña</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {refereeToDelete && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Eliminar Árbitro</h3>
                                <p className="text-xs text-slate-500 font-medium">Esta acción no se puede deshacer.</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            ¿Estás seguro de eliminar a <strong>{refereeToDelete.name}</strong>? Se eliminará su cuenta de usuario y se desasignará de cualquier partido programado.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setRefereeToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Eliminando...</span>
                                    </>
                                ) : (
                                    <span>Eliminar Árbitro</span>
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
