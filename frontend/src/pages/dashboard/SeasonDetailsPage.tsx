import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leagueApi, Season } from '@/shared/api/league-api';
import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';

export const SeasonDetailsPage = () => {
    const { leagueSlug, seasonId } = useParams();
    const navigate = useNavigate();
    const [season, setSeason] = useState<Season | null>(null);
    const [activeTab, setActiveTab] = useState<'teams' | 'calendar'>('calendar');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { settings } = useTenantSettings();
    const tenantId = settings?.tenantId;

    useEffect(() => {
        if (!seasonId || !tenantId) return;
        leagueApi.getSeasons(tenantId)
            .then(res => {
                const found = res.data.find(s => s.id === seasonId);
                setSeason(found || null);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [seasonId]);

    const handleAutoGenerate = async () => {
        if (!seasonId || !tenantId) return;
        try {
            await leagueApi.generateRoundRobinFixtures(tenantId, seasonId);
            alert("Calendario generado exitosamente!");
            // Reload or switch view
        } catch (error) {
            console.error(error);
            alert("Error generando calendario. Revisa que haya al menos 2 equipos aprobados.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !seasonId || !tenantId) return;

        setUploading(true);
        try {
            await leagueApi.importCalendar(tenantId, seasonId, file);
            alert("Calendario importado exitosamente!");
            // TODO: Reload calendar view
        } catch (error: any) {
            console.error("Error importing calendar:", error);
            const msg = error.response?.data?.error || "Revisa el formato.";
            alert(`Hubo un error al procesar el archivo Excel:\n\n${msg}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (loading) return <div className="p-8">Cargando detalles del torneo...</div>;
    if (!season) return <div className="p-8">Torneo no encontrado.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">


            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">{season.name}</h1>
                {season.status === 'DRAFT' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">EN BORRADOR</span>}
                {season.status === 'REGISTRATION_CLOSED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">REGISTROS CERRADOS</span>}
                {season.status === 'ACTIVE' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">EN CURSO</span>}
                {season.status === 'COMPLETED' && <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">CONCLUIDO</span>}
            </div>

            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-4 py-2 font-medium ${activeTab === 'teams' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
                    Equipos
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-4 py-2 font-medium ${activeTab === 'calendar' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
                    Calendario
                </button>
            </div>

            <div className="mt-6">
                {activeTab === 'calendar' && (
                    <div className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50">
                        <div className="max-w-md">
                            <h3 className="text-2xl font-bold mb-2">Calendario Vacío</h3>
                            <p className="text-muted-foreground mb-8">
                                Aún no hay partidos programados para este torneo. ¿Cómo te gustaría generar el calendario?
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
                            <button onClick={handleAutoGenerate} className="flex flex-col items-center p-6 bg-white border rounded-xl hover:border-primary hover:shadow-md transition-all">
                                <span className="text-4xl mb-4">🪄</span>
                                <span className="font-bold mb-2">Round-Robin Automático</span>
                                <span className="text-xs text-muted-foreground text-center">Genera enfrentamientos todos contra todos con los equipos inscritos.</span>
                            </button>

                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={`flex flex-col items-center p-6 bg-white border rounded-xl hover:border-primary hover:shadow-md transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <span className="text-4xl mb-4">📄</span>
                                <span className="font-bold mb-2">{uploading ? 'Subiendo...' : 'Importar Excel'}</span>
                                <span className="text-xs text-muted-foreground text-center">Sube tu calendario listo usando nuestra plantilla estandarizada.</span>
                            </button>

                            <button className="flex flex-col items-center p-6 bg-white border rounded-xl hover:border-primary hover:shadow-md transition-all">
                                <span className="text-4xl mb-4">➕</span>
                                <span className="font-bold mb-2">Creación Manual</span>
                                <span className="text-xs text-muted-foreground text-center">Agrega los partidos uno por uno controlando todas las fechas.</span>
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'teams' && <p>Equipos Inscritos (Próximamente)</p>}
            </div>
        </div>
    );
};
