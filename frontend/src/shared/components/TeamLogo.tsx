import { useState } from 'react';
import { SecureImage } from '../../features/team-management/ui/SecureImage';

interface TeamLogoProps {
    teamName: string;
    logoUrl?: string;
    fallbackClass?: string;
}

export const TeamLogo = ({ teamName, logoUrl, fallbackClass = "text-[10px] font-bold text-white" }: TeamLogoProps) => {
    const [error, setError] = useState(false);

    if (!logoUrl || error) {
        return (
            <span className={fallbackClass}>
                {teamName ? teamName.substring(0, 2).toUpperCase() : '?'}
            </span>
        );
    }

    return (
        <SecureImage 
            srcKey={logoUrl} 
            alt={teamName || 'Team Logo'} 
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setError(true)}
        />
    );
};
