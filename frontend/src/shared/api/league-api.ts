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
    id: string;
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
    homeScore?: number;
    awayScore?: number;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
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
    deleteTeam: (tenantId: string, teamId: string) =>
        api.delete(`/leagues/teams/${teamId}`, { headers: { 'X-Tenant-ID': tenantId } }),
    enrollTeamsToSeason: (tenantId: string, seasonId: string, teamIds: string[]) =>
        api.post<TeamRegistration[]>(`/leagues/seasons/${seasonId}/enroll`, teamIds, { headers: { 'X-Tenant-ID': tenantId } }),
    getEnrolledTeams: (tenantId: string, seasonId: string) =>
        api.get<TeamRegistration[]>(`/leagues/seasons/${seasonId}/teams`, { headers: { 'X-Tenant-ID': tenantId } }),
    unenrollTeam: (tenantId: string, seasonId: string, teamId: string) =>
        api.delete(`/leagues/seasons/${seasonId}/teams/${teamId}`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Registration
    registerPlayer: (tenantId: string, player: any) =>
        api.post<Player>('/registration/players', player, { headers: { 'X-Tenant-ID': tenantId } }),
    batchCreatePlayers: (tenantId: string, teamId: string, players: any[]) =>
        api.post<Player[]>(`/teams/${teamId}/players/batch`, players, { headers: { 'X-Tenant-ID': tenantId } }),
    activatePlayer: (tenantId: string, playerId: string) => api.patch(`/players/${playerId}/activate`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    deactivatePlayer: (tenantId: string, playerId: string) => api.patch(`/players/${playerId}/deactivate`, {}, { headers: { 'X-Tenant-ID': tenantId } }),
    getTeamPlayers: (tenantId: string, teamId: string) =>
        api.get<Player[]>(`/registration/teams/${teamId}/players`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Competition
    scheduleMatch: (tenantId: string, match: Partial<Match>) =>
        api.post<Match>('/competition/matches', match, { headers: { 'X-Tenant-ID': tenantId } }),
    updateMatchSchedule: (tenantId: string, matchId: string, matchDate: string | null, location?: string) =>
        api.put<Match>(`/matches/${matchId}/schedule`, { matchDate, location }, { headers: { 'X-Tenant-ID': tenantId } }),
    getSeasonMatches: (tenantId: string, seasonId: string) =>
        api.get<Match[]>(`/competition/seasons/${seasonId}/matches`, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatches: (tenantId: string, matchday: number) => api.get<Match[]>(`/matches/${matchday}`, { headers: { 'X-Tenant-ID': tenantId } }),
    submitMatchReport: (tenantId: string, matchId: string, events: any[]) => api.post(`/matches/${matchId}/report`, events, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatchReport: (tenantId: string, matchId: string) => api.get<any[]>(`/matches/${matchId}/report`, { headers: { 'X-Tenant-ID': tenantId } }),
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

    // Statistics
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
};

export default api;
