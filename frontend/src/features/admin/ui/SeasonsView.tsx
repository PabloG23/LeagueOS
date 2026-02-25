import { useTenantSettings } from '@/features/tenant/context/TenantSettingsContext';
import { SeasonList } from '@/features/league-management/ui/SeasonList';

export const SeasonsView = () => {
    const { settings } = useTenantSettings();

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                {settings?.tenantId ? (
                    <SeasonList tenantId={settings.tenantId} />
                ) : (
                    <div className="p-8 text-center text-slate-500">Cargando torneos...</div>
                )}
            </div>
        </div>
    );
};
