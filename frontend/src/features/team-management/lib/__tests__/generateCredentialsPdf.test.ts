import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCredentialsPdf } from '../generateCredentialsPdf';

let lastJsPdfInstance: any = null;

// Mock jsPDF
vi.mock('jspdf', () => {
    class MockJsPDF {
        internal = {
            pageSize: {
                getWidth: () => 210,
                getHeight: () => 297,
            },
        };
        setFillColor = vi.fn();
        setDrawColor = vi.fn();
        setLineWidth = vi.fn();
        setTextColor = vi.fn();
        setFontSize = vi.fn();
        setFont = vi.fn();
        rect = vi.fn();
        text = vi.fn();
        addImage = vi.fn();
        addPage = vi.fn();
        splitTextToSize = vi.fn().mockReturnValue(['Texto']);
        getTextWidth = vi.fn().mockReturnValue(20);
        save = vi.fn();
        output = vi.fn().mockReturnValue(new Blob(['mock']));

        constructor() {
            lastJsPdfInstance = this;
        }
    }
    return {
        default: MockJsPDF,
    };
});

describe('generateCredentialsPdf', () => {
    beforeEach(() => {
        lastJsPdfInstance = null;
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        
        globalThis.Image = class {
            onload: () => void = () => {};
            onerror: (err: any) => void = () => {};
            naturalWidth = 100;
            naturalHeight = 100;
            width = 100;
            height = 100;
            private _src = '';
            get src() {
                return this._src;
            }
            set src(val: string) {
                this._src = val;
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
        } as any;

        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            drawImage: vi.fn(),
        }) as any;
        HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock');
    });

    const mockTeam = {
        id: 'team-1',
        name: 'Águilas de Pilares',
        logoUrl: '/placeholder.png',
    };

    const mockPlayers = [
        {
            id: 'player-1',
            firstName: 'Luis',
            lastName: 'Domínguez Ríos',
            jerseyNumber: 1,
            status: 'ACTIVE' as const,
        },
    ];

    it('throws an error if no active players are provided', async () => {
        await expect(
            generateCredentialsPdf({
                team: mockTeam as any,
                players: [],
                themeClass: 'theme-metepec',
            })
        ).rejects.toThrow('No hay jugadores activos registrados en este equipo.');
    });

    it('omits jersey number on credentials for Metepec when showJerseyNumberOnCredentials is false', async () => {
        await generateCredentialsPdf({
            team: mockTeam as any,
            players: mockPlayers as any,
            themeClass: 'theme-metepec',
            tenantId: 'e39a6b17-5646-452d-929c-ca9a8dc4e44d',
            leagueName: 'LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.',
            requireJerseyNumbers: false,
            showJerseyNumberOnCredentials: false,
        });

        expect(lastJsPdfInstance).not.toBeNull();
        const textCalls = lastJsPdfInstance.text.mock.calls.map((call: any[]) => call[0]);
        // The jersey number '1' must NOT be rendered on credentials
        expect(textCalls).not.toContain('1');
    });

    it('renders jersey number on credentials when enabled by tenant rule', async () => {
        await generateCredentialsPdf({
            team: mockTeam as any,
            players: mockPlayers as any,
            themeClass: 'theme-san-lucas',
            tenantId: '22222222-2222-2222-2222-222222222222',
            requireJerseyNumbers: true,
            showJerseyNumberOnCredentials: true,
        });

        expect(lastJsPdfInstance).not.toBeNull();
        const textCalls = lastJsPdfInstance.text.mock.calls.map((call: any[]) => call[0]);
        // The jersey number '1' MUST be rendered
        expect(textCalls).toContain('1');
    });

    it('generates credentials PDF for Liga Nuestro Deporte and renders jersey numbers by default', async () => {
        await generateCredentialsPdf({
            team: mockTeam as any,
            players: mockPlayers as any,
            themeClass: 'theme-nuestro-deporte',
            tenantId: '11111111-1111-1111-1111-111111111111',
            leagueName: 'LIGA NUESTRO DEPORTE',
            showJerseyNumberOnCredentials: true,
        });

        expect(lastJsPdfInstance).not.toBeNull();
        const textCalls = lastJsPdfInstance.text.mock.calls.map((call: any[]) => call[0]);
        // The jersey number '1' MUST be rendered for Nuestro Deporte
        expect(textCalls).toContain('1');
    });
});
