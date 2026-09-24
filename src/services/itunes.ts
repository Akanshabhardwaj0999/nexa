import type { Song } from "../types/music";

/*
 * The iTunes Search API is used only as a catalog: it knows nearly
 * every released song (Bollywood, Punjabi, old and new), copes with
 * loose spellings and needs no key. Songs are played from YouTube.
 */
const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

/*
 * Searches go through our own server (api/itunes.ts, or the dev server
 * proxy). Apple redirects browsers that say they're an iPhone to the
 * Music app instead of answering, so asking Apple directly fails there.
 */
const PROXY_SEARCH_URL = "/api/itunes";

// The Indian store has the widest Hindi / Punjabi catalog.
const COUNTRY = "IN";

export const ITUNES_ID_PREFIX = "itunes:";

const PAGE_SIZE = 50;

/*
 * Apple allows roughly 20 searches a minute per visitor. Over that it
 * answers 403 without CORS headers, which browsers report as a "CORS
 * error". Caching and running only a few requests at a time keeps us
 * under the limit.
 */
const MAX_CONCURRENT = 3;
const CACHE_TTL = 30 * 60 * 1000;

interface ITunesTrack {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName?: string;
    trackTimeMillis?: number;
    artworkUrl100?: string;
    kind?: string;
}

interface ITunesResponse {
    resultCount: number;
    results: ITunesTrack[];
}

function mapTrackToSong(track: ITunesTrack): Song {
    return {
        id: `${ITUNES_ID_PREFIX}${track.trackId}`,
        title: track.trackName,
        artist: track.artistName,
        duration: Math.round((track.trackTimeMillis ?? 0) / 1000),
        // Artwork URLs end in "100x100bb.jpg"; ask for a larger size.
        cover: track.artworkUrl100?.replace(/\/\d+x\d+bb\./, "/600x600bb.") ?? "",
        // Filled in with a YouTube video when the song is first played.
        audioUrl: "",
    };
}

// --------------------------------------------------
// Request queue
// --------------------------------------------------

let running = 0;
const waiting: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
    if (running >= MAX_CONCURRENT) {
        await new Promise<void>((resolve) => waiting.push(resolve));
    }

    running++;

    try {
        return await task();
    } finally {
        running--;
        waiting.shift()?.();
    }
}

// --------------------------------------------------
// Transport: fetch, falling back to JSONP
// --------------------------------------------------

let jsonpCounter = 0;

/*
 * iTunes also answers JSONP (a <script> tag with a callback), which
 * isn't subject to CORS. Used when fetch is blocked, for example by
 * a network or proxy that strips the CORS headers.
 */
function fetchJsonp(url: string): Promise<ITunesResponse> {
    return new Promise((resolve, reject) => {
        const callbackName = `__nexaItunes${Date.now()}_${jsonpCounter++}`;
        const script = document.createElement("script");
        const callbacks = window as unknown as Record<string, unknown>;

        const cleanup = () => {
            window.clearTimeout(timer);
            delete callbacks[callbackName];
            script.remove();
        };

        const timer = window.setTimeout(() => {
            cleanup();
            reject(new Error("iTunes search timed out"));
        }, 10000);

        callbacks[callbackName] = (data: ITunesResponse) => {
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            cleanup();
            reject(new Error("iTunes search failed"));
        };

        script.src = `${url}&callback=${callbackName}`;
        document.head.appendChild(script);
    });
}

async function requestViaProxy(query: string): Promise<ITunesResponse> {
    const response = await fetch(`${PROXY_SEARCH_URL}?${query}`);

    if (!response.ok) {
        throw new Error(`iTunes search failed (${response.status})`);
    }

    return response.json();
}

async function request(query: string): Promise<ITunesResponse> {
    try {
        return await requestViaProxy(query);
    } catch (error) {
        // Without our server (for example `vite preview`), ask Apple
        // directly; that works everywhere except on iPhones.
        console.warn("Search proxy failed, asking iTunes directly", error);
    }

    const url = `${ITUNES_SEARCH_URL}?${query}`;
    let response: Response;

    try {
        response = await fetch(url);
    } catch {
        // A CORS or network block surfaces as a TypeError here.
        return fetchJsonp(url);
    }

    if (!response.ok) {
        throw new Error(`iTunes search failed (${response.status})`);
    }

    return response.json();
}

// --------------------------------------------------
// Search
// --------------------------------------------------

const cache = new Map<string, { at: number; songs: Promise<Song[]> }>();

export function searchTracks(term: string, page = 0): Promise<Song[]> {
    const params = new URLSearchParams({
        term: term.trim().toLowerCase(),
        media: "music",
        entity: "song",
        country: COUNTRY,
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
    });

    const query = params.toString();
    const cached = cache.get(query);

    if (cached && Date.now() - cached.at < CACHE_TTL) {
        return cached.songs;
    }

    const songs = limited(() => request(query)).then((data) =>
        data.results
            .filter((track) => track.kind === "song" && track.trackName)
            .map(mapTrackToSong),
    );

    cache.set(query, { at: Date.now(), songs });

    // Don't keep failures; the next attempt should try again.
    songs.catch(() => cache.delete(query));

    return songs;
}
