import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerProfileModal } from '../PlayerProfileModal';

// Mock de useTenantSettings
vi.mock('@/shared/hooks/useTenantSettings', () => ({
    useTenantSettings: () => ({
        settings: {
            tenantId: 'tenant-123',
            name: 'Liga Nuestro Deporte',
            minMatchesForPlayoffs: 5
        }
    })
}));

// Mock de leagueApi
vi.mock('@/shared/api/league-api', () => ({
    leagueApi: {
        getProxyUrl: (key: string) => `http://localhost:8080/api/media/proxy?key=${encodeURIComponent(key)}`,
        getPlayerStats: vi.fn().mockResolvedValue({
            data: {
                matchesPlayed: 5,
                goals: 2,
                yellowCards: 1,
                redCards: 0,
                playedMatches: [
                    {
                        matchId: 'm-1',
                        matchday: 1,
                        matchDate: '2026-09-01T10:00:00',
                        opponentName: 'Atlas',
                        opponentLogo: 'atlas.png',
                        isHome: true,
                        goals: 1,
                        yellowCards: 0,
                        redCards: 0,
                        verifiedInReport: true
                    },
                    {
                        matchId: 'm-3',
                        matchday: 3,
                        matchDate: '2026-09-15T12:00:00',
                        opponentName: 'Santos',
                        opponentLogo: 'santos.png',
                        isHome: false,
                        goals: 1,
                        yellowCards: 1,
                        redCards: 0,
                        verifiedInReport: true
                    }
                ]
            }
        })
    }
}));

describe('PlayerProfileModal Component', () => {
    const mockPlayer = {
        id: 'player-1',
        name: 'Ezequiel Arreola Vicente',
        photoUrl: 'photos/ezequiel.jpg',
        jerseyNumber: 19,
        curp: 'AEVE940426HMCRCZ06',
        teamName: 'ZENOCAR',
        teamLogo: 'logos/zenocar.png',
        stats: {
            matchesPlayed: 2,
            goals: 2,
            yellowCards: 1,
            redCards: 0,
            playedMatches: [
                {
                    matchId: 'm-1',
                    matchday: 1,
                    matchDate: '2026-09-01T10:00:00',
                    opponentName: 'Atlas',
                    opponentLogo: 'atlas.png',
                    isHome: true,
                    goals: 1,
                    yellowCards: 0,
                    redCards: 0,
                    verifiedInReport: true
                },
                {
                    matchId: 'm-3',
                    matchday: 3,
                    matchDate: '2026-09-15T12:00:00',
                    opponentName: 'Santos',
                    opponentLogo: 'santos.png',
                    isHome: false,
                    goals: 1,
                    yellowCards: 1,
                    redCards: 0,
                    verifiedInReport: true
                }
            ]
        }
    };

    it('renders player identity, team name and jersey number in header', () => {
        render(
            <PlayerProfileModal
                isOpen={true}
                onClose={() => {}}
                player={mockPlayer}
                currentMatchday={4}
            />
        );

        expect(screen.getByText('Ezequiel Arreola Vicente')).toBeInTheDocument();
        expect(screen.getByText('ZENOCAR')).toBeInTheDocument();
        expect(screen.getByText('#19')).toBeInTheDocument();
        expect(screen.getByText('ELEGIBLE')).toBeInTheDocument();
    });

    it('renders transparency matchday chips and verified status in report', () => {
        render(
            <PlayerProfileModal
                isOpen={true}
                onClose={() => {}}
                player={mockPlayer}
                currentMatchday={4}
            />
        );

        expect(screen.getByText('Transparencia: Jornadas Jugadas')).toBeInTheDocument();
        expect(screen.getByText('Jornada 1')).toBeInTheDocument();
        expect(screen.getByText('Jornada 3')).toBeInTheDocument();
        expect(screen.getByText('vs Atlas')).toBeInTheDocument();
        expect(screen.getByText('vs Santos')).toBeInTheDocument();
        expect(screen.getAllByText(/Registrado en Cédula/i).length).toBe(2);
    });
});
