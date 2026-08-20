// Re-export types and API methods from the shared layer
// This keeps the feature self-contained per FSD conventions
export type { MatchPreviewDTO } from '@/shared/api/league-api';
export { leagueApi } from '@/shared/api/league-api';
