import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../../shared/components/ui/ToastContext';
import { X, Save, ScanFace, Globe, ShieldCheck, ImageIcon, Lock } from 'lucide-react';
import { leagueApi } from '@/shared/api/league-api';

export interface ExistingPlayerData {
    id: string;
    name?: string;
    jerseyNumber?: number;
    curp?: string;
    birthDate?: string;
}

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId?: string;
    tenantId?: string;
    requireJerseyNumbers?: boolean;
    existingPlayer?: ExistingPlayerData | null;
    onSuccess?: () => void;
}

export const AddPlayerModal = ({ isOpen, onClose, teamId, tenantId, requireJerseyNumbers, existingPlayer, onSuccess }: AddPlayerModalProps) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [playerType, setPlayerType] = useState<'mexican' | 'foreign' | null>(null);
    const [ineImage, setIneImage] = useState<File | null>(null);
    const [faceCrop, setFaceCrop] = useState<File | null>(null); // only for foreign
    const [inePreviewUrl, setInePreviewUrl] = useState<string | null>(null);
    const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null);

    // Form data
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [curp, setCurp] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const ineInputRef = useRef<HTMLInputElement>(null);
    const faceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && existingPlayer) {
            if (existingPlayer.jerseyNumber != null) {
                setJerseyNumber(String(existingPlayer.jerseyNumber));
            }
            if (existingPlayer.name) {
                const parts = existingPlayer.name.trim().split(' ');
                setName(parts[0] || '');
                setSurname(parts.slice(1).join(' ') || '');
            }
            if (existingPlayer.curp) {
                setCurp(existingPlayer.curp);
            }
            if (existingPlayer.birthDate) {
                setBirthDate(existingPlayer.birthDate);
            }
        }
    }, [isOpen, existingPlayer]);

    if (!isOpen) return null;

    const resetForm = () => {
        setStep(1);
        setPlayerType(null);
        setIneImage(null);
        setFaceCrop(null);
        if (inePreviewUrl) URL.revokeObjectURL(inePreviewUrl);
        if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
        setInePreviewUrl(null);
        setFacePreviewUrl(null);
        setName('');
        setSurname('');
        setJerseyNumber('');
        setBirthDate('');
        setCurp('');
        setIsSubmitting(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleIneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIneImage(file);
        if (inePreviewUrl) URL.revokeObjectURL(inePreviewUrl);
        setInePreviewUrl(URL.createObjectURL(file));
        setStep(2);
    };

    const handleFaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFaceCrop(file);
        if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl);
        setFacePreviewUrl(URL.createObjectURL(file));
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!tenantId) {
            showToast('Error de configuración (Tenant ID faltante)', 'error');
            return;
        }

        if (!jerseyNumber.trim()) {
            showToast('El dorsal o número de playera es obligatorio.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            const effectiveTeamId = teamId || localStorage.getItem('teamId') || undefined;

            if (playerType === 'mexican') {
                if (!ineImage) throw new Error("Falta la foto del INE");
                formData.append('ine_image', ineImage);
                if (jerseyNumber) formData.append('jersey_number', jerseyNumber);
                if (effectiveTeamId) formData.append('team_id', effectiveTeamId);

                if (existingPlayer?.id) {
                    await leagueApi.verifyExistingIne(tenantId, existingPlayer.id, formData);
                    showToast('Identidad verificada correctamente ✓', 'success');
                } else {
                    await leagueApi.verifyIne(tenantId, formData);
                    showToast('Jugador registrado y verificado exitosamente ✓', 'success');
                }
            } else {
                if (!faceCrop) throw new Error("Falta foto del jugador");
                if (!name.trim()) throw new Error("El nombre es obligatorio");

                formData.append('face_crop', faceCrop);
                formData.append('first_name', name.trim());
                if (surname.trim()) formData.append('last_name', surname.trim());
                if (birthDate) formData.append('birth_date', birthDate);
                if (curp.trim()) formData.append('curp', curp.trim().toUpperCase());
                if (jerseyNumber) formData.append('jersey_number', jerseyNumber);
                if (effectiveTeamId) formData.append('team_id', effectiveTeamId);

                if (existingPlayer?.id) {
                    await leagueApi.verifyExistingForeign(tenantId, existingPlayer.id, formData);
                    showToast('Identidad de jugador extranjero verificada correctamente ✓', 'success');
                } else {
                    await leagueApi.registerForeign(tenantId, formData);
                    showToast('Jugador extranjero registrado exitosamente ✓', 'success');
                }
            }

            if (onSuccess) onSuccess();
            handleClose();
        } catch (error: any) {
            showToast(error.response?.data?.message || error.message || 'Error al procesar el jugador', 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={isSubmitting ? undefined : handleClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-bold text-slate-900">
                        {existingPlayer ? 'Verificar Identidad' : 'Registrar Jugador'}
                    </h3>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    {/* Step 1 — Type selection */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {!playerType ? (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-slate-700 text-center mb-6">Selecciona el tipo de registro</h4>
                                    <button
                                        onClick={() => setPlayerType('mexican')}
                                        className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">Jugador Mexicano (con INE)</div>
                                            <div className="text-xs text-slate-500 mt-1">Sube una foto de su INE y la IA extraerá los datos y el rostro automáticamente.</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setPlayerType('foreign')}
                                        className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">Jugador Extranjero</div>
                                            <div className="text-xs text-slate-500 mt-1">Sube una foto del rostro y confirma sus datos directamente.</div>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-sm font-medium text-slate-700">
                                        {playerType === 'mexican'
                                            ? 'Sube una foto de la credencial INE/IFE del jugador'
                                            : 'Sube una foto del rostro del jugador (selfie o foto de carnet)'}
                                    </div>

                                    {playerType === 'mexican' && (
                                        <>
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex flex-col gap-2">
                                                <div className="font-bold flex items-center gap-1.5 text-amber-700">
                                                    <ScanFace className="w-5 h-5" />
                                                    Instrucciones importantes
                                                </div>
                                                <ul className="list-disc list-inside ml-1 opacity-90 text-xs space-y-1.5 mt-1">
                                                    <li>Sube <strong>solo la parte frontal</strong> (donde está la foto). No es necesario el reverso.</li>
                                                    <li>Toma la foto en <strong>orientación horizontal</strong> (acostada).</li>
                                                    <li>Asegúrate de que la foto sea <strong>lo más nítida posible</strong>.</li>
                                                    <li>Evita reflejos de luz o flash sobre el rostro y el texto.</li>
                                                </ul>
                                            </div>

                                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5 shadow-sm">
                                                <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                                                    <Lock className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="space-y-0.5 leading-relaxed">
                                                    <p className="font-bold text-emerald-800">Tu privacidad está protegida</p>
                                                    <p className="text-emerald-700/90 text-xs">
                                                        La foto de tu INE <strong>no se guardará ni almacenará</strong> en los servidores de la liga. Solo se procesa en tiempo real para extraer tu foto de perfil y los datos necesarios para tu credencial deportiva.
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors"
                                        onClick={() => playerType === 'mexican' ? ineInputRef.current?.click() : faceInputRef.current?.click()}
                                    >
                                        <input type="file" ref={ineInputRef} className="hidden" accept="image/*" onChange={handleIneFileChange} />
                                        <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={handleFaceFileChange} />
                                        <ImageIcon className="w-10 h-10 text-slate-400 mb-3" />
                                        <p className="text-sm font-bold text-slate-700">Toca para seleccionar foto</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                             {playerType === 'mexican'
                                                ? 'El sistema extraerá el rostro automáticamente usando IA'
                                                : 'Sube una foto clara del rostro'}
                                        </p>
                                    </div>
                                    <button onClick={() => setPlayerType(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                                        ← Volver
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2 — Preview + form */}
                    {step === 2 && (
                        <form id="playerForm" onSubmit={handleSubmit} noValidate className="space-y-6">
                            {/* Preview */}
                            <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {playerType === 'mexican' && inePreviewUrl && (
                                    <>
                                        <img
                                            src={inePreviewUrl}
                                            alt="INE cargada"
                                            className="max-h-40 rounded-lg object-contain border border-slate-200 shadow-sm mb-3"
                                        />
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 w-full text-center space-y-1">
                                            <p className="text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4" />
                                                IA lista para extraer datos y rostro
                                            </p>
                                            <p className="text-xs text-blue-600">Nombre, CURP y foto de perfil se obtendrán al guardar. La credencial INE no se almacenará.</p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => { setStep(1); setIneImage(null); setInePreviewUrl(null); }}
                                            className="mt-3 text-xs text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                                        >
                                            Cambiar foto
                                        </button>
                                    </>
                                )}

                                {playerType === 'foreign' && facePreviewUrl && (
                                    <>
                                        <img
                                            src={facePreviewUrl}
                                            alt="Foto del jugador"
                                            className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-md mb-3"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setStep(1); setFaceCrop(null); setFacePreviewUrl(null); }}
                                            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
                                        >
                                            Cambiar foto
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Foreign — manual data entry */}
                            {playerType === 'foreign' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Nombre(s) *</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="Ej. Juan"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Apellidos</label>
                                            <input
                                                type="text"
                                                value={surname}
                                                onChange={e => setSurname(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                placeholder="Ej. Pérez"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">Fecha Nacimiento</label>
                                            <input
                                                type="date"
                                                value={birthDate}
                                                onChange={e => setBirthDate(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-slate-500 uppercase">CURP (Opcional)</label>
                                            <input
                                                type="text"
                                                value={curp}
                                                maxLength={18}
                                                onChange={e => setCurp(e.target.value.toUpperCase())}
                                                className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase text-sm"
                                                placeholder="18 caracteres"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1 mt-4">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Dorsal / Playera *</label>
                                <input
                                    type="number"
                                    value={jerseyNumber}
                                    onChange={e => setJerseyNumber(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    placeholder="Ej. 10"
                                />
                            </div>
                        </form>
                    )}
                </div>

                {step === 2 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <button type="button" onClick={() => setStep(1)} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                            Atrás
                        </button>
                        <button
                            type="submit"
                            form="playerForm"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                            ) : (
                                <><Save className="w-4 h-4" /> {playerType === 'mexican' ? 'Verificar y Guardar' : 'Guardar Jugador'}</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
