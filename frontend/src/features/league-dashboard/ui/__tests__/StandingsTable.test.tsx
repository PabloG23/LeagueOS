import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { StandingsTable, TeamStanding } from '../StandingsTable';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { TENANT_NUESTRO_DEPORTE, TENANT_SAN_LUCAS } from '@/test/helpers/tenantTestUtils';

describe('StandingsTable — Total Points Tests', () => {
    const mockStandings: TeamStanding[] = [
        {
            id: 'team-1',
            rank: 1,
            team: 'Atlas',
            played: 2,
            won: 1,
            drawn: 1,
            lost: 0,
            goalsFor: 4,
            goalsAgainst: 2,
            goalDifference: 2,
            points: 5, // 3 (win) + 1 (draw) + 1 (extra point summed directly)
            form: ['W', 'D'],
        },
        {
            id: 'team-2',
            rank: 2,
            team: 'Pumas',
            played: 2,
            won: 0,
            drawn: 1,
            lost: 1,
            goalsFor: 2,
            goalsAgainst: 4,
            goalDifference: -2,
            points: 1, // 0 + 1 (draw)
            form: ['D', 'L'],
        },
    ];

    it('should display total points directly in PTS column without adding any PE column', () => {
        renderWithProviders(<StandingsTable data={mockStandings} />, {
            tenantSettings: TENANT_NUESTRO_DEPORTE,
        });

        // Column PE should NOT exist in the table
        expect(screen.queryByText('PE')).not.toBeInTheDocument();

        // Standard columns should be present
        expect(screen.getByText('JJ')).toBeInTheDocument();
        expect(screen.getByText('JG')).toBeInTheDocument();
        expect(screen.getByText('JE')).toBeInTheDocument();
        expect(screen.getByText('JP')).toBeInTheDocument();
        expect(screen.getByText('PTS')).toBeInTheDocument();

        // Team names and Atlas's total points (5) should be rendered
        expect(screen.getByText('Atlas')).toBeInTheDocument();
        expect(screen.getByText('Pumas')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should maintain standard table structure for other tenants (San Lucas)', () => {
        renderWithProviders(<StandingsTable data={mockStandings} />, {
            tenantSettings: TENANT_SAN_LUCAS,
        });

        expect(screen.queryByText('PE')).not.toBeInTheDocument();
        expect(screen.getByText('Atlas')).toBeInTheDocument();
        expect(screen.getByText('Pumas')).toBeInTheDocument();
    });
});
