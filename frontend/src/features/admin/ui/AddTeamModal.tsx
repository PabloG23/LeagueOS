import { X, Upload, Save, Shield } from 'lucide-react';
import { useState } from 'react';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (team: { name: string; representativeName: string; representativePhone: string; logoUrl: string; seasonId: string }) => void;
}

export const AddTeamModal = ({ isOpen, onClose, onSave }: AddTeamModalProps) => {
    const [name, setName] = useState('');
    const [representativeName, setRepresentativeName] = useState('');
    const [representativePhone, setRepresentativePhone] = useState('');
    const [seasonId, setSeasonId] = useState('00000000-0000-0000-0000-000000000001'); // Default mock UUID for 1ra Fuerza
    const [dragging, setDragging] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = 'El nombre del equipo es obligatorio';
        if (!representativeName.trim()) newErrors.representativeName = 'El nombre del representante es obligatorio';
        if (!representativePhone.trim()) newErrors.representativePhone = 'El teléfono es obligatorio';
        else if (representativePhone.replace(/\D/g, '').length < 10) newErrors.representativePhone = 'Ingresa un teléfono válido de 10 dígitos';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        // Mock photo for MVP
        const mockPhoto = `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`;
        onSave({
            name,
            representativeName,
            representativePhone,
            logoUrl: mockPhoto,
            seasonId
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
                        Registrar Nuevo Equipo
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
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'
                                }`}
                            placeholder="Ej. Atlético San Lucas"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Torneo / Fuerza *</label>
                        <select
                            value={seasonId}
                            onChange={(e) => setSeasonId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        >
                            <option value="00000000-0000-0000-0000-000000000001">1ra Fuerza - Temporada Regular</option>
                            <option value="00000000-0000-0000-0000-000000000002">2da Fuerza - Temporada Regular</option>
                            <option value="00000000-0000-0000-0000-000000000003">3ra Fuerza - Temporada Regular</option>
                        </select>
                    </div>

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
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Registrar Equipo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
