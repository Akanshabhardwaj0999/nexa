import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
    dedupeSongs,
    getCategorySongs,
    MUSIC_CATEGORIES,
    searchSongs,
} from "../../services/music";
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
    const [activeQuery, setActiveQuery] = useState("");
    const [category, setCategory] = useState(MUSIC_CATEGORIES[0].id);
    const [songs, setSongs] = useState<Song[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchError, setSearchError] = useState("");

    // Ignore responses for a list the user has already moved away from.
    const requestId = useRef(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Loads the first page of a search (when a query is set) or a category.
    const loadList = useCallback(async (searchQuery: string, categoryId: string) => {
        const id = ++requestId.current;

        setIsLoading(true);
        setSearchError("");
        setSongs([]);
        setPage(0);
        setHasMore(false);

        try {
            const found = searchQuery
                ? await searchSongs(searchQuery)
                : await getCategorySongs(categoryId);

            if (id !== requestId.current) {
                return;
            }

            setSongs(found);
            setHasMore(found.length > 0);

            if (found.length === 0) {
                setSearchError(
                    searchQuery
                        ? `No tracks found for "${searchQuery}".`
                        : "No songs here right now.",
                );
            }
        } catch (error) {
            console.error(error);

            if (id === requestId.current) {
                setSearchError("Unable to load music right now.");
            }
        } finally {
            if (id === requestId.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadList(activeQuery, category);
    }, [activeQuery, category, loadList]);

    const loadMore = async () => {
        const id = requestId.current;
        const nextPage = page + 1;

        setIsLoadingMore(true);

        try {
            const found = activeQuery
                ? await searchSongs(activeQuery, nextPage)
                : await getCategorySongs(category, nextPage);

            if (id !== requestId.current) {
                return;
            }

            setSongs((current) => [...current, ...dedupeSongs(found, current)]);
            setPage(nextPage);
            setHasMore(found.length > 0);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Until a tab is picked, show Discover while the queue is empty.
    const tab = selectedTab ?? (playlist.length > 0 ? "queue" : "discover");

    const handleSearch = () => {
        const trimmed = query.trim();

        if (!trimmed) {
            clearSearch();
            return;
        }

        setTab("discover");

        // On phones the keyboard covers the results; close it and bring
        // the list into view.
        inputRef.current?.blur();
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

        if (trimmed === activeQuery) {
            loadList(trimmed, category);
        } else {
            setActiveQuery(trimmed);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setActiveQuery("");
    };

    const pickCategory = (id: string) => {
        setQuery("");
        setActiveQuery("");
        setCategory(id);
        setTab("discover");
    };

    const isInPlaylist = (song: Song) =>
        playlist.some((item) => item.id === song.id);

    const isSearching = Boolean(activeQuery) && isLoading;
    const categoryLabel =
        MUSIC_CATEGORIES.find((item) => item.id === category)?.label ?? "";

    return (
        <aside className="flex min-h-0 min-w-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)]">
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
                className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 focus-within:border-violet-400/60 sm:mt-5"
            >
                {isSearching ? (
                    <Loader2 size={17} className="shrink-0 animate-spin text-white/40" />
                ) : (
                    <Search size={17} className="shrink-0 text-white/30" />
                )}

                {/*
                  * Phone keyboards "correct" Hindi / Punjabi words typed in
                  * English letters ("chadh gyi" -> "chad guy"), so turn that off.
                  */}
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search songs or singers..."
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/30 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                />

                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center text-white/40 transition hover:text-white"
                        aria-label="Clear search"
                    >
                        <X size={16} />
                    </button>
                )}
            </form>

            {/* Categories */}
            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {MUSIC_CATEGORIES.map((item) => {
                    const selected = !activeQuery && category === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => pickCategory(item.id)}
                            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition sm:px-3.5 sm:py-1.5 ${
                                selected
                                    ? "border-violet-400/60 bg-violet-500/20 text-white"
                                    : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
                            }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Tabs */}
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-black/20 p-1 text-sm">
                {(["queue", "discover"] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`rounded-xl py-2.5 capitalize transition sm:py-2 ${
                            tab === key
                                ? "bg-white/10 text-white"
                                : "text-white/40 hover:text-white/70"
                        }`}
                    >
                        {key === "discover" && activeQuery ? "Results" : key}
                    </button>
                ))}
            </div>

            <div
                ref={resultsRef}
                className="-mx-1 mt-3 min-h-0 flex-1 scroll-mt-4 overflow-y-auto px-1 pb-1"
            >
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
                            {activeQuery ? `Results for "${activeQuery}"` : categoryLabel}
                        </p>

                        {searchError && (
                            <p className="py-6 text-center text-sm text-white/30">
                                {searchError}
                            </p>
                        )}

                        {!searchError && isLoading && (
                            <div className="flex justify-center py-8 text-white/30">
                                <Loader2 size={20} className="animate-spin" />
                            </div>
                        )}

                        <div className="space-y-1">
                            {songs.map((song) => (
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

                        {hasMore && !isLoading && (
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
                            >
                                {isLoadingMore && (
                                    <Loader2 size={15} className="animate-spin" />
                                )}
                                {isLoadingMore ? "Loading..." : "Load more songs"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

export default LibraryPanel;
