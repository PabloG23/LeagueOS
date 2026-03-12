import { useState, useRef } from 'react';
import { X, Upload, Save, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ParsedPlayer {
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    _error?: string;
}

interface MassUploadPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (players: any[]) => Promise<void>;
    requireJerseyNumbers?: boolean;
}

export const MassUploadPlayerModal = ({ isOpen, onClose, onSave, requireJerseyNumbers }: MassUploadPlayerModalProps) => {
    const [dragging, setDragging] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedPlayer[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([['Nombre', 'Apellido', 'Dorsal']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Jugadores");
        XLSX.writeFile(wb, "plantilla_jugadores.xlsx");
    };

    const handleFileParse = (file: File) => {
        setUploadError(null);

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt !== 'xlsx') {
            setUploadError("Por favor, sube un archivo Excel (.xlsx).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const results = XLSX.utils.sheet_to_json(worksheet);

                if (results.length === 0) {
                    setUploadError("El archivo está vacío o no tiene el formato correcto.");
                    return;
                }

                const players: ParsedPlayer[] = results.map((row: any) => {
                    const firstName = (row['Nombre'] || '').toString().trim();
                    const lastName = (row['Apellido'] || '').toString().trim();
                    const rawJersey = (row['Dorsal'] || row['Numero'] || '').toString().trim();
                    const jerseyNumber = rawJersey ? parseInt(rawJersey, 10) : undefined;

                    let error;
                    if (!firstName) error = "Nombre es requerido";
                    else if (requireJerseyNumbers && isNaN(jerseyNumber as number)) error = "Dorsal inválido o faltante";

                    return { firstName, lastName, jerseyNumber: isNaN(jerseyNumber as number) ? undefined : jerseyNumber, _error: error };
                });

                if (players.length === 0) {
                    setUploadError("No se encontraron jugadores válidos en el archivo.");
                } else {
                    setParsedData(players);
                }
            } catch (error: any) {
                setUploadError("Hubo un error al procesar el archivo. Asegúrate de que no esté dañado.");
            }
        };
        reader.onerror = () => setUploadError("Error al leer el archivo.");
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileParse(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileParse(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        const validPlayers = parsedData.filter(p => !p._error);
        if (validPlayers.length === 0) {
            setUploadError("No hay jugadores válidos para guardar.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(validPlayers);
            handleClose();
        } catch (error: any) {
            setUploadError(error.message || "Error al guardar los jugadores.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setParsedData([]);
        setUploadError(null);
        setIsSaving(false);
        onClose();
    };

    const updateRow = (index: number, field: keyof ParsedPlayer, value: string) => {
        const newData = [...parsedData];
        if (field === 'jerseyNumber') {
            const num = parseInt(value, 10);
            newData[index] = { ...newData[index], jerseyNumber: isNaN(num) ? undefined : num };
        } else {
            newData[index] = { ...newData[index], [field]: value };
        }

        // Re-validate
        let error;
        if (!newData[index].firstName) error = "Nombre es requerido";
        else if (requireJerseyNumbers && newData[index].jerseyNumber === undefined) error = "Dorsal requerido";
        newData[index]._error = error;

        setParsedData(newData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 overflow-y-auto flex-1 bg-white flex flex-col items-center">
                    {!parsedData.length && (
                        <div className="w-16 h-16 bg-[#22C55E] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/20 transform -rotate-6">
                            <FileSpreadsheet className="w-8 h-8 text-white rotate-6" />
                        </div>
                    )}

                    <div className="text-center mb-8 w-full">
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Carga Masiva de Jugadores</h3>
                        <p className="text-[15px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                            Importa múltiples jugadores desde un archivo Excel. El sistema validará automáticamente el formato de los datos.
                        </p>
                    </div>
                    {uploadError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm font-medium text-red-800">{uploadError}</div>
                        </div>
                    )}

                    {parsedData.length === 0 ? (
                        <div className="w-full max-w-lg mb-8">
                            <div
                                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors w-full ${dragging ? 'border-[#22C55E] bg-green-50/50' : 'border-slate-200 hover:border-[#22C55E] hover:bg-slate-50'}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileInput} />
                                <div className="w-14 h-14 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-[#22C55E]">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-2">Seleccionar Archivo Excel</h4>
                                <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-400">
                                    Formatos soportados: .xlsx
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-center gap-4">
                                <span className="text-sm font-semibold text-slate-500">¿No tienes la plantilla de la plantilla?</span>
                                <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors">
                                    <Download className="w-4 h-4" />
                                    Descargar Formato Base
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Vista Previa de Jugadores</h4>
                                    <p className="text-xs text-slate-500">{parsedData.length} registros detectados. Puedes corregir los errores directamente en esta tabla.</p>
                                </div>
                                <button type="button" onClick={() => setParsedData([])} className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                                    Cargar otro archivo
                                </button>
                            </div>

                            <div className="bg-white border text-sm rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b">
                                            <th className="font-semibold text-slate-500 p-3 text-xs uppercase w-8 text-center">#</th>
                                            <th className="font-semibold text-slate-500 p-3 text-xs uppercase">Nombre</th>
                                            <th className="font-semibold text-slate-500 p-3 text-xs uppercase">Apellido</th>
                                            <th className="font-semibold text-slate-500 p-3 text-xs uppercase w-24 text-center">Dorsal</th>
                                            <th className="font-semibold text-slate-500 p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className={`border-b last:border-0 hover:bg-slate-50 transition-colors ${row._error ? 'bg-red-50/30' : ''}`}>
                                                <td className="p-3 text-center text-slate-400 text-xs font-mono">{i + 1}</td>
                                                <td className="p-2">
                                                    <input type="text" value={row.firstName} onChange={(e) => updateRow(i, 'firstName', e.target.value)}
                                                        className={`w-full bg-transparent border-0 focus:ring-1 p-1 px-2 rounded font-medium text-slate-800 ${!row.firstName ? 'focus:ring-red-400 placeholder:text-red-400' : 'focus:ring-blue-400'}`} placeholder="Requerido" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="text" value={row.lastName} onChange={(e) => updateRow(i, 'lastName', e.target.value)}
                                                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-400 p-1 px-2 rounded text-slate-600" placeholder="Opcional" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="text" value={row.jerseyNumber ?? ''} onChange={(e) => updateRow(i, 'jerseyNumber', e.target.value)}
                                                        className={`w-full bg-transparent border-0 focus:ring-1 p-1 px-2 rounded text-center text-slate-600 font-mono ${(requireJerseyNumbers && !row.jerseyNumber) ? 'focus:ring-red-400 bg-red-50' : 'focus:ring-blue-400'}`} placeholder="--" />
                                                </td>
                                                <td className="p-3 text-center">
                                                    {row._error && <div title={row._error}><AlertCircle className="w-4 h-4 text-red-500 inline-block" /></div>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button type="button" onClick={handleClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 w-full sm:w-auto hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    {parsedData.length > 0 && (
                        <button type="button" onClick={handleSave} disabled={isSaving || parsedData.some(p => p._error)}
                            className="bg-[#22C55E] w-full sm:w-auto hover:bg-[#16a34a] text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all focus:ring-2 focus:ring-[#22C55E] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? (
                                <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Importando...</>
                            ) : (
                                <>Importar {parsedData.filter(p => !p._error).length} Jugadores</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
