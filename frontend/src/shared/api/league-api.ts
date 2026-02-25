import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
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
    homeTeam?: Team;
    awayTeam?: Team;
    matchday?: number;
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
    createSeason: (tenantId: string, season: Partial<Season>) =>
        api.post<Season>('/leagues/seasons', season, { headers: { 'X-Tenant-ID': tenantId } }),
    getTeams: (tenantId: string) =>
        api.get<Team[]>('/leagues/teams', { headers: { 'X-Tenant-ID': tenantId } }),
    createTeam: (tenantId: string, team: Partial<Team>) =>
        api.post<Team>('/leagues/teams', team, { headers: { 'X-Tenant-ID': tenantId } }),

    // Registration
    registerPlayer: (tenantId: string, player: Partial<Player>) =>
        api.post<Player>('/registration/players', player, { headers: { 'X-Tenant-ID': tenantId } }),
    getTeamPlayers: (tenantId: string, teamId: string) =>
        api.get<Player[]>(`/registration/teams/${teamId}/players`, { headers: { 'X-Tenant-ID': tenantId } }),

    // Competition
    scheduleMatch: (tenantId: string, match: Partial<Match>) =>
        api.post<Match>('/competition/matches', match, { headers: { 'X-Tenant-ID': tenantId } }),
    getSeasonMatches: (tenantId: string, seasonId: string) =>
        api.get<Match[]>(`/competition/seasons/${seasonId}/matches`, { headers: { 'X-Tenant-ID': tenantId } }),
    getMatches: (matchday: number) => api.get<Match[]>(`/matches/${matchday}`),
    submitMatchReport: (matchId: string, events: any[]) => api.post(`/matches/${matchId}/report`, events),
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
    getUpcomingMatches: (tenantId: string) =>
        api.get<Match[]>(`/public/matches/upcoming`, { headers: { 'X-Tenant-ID': tenantId } }),
};

export default api;
