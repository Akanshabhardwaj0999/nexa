import {
    Headphones,
    Heart,
    Loader2,
    Pause,
    Play,
    SkipBack,
    SkipForward,
    Volume1,
    Volume2,
    VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { formatTime } from "../../lib/format";
import { FALLBACK_COVER } from "../../services/room";
import type { Song } from "../../types/music";

interface NowPlayingProps {
    song: Song | null;
    // Element the YouTube player is placed in (from useYouTubePlayer).
    playerMountRef: (element: HTMLDivElement | null) => void;
    showVideo: boolean;
    isResolving: boolean;
    isPlaying: boolean;
    isBuffering: boolean;
    isBlocked: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    canSkip: boolean;
    activity: string;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onNext: () => void;
    onPrevious: () => void;
    onVolume: (volume: number) => void;
    onUnlock: () => void;
}

function NowPlaying({
    song,
    playerMountRef,
    showVideo,
    isResolving,
    isPlaying,
    isBuffering,
    isBlocked,
    currentTime,
    duration,
    volume,
    canSkip,
    activity,
    onTogglePlay,
    onSeek,
    onNext,
    onPrevious,
    onVolume,
    onUnlock,
}: NowPlayingProps) {
    const [likedIds, setLikedIds] = useState<string[]>([]);

    // While scrubbing, show the thumb position instead of audio time
    // and only seek (and sync) once the user lets go.
    const [scrubTime, setScrubTime] = useState<number | null>(null);

    const liked = song ? likedIds.includes(song.id) : false;
    const totalTime = duration || song?.duration || 0;
    const shownTime = scrubTime ?? currentTime;
    const progress = totalTime > 0 ? (shownTime / totalTime) * 100 : 0;

    /*
     * Seek once the user lets go. The native "change" event fires on
     * release for mouse, touch and keyboard alike; pointerup is not
     * reliable on phones (it is often cancelled or never sent for
     * range inputs), which left the slider stuck without seeking.
     * React's onChange is the "input" event, so listen natively.
     */
    const seekInputRef = useRef<HTMLInputElement | null>(null);
    const onSeekRef = useRef(onSeek);

    useEffect(() => {
        onSeekRef.current = onSeek;
    }, [onSeek]);

    useEffect(() => {
        const input = seekInputRef.current;

        if (!input) {
            return;
        }

        const commit = () => {
            onSeekRef.current(Number(input.value));
            setScrubTime(null);
        };

        input.addEventListener("change", commit);

        return () => input.removeEventListener("change", commit);
    }, []);

    const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <section className="flex flex-col">
            {/* Album */}
            <div className="mx-auto w-full max-w-[min(460px,46dvh)] sm:max-w-[min(460px,52dvh)] lg:max-w-[460px]">
                <div className="group relative aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:rounded-[36px]">
                    {song ? (
                        <img
                            src={song.cover || FALLBACK_COVER}
                            onError={(e) => {
                                // Some artwork hosts go offline; show the default cover.
                                if (e.currentTarget.src !== FALLBACK_COVER) {
                                    e.currentTarget.src = FALLBACK_COVER;
                                }
                            }}
                            alt={song.title}
                            className={`h-full w-full object-cover transition duration-700 ${
                                showVideo
                                    ? "scale-110 opacity-60 blur-2xl"
                                    : `group-hover:scale-105 ${isPlaying ? "" : "saturate-[0.85]"}`
                            }`}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/30 via-violet-500/25 to-sky-400/30">
                            <Headphones size={64} className="text-white/30" />
                        </div>
                    )}

                    {/*
                      * YouTube's player, shown at the top of the card. It stays
                      * mounted (hidden when unused) so playback never restarts.
                      */}
                    <div
                        className={`absolute inset-x-0 top-0 aspect-video overflow-hidden bg-black transition-opacity duration-500 [&_iframe]:h-full [&_iframe]:w-full ${
                            showVideo ? "opacity-100" : "pointer-events-none opacity-0"
                        }`}
                    >
                        <div ref={playerMountRef} className="h-full w-full" />
                    </div>

                    <div
                        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent ${
                            showVideo ? "top-1/2" : "top-0"
                        }`}
                    />

                    <div className="pointer-events-none absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7">
                        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                            {isPlaying && (
                                <span className="flex h-3 items-end gap-0.5">
                                    <span className="eq-bar h-2 w-0.5 bg-white/70" />
                                    <span className="eq-bar h-3 w-0.5 bg-white/70 [animation-delay:150ms]" />
                                    <span className="eq-bar h-1.5 w-0.5 bg-white/70 [animation-delay:300ms]" />
                                </span>
                            )}
                            {isResolving && (
                                <Loader2 size={12} className="animate-spin" />
                            )}
                            {isResolving
                                ? "Finding song..."
                                : song
                                  ? "Now playing"
                                  : "Nothing playing"}
                        </p>

                        <h1 className="line-clamp-2 text-xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                            {song?.title ?? "Pick a song"}
                        </h1>

                        <p className="mt-1 truncate text-sm text-white/60 sm:text-base">
                            {song?.artist ?? "Search or discover music to play together"}
                        </p>
                    </div>

                    {isBlocked && (
                        <button
                            onClick={onUnlock}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm transition hover:bg-black/50"
                        >
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl">
                                <Play size={26} fill="currentColor" />
                            </span>

                            <span className="text-sm font-medium">
                                Tap to listen along
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="mx-auto mt-5 flex w-full max-w-[460px] items-center justify-between sm:mt-6">
                <p className="min-h-5 truncate text-sm text-white/50">
                    {activity}
                </p>

                <button
                    onClick={() =>
                        song &&
                        setLikedIds((ids) =>
                            ids.includes(song.id)
                                ? ids.filter((id) => id !== song.id)
                                : [...ids, song.id],
                        )
                    }
                    disabled={!song}
                    aria-label="Like"
                    className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-30"
                >
                    <Heart
                        size={19}
                        className={liked ? "fill-fuchsia-400 text-fuchsia-400" : ""}
                    />
                </button>
            </div>

            {/* Progress */}
            <div className="mx-auto mt-4 w-full max-w-[460px] sm:mt-5">
                <input
                    ref={seekInputRef}
                    type="range"
                    min={0}
                    max={totalTime || 0}
                    step={0.1}
                    value={Math.min(shownTime, totalTime || 0)}
                    onChange={(e) => setScrubTime(Number(e.target.value))}
                    disabled={!song}
                    style={{ "--progress": `${progress}%` } as CSSProperties}
                    className="range-slider w-full disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Seek"
                />

                <div className="mt-1 flex justify-between text-xs tabular-nums text-white/30">
                    <span>{formatTime(shownTime)}</span>
                    <span>{formatTime(totalTime)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="mx-auto mt-3 flex w-full max-w-[460px] items-center justify-center gap-6 sm:mt-4 sm:gap-8">
                <button
                    onClick={onPrevious}
                    disabled={!canSkip}
                    aria-label="Previous"
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                >
                    <SkipBack size={22} />
                </button>

                <button
                    onClick={isBlocked ? onUnlock : onTogglePlay}
                    disabled={!song}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                >
                    {isResolving || (isBuffering && isPlaying) ? (
                        <Loader2 size={22} className="animate-spin" />
                    ) : isPlaying ? (
                        <Pause size={22} fill="currentColor" />
                    ) : (
                        <Play size={22} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                <button
                    onClick={onNext}
                    disabled={!canSkip}
                    aria-label="Next"
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                >
                    <SkipForward size={22} />
                </button>
            </div>

            {/* Volume (local only, each listener picks their own) */}
            <div className="mx-auto mt-5 flex items-center gap-3 text-white/40 sm:mt-6">
                <button
                    onClick={() => onVolume(volume === 0 ? 0.8 : 0)}
                    aria-label="Mute"
                    className="flex h-10 w-10 items-center justify-center transition hover:text-white"
                >
                    <VolumeIcon size={17} />
                </button>

                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => onVolume(Number(e.target.value))}
                    style={{ "--progress": `${volume * 100}%` } as CSSProperties}
                    className="range-slider w-32 sm:w-28"
                    aria-label="Volume"
                />
            </div>
        </section>
    );
}

export default NowPlaying;
