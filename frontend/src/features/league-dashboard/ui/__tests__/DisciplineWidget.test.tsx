import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { DisciplineWidget } from '../DisciplineWidget';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';

describe('DisciplineWidget — UI Component Tests', () => {

    it('should render discipline table title and columns', () => {
        renderWithProviders(<DisciplineWidget />);

        expect(screen.getByText('Tabla de Disciplina')).toBeInTheDocument();
        expect(screen.getByText('Equipo')).toBeInTheDocument();
        expect(screen.getByText('Tarjetas Rojas')).toBeInTheDocument();
    });

    it('should render ranked teams with red card counts', () => {
        renderWithProviders(<DisciplineWidget />);

        expect(screen.getByText('Carniceros')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();

        expect(screen.getByText('Leñadores')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();

        expect(screen.getByText('Atletico')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render full report button', () => {
        renderWithProviders(<DisciplineWidget />);

        expect(screen.getByRole('button', { name: /ver reporte completo/i })).toBeInTheDocument();
    });
});
