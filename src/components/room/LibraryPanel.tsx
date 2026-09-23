import { Loader2, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getFeaturedSongs, searchSongs } from "../../services/music";
import type { Song } from "../../types/music";
import SongRow from "./SongRow";

interface LibraryPanelProps {
    playlist: Song[];
    currentSongId: string | null;
    isPlaying: boolean;
    onPlay: (song: Song) => void;
    onAdd: (song: Song) => void;
    onRemove: (song: Song) => void;
}

function LibraryPanel({
    playlist,
    currentSongId,
    isPlaying,
    onPlay,
    onAdd,
    onRemove,
}: LibraryPanelProps) {
    const [selectedTab, setTab] = useState<"queue" | "discover" | null>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Song[]>([]);
    const [featured, setFeatured] = useState<Song[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);

    // Load something to browse so the list is never empty.
    useEffect(() => {
        let cancelled = false;

        getFeaturedSongs()
            .then((songs) => {
                if (!cancelled) {
                    setFeatured(songs);
                }
            })
            .catch((error) =>
                console.error("Unable to load featured songs:", error),
            )
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingFeatured(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Until a tab is picked, show Discover while the queue is empty.
    const tab = selectedTab ?? (playlist.length > 0 ? "queue" : "discover");

    const handleSearch = async () => {
        const trimmed = query.trim();

        if (!trimmed) {
            clearSearch();
            return;
        }

        try {
            setIsSearching(true);
            setSearchError("");
            setTab("discover");

            const songs = await searchSongs(trimmed);

            setResults(songs);
            setActiveQuery(trimmed);

            if (songs.length === 0) {
                setSearchError(`No tracks found for "${trimmed}".`);
            }
        } catch (error) {
            console.error(error);
            setResults([]);
            setSearchError("Unable to search music right now.");
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setActiveQuery("");
        setSearchError("");
    };

    const isInPlaylist = (song: Song) =>
        playlist.some((item) => item.id === song.id);

    const discoverSongs = activeQuery ? results : featured;

    return (
        <aside className="flex min-h-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-128px)]">
            <div className="flex items-center justify-between px-1">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/30">
                        Shared room
                    </p>

                    <h2 className="mt-1 text-xl font-medium">Our music</h2>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/40">
                    {playlist.length} {playlist.length === 1 ? "song" : "songs"}
                </span>
            </div>

            {/* Search */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                }}
                className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-white/25"
            >
                {isSearching ? (
                    <Loader2 size={17} className="shrink-0 animate-spin text-white/40" />
                ) : (
                    <Search size={17} className="shrink-0 text-white/30" />
                )}

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search songs or artists..."
                    enterKeyHint="search"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />

                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="shrink-0 text-white/30 transition hover:text-white"
                        aria-label="Clear search"
                    >
                        <X size={16} />
                    </button>
                )}
            </form>

            {/* Tabs */}
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-black/20 p-1 text-sm">
                {(["queue", "discover"] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-xl py-2 capitalize transition ${
                            tab === key
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white/70"
                        }`}
                    >
                        {key === "discover" && activeQuery ? "Results" : key}
                    </button>
                ))}
            </div>

            <div className="-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
                {tab === "queue" ? (
                    playlist.length === 0 ? (
                        <div className="mt-2 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">
                            <p className="text-sm text-white/40">
                                Your queue is empty
                            </p>

                            <p className="mt-1 text-xs text-white/20">
                                Search or discover a song and add it here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {playlist.map((song) => (
                                <SongRow
                                    key={song.id}
                                    song={song}
                                    active={song.id === currentSongId}
                                    isPlaying={isPlaying}
                                    onPlay={() => onPlay(song)}
                                    onRemove={() => onRemove(song)}
                                />
                            ))}
                        </div>
                    )
                ) : (
                    <>
                        <p className="mb-2 mt-1 px-1 text-xs uppercase tracking-[0.18em] text-white/30">
                            {activeQuery ? `Results for "${activeQuery}"` : "Trending now"}
                        </p>

                        {searchError && (
                            <p className="py-6 text-center text-sm text-white/30">
                                {searchError}
                            </p>
                        )}

                        {!searchError && discoverSongs.length === 0 && (
                            <div className="flex justify-center py-8 text-sm text-white/30">
                                {isLoadingFeatured ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    "Search for a song to get started."
                                )}
                            </div>
                        )}

                        <div className="space-y-1">
                            {discoverSongs.map((song) => (
                                <SongRow
                                    key={song.id}
                                    song={song}
                                    active={song.id === currentSongId}
                                    isPlaying={isPlaying}
                                    onPlay={() => onPlay(song)}
                                    onAdd={() => onAdd(song)}
                                    added={isInPlaylist(song)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
}

export default LibraryPanel;
