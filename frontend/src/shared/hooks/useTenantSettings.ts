import { useTenantSettings as useContextTenantSettings } from '@/features/tenant/context/TenantSettingsContext';

// Re-exporting for easier import/usage consistency
export const useTenantSettings = () => {
    return useContextTenantSettings();
};
