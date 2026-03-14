import { useState } from 'react';
import { useToast } from '../../../shared/components/ui/ToastContext';
import { X, Upload, Save } from 'lucide-react';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (player: { name: string; photoUrl: string, jerseyNumber?: number, birthDate?: string }) => void;
    requireJerseyNumbers?: boolean;
}

export const AddPlayerModal = ({ isOpen, onClose, onSave, requireJerseyNumbers }: AddPlayerModalProps) => {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
             showToast('El nombre es obligatorio.', 'error');
             return;
        }

        if (!surname.trim()) {
             showToast('El apellido es obligatorio.', 'error');
             return;
        }

        if (requireJerseyNumbers && !jerseyNumber.trim()) {
             showToast('El dorsal o número de playera es obligatorio para esta liga.', 'error');
             return;
        }

        let formattedDate = undefined;
        if (birthDate) {
            // birthDate from type="date" is already in YYYY-MM-DD format
            formattedDate = birthDate;
            const dateObj = new Date(formattedDate);
            if (isNaN(dateObj.getTime())) {
                showToast('Fecha de nacimiento inválida.', 'error');
                return;
            }
        }

        // Mock photo for now
        const mockPhoto = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
        onSave({
            name: `${name} ${surname}`,
            photoUrl: mockPhoto,
            jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
            birthDate: formattedDate
        });
        // Reset form
        setName('');
        setSurname('');
        setJerseyNumber('');
        setBirthDate('');
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Jugador</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Photo Dropzone */}
                    <div
                        className={`
                            border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); }}
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">Arrastra una foto aquí o haz clic</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG hasta 5MB</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Nombre(s)</label>
                            <input
                                type="text"
                                
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Ej. Roberto"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Apellidos</label>
                            <input
                                type="text"
                                
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Ej. Gomez Pérez"
                            />
                        </div>
                    </div>

                    {requireJerseyNumbers && (
                        <div>
                            <label className="text-sm font-medium text-slate-700">Dorsal / Número de Playera</label>
                            <input
                                type="number"
                                
                                value={jerseyNumber}
                                onChange={(e) => setJerseyNumber(e.target.value)}
                                className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Ej. 10"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Fecha de Nacimiento (Opcional)</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-blue-500'}`}
                        />
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
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
                            Guardar Jugador
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
