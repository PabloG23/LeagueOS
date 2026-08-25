import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Shield, KeyRound, Copy, Check, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { leagueApi, LeagueUser, CreateAdminRequest } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';

interface AdminUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: LeagueUser) => void;
}

export const AdminUserModal = ({ isOpen, onClose, onSuccess }: AdminUserModalProps) => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const tenantId = settings?.tenantId;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [createdAdmin, setCreatedAdmin] = useState<LeagueUser | null>(null);
    const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setUsername('');
            setPassword('');
            setErrors({});
            setCreatedAdmin(null);
            setCopiedField(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setCreatedAdmin(null);
        setName('');
        setPhone('');
        setUsername('');
        setPassword('');
        setErrors({});
        setCopiedField(null);
        onClose();
    };

    if (!isOpen) return null;

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) {
            errs.name = 'El nombre del administrador es obligatorio.';
        }
        if (phone.trim()) {
            const clean = phone.replace(/\D/g, '');
            if (clean.length !== 10) {
                errs.phone = 'El teléfono debe tener exactamente 10 dígitos numéricos.';
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !tenantId) return;

        setIsSubmitting(true);
        try {
            const payload: CreateAdminRequest = {
                name: name.trim(),
                phone: phone.trim() ? phone.trim() : undefined,
                username: username.trim() ? username.trim() : undefined,
                password: password.trim() ? password.trim() : undefined,
            };

            const res = await leagueApi.createAdminUser(tenantId, payload);
            setCreatedAdmin(res.data);
            showToast('¡Administrador creado con éxito!', 'success');
            onSuccess(res.data);
        } catch (error: any) {
            console.error('Error creating admin user:', error);
            const msg = error.response?.data?.message || 'Error al crear el administrador.';
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = (text: string, field: 'username' | 'password') => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        showToast(field === 'username' ? 'Usuario copiado' : 'Contraseña copiada', 'success');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const toTitleCase = (str?: string) => {
        if (!str) return '';
        return str
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getWhatsAppUrl = () => {
        if (!createdAdmin || !createdAdmin.phone) return null;
        const clean = createdAdmin.phone.replace(/\D/g, '');
        const phoneFormatted = clean.length === 10 ? `52${clean}` : clean;
        const leagueName = settings?.name || 'la plataforma';
        const loginUrl = `${window.location.origin}/login`;

        const formattedName = toTitleCase(createdAdmin.name || createdAdmin.username);

        const text = `¡Hola ${formattedName}!

Has sido registrado como Administrador en *${leagueName}*.

Tus datos de acceso para la plataforma son:
• *Usuario:* ${createdAdmin.username}
• *Contraseña:* ${createdAdmin.rawPassword}

*Inicia sesión aquí:*
${loginUrl}

¡Bienvenido al equipo de gestión!`;

        return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(text)}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-white">
                                {createdAdmin ? 'Credenciales de Administrador' : 'Nuevo Administrador'}
                            </h2>
                            <p className="text-xs text-blue-200">
                                {createdAdmin ? 'Acceso administrativo generado' : 'Crear cuenta con acceso total a la liga'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                {createdAdmin ? (
                    <div className="p-6 space-y-5 bg-slate-50/50">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                            <p className="text-sm font-bold text-emerald-900">
                                ✅ Administrador registrado exitosamente
                            </p>
                            <p className="text-xs text-emerald-700 mt-1">
                                {createdAdmin.name} ahora tiene acceso administrativo a la liga.
                            </p>
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            {/* Username */}
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                    Usuario
                                </span>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-sm font-bold text-slate-900">
                                        @{createdAdmin.username}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(createdAdmin.username, 'username')}
                                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors"
                                    >
                                        {copiedField === 'username' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedField === 'username' ? 'Copiado' : 'Copiar'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="pt-3 border-t border-slate-100">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                    Contraseña
                                </span>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-sm font-black text-blue-600">
                                        {createdAdmin.rawPassword}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(createdAdmin.rawPassword || '', 'password')}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors"
                                    >
                                        {copiedField === 'password' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiedField === 'password' ? 'Copiado' : 'Copiar'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Welcome Button */}
                        {createdAdmin.phone && getWhatsAppUrl() && (
                            <a
                                href={getWhatsAppUrl()!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-md shadow-emerald-600/20 transition-all"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span>Enviar Credenciales por WhatsApp</span>
                            </a>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full px-5 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 text-sm shadow-sm transition-all"
                            >
                                Listo y Cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Nombre Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                }}
                                placeholder="Ej. Roberto Méndez"
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${
                                    errors.name ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                            />
                            {errors.name && <p className="text-xs font-semibold text-red-600 mt-1">{errors.name}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Teléfono (WhatsApp) <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                            </label>
                            <input
                                type="tel"
                                maxLength={10}
                                value={phone}
                                onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setPhone(cleanVal);
                                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                placeholder="Ej. 7221234567"
                                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 text-sm font-semibold font-mono focus:outline-none focus:ring-2 transition-all ${
                                    errors.phone ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                            />
                            {errors.phone && <p className="text-xs font-semibold text-red-600 mt-1">{errors.phone}</p>}
                        </div>

                        {/* Custom Username */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Nombre de Usuario <span className="text-slate-400 font-normal lowercase">(opcional, auto-generado)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm font-bold">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    placeholder="admin_nombre"
                                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Custom Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Contraseña Inicial <span className="text-slate-400 font-normal lowercase">(opcional, auto-generada)</span>
                            </label>
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Dejar en blanco para generar aleatoria"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Creando...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Crear Administrador</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};
