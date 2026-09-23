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

export function searchSongs(query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return Promise.resolve([]);
  }

  return withFallback(
    () => jamendo.searchTracks(trimmed),
    () => audius.searchTracks(trimmed),
  );
}

export function getFeaturedSongs() {
  return withFallback(
    jamendo.getPopularTracks,
    audius.getTrendingTracks,
  );
}
