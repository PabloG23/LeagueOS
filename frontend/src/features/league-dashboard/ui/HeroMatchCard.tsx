import { Calendar, MapPin, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeroMatchCardProps {
    homeTeam: string;
    awayTeam: string;
    homeLogo?: string;
    awayLogo?: string;
    date: string;
    venue: string;
    leagueName: string;
}

export const HeroMatchCard = ({
    homeTeam,
    awayTeam,
    homeLogo,
    awayLogo,
    date,
    venue,
    leagueName,
}: HeroMatchCardProps) => {
    return (
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden mb-8 group bg-card text-card-foreground shadow-sm border">
            {/* Background Image with Blur */}
            <div
                className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1522778119026-d647f0565c6d?q=80&w=2070&auto=format&fit=crop')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10" />

            {/* Content */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8 text-white">
                <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-accent text-accent-foreground hover:bg-accent/90 border-none">PRÓXIMO PARTIDO</span>
                    <span className="text-sm font-medium tracking-wider opacity-90">{leagueName.toUpperCase()}</span>
                </div>

                <div className="flex items-center justify-between max-w-4xl w-full">
                    {/* Home Team */}
                    <Link to={`/ligaMexiquense/team/1`} className="flex flex-col items-center gap-4 flex-1 group/team hover:opacity-80 transition-opacity">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full p-4 flex items-center justify-center border border-white/20 shadow-xl group-hover/team:scale-110 transition-transform duration-300">
                            {homeLogo ? (
                                <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-2xl font-bold">{homeTeam.substring(0, 2)}</span>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-center underline decoration-transparent group-hover/team:decoration-white transition-all">{homeTeam}</h2>
                    </Link>

                    {/* VS */}
                    <div className="flex flex-col items-center px-8">
                        <span className="text-6xl font-black text-white/20">VS</span>
                        <div className="flex items-center gap-2 mt-2 text-lg font-medium">
                            <Calendar className="w-5 h-5 text-accent" />
                            <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-300">
                            <MapPin className="w-4 h-4" />
                            <span>{venue}</span>
                        </div>
                    </div>

                    {/* Away Team */}
                    <Link to={`/ligaMexiquense/team/2`} className="flex flex-col items-center gap-4 flex-1 group/team hover:opacity-80 transition-opacity">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full p-4 flex items-center justify-center border border-white/20 shadow-xl group-hover/team:scale-110 transition-transform duration-300">
                            {awayLogo ? (
                                <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-2xl font-bold">{awayTeam.substring(0, 2)}</span>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-center underline decoration-transparent group-hover/team:decoration-white transition-all">{awayTeam}</h2>
                    </Link>
                </div>

                <div className="mt-8 flex justify-center">
                    <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 rounded-md px-8 bg-accent hover:bg-accent/90 text-accent-foreground py-6 text-lg font-semibold rounded-full shadow-lg hover:shadow-accent/20 transition-all">
                        <Ticket className="mr-2 w-5 h-5" />
                        Comprar Boletos
                    </button>
                </div>
            </div>
        </div>
    );
};
