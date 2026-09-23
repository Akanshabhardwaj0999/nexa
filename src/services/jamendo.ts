import type { Song } from "../types/music";

const JAMENDO_BASE_URL = "https://api.jamendo.com/v3.0";

const CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "";

export interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  album_name: string;
  image: string;
  album_image: string;
  audio: string;
}

interface JamendoResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    results_count: number;
  };
  results: JamendoTrack[];
}

export function isJamendoConfigured() {
  return Boolean(CLIENT_ID);
}

export function mapJamendoTrackToSong(
  track: JamendoTrack,
): Song {
  return {
    id: track.id,
    title: track.name,
    artist: track.artist_name,
    duration: track.duration,
    cover: track.image || track.album_image,
    audioUrl: getTrackStreamUrl(track.id),
  };
}

export function getTrackStreamUrl(trackId: string) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    id: trackId,
    action: "stream",
    audioformat: "mp32",
  });

  return `${JAMENDO_BASE_URL}/tracks/file/?${params.toString()}`;
}

async function fetchTracks(
  extraParams: Record<string, string>,
): Promise<Song[]> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: "json",
    limit: "20",
    audioformat: "mp32",
    ...extraParams,
  });

  const response = await fetch(
    `${JAMENDO_BASE_URL}/tracks/?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error("Failed to search Jamendo tracks");
  }

  const data: JamendoResponse = await response.json();

  /*
   * Jamendo answers with HTTP 200 even when the request fails
   * (invalid or suspended client id), so check the body status.
   */
  if (data.headers.status !== "success") {
    throw new Error(
      `Jamendo error ${data.headers.code}: ${data.headers.error_message}`,
    );
  }

  return data.results.map(mapJamendoTrackToSong);
}

export function searchTracks(query: string) {
  return fetchTracks({ search: query });
}

export function getPopularTracks() {
  return fetchTracks({ order: "popularity_week" });
}
