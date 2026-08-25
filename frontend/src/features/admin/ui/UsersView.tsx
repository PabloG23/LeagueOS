import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Users, Plus, Search, Edit2, Trash2, AlertCircle, Loader2, Phone, MessageCircle, 
    KeyRound, Copy, Check, Shield, Eye, EyeOff, Lock, UserPlus, Power, CheckCircle2, 
    XCircle, ShieldCheck, UserCheck, UserX, RefreshCw
} from 'lucide-react';
import { leagueApi, LeagueUser, Referee } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { useToast } from '@/shared/components/ui/ToastContext';
import { AdminUserModal } from './AdminUserModal';
import { RefereeModal } from '@/features/referees/ui/RefereeModal';

type RoleFilter = 'ALL' | 'ROLE_LEAGUE_ADMIN' | 'ROLE_REFEREE' | 'ROLE_TEAM_REP';

export const UsersView = () => {
    const { settings } = useTenantSettings();
    const { showToast } = useToast();
    const tenantId = settings?.tenantId;

    const [users, setUsers] = useState<LeagueUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

    // Modals
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [isRefereeModalOpen, setIsRefereeModalOpen] = useState(false);
    const [refereeToEdit, setRefereeToEdit] = useState<Referee | null>(null);

    // Password visibility & timer
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const passwordTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
    const [copiedMap, setCopiedMap] = useState<Record<string, 'user' | 'pass' | null>>({});

    // Reset password state
    const [userToReset, setUserToReset] = useState<LeagueUser | null>(null);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [newTempPassword, setNewTempPassword] = useState<string | null>(null);
    const [copiedReset, setCopiedReset] = useState(false);

    // Delete user state
    const [userToDelete, setUserToDelete] = useState<LeagueUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toggle active state
    const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

    const loadUsers = async (isInitial = false) => {
        if (!tenantId) return;
        if (isInitial) setIsLoading(true);
        try {
            const res = await leagueApi.getUsers(tenantId);
            setUsers(res.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Error al cargar la lista de usuarios.', 'error');
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers(true);
        return () => {
            Object.values(passwordTimersRef.current).forEach(t => clearTimeout(t));
        };
    }, [tenantId]);

    const filteredUsers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return users.filter((u) => {
            // Filter by role
            if (roleFilter !== 'ALL' && u.role !== roleFilter) {
                return false;
            }

            if (!q) return true;

            const name = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const username = (u.username || '').toLowerCase();
            const phone = (u.phone || '').toLowerCase();
            const team = (u.teamName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            return name.includes(q) || username.includes(q) || phone.includes(q) || team.includes(q);
        });
    }, [users, searchQuery, roleFilter]);

    const roleCounts = useMemo(() => {
        return {
            ALL: users.length,
            ROLE_LEAGUE_ADMIN: users.filter(u => u.role === 'ROLE_LEAGUE_ADMIN').length,
            ROLE_REFEREE: users.filter(u => u.role === 'ROLE_REFEREE').length,
            ROLE_TEAM_REP: users.filter(u => u.role === 'ROLE_TEAM_REP').length,
        };
    }, [users]);

    const togglePasswordVisibility = (userId: string) => {
        setVisiblePasswords((prev) => {
            const next = !prev[userId];
            if (passwordTimersRef.current[userId]) {
                clearTimeout(passwordTimersRef.current[userId]);
            }
            if (next) {
                passwordTimersRef.current[userId] = setTimeout(() => {
                    setVisiblePasswords(curr => ({ ...curr, [userId]: false }));
                }, 10000);
            }
            return { ...prev, [userId]: next };
        });
    };

    const handleCopy = (userId: string, text: string, type: 'user' | 'pass') => {
        navigator.clipboard.writeText(text);
        setCopiedMap(prev => ({ ...prev, [userId]: type }));
        showToast(type === 'user' ? 'Usuario copiado' : 'Contraseña copiada', 'success');
        setTimeout(() => {
            setCopiedMap(prev => ({ ...prev, [userId]: null }));
        }, 2000);
    };

    const handleToggleActive = async (user: LeagueUser) => {
        if (!tenantId) return;
        setTogglingUserId(user.id);
        try {
            const res = await leagueApi.toggleUserStatus(tenantId, user.id);
            const nextActive = res.data.isActive;
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: nextActive } : u));
            showToast(nextActive ? 'Acceso de usuario activado' : 'Acceso de usuario suspendido', nextActive ? 'success' : 'info');
        } catch (error: any) {
            console.error('Error toggling user status:', error);
            const msg = error.response?.data?.message || 'Error al cambiar estado del usuario.';
            showToast(msg, 'error');
        } finally {
            setTogglingUserId(null);
        }
    };

    const handleResetPassword = async () => {
        if (!tenantId || !userToReset) return;
        setResettingPassword(true);
        try {
            const res = await leagueApi.resetUserPassword(tenantId, userToReset.id);
            const tempPass = res.data.tempPassword;
            setNewTempPassword(tempPass);
            setUsers(prev => prev.map(u => u.id === userToReset.id ? { ...u, rawPassword: tempPass } : u));
            showToast('Contraseña restablecida con éxito.', 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            showToast('No se pudo restablecer la contraseña.', 'error');
        } finally {
            setResettingPassword(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!tenantId || !userToDelete) return;
        setIsDeleting(true);
        try {
            await leagueApi.deleteUser(tenantId, userToDelete.id);
            showToast('Usuario eliminado exitosamente.', 'success');
            setUserToDelete(null);
            loadUsers(false);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            const msg = error.response?.data?.message || 'No se pudo eliminar el usuario.';
            showToast(msg, 'error');
        } finally {
            setIsDeleting(false);
        }
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

    const getWhatsAppWelcomeLink = (user: LeagueUser) => {
        if (!user.phone) return null;
        const clean = user.phone.replace(/\D/g, '');
        const phoneFormatted = clean.length === 10 ? `52${clean}` : clean;
        const leagueName = settings?.name || 'la plataforma';
        const loginUrl = `${window.location.origin}/login`;

        let roleLabel = 'Usuario';
        if (user.role === 'ROLE_LEAGUE_ADMIN') roleLabel = 'Administrador de la Liga';
        if (user.role === 'ROLE_REFEREE') roleLabel = 'Árbitro Oficial';
        if (user.role === 'ROLE_TEAM_REP') roleLabel = `Representante de ${user.teamName || 'Equipo'}`;

        const formattedName = toTitleCase(user.name || user.username);

        const text = `¡Hola ${formattedName}!

Te damos la bienvenida a *${leagueName}*.

Tus datos de acceso para la plataforma (${roleLabel}) son:
• *Usuario:* ${user.username}
• *Contraseña:* ${user.rawPassword || '••••••••'}

*Inicia sesión aquí:*
${loginUrl}

Por favor guarda estas credenciales para consultar partidos y gestionar tu información.`;

        return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Administra las cuentas de acceso para administradores, árbitros y representantes de equipo.
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setIsAdminModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all text-xs"
                    >
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span>+ Administrador</span>
                    </button>
                    <button
                        onClick={() => {
                            setRefereeToEdit(null);
                            setIsRefereeModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all text-xs"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Árbitro</span>
                    </button>
                </div>
            </div>

            {/* Filter Tabs & Full-Width Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
                {/* Role Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setRoleFilter('ALL')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                            roleFilter === 'ALL'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Todos ({roleCounts.ALL})
                    </button>
                    <button
                        onClick={() => setRoleFilter('ROLE_LEAGUE_ADMIN')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            roleFilter === 'ROLE_LEAGUE_ADMIN'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admins ({roleCounts.ROLE_LEAGUE_ADMIN})</span>
                    </button>
                    <button
                        onClick={() => setRoleFilter('ROLE_REFEREE')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            roleFilter === 'ROLE_REFEREE'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Árbitros ({roleCounts.ROLE_REFEREE})</span>
                    </button>
                    <button
                        onClick={() => setRoleFilter('ROLE_TEAM_REP')}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                            roleFilter === 'ROLE_TEAM_REP'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Representantes ({roleCounts.ROLE_TEAM_REP})</span>
                    </button>
                </div>

                {/* Full-Width Search Input */}
                <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar usuario por nombre, @usuario, teléfono o equipo..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                </div>
            </div>

            {/* Users Grid / List */}
            {isLoading ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-slate-600">Cargando usuarios...</p>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios en esta categoría'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        {searchQuery
                            ? `No hay resultados que coincidan con "${searchQuery}".`
                            : 'Registra administradores, árbitros o equipos para gestionar sus accesos.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => {
                        const isPasswordVisible = !!visiblePasswords[user.id];
                        const waLink = getWhatsAppWelcomeLink(user);
                        const isToggling = togglingUserId === user.id;

                        return (
                            <div
                                key={user.id}
                                className={`bg-white p-5 rounded-3xl border transition-all flex flex-col justify-between group shadow-2xs hover:shadow-md ${
                                    user.isActive
                                        ? 'border-slate-200 hover:border-slate-300'
                                        : 'border-rose-200/80 bg-rose-50/10'
                                }`}
                            >
                                <div>
                                    {/* Top Card: Photo/Avatar & Role & Actions */}
                                    <div className="flex items-start justify-between gap-3 mb-3.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Fixed Avatar Container */}
                                            <div className="w-12 h-12 min-w-[48px] max-w-[48px] h-[48px] rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-slate-200/80 bg-slate-100 relative">
                                                {user.role === 'ROLE_REFEREE' ? (
                                                    user.signedPhotoUrl || user.photoUrl ? (
                                                        <img
                                                            src={user.signedPhotoUrl || user.photoUrl}
                                                            alt={user.name || user.username}
                                                            className="w-full h-full object-cover object-center"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-blue-50 text-blue-700 font-black text-lg flex items-center justify-center">
                                                            {(user.name || user.username).charAt(0).toUpperCase()}
                                                        </div>
                                                    )
                                                ) : user.role === 'ROLE_TEAM_REP' ? (
                                                    user.signedTeamLogoUrl || user.teamLogoUrl ? (
                                                        <img
                                                            src={user.signedTeamLogoUrl || user.teamLogoUrl}
                                                            alt={user.teamName || user.name || ''}
                                                            className="w-full h-full object-contain p-1 bg-white"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-emerald-50 text-emerald-700 font-black text-lg flex items-center justify-center">
                                                            {(user.teamName || user.name || 'E').charAt(0).toUpperCase()}
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-900 text-blue-400 flex items-center justify-center">
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                                    {user.name || user.username}
                                                </h3>

                                                {/* Role Badge */}
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {user.role === 'ROLE_LEAGUE_ADMIN' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-200/80 text-indigo-700 px-2 py-0.5 rounded-full">
                                                            👑 Admin Liga
                                                        </span>
                                                    )}
                                                    {user.role === 'ROLE_REFEREE' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-50 border border-blue-200/80 text-blue-700 px-2 py-0.5 rounded-full">
                                                            🛡️ Árbitro
                                                        </span>
                                                    )}
                                                    {user.role === 'ROLE_TEAM_REP' && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2 py-0.5 rounded-full truncate max-w-[150px]" title={user.teamName}>
                                                            👥 {user.teamName || 'Representante'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {/* Reset password */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUserToReset(user);
                                                    setNewTempPassword(null);
                                                }}
                                                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-amber-600 transition-colors"
                                                title="Restablecer contraseña"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Delete user */}
                                            <button
                                                type="button"
                                                onClick={() => setUserToDelete(user)}
                                                className="p-1.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Credentials Box */}
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
                                                    @{user.username}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(user.id, user.username, 'user')}
                                                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                    title="Copiar usuario"
                                                >
                                                    {copiedMap[user.id] === 'user' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Password with Eye */}
                                        <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                                            <span className="text-slate-500 font-semibold">Contraseña:</span>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={`font-mono font-bold truncate text-[11px] ${
                                                    isPasswordVisible
                                                        ? user.rawPassword
                                                            ? 'text-blue-700 tracking-normal'
                                                            : 'text-amber-600 tracking-normal italic'
                                                        : 'text-slate-400 tracking-widest'
                                                }`}>
                                                    {isPasswordVisible ? (user.rawPassword || 'Sin contraseña (usa 🔑)') : '••••••••'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => togglePasswordVisibility(user.id)}
                                                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                    title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña (10 seg)'}
                                                >
                                                    {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                {user.rawPassword && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(user.id, user.rawPassword!, 'pass')}
                                                        className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                        title="Copiar contraseña"
                                                    >
                                                        {copiedMap[user.id] === 'pass' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phone / WhatsApp Welcome Section */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="font-mono truncate">{user.phone || 'Sin teléfono'}</span>
                                        </div>

                                        {waLink && (
                                            <a
                                                href={waLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors shadow-2xs shrink-0"
                                                title="Enviar mensaje de bienvenida con credenciales por WhatsApp"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Enviar Accesos</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Status & Toggle Bar */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                        <span className={`text-[11px] font-bold ${user.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {user.isActive ? 'Acceso Activo' : 'Acceso Suspendido'}
                                        </span>
                                    </div>

                                    {/* Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(user)}
                                        disabled={isToggling}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            user.isActive
                                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                        }`}
                                        title={user.isActive ? 'Desactivar acceso' : 'Habilitar acceso'}
                                    >
                                        {isToggling ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Power className="w-3 h-3" />
                                        )}
                                        <span>{user.isActive ? 'Desactivar' : 'Activar'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Admin User Modal */}
            <AdminUserModal
                isOpen={isAdminModalOpen}
                onClose={() => setIsAdminModalOpen(false)}
                onSuccess={() => loadUsers(false)}
            />

            {/* Referee Modal */}
            <RefereeModal
                isOpen={isRefereeModalOpen}
                tenantId={tenantId || ''}
                refereeToEdit={refereeToEdit}
                onClose={() => {
                    setIsRefereeModalOpen(false);
                    setRefereeToEdit(null);
                }}
                onSuccess={() => loadUsers(false)}
            />

            {/* Reset Password Modal */}
            {userToReset && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setUserToReset(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                            <KeyRound className="w-6 h-6" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-black text-slate-900">
                                Restablecer Contraseña
                            </h3>
                            <p className="text-xs text-slate-500">
                                ¿Deseas generar una nueva contraseña temporal para <strong>{userToReset.name || userToReset.username}</strong>?
                            </p>
                        </div>

                        {newTempPassword ? (
                            <div className="space-y-4 pt-2">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                                        Nueva Contraseña Generada
                                    </span>
                                    <span className="font-mono text-lg font-black text-emerald-700 tracking-wider">
                                        {newTempPassword}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(newTempPassword);
                                        setCopiedReset(true);
                                        showToast('Contraseña copiada', 'success');
                                        setTimeout(() => setCopiedReset(false), 2000);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-slate-900 text-white text-xs hover:bg-slate-800 transition-colors"
                                >
                                    {copiedReset ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    <span>{copiedReset ? 'Copiada al Portapapeles' : 'Copiar Contraseña'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUserToReset(null)}
                                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setUserToReset(null)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    disabled={resettingPassword}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                                >
                                    {resettingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    <span>Restablecer</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Delete User Modal */}
            {userToDelete && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setUserToDelete(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-black text-slate-900">
                                ¿Eliminar Usuario?
                            </h3>
                            <p className="text-xs text-slate-500">
                                Esta acción eliminará permanentemente la cuenta de <strong>{userToDelete.name || userToDelete.username}</strong> (@{userToDelete.username}).
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white text-xs shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span>Eliminar</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
