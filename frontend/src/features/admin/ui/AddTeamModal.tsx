import { X, Upload, Save, Shield, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (team: { name: string; representative?: { firstName: string; lastName: string; phone?: string }; logoUrl: string; }) => void;
    teamToEdit?: { id?: string; name: string; representative?: { firstName: string; lastName: string; phone?: string }; logoUrl?: string };
    existingTeams?: { id: string; name: string }[];
}

export const AddTeamModal = ({ isOpen, onClose, onSave, teamToEdit, existingTeams = [] }: AddTeamModalProps) => {
    const { settings } = useTenantSettings();
    const isSanLucas = settings.tenantId === '22222222-2222-2222-2222-222222222222';

    const [name, setName] = useState('');
    const [representativeName, setRepresentativeName] = useState('');
    const [representativePhone, setRepresentativePhone] = useState('');
    const [dragging, setDragging] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Effect to populate form when editing
    useEffect(() => {
        if (teamToEdit && isOpen) {
            setName(teamToEdit.name || '');
            if (teamToEdit.representative) {
                setRepresentativeName(`${teamToEdit.representative.firstName || ''} ${teamToEdit.representative.lastName || ''}`.trim());
                setRepresentativePhone(teamToEdit.representative.phone || '');
            }
        } else if (!teamToEdit && isOpen) {
            setName('');
            setRepresentativeName('');
            setRepresentativePhone('');
        }
        setErrors({});
    }, [teamToEdit, isOpen]);

    if (!isOpen) return null;

    const isNameDuplicate = existingTeams.some(
        t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.id !== teamToEdit?.id
    );

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = 'El nombre del equipo es obligatorio';
        
        if (!isSanLucas) {
            if (!representativeName.trim()) newErrors.representativeName = 'El nombre del representante es obligatorio';
            if (!representativePhone.trim()) newErrors.representativePhone = 'El teléfono es obligatorio';
            else if (representativePhone.replace(/\D/g, '').length < 10) newErrors.representativePhone = 'Ingresa un teléfono válido de 10 dígitos';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || isNameDuplicate) return;

        // Mock photo for MVP
        const mockPhoto = `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`;
        onSave({
            name,
            logoUrl: mockPhoto,
            representative: isSanLucas ? undefined : {
                firstName: representativeName.split(' ')[0],
                lastName: representativeName.split(' ').slice(1).join(' '),
                phone: representativePhone
            }
        });

        // Reset form
        setName('');
        setRepresentativeName('');
        setRepresentativePhone('');
        setErrors({});
        onClose();
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
                    {/* Photo Dropzone (Optional) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Escudo del Equipo (Opcional)</label>
                        <div
                            className={`
                                border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                                ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                            `}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); }}
                        >
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-900">Arrastra una imagen o haz clic</p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG hasta 2MB</p>
                        </div>
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
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
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



                    {!isSanLucas && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Representante *</label>
                                <input
                                    type="text"
                                    value={representativeName}
                                    onChange={(e) => {
                                        setRepresentativeName(e.target.value);
                                        if (errors.representativeName) setErrors({ ...errors, representativeName: '' });
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.representativeName ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                                        }`}
                                    placeholder="Nombre completo"
                                />
                                {errors.representativeName && <p className="text-xs text-red-500 mt-1">{errors.representativeName}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Teléfono / WhatsApp *</label>
                                <input
                                    type="tel"
                                    value={representativePhone}
                                    onChange={(e) => {
                                        setRepresentativePhone(e.target.value);
                                        if (errors.representativePhone) setErrors({ ...errors, representativePhone: '' });
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.representativePhone ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                                        }`}
                                    placeholder="10 dígitos"
                                />
                                {errors.representativePhone && <p className="text-xs text-red-500 mt-1">{errors.representativePhone}</p>}
                            </div>
                        </div>
                    )}

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
