import { useState, useMemo } from 'react';
import { leagueApi, MatchPreviewDTO } from '../api/fixture-generator.api';

export interface FixtureGeneratorState {
    /** Flat list of preview matches as returned by the backend */
    previews: MatchPreviewDTO[];
    /**
     * Derived Map<matchday, MatchPreviewDTO[]> — built once in O(n) via useMemo.
     * Lookup per matchday is O(1).
     */
    matchdayMap: Map<number, MatchPreviewDTO[]>;
    /** Sorted list of matchday numbers for rendering in order */
    matchdays: number[];
    isLoadingPreview: boolean;
    isConfirming: boolean;
    error: string | null;
    fetchPreview: () => Promise<void>;
    confirmFixtures: () => Promise<void>;
}

/**
 * Custom hook encapsulating all fixture generator logic.
 *
 * Complexity:
 *   - fetchPreview: O(n) — one API call + one Array.reduce to build matchdayMap
 *   - matchdayMap: O(n) space, O(1) per-matchday access
 *   - confirmFixtures: O(1) — single API call, no local computation
 */
export function useFixtureGenerator(
    tenantId: string,
    seasonId: string,
    onSuccess: () => void
): FixtureGeneratorState {
    const [previews, setPreviews] = useState<MatchPreviewDTO[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Group flat preview list into a Map by matchday.
     * Runs once in O(n) whenever `previews` changes — memoized.
     * Space: O(n) — each match stored exactly once in the map values.
     */
    const matchdayMap = useMemo<Map<number, MatchPreviewDTO[]>>(() => {
        return previews.reduce<Map<number, MatchPreviewDTO[]>>((map, match) => {
            const existing = map.get(match.matchday);
            if (existing) {
                existing.push(match);
            } else {
                map.set(match.matchday, [match]);
            }
            return map;
        }, new Map());
    }, [previews]);

    /**
     * Sorted matchday keys — O(k log k) where k = number of matchdays.
     * For n teams: k = n-1, which is small — effectively O(n log n).
     */
    const matchdays = useMemo<number[]>(
        () => Array.from(matchdayMap.keys()).sort((a, b) => a - b),
        [matchdayMap]
    );

    const fetchPreview = async () => {
        setIsLoadingPreview(true);
        setError(null);
        try {
            const res = await leagueApi.previewRoundRobinFixtures(tenantId, seasonId);
            setPreviews(res.data);
        } catch (err: any) {
            const msg = err.response?.data?.error ?? 'No se pudo generar la vista previa.';
            setError(msg);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const confirmFixtures = async () => {
        setIsConfirming(true);
        setError(null);
        try {
            await leagueApi.generateRoundRobinFixtures(tenantId, seasonId);
            onSuccess();
        } catch (err: any) {
            const msg = err.response?.data?.error ?? 'No se pudieron guardar los partidos.';
            setError(msg);
        } finally {
            setIsConfirming(false);
        }
    };

    return {
        previews,
        matchdayMap,
        matchdays,
        isLoadingPreview,
        isConfirming,
        error,
        fetchPreview,
        confirmFixtures,
    };
}
