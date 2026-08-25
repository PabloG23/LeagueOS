import { X, Upload, Save, Shield, AlertTriangle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { SecureImage } from '@/features/team-management/ui/SecureImage';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (team: {
        name: string;
        representative?: { firstName: string; lastName: string; phone?: string };
        logoUrl: string;
        logoFile?: File;
    }) => Promise<void> | void;
    teamToEdit?: {
        id?: string;
        name: string;
        representative?: { firstName?: string; lastName?: string; phone?: string };
        representativeName?: string;
        representativePhone?: string;
        logoUrl?: string;
    };
    existingTeams?: { id: string; name: string }[];
}

export const AddTeamModal = ({ isOpen, onClose, onSave, teamToEdit, existingTeams = [] }: AddTeamModalProps) => {
    const { settings } = useTenantSettings();
    const isSanLucas = settings.tenantId === '22222222-2222-2222-2222-222222222222';

    const [name, setName] = useState('');
    const [representativeName, setRepresentativeName] = useState('');
    const [representativePhone, setRepresentativePhone] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to populate form when editing
    useEffect(() => {
        if (teamToEdit && isOpen) {
            setName(teamToEdit.name || '');

            let repFullName = '';
            let repPhone = '';

            if (teamToEdit.representative) {
                repFullName = `${teamToEdit.representative.firstName || ''} ${teamToEdit.representative.lastName || ''}`.trim();
                repPhone = (teamToEdit.representative.phone || '').replace(/\D/g, '').slice(0, 10);
            }

            if (!repFullName && teamToEdit.representativeName) {
                repFullName = teamToEdit.representativeName.trim();
            }

            if (!repPhone && teamToEdit.representativePhone) {
                repPhone = teamToEdit.representativePhone.replace(/\D/g, '').slice(0, 10);
            }

            setRepresentativeName(repFullName);
            setRepresentativePhone(repPhone);
            setLogoFile(null);
            setPreviewUrl(null);
        } else if (!teamToEdit && isOpen) {
            setName('');
            setRepresentativeName('');
            setRepresentativePhone('');
            setLogoFile(null);
            setPreviewUrl(null);
        }
        setErrors({});
        setIsSubmitting(false);
    }, [teamToEdit, isOpen]);

    if (!isOpen) return null;

    const isNameDuplicate = existingTeams.some(
        t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.id !== teamToEdit?.id
    );

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrors(prev => ({ ...prev, logo: 'Por favor selecciona un formato de imagen válido (PNG, JPG, SVG, WebP).' }));
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, logo: 'El archivo es demasiado grande (máximo 20MB).' }));
            return;
        }

        setLogoFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setErrors(prev => ({ ...prev, logo: '' }));
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = 'El nombre del equipo es obligatorio';
        
        if (!representativeName.trim()) {
            newErrors.representativeName = 'El nombre del representante es obligatorio';
        } else if (/\d/.test(representativeName)) {
            newErrors.representativeName = 'El nombre solo debe contener letras, sin números';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(representativeName.trim())) {
            newErrors.representativeName = 'Solo se permiten letras y espacios';
        }

        const cleanPhone = representativePhone.replace(/\D/g, '');
        if (!cleanPhone) {
            newErrors.representativePhone = 'El teléfono es obligatorio para enviar sus credenciales';
        } else if (cleanPhone.length !== 10) {
            newErrors.representativePhone = 'El teléfono debe tener exactamente 10 dígitos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || isNameDuplicate || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const photo = teamToEdit?.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`;
            await onSave({
                name,
                logoUrl: photo,
                logoFile: logoFile || undefined,
                representative: {
                    firstName: representativeName.split(' ')[0],
                    lastName: representativeName.split(' ').slice(1).join(' '),
                    phone: representativePhone
                }
            });

            // Reset form
            setName('');
            setRepresentativeName('');
            setRepresentativePhone('');
            setLogoFile(null);
            setPreviewUrl(null);
            setErrors({});
            onClose();
        } catch (err: any) {
            setErrors(prev => ({ ...prev, submit: err.message || 'Error al guardar el equipo.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {teamToEdit ? 'Actualizar Equipo' : 'Registrar Nuevo Equipo'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 flex flex-col max-h-[80vh] overflow-y-auto">
                    {/* Photo Dropzone */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Escudo</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileSelect(e.target.files[0]);
                                }
                            }}
                        />

                        {previewUrl ? (
                            <div className="relative border-2 border-blue-200 bg-blue-50/40 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-white border border-blue-200 p-1 shadow-sm overflow-hidden flex items-center justify-center">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{logoFile?.name}</p>
                                        <p className="text-xs text-blue-600 font-medium">Nueva imagen lista para guardar</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors text-xs font-semibold"
                                    >
                                        Cambiar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLogoFile(null);
                                            setPreviewUrl(null);
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : teamToEdit?.logoUrl ? (
                            <div className="relative border-2 border-slate-200 rounded-xl p-4 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 shadow-sm overflow-hidden flex items-center justify-center">
                                        <SecureImage
                                            srcKey={teamToEdit.logoUrl}
                                            fallbackSrc={`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(teamToEdit.name)}`}
                                            alt={teamToEdit.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Escudo actual</p>
                                        <p className="text-xs text-slate-500">Haz clic en cambiar para subir una nueva imagen</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition-colors"
                                >
                                    Cambiar Escudo
                                </button>
                            </div>
                        ) : (
                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                                    ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                                `}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handleFileSelect(e.dataTransfer.files[0]);
                                    }
                                }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-900">Arrastra una imagen o haz clic para seleccionar</p>
                                <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG o WebP hasta 5MB</p>
                            </div>
                        )}
                        {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nombre del Equipo *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors({ ...errors, name: '' });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-slate-900 bg-white font-medium ${
                                errors.name || isNameDuplicate
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50' 
                                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                            }`}
                            placeholder="Ej. Atlético San Lucas"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        {isNameDuplicate && !errors.name && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                Este nombre ya está en uso por otro equipo.
                            </p>
                        )}
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                        <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                            💡 Al registrar el equipo se generará automáticamente el usuario y contraseña del representante para acceder al sistema.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Representante *</label>
                            <input
                                type="text"
                                value={representativeName}
                                onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/[0-9]/g, '');
                                    setRepresentativeName(cleanVal);
                                    if (errors.representativeName) setErrors({ ...errors, representativeName: '' });
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 bg-white font-medium ${errors.representativeName ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                placeholder="Nombre completo"
                            />
                            {errors.representativeName && <p className="text-xs text-red-500 mt-1">{errors.representativeName}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Teléfono / WhatsApp *</label>
                            <input
                                type="tel"
                                maxLength={10}
                                value={representativePhone}
                                onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setRepresentativePhone(cleanVal);
                                    if (errors.representativePhone) setErrors({ ...errors, representativePhone: '' });
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 bg-white font-medium font-mono ${errors.representativePhone ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                                    }`}
                                placeholder="10 dígitos"
                            />
                            {errors.representativePhone && <p className="text-xs text-red-500 mt-1">{errors.representativePhone}</p>}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={dragging || isNameDuplicate}
                            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors ${
                                dragging || isNameDuplicate ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <Save className="w-4 h-4" />
                            {teamToEdit ? 'Guardar Cambios' : 'Registrar Equipo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
