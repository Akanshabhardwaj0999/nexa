import {
    ArrowRight,
    Headphones,
    Heart,
    MapPin,
    Music,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Sparkles,
    Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/*
 * The hero visual is laid out on an 860 x 680 grid (the SVG viewBox),
 * and every piece is positioned in percentages of it, so the whole
 * scene scales down as one unit on smaller screens.
 */

function Home() {
    const navigate = useNavigate();

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#06050c] text-white">
            <Background />

            {/* ================= NAVBAR ================= */}
            <nav className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 sm:px-6 lg:px-12 lg:py-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.12)] lg:h-14 lg:w-14">
                        <Headphones size={24} strokeWidth={2.4} />
                    </div>

                    <span className="text-2xl font-semibold tracking-tight lg:text-3xl">
                        Nexa
                    </span>
                </div>

                <button className="rounded-full border border-white/20 bg-white/[0.03] px-6 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition hover:border-white/40 hover:bg-white/10 lg:px-8 lg:py-3">
                    About
                </button>
            </nav>

            {/* ================= HERO ================= */}
            <section className="relative z-10 mx-auto flex max-w-[1400px] items-center px-5 pb-16 pt-6 sm:px-6 lg:min-h-[calc(100vh-120px)] lg:px-12 lg:pb-24">
                <div className="grid w-full items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-6">
                    {/* ================= LEFT CONTENT ================= */}
                    <div>
                        <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-5 py-2.5 text-sm text-white/80 backdrop-blur-md">
                            <Sparkles size={16} className="text-violet-200" fill="currentColor" />
                            Music feels better together
                        </div>

                        <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-6xl xl:text-7xl">
                            Your music.
                            <br />
                            <span className="bg-gradient-to-r from-[#8f84b8] via-[#b5a8e6] to-[#8d7ee8] bg-clip-text text-transparent">
                                Their vibe.
                            </span>
                            <br />
                            One moment.
                        </h1>

                        <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
                            Create a room, invite someone you love, and listen to the
                            same song together — even when you're miles apart.
                        </p>

                        {/* CTA */}
                        <div className="mt-10 flex flex-wrap gap-3 sm:gap-5">
                            <button
                                onClick={() => navigate("/create")}
                                className="group flex items-center gap-2 sm:gap-3 rounded-full bg-white px-6 py-3.5 text-base font-medium sm:px-9 sm:py-4 sm:text-lg text-black transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(255,255,255,0.2)]"
                            >
                                Create a room
                                <ArrowRight
                                    size={20}
                                    className="transition-transform group-hover:translate-x-1"
                                />
                            </button>

                            <button
                                onClick={() => navigate("/join")}
                                className="rounded-full border border-violet-400/60 bg-violet-500/[0.04] px-6 py-3.5 text-base font-medium sm:px-9 sm:py-4 sm:text-lg text-white transition hover:border-violet-300 hover:bg-violet-500/10 hover:shadow-[0_0_30px_rgba(139,92,246,0.25)]"
                            >
                                Join a room
                            </button>
                        </div>

                        {/* Features */}
                        <div className="mt-10 flex flex-wrap items-center gap-5 text-sm text-white/80 sm:mt-12 sm:gap-8 sm:text-base">
                            <div className="flex items-center gap-3">
                                <Users size={22} className="text-violet-400" />
                                <span>Listen together</span>
                            </div>

                            <div className="h-7 w-px bg-white/15 max-[360px]:hidden" />

                            <div className="flex items-center gap-3">
                                <Headphones size={22} className="text-violet-400" />
                                <span>Real-time sync</span>
                            </div>
                        </div>
                    </div>

                    {/* ================= RIGHT VISUAL ================= */}
                    <HeroScene />
                </div>
            </section>
        </main>
    );
}

function Background() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {/* top-left magenta */}
            <div className="absolute -left-[12%] top-[5%] h-[480px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(168,40,200,0.5),transparent)]" />
            {/* top-right blue */}
            <div className="absolute -right-[8%] -top-[18%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(40,50,200,0.6),transparent)]" />
            {/* bottom-left violet/blue */}
            <div className="absolute -bottom-[25%] -left-[10%] h-[520px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgba(60,70,210,0.5),transparent)]" />
            {/* bottom-left magenta */}
            <div className="absolute -bottom-[30%] left-[5%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(170,40,190,0.45),transparent)]" />
            {/* bottom-center violet wave */}
            <div className="absolute -bottom-[22%] left-[30%] h-[460px] w-[900px] -rotate-6 rounded-[50%] bg-[radial-gradient(closest-side,rgba(110,50,230,0.5),transparent)]" />
            {/* bottom-right blue */}
            <div className="absolute -bottom-[25%] -right-[10%] h-[440px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(50,60,210,0.5),transparent)]" />
        </div>
    );
}

