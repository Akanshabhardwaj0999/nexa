import { Loader2, Pause, Play, SkipForward } from "lucide-react";

import { FALLBACK_COVER } from "../../services/room";
import type { Song } from "../../types/music";

interface MiniPlayerProps {
    song: Song;
    visible: boolean;
    isPlaying: boolean;
    isBuffering: boolean;
    progress: number;
    canSkip: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onOpen: () => void;
}

/*
 * Bottom bar shown on phones and tablets once the big player has
 * scrolled out of view, so the song list and the controls can be
 * used together.
 */
function MiniPlayer({
    song,
    visible,
    isPlaying,
    isBuffering,
    progress,
    canSkip,
    onTogglePlay,
    onNext,
    onOpen,
}: MiniPlayerProps) {
    return (
        <div
            className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition duration-300 lg:hidden ${
                visible
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-full opacity-0"
            }`}
            aria-hidden={!visible}
        >
            <div className="relative mx-auto flex max-w-xl items-center gap-3 overflow-hidden rounded-2xl border border-violet-400/25 bg-[#15122a]/90 p-2 pr-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <button
                    onClick={onOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label="Show player"
                    tabIndex={visible ? 0 : -1}
                >
                    <img
                        src={song.cover || FALLBACK_COVER}
                        onError={(e) => {
                            if (e.currentTarget.src !== FALLBACK_COVER) {
                                e.currentTarget.src = FALLBACK_COVER;
                            }
                        }}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                    />

                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                            {song.title}
                        </span>
                        <span className="block truncate text-xs text-white/45">
                            {song.artist}
                        </span>
                    </span>
                </button>

                <button
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    tabIndex={visible ? 0 : -1}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black"
                >
                    {isBuffering && isPlaying ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                <button
                    onClick={onNext}
                    disabled={!canSkip}
                    aria-label="Next"
                    tabIndex={visible ? 0 : -1}
                    className="flex h-11 w-9 shrink-0 items-center justify-center text-white/60 disabled:opacity-25"
                >
                    <SkipForward size={20} />
                </button>

                {/* progress line */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-violet-400 to-sky-400"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default MiniPlayer;
