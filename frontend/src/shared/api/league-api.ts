import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const finalBaseUrl = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
    baseURL: finalBaseUrl,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Tenant {
    id: string;
    name: string;
    sportType: string;
    subdomain: string;
}

export interface Season {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'DRAFT' | 'REGISTRATION_CLOSED' | 'ACTIVE' | 'COMPLETED';
    currentMatchday: number;
    tenantId: string;
}

export interface Person {
    id?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    profilePhotoUrl?: string;
}

export interface Team {
    id: string;
    tenantId: string;
    name: string;
    logoUrl?: string;
    signedLogoUrl?: string;
    isActive?: boolean;
    activePlayersCount?: number;
    representative?: Person;
}

export interface TeamRegistration {
    id: string;
    team: Team;
    season: Season;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    teamId: string;
    jerseyNumber?: number;
    status?: string;
    profilePhotoUrl?: string;
}

export interface AdminPlayerDirectoryDTO {
    id: string;
    personId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    curp?: string;
    birthDate?: string;
    jerseyNumber?: number;
    profilePhotoUrl?: string;
    signedPhotoUrl?: string;
    status: string;
    isActive: boolean;
    teamId?: string;
    teamName: string;
    teamLogoUrl?: string;
    signedTeamLogoUrl?: string;
    matchesPlayed: number;
    goals: number;
    yellowCards: number;
    redCards: number;
    suspendedUntilMatchday?: number;
}

export interface PlayerScorerDTO {
    id: string;
    name: string;
    team: string;
    teamId: string;
    goals: number;
    rank: number;
    profilePhotoUrl?: string;
}

