import type { Song } from "../types/music";
import * as itunes from "./itunes";

/*
 * The same recording is often listed several times (single, album,
 * "From <film>" soundtrack), so compare titles without bracketed
 * parts together with the main artist.
 */
function songKey(song: Song) {
    const title = song.title
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "");

    const artist = song.artist
        .toLowerCase()
        .split(/,|&/)[0]
        .replace(/[^\p{L}\p{N}]+/gu, "");

    return `${title}|${artist}`;
}

export function dedupeSongs(songs: Song[], existing: Song[] = []) {
    const seen = new Set(existing.map(songKey));
    const seenIds = new Set(existing.map((song) => song.id));

    return songs.filter((song) => {
        const key = songKey(song);

        if (seenIds.has(song.id) || seen.has(key)) {
            return false;
        }

        seen.add(key);
        seenIds.add(song.id);
        return true;
    });
}

/*
 * Runs several searches at once and interleaves the results, so a
 * list mixes songs from every query instead of one after another.
 * A failing query is skipped.
 */
async function searchMany(queries: string[], page: number) {
    const settled = await Promise.allSettled(
        queries.map((query) => itunes.searchTracks(query, page)),
    );

    if (settled.every((result) => result.status === "rejected")) {
        throw new Error("Unable to load songs");
    }

    const lists = settled.map((result) =>
        result.status === "fulfilled" ? result.value : [],
    );

    const mixed: Song[] = [];
    const longest = Math.max(0, ...lists.map((list) => list.length));

    for (let i = 0; i < longest; i++) {
        lists.forEach((list) => {
            if (list[i]) {
                mixed.push(list[i]);
            }
        });
    }

    return dedupeSongs(mixed);
}

/*
 * Search like a music app: exact matches first, then, if there are
 * only a few, related songs found with fewer of the words (so a typo
 * or a song that isn't listed still shows something close).
 */
export async function searchSongs(query: string, page = 0) {
    const trimmed = query.trim().replace(/\s+/g, " ");

    if (!trimmed) {
        return [];
    }

    const exact = dedupeSongs(await itunes.searchTracks(trimmed, page));

    if (page > 0 || exact.length >= 10) {
        return exact;
    }

    const words = trimmed.split(" ");
    const related: string[] = [];

    // "nashe se chadh gyi" -> "nashe se chadh", "nashe se", ...
    for (let count = words.length - 1; count >= 1 && related.length < 3; count--) {
        const shorter = words.slice(0, count).join(" ");

        if (shorter.length >= 3) {
            related.push(shorter);
        }
    }

    if (related.length === 0) {
        return exact;
    }

    try {
        return [...exact, ...dedupeSongs(await searchMany(related, 0), exact)];
    } catch {
        return exact;
    }
}

export interface MusicCategory {
    id: string;
    label: string;
    queries: string[];
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
    {
        id: "bollywood",
        label: "Bollywood",
        queries: ["bollywood", "arijit singh", "shreya ghoshal", "pritam"],
    },
    {
        id: "romantic",
        label: "Romantic",
        queries: ["hindi romantic", "love songs hindi", "atif aslam", "jubin nautiyal"],
    },
    {
        id: "punjabi",
        label: "Punjabi",
        queries: ["karan aujla", "diljit dosanjh", "sidhu moose wala", "ap dhillon", "shubh"],
    },
    {
        id: "latest",
        label: "New & latest",
        queries: ["new punjabi", "new hindi songs", "anuv jain", "aditya rikhari", "b praak"],
    },
    {
        id: "90s",
        label: "90s",
        queries: ["90s hindi", "kumar sanu", "udit narayan", "alka yagnik", "sonu nigam"],
    },
    {
        id: "80s",
        label: "80s & retro",
        queries: ["kishore kumar", "lata mangeshkar", "mohammed rafi", "r d burman", "asha bhosle"],
    },
];

export async function getCategorySongs(categoryId: string, page = 0) {
    const category = MUSIC_CATEGORIES.find((item) => item.id === categoryId);

    if (!category) {
        return [];
    }

    return searchMany(category.queries, page);
}
