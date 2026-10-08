import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TopYellowCardsWidget } from '../TopYellowCardsWidget';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { PlayerYellowCardsDTO } from '@/shared/api/league-api';

describe('TopYellowCardsWidget — UI Component Tests', () => {
    const mockData: PlayerYellowCardsDTO[] = [
        {
            playerId: 'player-1',
            playerName: 'Carlos Vela',
            teamId: 'team-1',
            teamName: 'Metepec FC',
            yellowCards: 4,
            matchesSuspended: 0
        },
        {
            playerId: 'player-2',
            playerName: 'Luis Hernández',
            teamId: 'team-2',
            teamName: 'Deportivo Toluca',
            yellowCards: 5,
            matchesSuspended: 1
        }
    ];

    it('should render title and rule badge', () => {
        renderWithProviders(<TopYellowCardsWidget data={mockData} />);

        expect(screen.getByText('Tarjetas Amarillas')).toBeInTheDocument();
        expect(screen.getByText('5 = Suspensión')).toBeInTheDocument();
    });

    it('should render player names and yellow card count', () => {
        renderWithProviders(<TopYellowCardsWidget data={mockData} />);

        expect(screen.getByText('Carlos Vela')).toBeInTheDocument();
        expect(screen.getByText('Metepec FC')).toBeInTheDocument();
        expect(screen.getByText('4 🟨')).toBeInTheDocument();

        expect(screen.getByText('Luis Hernández')).toBeInTheDocument();
        expect(screen.getByText('Deportivo Toluca')).toBeInTheDocument();
        expect(screen.getByText('5 🟨')).toBeInTheDocument();
    });

    it('should show suspended badge when matchesSuspended > 0', () => {
        renderWithProviders(<TopYellowCardsWidget data={mockData} />);

        expect(screen.getByText('Suspendido')).toBeInTheDocument();
    });

    it('should render empty state message when data is empty', () => {
        renderWithProviders(<TopYellowCardsWidget data={[]} />);

        expect(screen.getByText('Sin tarjetas amarillas registradas.')).toBeInTheDocument();
    });

    it('should correctly render generic backend PlayerStatDTO format (name, team, redCards) without undefined or errors', () => {
        const legacyData: any[] = [
            {
                id: 'player-legacy-1',
                name: 'Oribe Peralta',
                team: 'Santos Laguna',
                redCards: 3
            }
        ];
        renderWithProviders(<TopYellowCardsWidget data={legacyData} />);

        expect(screen.getByText('Oribe Peralta')).toBeInTheDocument();
        expect(screen.getByText('Santos Laguna')).toBeInTheDocument();
        expect(screen.getByText('3 🟨')).toBeInTheDocument();
    });
});