export interface SoccerField {
    id: string;
    tenantId: string;
    name: string;
    locationUrl?: string;
    address?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Referee {
    id: string;
    name: string;
    phone?: string;
    photoUrl?: string;
    signedPhotoUrl?: string;
    userId?: string;
    username?: string;
    rawPassword?: string;
}

export interface RefereeCreated extends Referee {
    tempPassword?: string;
}

export interface LeagueUser {
    id: string;
    username: string;
    name?: string;
    phone?: string;
    role: 'ROLE_LEAGUE_ADMIN' | 'ROLE_REFEREE' | 'ROLE_TEAM_REP';
    tenantId: string;
    teamId?: string;
    teamName?: string;
    teamLogoUrl?: string;
    signedTeamLogoUrl?: string;
    refereeId?: string;
    photoUrl?: string;
    signedPhotoUrl?: string;
    rawPassword?: string;
    isActive: boolean;
    createdAt?: string;
}

export interface CreateAdminRequest {
    name: string;
    phone?: string;
    username?: string;
    password?: string;
}

export interface RefereeMatch {
    id: string;
    seasonId?: string;
    seasonName?: string;
    matchday?: number;
    matchDate?: string;
    location?: string;
    fieldName?: string;
    homeTeamName: string;
    homeTeamLogoUrl?: string;
    awayTeamName: string;
    awayTeamLogoUrl?: string;
    homeScore?: number;
    awayScore?: number;
    status: string;
    hasReportPhoto: boolean;
    reportPhotoUrl?: string;
    reportPhotoSignedUrl?: string;
}

export interface Match {
    id: string;
    seasonId: string;
    season?: Season;
    homeTeamId: string;
    awayTeamId: string;
    homeTeam?: Team;
    awayTeam?: Team;
    matchday?: number;
    matchDate?: string;
    location?: string;
    fieldId?: string;
    field?: SoccerField;
    refereeId?: string;
    referee?: Referee;
    reportPhotoUrl?: string;
    hasReportPhoto?: boolean;
    homeScore?: number;
    awayScore?: number;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
}

/**
 * Lightweight preview DTO for round-robin fixture generation.
 * matchDate is always null ("Por definir") — dates are set manually by the admin.
 */
export interface MatchPreviewDTO {
    matchday: number;
    homeTeamId: string;
    homeTeamName: string;
    homeTeamLogoUrl?: string;
    homeTeamSignedLogoUrl?: string;
    awayTeamId: string;
    awayTeamName: string;
    awayTeamLogoUrl?: string;
    awayTeamSignedLogoUrl?: string;
    matchDate: string | null;
}

export const leagueApi = {
    // Leagues & Teams
    getTenants: () => api.get<Tenant[]>('/leagues/tenants'),
    getSeasons: (tenantId: string) =>
        api.get<Season[]>('/leagues/seasons', { headers: { 'X-Tenant-ID': tenantId } }),
    createSeason: (tenantId: string, season: Partial<Season>) =>
        api.post<Season>('/leagues/seasons', season, { headers: { 'X-Tenant-ID': tenantId } }),
    deleteSeason: (tenantId: string, seasonId: string) =>
        api.delete(`/leagues/seasons/${seasonId}`, { headers: { 'X-Tenant-ID': tenantId } }),
    activateSeason: (tenantId: string, seasonId: string) =>
        api.put<Season>(`/leagues/seasons/${seasonId}/activate`, null, { headers: { 'X-Tenant-ID': tenantId } }),

    // Playoffs
    generatePlayoffs: (tenantId: string, seasonId: string, payload: { startingRound: string, seededTeamIds: string[], numLegs: number }) =>
        api.post(`/leagues/seasons/${seasonId}/playoffs/generate`, payload, {
            headers: { 'X-Tenant-ID': tenantId }
        }),

    getPlayoffBracket: (tenantId: string, seasonId: string) =>
        api.get(`/leagues/seasons/${seasonId}/playoffs/bracket`, {
            headers: { 'X-Tenant-ID': tenantId }
        }),

    deletePlayoffs: (tenantId: string, seasonId: string) =>
        api.delete(`/leagues/seasons/${seasonId}/playoffs`, {
            headers: { 'X-Tenant-ID': tenantId }
        }),

    getTeams: (tenantId: string) =>
        api.get<Team[]>('/leagues/teams', { headers: { 'X-Tenant-ID': tenantId } }),
    createTeam: (tenantId: string, team: Partial<Team>) =>
        api.post<Team>('/leagues/teams', team, { headers: { 'X-Tenant-ID': tenantId } }),
    updateTeam: (tenantId: string, teamId: string, team: Partial<Team>) =>
        api.put<Team>(`/leagues/teams/${teamId}`, team, { headers: { 'X-Tenant-ID': tenantId } }),
    uploadTeamLogo: (tenantId: string, teamId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<Team>(`/leagues/teams/${teamId}/logo`, formData, { headers: { 'X-Tenant-ID': tenantId } });
    },
    deleteTeam: (tenantId: string, teamId: string) =>
        api.delete(`/leagues/teams/${teamId}`, { headers: { 'X-Tenant-ID': tenantId } }),
    activateTeam: (tenantId: string, teamId: string) =>
        api.put(`/leagues/teams/${teamId}/activate`, null, { headers: { 'X-Tenant-ID': tenantId } }),
    enrollTeamsToSeason: (tenantId: string, seasonId: string, teamIds: string[]) =>
        api.post<TeamRegistration[]>(`/leagues/seasons/${seasonId}/enroll`, teamIds, { headers: { 'X-Tenant-ID': tenantId } }),
    getEnrolledTeams: (tenantId: string, seasonId: string) =>
        api.get<TeamRegistration[]>(`/leagues/seasons/${seasonId}/teams`, { headers: { 'X-Tenant-ID': tenantId } }),
    unenrollTeam: (tenantId: string, seasonId: string, teamId: string) =>
        api.delete(`/leagues/seasons/${seasonId}/teams/${teamId}`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Soccer Fields / Canchas
    getFields: (tenantId: string) =>
        api.get<SoccerField[]>('/leagues/fields', { headers: { 'X-Tenant-ID': tenantId } }),
    createField: (tenantId: string, field: Partial<SoccerField>) =>
        api.post<SoccerField>('/leagues/fields', field, { headers: { 'X-Tenant-ID': tenantId } }),
    updateField: (tenantId: string, fieldId: string, field: Partial<SoccerField>) =>
        api.put<SoccerField>(`/leagues/fields/${fieldId}`, field, { headers: { 'X-Tenant-ID': tenantId } }),
    deleteField: (tenantId: string, fieldId: string) =>
        api.delete(`/leagues/fields/${fieldId}`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Referees / Árbitros
    getReferees: (tenantId: string) =>
        api.get<Referee[]>('/referees', { headers: { 'X-Tenant-ID': tenantId } }),
    getRefereeById: (tenantId: string, id: string) =>
        api.get<Referee>(`/referees/${id}`, { headers: { 'X-Tenant-ID': tenantId } }),
    createReferee: (tenantId: string, data: { name: string; phone?: string }) =>
        api.post<RefereeCreated>('/referees', data, { headers: { 'X-Tenant-ID': tenantId } }),
    updateReferee: (tenantId: string, id: string, data: { name: string; phone?: string }) =>
        api.put<Referee>(`/referees/${id}`, data, { headers: { 'X-Tenant-ID': tenantId } }),
    deleteReferee: (tenantId: string, id: string) =>
        api.delete(`/referees/${id}`, { headers: { 'X-Tenant-ID': tenantId } }),
    uploadRefereePhoto: (tenantId: string, id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<Referee>(`/referees/${id}/photo`, formData, {
            headers: {
                'X-Tenant-ID': tenantId,
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    resetRefereePassword: (tenantId: string, id: string) =>
        api.post<{ tempPassword: string }>(`/referees/${id}/reset-password`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatchReportDownloadUrl: (tenantId: string, matchId: string) =>
        api.get<{ signedUrl: string }>(`/referees/match-report/${matchId}/download-url`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Referee Portal
    getMyMatches: (tenantId: string) =>
        api.get<RefereeMatch[]>('/referee/my-matches', { headers: { 'X-Tenant-ID': tenantId } }),
    uploadMatchReportPhoto: (tenantId: string, matchId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<RefereeMatch>(`/referee/matches/${matchId}/report-photo`, formData, {
            headers: {
                'X-Tenant-ID': tenantId,
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Registration
    registerPlayer: (tenantId: string, player: any) =>
        api.post<Player>('/registration/players', player, { headers: { 'X-Tenant-ID': tenantId } }),
    verifyIne: (tenantId: string, formData: FormData) =>
        api.post<Player>('/players/verify-ine', formData, { headers: { 'X-Tenant-ID': tenantId } }),
    verifyExistingIne: (tenantId: string, playerId: string, formData: FormData) =>
        api.post<Player>(`/players/${playerId}/verify-ine`, formData, { headers: { 'X-Tenant-ID': tenantId } }),
    registerForeign: (tenantId: string, formData: FormData) =>
        api.post<Player>('/players/register-foreign', formData, { headers: { 'X-Tenant-ID': tenantId } }),
    verifyExistingForeign: (tenantId: string, playerId: string, formData: FormData) =>
        api.post<Player>(`/players/${playerId}/verify-foreign`, formData, { headers: { 'X-Tenant-ID': tenantId } }),
    batchCreatePlayers: (tenantId: string, teamId: string, players: any[]) =>
        api.post<Player[]>(`/teams/${teamId}/players/batch`, players, { headers: { 'X-Tenant-ID': tenantId } }),
    activatePlayer: (tenantId: string, playerId: string) => api.patch(`/players/${playerId}/activate`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    deactivatePlayer: (tenantId: string, playerId: string) => api.patch(`/players/${playerId}/deactivate`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    getTeamPlayers: (tenantId: string, teamId: string) =>
        api.get<Player[]>(`/registration/teams/${teamId}/players`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Competition
    scheduleMatch: (tenantId: string, match: Partial<Match>) =>
        api.post<Match>('/competition/matches', match, { headers: { 'X-Tenant-ID': tenantId } }),
    updateMatchSchedule: (tenantId: string, matchId: string, matchDate: string | null, location?: string, fieldId?: string, refereeId?: string) =>
        api.put<Match>(`/matches/${matchId}/schedule`, { matchDate, location, fieldId, refereeId }, { headers: { 'X-Tenant-ID': tenantId } }),
    getSeasonMatches: (tenantId: string, seasonId: string) =>
        api.get<Match[]>(`/competition/seasons/${seasonId}/matches`, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatches: (tenantId: string, matchday: number) => api.get<Match[]>(`/matches/${matchday}`, { headers: { 'X-Tenant-ID': tenantId } }),
    submitMatchReport: (tenantId: string, matchId: string, events: any[]) => api.post(`/matches/${matchId}/report`, events, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatchReport: (tenantId: string, matchId: string) => api.get<any[]>(`/matches/${matchId}/report`, { headers: { 'X-Tenant-ID': tenantId } }),
    previewRoundRobinFixtures: (tenantId: string, seasonId: string) =>
        api.get<MatchPreviewDTO[]>(`/leagues/seasons/${seasonId}/preview-fixtures/round-robin`, { headers: { 'X-Tenant-ID': tenantId } }),
    generateRoundRobinFixtures: (tenantId: string, seasonId: string) =>
        api.post(`/leagues/seasons/${seasonId}/generate-fixtures/round-robin`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    importCalendar: (tenantId: string, seasonId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/leagues/seasons/${seasonId}/import-calendar`, formData, {
            headers: {
                'X-Tenant-ID': tenantId,
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    downloadCalendarTemplate: () =>
        api.get('/templates/calendar', { responseType: 'blob' }),
    getUpcomingMatches: (tenantId: string) =>
        api.get<Match[]>('/public/matches/upcoming', { headers: { 'X-Tenant-ID': tenantId } }),
    getAllMatches: (tenantId: string) => api.get<Match[]>('/public/matches/season', { headers: { 'X-Tenant-ID': tenantId } }),
    getPublicMatchReportPhotoUrl: (tenantId: string, matchId: string) =>
        api.get<{ signedUrl: string }>(`/public/matches/${matchId}/report-photo-url`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Statistics
    getTopScorers: (tenantId: string) =>
        api.get<PlayerScorerDTO[]>('/public/stats/scorers/top', { headers: { 'X-Tenant-ID': tenantId } }),
    getGeneralRedCards: (tenantId: string) =>
        api.get<any[]>('/public/stats/discipline/general', { headers: { 'X-Tenant-ID': tenantId } }),
    getMatchdayRedCards: (tenantId: string) =>
        api.get<any[]>('/public/stats/discipline/matchday', { headers: { 'X-Tenant-ID': tenantId } }),
    getTeamRedCards: (tenantId: string) =>
        api.get<any[]>('/public/stats/discipline/teams', { headers: { 'X-Tenant-ID': tenantId } }),
    getSeasonStandings: (seasonId: string, tenantId: string) =>
        api.get<any[]>(`/public/stats/seasons/${seasonId}/standings`, { headers: { 'X-Tenant-ID': tenantId } }),
    getPlayerStats: (playerId: string, tenantId: string) =>
        api.get<any>(`/public/stats/players/${playerId}`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Media
    getSignedUrl: (key: string) => api.get<{url: string}>(`/media/signed-url?key=${encodeURIComponent(key)}`),
    getProxyUrl: (key: string) => `${api.defaults.baseURL}/media/proxy?key=${encodeURIComponent(key)}`,

    // Leagues & Seasons
    updateCurrentMatchday: (tenantId: string, seasonId: string, matchday: number) =>
        api.put<Season>(`/leagues/seasons/${seasonId}/current-matchday?matchday=${matchday}`, null, { headers: { 'X-Tenant-ID': tenantId } }),

    // Players Directory & Playoff Settings
    getPlayersDirectory: (tenantId: string) =>
        api.get<AdminPlayerDirectoryDTO[]>('/registration/players/directory', { headers: { 'X-Tenant-ID': tenantId } }),
    updateMinMatchesForPlayoffs: (tenantId: string, minMatches: number) =>
        api.put(`/tenants/settings/min-matches?minMatches=${minMatches}`, null, { headers: { 'X-Tenant-ID': tenantId } }),

    // User Management (Unified)
    getUsers: (tenantId: string) =>
        api.get<LeagueUser[]>('/users', { headers: { 'X-Tenant-ID': tenantId } }),
    createAdminUser: (tenantId: string, data: CreateAdminRequest) =>
        api.post<LeagueUser>('/users/admins', data, { headers: { 'X-Tenant-ID': tenantId } }),
    toggleUserStatus: (tenantId: string, userId: string) =>
        api.patch<{ userId: string; isActive: boolean }>(`/users/${userId}/toggle-status`, null, { headers: { 'X-Tenant-ID': tenantId } }),
    resetUserPassword: (tenantId: string, userId: string) =>
        api.post<{ tempPassword: string }>(`/users/${userId}/reset-password`, null, { headers: { 'X-Tenant-ID': tenantId } }),
    deleteUser: (tenantId: string, userId: string) =>
        api.delete(`/users/${userId}`, { headers: { 'X-Tenant-ID': tenantId } }),
};

export default api;
