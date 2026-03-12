import { PlayoffsBracketView } from '@/features/league-management/ui/PlayoffsBracketView';

interface PublicPlayoffsViewProps {
    tenantId: string;
    seasonId: string;
}

export const PublicPlayoffsView = ({ tenantId, seasonId }: PublicPlayoffsViewProps) => {
    return (
        <div className="w-full overflow-x-auto">
            <PlayoffsBracketView tenantId={tenantId} seasonId={seasonId} readonly={true} />
        </div>
    );
};
