import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Save, Loader2, AlertCircle, Copy, Check, Camera, User, Phone, KeyRound } from 'lucide-react';
import { leagueApi, Referee, RefereeCreated } from '@/shared/api/league-api';
import { useToast } from '@/shared/components/ui/ToastContext';

interface RefereeModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    refereeToEdit?: Referee | null;
    onSuccess: (referee: Referee) => void;
}

export const RefereeModal: React.FC<RefereeModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    refereeToEdit,
    onSuccess,
}) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado para mostrar credenciales generadas tras creación
    const [createdCredentials, setCreatedCredentials] = useState<{
        username: string;
        tempPassword?: string;
        name: string;
    } | null>(null);
    const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setCreatedCredentials(null);
            setCopiedField(null);
            setPhotoFile(null);
            if (refereeToEdit) {
                setName(refereeToEdit.name || '');
                setPhone(refereeToEdit.phone || '');
                setPhotoPreview(refereeToEdit.signedPhotoUrl || refereeToEdit.photoUrl || null);
            } else {
                setName('');
                setPhone('');
                setPhotoPreview(null);
            }
        }
    }, [isOpen, refereeToEdit]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('La imagen no debe superar los 10MB.');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleCopy = (text: string, field: 'username' | 'password') => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        showToast('Copiado al portapapeles', 'success');
        setTimeout(() => setCopiedField(null), 2500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('El nombre del árbitro es requerido.');
            return;
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone && cleanPhone.length !== 10) {
            setError('El teléfono debe tener exactamente 10 dígitos numéricos.');
            return;
        }

        setIsSubmitting(true);

        try {
            if (refereeToEdit) {
                // Actualización
                const res = await leagueApi.updateReferee(tenantId, refereeToEdit.id, {
                    name: trimmedName,
                    phone: phone.trim() || undefined,
                });

                let updatedReferee = res.data;
                if (photoFile) {
                    const photoRes = await leagueApi.uploadRefereePhoto(tenantId, refereeToEdit.id, photoFile);
                    updatedReferee = photoRes.data;
                }

                showToast('Árbitro actualizado exitosamente.', 'success');
                onSuccess(updatedReferee);
                onClose();
            } else {
                // Creación
                const res = await leagueApi.createReferee(tenantId, {
                    name: trimmedName,
                    phone: phone.trim() || undefined,
                });

                let createdRef: RefereeCreated = res.data;

                if (photoFile) {
                    try {
                        const photoRes = await leagueApi.uploadRefereePhoto(tenantId, createdRef.id, photoFile);
                        createdRef = { ...createdRef, ...photoRes.data };
                    } catch (photoErr) {
                        console.error('Error uploading referee photo on create:', photoErr);
                    }
                }

                showToast('Árbitro creado exitosamente.', 'success');
                onSuccess(createdRef);

                // Mostrar pantalla con credenciales si viene contraseña temporal
                if (createdRef.tempPassword && createdRef.username) {
                    setCreatedCredentials({
                        name: createdRef.name,
                        username: createdRef.username,
                        tempPassword: createdRef.tempPassword,
                    });
                } else {
                    onClose();
                }
            }
        } catch (err: any) {
            console.error('Error saving referee:', err);
            setError(err.response?.data?.message || err.response?.data || 'Error al guardar el árbitro. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg mx-auto my-6 animate-in zoom-in-95 duration-200">
                <div className="relative flex flex-col w-full bg-white border border-slate-200 shadow-2xl rounded-3xl overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    {createdCredentials ? 'Credenciales del Árbitro' : (refereeToEdit ? 'Editar Árbitro' : 'Registrar Nuevo Árbitro')}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {createdCredentials ? 'Guarda estos datos para proporcionárselos al árbitro.' : 'Gestiona los datos y acceso del árbitro de la liga.'}
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

                    {/* Content: Pantalla de Credenciales O Formulario */}
                    {createdCredentials ? (
                        <div className="p-6 space-y-6 bg-slate-50/50">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                <p className="text-sm font-bold text-emerald-900">
                                    ✅ ¡Cuenta creada exitosamente para {createdCredentials.name}!
                                </p>
                                <p className="text-xs text-emerald-700 mt-1">
                                    El árbitro puede iniciar sesión en la plataforma con estas credenciales para consultar sus partidos y subir las cédulas de juego.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Username */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                        Usuario
                                    </span>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-base font-bold text-slate-900 truncate">
                                            {createdCredentials.username}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(createdCredentials.username, 'username')}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                        >
                                            {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiedField === 'username' ? 'Copiado' : 'Copiar'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Temp Password */}
                                {createdCredentials.tempPassword && (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                                            Contraseña Temporal
                                        </span>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-base font-black text-blue-600 truncate tracking-wider">
                                                {createdCredentials.tempPassword}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(createdCredentials.tempPassword!, 'password')}
                                                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                                            >
                                                {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copiedField === 'password' ? 'Copiado' : 'Copiar'}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
                                <KeyRound className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                    Podrás consultar y copiar estas credenciales en cualquier momento desde el catálogo de árbitros usando el botón del ojo.
                                </p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all text-sm"
                                >
                                    Listo y Finalizar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="p-6 space-y-5 bg-slate-50/50">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 animate-in fade-in">
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-xs font-semibold text-red-800">{error}</p>
                                    </div>
                                )}

                                {/* Photo Selector */}
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-slate-300 group-hover:border-blue-500 overflow-hidden flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                                             onClick={() => fileInputRef.current?.click()}
                                        >
                                            {photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                                    <Camera className="w-7 h-7 mb-1" />
                                                    <span className="text-[10px] font-bold">Foto</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors"
                                            title="Subir foto"
                                        >
                                            <Camera className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                    />
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        PNG, JPG o WEBP (máx. 10MB)
                                    </span>
                                </div>

                                {/* Name Field */}
                                <div>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-blue-600" />
                                        Nombre Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="ej. Juan Carlos Pérez Gómez"
                                        className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {/* Phone Field */}
                                <div>
                                    <label className="block text-slate-800 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        Teléfono (WhatsApp) <span className="text-slate-400 font-normal text-[11px]">(Opcional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="ej. 6671234567"
                                        className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all shadow-xs font-mono"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Se creará un enlace directo de WhatsApp para comunicarte rápidamente con él.
                                    </p>
                                </div>

                                {!refereeToEdit && (
                                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl">
                                        <p className="text-[11px] text-blue-800 font-medium">
                                            ℹ️ Al crear el árbitro, el sistema generará automáticamente su usuario y contraseña para que pueda ingresar a LeagueOS.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
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
                                    className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{refereeToEdit ? 'Guardar Cambios' : 'Registrar Árbitro'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