function HeroScene() {
    const [isPlaying, setIsPlaying] = useState(true);

    return (
        <div className="@container relative mx-auto aspect-[860/680] w-full max-w-[860px]">
            {/* ================= GLOBE + ROUTE ================= */}
            <svg
                viewBox="0 0 860 680"
                className="absolute inset-0 h-full w-full"
                aria-hidden
            >
                <defs>
                    <radialGradient id="globe-fill" cx="45%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#1b2160" stopOpacity="0.75" />
                        <stop offset="70%" stopColor="#0f1240" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#0a0b25" stopOpacity="0.2" />
                    </radialGradient>
                    <clipPath id="globe-clip">
                        <circle cx="420" cy="330" r="240" />
                    </clipPath>
                </defs>

                <circle cx="420" cy="330" r="240" fill="url(#globe-fill)" />
                <circle cx="420" cy="330" r="240" fill="none" stroke="#6d6cf5" strokeOpacity="0.25" />

                {/* latitude / longitude lines */}
                <g clipPath="url(#globe-clip)" fill="none" stroke="#7c83ff" strokeOpacity="0.09">
                    {[-160, -80, 0, 80, 160].map((dy) => (
                        <ellipse key={dy} cx="420" cy={330 + dy} rx="240" ry="40" />
                    ))}
                    {[60, 130, 200].map((rx) => (
                        <ellipse key={rx} cx="420" cy="330" rx={rx} ry="240" />
                    ))}
                </g>

                {/* dashed route between the two cities */}
                <path
                    d="M282 84 Q 432 -20 582 84"
                    fill="none"
                    stroke="#b6b3ff"
                    strokeOpacity="0.6"
                    strokeWidth="1.5"
                    strokeDasharray="5 6"
                    className="animate-[route_1.5s_linear_infinite]"
                />
            </svg>

            {/* Map pins */}
            <MapPin
                className="absolute left-[30.6%] top-[8.5%] h-[5.2%] w-[5.2%] -translate-x-1/2 -translate-y-1/2 fill-fuchsia-400 text-fuchsia-100 drop-shadow-[0_0_10px_rgba(232,121,249,0.9)]"
                strokeWidth={1.5}
            />
            <MapPin
                className="absolute left-[67.7%] top-[8.5%] h-[5.2%] w-[5.2%] -translate-x-1/2 -translate-y-1/2 fill-sky-400 text-sky-100 drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]"
                strokeWidth={1.5}
            />

            {/* Floating notes */}
            <Music className="absolute left-[18.5%] top-[5%] h-[5%] w-[5%] text-violet-400 animate-[float_4s_ease-in-out_infinite]" />
            <Music className="absolute left-[79%] top-[15%] h-[4.2%] w-[4.2%] text-blue-500 animate-[float_5s_ease-in-out_infinite]" />
            <Heart className="absolute left-[73%] top-[2%] h-[3%] w-[3%] text-violet-500 animate-[float_3.5s_ease-in-out_infinite]" />
            <Music className="absolute left-[30%] top-[76%] h-[5%] w-[5%] text-violet-400 animate-[float_4.5s_ease-in-out_infinite]" />

            {/* ================= LISTENER CARDS ================= */}
            <ListenerCard
                src="/images/listener-delhi.png"
                alt="Someone in New Delhi listening on their phone"
                className="left-[2%] top-[18%] h-[52%] w-[35%] -rotate-[4deg] border-violet-400/90 shadow-[0_0_35px_rgba(168,85,247,0.55),inset_0_0_20px_rgba(168,85,247,0.35)] animate-[drift-left_7s_ease-in-out_infinite]"
            />
            <ListenerCard
                src="/images/listener-bangalore.png"
                alt="Someone in Bangalore listening on their phone"
                className="left-[65.5%] top-[30.5%] h-[50.5%] w-[34%] rotate-[4deg] border-sky-400/90 shadow-[0_0_35px_rgba(56,189,248,0.55),inset_0_0_20px_rgba(56,189,248,0.35)] animate-[drift-right_7s_ease-in-out_infinite]"
            />

           

            {/* ================= SOUND WAVES ================= */}
            <svg
                viewBox="0 0 860 680"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                aria-hidden
            >
                <defs>
                    <linearGradient id="wave-left" x1="0" x2="1">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                        <stop offset="40%" stopColor="#e9d5ff" />
                        <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <linearGradient id="wave-right" x1="0" x2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="60%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                    <filter id="wave-glow" x="-20%" y="-50%" width="140%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g filter="url(#wave-glow)" fill="none" strokeLinecap="round">
                    {[0, 7, -7].map((offset, i) => (
                        <path
                            key={`l${i}`}
                            d={`M235 ${335 + offset} C 262 ${300 - offset}, 288 ${372 + offset}, 312 ${333 + offset} S 336 ${300 - offset}, 352 ${340 + offset}`}
                            stroke="url(#wave-left)"
                            strokeWidth={i === 0 ? 3 : 1.5}
                            strokeOpacity={i === 0 ? 1 : 0.75}
                            strokeDasharray="14 3"
                            className="animate-[wave-flow_1.2s_linear_infinite]"
                        />
                    ))}
                    {[0, 7, -7].map((offset, i) => (
                        <path
                            key={`r${i}`}
                            d={`M526 ${350 + offset} C 546 ${312 - offset}, 566 ${378 + offset}, 588 ${340 + offset} S 620 ${300 - offset}, 650 ${330 + offset}`}
                            stroke="url(#wave-right)"
                            strokeWidth={i === 0 ? 3 : 1.5}
                            strokeOpacity={i === 0 ? 1 : 0.75}
                            strokeDasharray="14 3"
                            className="animate-[wave-flow_1.2s_linear_infinite]"
                        />
                    ))}
                </g>
            </svg>

            {/* ================= CENTRAL PLAYER ================= */}
            <div className="absolute left-[40.2%] top-[35.5%] z-20 w-[21.8%] rounded-[2.6cqw] border border-violet-400/40 bg-[#14122b]/85 p-[1.9cqw] shadow-[0_0_40px_rgba(124,58,237,0.35)] backdrop-blur-xl">
                <AlbumArt />

                <p className="mt-[1.6cqw] truncate text-[clamp(8px,1.75cqw,15px)] font-semibold">
                    Better Together
                </p>
                <p className="text-[clamp(7px,1.4cqw,12px)] text-white/50">Ours</p>

                {/* Progress */}
                <div className="relative mt-[2cqw] h-[0.5cqw] min-h-[2px] rounded-full bg-white/20">
                    <div className="absolute inset-y-0 left-0 w-[48%] rounded-full bg-gradient-to-r from-violet-300 to-white" />
                    <div className="absolute left-[48%] top-1/2 h-[1.6cqw] w-[1.6cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                </div>
                <div className="mt-[1cqw] flex justify-between text-[clamp(6px,1.2cqw,11px)] text-white/60">
                    <span>1:42</span>
                    <span>3:26</span>
                </div>

                {/* Controls */}
                <div className="mt-[1.2cqw] flex items-center justify-center gap-[3cqw]">
                    <SkipBack className="h-[2.2cqw] w-[2.2cqw] text-white" fill="currentColor" />
                    <button
                        onClick={() => setIsPlaying((playing) => !playing)}
                        aria-label={isPlaying ? "Pause preview" : "Play preview"}
                        className="flex h-[4.6cqw] w-[4.6cqw] items-center justify-center rounded-full bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.8)] transition hover:scale-105"
                    >
                        {isPlaying ? (
                            <Pause className="h-[2.2cqw] w-[2.2cqw]" fill="currentColor" />
                        ) : (
                            <Play className="h-[2.2cqw] w-[2.2cqw]" fill="currentColor" />
                        )}
                    </button>
                    <SkipForward className="h-[2.2cqw] w-[2.2cqw] text-white" fill="currentColor" />
                </div>
            </div>
        </div>
    );
}

