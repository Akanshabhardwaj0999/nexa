import { Check, Play, Plus, X } from "lucide-react";

import { formatTime } from "../../lib/format";
import { FALLBACK_COVER } from "../../services/room";
import type { Song } from "../../types/music";

interface SongRowProps {
    song: Song;
    active?: boolean;
    isPlaying?: boolean;
    onPlay: () => void;
    onAdd?: () => void;
    onRemove?: () => void;
    added?: boolean;
}

function SongRow({
    song,
    active = false,
    isPlaying = false,
    onPlay,
    onAdd,
    onRemove,
    added = false,
}: SongRowProps) {
    return (
        <div
            className={`group flex items-center gap-3 rounded-2xl p-2 transition ${
                active ? "bg-white/10" : "hover:bg-white/5"
            }`}
        >
            <button
                onClick={onPlay}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5"
                aria-label={`Play ${song.title}`}
            >
                <img
                    src={song.cover || FALLBACK_COVER}
                    onError={(e) => {
                        // Some artwork hosts go offline; show the default cover.
                        if (e.currentTarget.src !== FALLBACK_COVER) {
                            e.currentTarget.src = FALLBACK_COVER;
                        }
                    }}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                />

                <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 transition ${
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                >
                    {active && isPlaying ? (
                        <div className="flex h-4 items-end gap-0.5">
                            <span className="eq-bar h-3 w-0.5 bg-white" />
                            <span className="eq-bar h-4 w-0.5 bg-white [animation-delay:150ms]" />
                            <span className="eq-bar h-2 w-0.5 bg-white [animation-delay:300ms]" />
                        </div>
                    ) : (
                        <Play size={15} fill="white" />
                    )}
                </div>
            </button>

            <button
                onClick={onPlay}
                className="min-w-0 flex-1 text-left"
            >
                <p
                    className={`truncate text-sm ${
                        active ? "font-medium text-white" : "text-white/75"
                    }`}
                >
                    {song.title}
                </p>

                <p className="mt-0.5 truncate text-xs text-white/30">
                    {song.artist}
                </p>
            </button>

            <span className="hidden text-xs text-white/25 sm:block">
                {formatTime(song.duration)}
            </span>

            {onAdd && (
                <button
                    onClick={onAdd}
                    disabled={added}
                    title={added ? "In queue" : "Add to queue"}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white hover:text-black disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-white/60"
                >
                    {added ? <Check size={14} /> : <Plus size={15} />}
                </button>
            )}

            {onRemove && (
                <button
                    onClick={onRemove}
                    title="Remove from queue"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/25 transition hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                >
                    <X size={15} />
                </button>
            )}
        </div>
    );
}

export default SongRow;
