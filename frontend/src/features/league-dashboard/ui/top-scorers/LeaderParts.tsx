import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Shield, User } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Visual variant of the top-scorer leader presentation.
 * - `fut`: Trading-card ("FUT") style used by tenants with the `theme-nuestro-deporte` theme.
 * - `classic`: Circular-photo layout used by every other tenant.
 */
export type LeaderVariant = 'fut' | 'classic';

/* ------------------------------------------------------------------ */
/* PlayerAvatar: image with automatic icon fallback on load error       */
/* ------------------------------------------------------------------ */

interface PlayerAvatarProps {
    src?: string;
    alt: string;
    className?: string;
    imgClassName?: string;
    fallbackIconClassName?: string;
}

export const PlayerAvatar = ({ src, alt, className, imgClassName, fallbackIconClassName }: PlayerAvatarProps) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = !!src && failedSrc !== src;

    return (
        <div className={cn('overflow-hidden flex items-center justify-center', className)}>
            {showImage ? (
                <img
                    src={src}
                    alt={alt}
                    className={cn('w-full h-full object-cover', imgClassName)}
                    onError={() => setFailedSrc(src!)}
                />
            ) : (
                <User className={cn('text-slate-400', fallbackIconClassName)} />
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* LeaderBadge: "#1 Líder de Goleo" / "#1 Co-Líder (x de n)"            */
/* ------------------------------------------------------------------ */

interface LeaderBadgeProps {
    variant: LeaderVariant;
    coLeaderIndex?: number;
    coLeaderCount?: number;
}

export const getLeaderLabel = (coLeaderIndex = 0, coLeaderCount = 1) =>
    coLeaderCount > 1 ? `#1 Co-Líder (${coLeaderIndex + 1} de ${coLeaderCount})` : '#1 Líder de Goleo';

export const LeaderBadge = ({ variant, coLeaderIndex, coLeaderCount }: LeaderBadgeProps) => (
    <div
        className={cn(
            'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 shadow-sm',
            variant === 'fut'
                ? 'bg-amber-400/25 border border-amber-400/50 text-amber-300'
                : 'bg-yellow-400/25 border border-yellow-400/50 text-yellow-300'
        )}
    >
        <Crown className="w-3 h-3 text-amber-300" />
        {getLeaderLabel(coLeaderIndex, coLeaderCount)}
    </div>
);

/* ------------------------------------------------------------------ */
/* LeaderName                                                          */
/* ------------------------------------------------------------------ */

export const LeaderName = ({ name }: { name: string }) => (
    <h4 className="text-base sm:text-lg font-black tracking-tight mb-1 leading-tight text-white uppercase drop-shadow-sm px-1 text-center text-balance line-clamp-2">
        {name}
    </h4>
);

/* ------------------------------------------------------------------ */
/* LeaderTeam                                                          */
/* ------------------------------------------------------------------ */

interface LeaderTeamProps {
    variant: LeaderVariant;
    team: string;
    to?: string;
}

export const LeaderTeam = ({ variant, team, to }: LeaderTeamProps) => (
    <Link
        to={to || '#'}
        className={cn(
            'text-xs font-semibold transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 max-w-full',
            variant === 'fut'
                ? 'mb-2.5 text-slate-300 hover:text-red-400'
                : 'mb-2 text-white/70 hover:text-white'
        )}
    >
        {variant === 'fut' && <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        <span className="truncate">{team}</span>
    </Link>
);

/* ------------------------------------------------------------------ */
/* GoalsCounter                                                        */
/* ------------------------------------------------------------------ */

interface GoalsCounterProps {
    variant: LeaderVariant;
    goals: number;
}

export const GoalsCounter = ({ variant, goals }: GoalsCounterProps) => {
    const label = goals === 1 ? 'Gol' : 'Goles';

    if (variant === 'fut') {
        return (
            <div className="flex items-baseline justify-center gap-1.5 bg-black/40 px-4 py-1 rounded-full border border-white/10 shadow-inner">
                <span className="font-['Bebas_Neue'] text-3xl text-red-400 tracking-wider leading-none drop-shadow-md">
                    {goals}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label}</span>
            </div>
        );
    }

    return (
        <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-black tracking-tight leading-none drop-shadow-md text-3xl text-amber-400">{goals}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">{label}</span>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* ContainedPhoto: full photo (object-contain) over a blurred copy     */
/* so ID-style pictures never get cropped or show white bars.          */
/* ------------------------------------------------------------------ */

export const ContainedPhoto = ({ src, alt }: { src?: string; alt: string }) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showImage = !!src && failedSrc !== src;

    if (!showImage) {
        return <User className="w-16 h-16 text-slate-400 relative z-10" />;
    }

    return (
        <>
            <img
                src={src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-60"
            />
            <img
                src={src}
                alt={alt}
                className="relative z-10 w-full h-full object-contain object-center"
                onError={() => setFailedSrc(src!)}
            />
        </>
    );
};