function ListenerCard({ src, alt, className }: { src: string; alt: string; className: string }) {
    return (
        <div className={`absolute overflow-hidden rounded-[4.6cqw] border-2 bg-[#15112a] ${className}`}>
            <img src={src} alt={alt} className="h-full w-full object-cover" />
        </div>
    );
}

/* Sunset-with-palms cover, drawn in SVG so it needs no image */
function AlbumArt() {
    return (
        <svg viewBox="0 0 80 80" className="w-[45%] rounded-[1.2cqw]" aria-hidden>
            <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4c3fc9" />
                    <stop offset="55%" stopColor="#c04fc4" />
                    <stop offset="100%" stopColor="#ff9a6b" />
                </linearGradient>
            </defs>
            <rect width="80" height="80" fill="url(#sky)" />
            <circle cx="40" cy="52" r="15" fill="#ffc48a" opacity="0.9" />
            <rect y="58" width="80" height="22" fill="#2a1450" opacity="0.85" />
            <g stroke="#1a0b33" strokeWidth="2" fill="#1a0b33">
                <path d="M16 62 Q 18 44 20 34" fill="none" />
                <path d="M20 34 q -8 -2 -12 4 M20 34 q 7 -4 12 1 M20 34 q -3 -6 -9 -6 M20 34 q 4 -6 10 -5" fill="none" strokeWidth="1.5" />
                <path d="M62 64 Q 60 48 58 40" fill="none" />
                <path d="M58 40 q -8 -2 -12 4 M58 40 q 7 -4 12 1 M58 40 q -3 -6 -9 -6 M58 40 q 4 -6 10 -5" fill="none" strokeWidth="1.5" />
            </g>
        </svg>
    );
}

export default Home;
