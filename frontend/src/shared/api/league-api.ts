import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
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
    isActive: boolean;
    tenantId: string;
}

export interface Team {
    id: string;
    name: string;
    logoUrl?: string;
}

export interface Player {
    id: string;
    firstName: string;
    lastName: string;
    teamId: string;
}

export interface Match {
    id: string;
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    homeScore?: number;
    awayScore?: number;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
}

export const leagueApi = {
    // Leagues & Teams
    getTenants: () => api.get<Tenant[]>('/leagues/tenants'),
    getSeasons: (tenantId: string) =>
        api.get<Season[]>('/leagues/seasons', { headers: { 'X-Tenant-ID': tenantId } }),
    getTeams: (tenantId: string) =>
        api.get<Team[]>('/leagues/teams', { headers: { 'X-Tenant-ID': tenantId } }),
    createTeam: (tenantId: string, team: Partial<Team>) =>
        api.post<Team>('/leagues/teams', team, { headers: { 'X-Tenant-ID': tenantId } }),

    // Registration
    registerPlayer: (tenantId: string, player: Partial<Player>) =>
        api.post<Player>('/api/registration/players', player, { headers: { 'X-Tenant-ID': tenantId } }),
    getTeamPlayers: (tenantId: string, teamId: string) =>
        api.get<Player[]>(`/api/registration/teams/${teamId}/players`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Competition
    scheduleMatch: (tenantId: string, match: Partial<Match>) =>
        api.post<Match>('/api/competition/matches', match, { headers: { 'X-Tenant-ID': tenantId } }),
    getSeasonMatches: (tenantId: string, seasonId: string) =>
        api.get<Match[]>(`/api/competition/seasons/${seasonId}/matches`, { headers: { 'X-Tenant-ID': tenantId } }),
};

export default api;
