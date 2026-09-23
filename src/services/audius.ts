import type { Song } from "../types/music";

/*
 * Audius is a free, open music API that needs no key.
 * It is used when Jamendo is unavailable.
 */
const AUDIUS_BASE_URL = "https://api.audius.co/v1";
const APP_NAME = "nexa";

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  is_streamable?: boolean;
  artwork: Record<string, string> | null;
  user: {
    name: string;
  };
}

interface AudiusResponse {
  data: AudiusTrack[];
}

export const AUDIUS_ID_PREFIX = "audius:";

function getStreamUrl(trackId: string) {
  // This endpoint redirects to a freshly signed stream URL,
  // so it is safe to store in the database.
  return `${AUDIUS_BASE_URL}/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

function mapAudiusTrackToSong(track: AudiusTrack): Song {
  return {
    id: `${AUDIUS_ID_PREFIX}${track.id}`,
    title: track.title,
    artist: track.user.name,
    duration: track.duration,
    cover:
      track.artwork?.["480x480"] ||
      track.artwork?.["150x150"] ||
      "",
    audioUrl: getStreamUrl(track.id),
  };
}

async function fetchTracks(
  path: string,
  extraParams: Record<string, string> = {},
): Promise<Song[]> {
  const params = new URLSearchParams({
    app_name: APP_NAME,
    limit: "20",
    ...extraParams,
  });

  const response = await fetch(
    `${AUDIUS_BASE_URL}${path}?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to load Audius tracks");
  }

  const data: AudiusResponse = await response.json();

  return data.data
    .filter((track) => track.is_streamable !== false)
    .slice(0, 20)
    .map(mapAudiusTrackToSong);
}

export function searchTracks(query: string) {
  return fetchTracks("/tracks/search", { query });
}

export function getTrendingTracks() {
  return fetchTracks("/tracks/trending");
}
