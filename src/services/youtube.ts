import type { Song } from "../types/music";

/*
 * Finds the YouTube video to play for a catalog song. Each lookup
 * costs 100 of the 10,000 free daily YouTube API units, so results
 * are cached in the browser and saved with the room's playlist.
 */
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "";
const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_PREFIX = "nexa-yt:";

export const YOUTUBE_PREFIX = "youtube:";

export type YouTubeErrorKind = "no-key" | "quota" | "not-found" | "network";

export class YouTubeError extends Error {
    kind: YouTubeErrorKind;

    constructor(kind: YouTubeErrorKind, message: string) {
        super(message);
        this.kind = kind;
    }
}

export function isYouTubeConfigured() {
    return Boolean(API_KEY);
}

export function getVideoId(song: Song | null) {
    return song?.audioUrl.startsWith(YOUTUBE_PREFIX)
        ? song.audioUrl.slice(YOUTUBE_PREFIX.length)
        : null;
}

export function withVideoId(song: Song, videoId: string): Song {
    return { ...song, audioUrl: `${YOUTUBE_PREFIX}${videoId}` };
}

function readCache(songId: string) {
    try {
        return localStorage.getItem(CACHE_PREFIX + songId);
    } catch {
        return null;
    }
}

function writeCache(songId: string, videoId: string) {
    try {
        localStorage.setItem(CACHE_PREFIX + songId, videoId);
    } catch {
        // Storage full or blocked; the lookup simply isn't cached.
    }
}

// "Nashe Si Chadh Gayi (From "Befikre")" -> "Nashe Si Chadh Gayi"
function cleanTitle(title: string) {
    return title
        .replace(/\(.*?\)|\[.*?\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// "Vishal & Shekhar, Arijit Singh & Caralisa Monteiro" -> "Vishal"
function primaryArtist(artist: string) {
    return artist.split(/,|&| x | feat\.?| ft\.?/i)[0].trim();
}

function decodeEntities(text: string) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}

// Versions we don't want unless the song title itself asks for them.
const UNWANTED = [
    "cover", "reaction", "karaoke", "instrumental", "slowed", "reverb",
    "8d", "lofi", "lo-fi", "remix", "mashup", "live", "status", "ringtone",
    "shorts", "teaser", "tutorial", "guitar", "piano",
];

interface SearchItem {
    id: { videoId?: string };
    snippet: { title: string; channelTitle: string };
}

function scoreCandidate(item: SearchItem, song: Song, index: number) {
    const title = decodeEntities(item.snippet.title).toLowerCase();
    const channel = item.snippet.channelTitle.toLowerCase();
    const wanted = song.title.toLowerCase();

    // YouTube's own ranking matters most.
    let score = 20 - index * 2;

    const words = cleanTitle(wanted).split(" ").filter((word) => word.length > 1);
    const matched = words.filter((word) => title.includes(word)).length;
    score += words.length ? (matched / words.length) * 20 : 0;

    // "Artist - Topic" channels host the official audio release.
    if (channel.endsWith(" - topic")) score += 15;
    if (/official|audio|lyric/.test(title)) score += 6;
    if (channel.includes(primaryArtist(song.artist).toLowerCase())) score += 5;

    for (const word of UNWANTED) {
        if (title.includes(word) && !wanted.includes(word)) {
            score -= 25;
        }
    }

    return score;
}

async function searchVideos(song: Song) {
    const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        videoEmbeddable: "true",
        maxResults: "8",
        regionCode: "IN",
        q: `${cleanTitle(song.title)} ${primaryArtist(song.artist)} audio`,
        key: API_KEY,
    });

    let response: Response;

    try {
        response = await fetch(`${SEARCH_URL}?${params.toString()}`);
    } catch {
        throw new YouTubeError("network", "Couldn't reach YouTube.");
    }

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const reason = body?.error?.errors?.[0]?.reason ?? "";

        if (response.status === 403 && /quota/i.test(reason)) {
            throw new YouTubeError("quota", "Today's YouTube limit is used up. Try again tomorrow.");
        }

        throw new YouTubeError("network", `YouTube search failed (${response.status}).`);
    }

    const data: { items?: SearchItem[] } = await response.json();

    return (data.items ?? [])
        .filter((item) => item.id.videoId)
        .map((item, index) => ({
            videoId: item.id.videoId as string,
            score: scoreCandidate(item, song, index),
        }))
        .sort((a, b) => b.score - a.score)
        .map((candidate) => candidate.videoId);
}

/*
 * Returns the song with a playable YouTube video attached. Videos in
 * `exclude` (for example ones that refused to play) are skipped.
 */
export async function resolveSong(song: Song, exclude: string[] = []): Promise<Song> {
    const existing = getVideoId(song);

    if (existing && !exclude.includes(existing)) {
        return song;
    }

    const cached = readCache(song.id);

    if (cached && !exclude.includes(cached)) {
        return withVideoId(song, cached);
    }

    if (!API_KEY) {
        throw new YouTubeError("no-key", "Add a YouTube API key to play songs.");
    }

    const videoId = (await searchVideos(song)).find((id) => !exclude.includes(id));

    if (!videoId) {
        throw new YouTubeError("not-found", `Couldn't find "${song.title}" on YouTube.`);
    }

    writeCache(song.id, videoId);

    return withVideoId(song, videoId);
}
