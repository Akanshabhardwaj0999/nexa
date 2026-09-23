import type { Song } from "../types/music";
import * as audius from "./audius";
import * as jamendo from "./jamendo";

/*
 * Jamendo is tried first. If it fails (for example the client id
 * is invalid or suspended) we switch to Audius for the rest of
 * the session instead of showing an empty list.
 */
let jamendoAvailable = jamendo.isJamendoConfigured();

async function withFallback(
  fromJamendo: () => Promise<Song[]>,
  fromAudius: () => Promise<Song[]>,
) {
  if (jamendoAvailable) {
    try {
      const songs = await fromJamendo();

      if (songs.length > 0) {
        return songs;
      }
    } catch (error) {
      jamendoAvailable = false;

      console.warn(
        "Jamendo unavailable, using Audius instead.",
        error,
      );
    }
  }

  return fromAudius();
}

function searchOne(query: string, page: number) {
  return withFallback(
    () => jamendo.searchTracks(query, page),
    () => audius.searchTracks(query, page),
  );
}

/*
 * The same song is often uploaded many times ("2 AM - Karan Aujla
 * (DJJOhAL.Com)" by fun10, fun13, fun15...), so compare titles with
 * bracketed bits, site names and punctuation stripped.
 */
function titleKey(song: Song) {
  return song.title
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/\b[\w-]+\.(com|in|net|org|pk)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function dedupeSongs(songs: Song[], existing: Song[] = []) {
  const seen = new Set(existing.map(titleKey));
  const seenIds = new Set(existing.map((song) => song.id));

  return songs.filter((song) => {
    const key = titleKey(song);

    if (seenIds.has(song.id) || (key && seen.has(key))) {
      return false;
    }

    seen.add(key);
    seenIds.add(song.id);
    return true;
  });
}

/*
 * Runs several searches at once and interleaves the results, so a
 * category mixes songs from every query instead of listing one
 * query's results after another. A failing query is skipped.
 */
async function searchMany(queries: string[], page: number) {
  const settled = await Promise.allSettled(
    queries.map((query) => searchOne(query, page)),
  );

  const lists = settled.map((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  if (settled.every((result) => result.status === "rejected")) {
    throw new Error("Unable to load songs");
  }

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

export async function searchSongs(query: string, page = 0) {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  return dedupeSongs(await searchOne(trimmed, page));
}

export interface MusicCategory {
  id: string;
  label: string;
  // Short searches work best: Audius only matches when every word does.
  queries: string[];
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {
    id: "bollywood",
    label: "Bollywood",
    queries: ["bollywood", "hindi songs", "arijit singh", "shreya ghoshal"],
  },
  {
    id: "romantic",
    label: "Romantic",
    queries: ["romantic hindi", "bollywood love", "love mashup", "atif aslam"],
  },
  {
    id: "punjabi",
    label: "Punjabi",
    queries: ["punjabi", "karan aujla", "sidhu moose wala", "diljit dosanjh", "ap dhillon"],
  },
  {
    id: "latest",
    label: "New & latest",
    queries: ["new punjabi", "latest hindi", "new hindi", "2025 hindi", "2024 bollywood"],
  },
  {
    id: "90s",
    label: "90s",
    queries: ["90s bollywood", "90s hindi", "kumar sanu", "udit narayan", "alka yagnik"],
  },
  {
    id: "80s",
    label: "80s & retro",
    queries: ["80s bollywood", "old hindi songs", "kishore kumar", "lata mangeshkar", "mohammed rafi"],
  },
  {
    id: "trending",
    label: "Global trending",
    queries: [],
  },
];

export async function getCategorySongs(categoryId: string, page = 0) {
  const category = MUSIC_CATEGORIES.find((item) => item.id === categoryId);

  if (!category) {
    return [];
  }

  if (category.queries.length === 0) {
    // Trending lists have no paging, so there is only one page.
    return page === 0 ? getFeaturedSongs() : [];
  }

  return searchMany(category.queries, page);
}

export function getFeaturedSongs() {
  return withFallback(
    jamendo.getPopularTracks,
    audius.getTrendingTracks,
  );
}
