import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LeagueDashboard } from '@/features/league-dashboard/ui/LeagueDashboard';
import { RosterDashboard } from '@/features/team-management/ui/RosterDashboard';
import { LoginPage } from '@/pages/auth/LoginPage';
import { LeagueOSLandingPage } from '@/features/landing/ui/LeagueOSLandingPage';
import './App.css';

import { AdminDashboardLayout } from '@/features/admin/ui/AdminDashboardLayout';
import { TeamsView } from '@/features/admin/ui/TeamsView';
import { PlayersDirectoryView } from '@/features/admin/ui/PlayersDirectoryView';
import { MatchResultsView } from '@/features/admin/ui/MatchResultsView';
import { PlayerTransferView } from '@/features/admin/ui/PlayerTransferView';
import { SeasonsView } from '@/features/admin/ui/SeasonsView';
import { FieldsManagementView } from '@/features/fields/ui/FieldsManagementView';
import { RefereesView } from '@/features/referees/ui/RefereesView';
import { UsersView } from '@/features/admin/ui/UsersView';
import { RefereeMatchDashboard } from '@/features/referees/ui/RefereeMatchDashboard';
import { SeasonDetailsPage } from '@/pages/dashboard/SeasonDetailsPage';
import { TenantSettingsProvider } from '@/features/tenant/context/TenantSettingsContext';
import { ToastProvider } from '@/shared/components/ui/ToastContext';
import { SessionTimeoutManager } from '@/shared/components/auth/SessionTimeoutManager';
import { ProtectedRoute } from '@/shared/components/auth/ProtectedRoute';

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
            <SessionTimeoutManager />
            <ToastProvider>
            <TenantSettingsProvider>
                <Routes>
                    {/* Official LeagueOS Landing Page */}
                    <Route path="/leagueos" element={<LeagueOSLandingPage />} />
                    <Route path="/landing" element={<LeagueOSLandingPage />} />
                    <Route path="/about" element={<LeagueOSLandingPage />} />

                    {/* Dynamic League Public Dashboard */}
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/:leagueSlug" element={<LeagueDashboard />} />
                    <Route path="/:leagueSlug/team/:teamId" element={<RosterDashboard />} />
                    
                    {/* Standalone Player Registration Route */}
                    <Route path="/:leagueSlug/register" element={<LoginPage />} />

                    {/* Authentication Route */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/:leagueSlug/login" element={<LoginPage />} />

                    {/* Admin Routes with Dashboard Layout and ProtectedRoute */}
                    <Route path="/:leagueSlug/admin/teams" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <TeamsView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/teams/:teamId" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <RosterDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/players" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <PlayersDirectoryView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/matches" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <MatchResultsView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/fields" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <FieldsManagementView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/users" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <UsersView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/referees" element={<Navigate to="../users" replace />} />
                    <Route path="/:leagueSlug/admin/transfers" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <PlayerTransferView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/seasons" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <SeasonsView />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />
                    <Route path="/:leagueSlug/admin/seasons/:seasonId" element={
                        <ProtectedRoute allowedRoles={['ROLE_LEAGUE_ADMIN']}>
                            <AdminDashboardLayout>
                                <SeasonDetailsPage />
                            </AdminDashboardLayout>
                        </ProtectedRoute>
                    } />

                    {/* Legacy Admin Routes (Backward compatibility redirects to ligaNuestroDeporte) */}
                    <Route path="/admin/teams" element={<Navigate to="/ligaNuestroDeporte/admin/teams" replace />} />
                    <Route path="/admin/players" element={<Navigate to="/ligaNuestroDeporte/admin/players" replace />} />
                    <Route path="/admin/matches" element={<Navigate to="/ligaNuestroDeporte/admin/matches" replace />} />
                    <Route path="/admin/fields" element={<Navigate to="/ligaNuestroDeporte/admin/fields" replace />} />
                    <Route path="/admin/users" element={<Navigate to="/ligaNuestroDeporte/admin/users" replace />} />
                    <Route path="/admin/referees" element={<Navigate to="/ligaNuestroDeporte/admin/users" replace />} />
                    <Route path="/admin/transfers" element={<Navigate to="/ligaNuestroDeporte/admin/transfers" replace />} />

                    {/* Team Rep Dashboard */}
                    <Route path="/team-dashboard" element={<Navigate to="/ligaNuestroDeporte/team-dashboard" replace />} />
                    <Route path="/:leagueSlug/team-dashboard" element={
                        <ProtectedRoute allowedRoles={['ROLE_TEAM_REP', 'ROLE_LEAGUE_ADMIN']}>
                            <RosterDashboard />
                        </ProtectedRoute>
                    } />

                    {/* Referee Dashboard Legacy / Fallback */}
                    <Route path="/referee/dashboard" element={<Navigate to="/ligaNuestroDeporte/referee/dashboard" replace />} />
                    <Route path="/:leagueSlug/referee/dashboard" element={
                        <ProtectedRoute allowedRoles={['ROLE_REFEREE', 'ROLE_LEAGUE_ADMIN']}>
                            <RefereeMatchDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </TenantSettingsProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}

export default App;
