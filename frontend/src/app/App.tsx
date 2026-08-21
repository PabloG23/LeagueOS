import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LeagueDashboard } from '@/features/league-dashboard/ui/LeagueDashboard';
import { RosterDashboard } from '@/features/team-management/ui/RosterDashboard';
import { LoginPage } from '@/pages/auth/LoginPage';
import './App.css';

import { AdminDashboardLayout } from '@/features/admin/ui/AdminDashboardLayout';
import { TeamsView } from '@/features/admin/ui/TeamsView';
import { MatchResultsView } from '@/features/admin/ui/MatchResultsView';
import { PlayerTransferView } from '@/features/admin/ui/PlayerTransferView';
import { SeasonsView } from '@/features/admin/ui/SeasonsView';
import { FieldsManagementView } from '@/features/fields/ui/FieldsManagementView';
import { SeasonDetailsPage } from '@/pages/dashboard/SeasonDetailsPage';
import { TenantSettingsProvider } from '@/features/tenant/context/TenantSettingsContext';
import { ToastProvider } from '@/shared/components/ui/ToastContext';

function RootRoute() {
    const isNuestroDeporteDomain = typeof window !== 'undefined' && window.location.hostname.toLowerCase().includes('nuestrodeporte');
    if (isNuestroDeporteDomain) {
        return <LeagueDashboard />;
    }
    return <Navigate to="/ligaNuestroDeporte" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
            <TenantSettingsProvider>
                <Routes>
                    {/* Root path: If on custom domain, render LeagueDashboard directly; else redirect */}
                    <Route path="/" element={<RootRoute />} />

                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/:leagueSlug/login" element={<LoginPage />} />

                    {/* Dynamic League Routes */}
                    <Route path="/:leagueSlug" element={<LeagueDashboard />} />
                    <Route path="/:leagueSlug/team/:teamId" element={<RosterDashboard />} />

                    {/* Admin Routes (Still Authenticated) */}
                    <Route path="/:leagueSlug/admin/teams" element={
                        <AdminDashboardLayout>
                            <TeamsView />
                        </AdminDashboardLayout>
                    } />
                    <Route path="/:leagueSlug/admin/teams/:teamId" element={<RosterDashboard />} />
                    <Route path="/:leagueSlug/admin/matches" element={
                        <AdminDashboardLayout>
                            <MatchResultsView />
                        </AdminDashboardLayout>
                    } />
                    <Route path="/:leagueSlug/admin/fields" element={
                        <AdminDashboardLayout>
                            <FieldsManagementView />
                        </AdminDashboardLayout>
                    } />
                    <Route path="/:leagueSlug/admin/transfers" element={
                        <AdminDashboardLayout>
                            <PlayerTransferView />
                        </AdminDashboardLayout>
                    } />
                    <Route path="/:leagueSlug/admin/seasons" element={
                        <AdminDashboardLayout>
                            <SeasonsView />
                        </AdminDashboardLayout>
                    } />
                    <Route path="/:leagueSlug/admin/seasons/:seasonId" element={
                        <AdminDashboardLayout>
                            <SeasonDetailsPage />
                        </AdminDashboardLayout>
                    } />

                    {/* Legacy Admin Routes (Backward compatibility redirects to ligaNuestroDeporte) */}
                    <Route path="/admin/teams" element={<Navigate to="/ligaNuestroDeporte/admin/teams" replace />} />
                    <Route path="/admin/matches" element={<Navigate to="/ligaNuestroDeporte/admin/matches" replace />} />
                    <Route path="/admin/fields" element={<Navigate to="/ligaNuestroDeporte/admin/fields" replace />} />
                    <Route path="/admin/transfers" element={<Navigate to="/ligaNuestroDeporte/admin/transfers" replace />} />

                    {/* Team Rep Dashboard */}
                    <Route path="/team-dashboard" element={<Navigate to="/ligaNuestroDeporte/team-dashboard" replace />} />
                    <Route path="/:leagueSlug/team-dashboard" element={<RosterDashboard />} />

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </TenantSettingsProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}

export default App;
