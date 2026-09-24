import { supabase } from "../lib/supabase";
import type { Song } from "../types/music";

const USER_NAME_KEY = "nexa-user-name";
const CLIENT_ID_KEY = "nexa-client-id";

export function getStoredUserName() {
    return localStorage.getItem(USER_NAME_KEY) || "";
}

export function saveUserName(name: string) {
    localStorage.setItem(USER_NAME_KEY, name);
}

/*
 * A random id per browser tab, used to tell our own realtime
 * messages apart from the other listener's (names can match).
 */
export function getClientId() {
    let clientId = sessionStorage.getItem(CLIENT_ID_KEY);

    if (!clientId) {
        // randomUUID is missing on older mobile browsers and non-HTTPS pages
        clientId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(CLIENT_ID_KEY, clientId);
    }

    return clientId;
}

export function getInviteLink(roomCode: string) {
    return `${window.location.origin}/join?code=${roomCode}`;
}

export interface PlaylistTrackRow {
    id: string;
    room_id: string;
    track_id: string;
    title: string;
    artist: string;
    image_url: string | null;
    audio_url: string | null;
    duration: number | null;
    position: number;
    added_by: string | null;
}

export interface PlaybackRow {
    room_id: string;
    track_id: string | null;
    is_playing: boolean;
    position: number;
    updated_at: string;
    updated_by: string;
}

export const FALLBACK_COVER =
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

export function mapTrackRowToSong(track: PlaylistTrackRow): Song {
    return {
        id: track.track_id,
        title: track.title,
        artist: track.artist,
        duration: track.duration || 0,
        cover: track.image_url || FALLBACK_COVER,
        audioUrl: track.audio_url || "",
    };
}

function generateRoomCode(length = 6) {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < length; i++) {
        code += characters.charAt(
            Math.floor(Math.random() * characters.length),
        );
    }

    return code;
}

// --------------------------------------------------
// Create room
// --------------------------------------------------

export async function createRoom(userName: string) {
    const name = userName.trim();

    if (!name) {
        throw new Error("Name is required");
    }

    let roomCode = "";

    // Generate a unique room code
    for (let attempt = 0; attempt < 10; attempt++) {
        const generatedCode = generateRoomCode();

        const { data: existingRoom, error } = await supabase
            .from("rooms")
            .select("id")
            .eq("room_code", generatedCode)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!existingRoom) {
            roomCode = generatedCode;
            break;
        }
    }

    if (!roomCode) {
        throw new Error("Unable to generate room code");
    }

    // Create room
    const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
            room_code: roomCode,
        })
        .select()
        .single();

    if (roomError) {
        throw roomError;
    }

    // Add creator as member
    const { error: memberError } = await supabase
        .from("room_members")
        .insert({
            room_id: room.id,
            user_name: name,
        });

    if (memberError) {
        // Cleanup room if member creation fails
        await supabase
            .from("rooms")
            .delete()
            .eq("id", room.id);

        throw memberError;
    }

    // Create initial playback state
    const { error: playbackError } = await supabase
        .from("room_playback")
        .insert({
            room_id: room.id,
            track_id: null,
            is_playing: false,
            position: 0,
            updated_by: name,
        });

    if (playbackError) {
        console.error(
            "Unable to create playback state:",
            playbackError,
        );
    }

    saveUserName(name);

    return {
        roomId: room.id,
        roomCode: room.room_code,
    };
}

// --------------------------------------------------
// Find room
// --------------------------------------------------

export async function getRoomByCode(roomCode: string) {
    const normalizedCode = roomCode.trim().toUpperCase();

    const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", normalizedCode)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

// --------------------------------------------------
// Join room
// --------------------------------------------------

export async function joinRoom(
    roomCode: string,
    userName: string,
) {
    const name = userName.trim();
    const normalizedCode = roomCode.trim().toUpperCase();

    if (!name) {
        throw new Error("Name is required");
    }

    if (!normalizedCode) {
        throw new Error("Room code is required");
    }

    const room = await getRoomByCode(normalizedCode);

    if (!room) {
        throw new Error("Room not found");
    }

    // Check if this name is already in the room
    const { data: existingMember, error: memberCheckError } =
        await supabase
            .from("room_members")
            .select("id")
            .eq("room_id", room.id)
            .eq("user_name", name)
            .maybeSingle();

    if (memberCheckError) {
        throw memberCheckError;
    }

    if (!existingMember) {
        const { error: memberError } = await supabase
            .from("room_members")
            .insert({
                room_id: room.id,
                user_name: name,
            });

        if (memberError) {
            throw memberError;
        }
    }

    saveUserName(name);

    return {
        roomId: room.id,
        roomCode: room.room_code,
    };
}

// --------------------------------------------------
// Get playlist
// --------------------------------------------------

export async function getPlaylist(roomId: string): Promise<Song[]> {
    const { data, error } = await supabase
        .from("playlist_tracks")
        .select("*")
        .eq("room_id", roomId)
        .order("position", {
            ascending: true,
        });

    if (error) {
        throw error;
    }

    return ((data || []) as PlaylistTrackRow[]).map(
        mapTrackRowToSong,
    );
}

// --------------------------------------------------
// Add song
// --------------------------------------------------

export async function addSongToRoom(
    roomId: string,
    song: Song,
    userName: string,
) {
    // Prevent duplicates
    const { data: existingSong, error: existingError } =
        await supabase
            .from("playlist_tracks")
            .select("id")
            .eq("room_id", roomId)
            .eq("track_id", song.id)
            .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    if (existingSong) {
        return existingSong;
    }

    // Append after the last song (positions can have gaps
    // once songs are removed, so don't rely on the count).
    const { data: lastSong, error: lastError } = await supabase
        .from("playlist_tracks")
        .select("position")
        .eq("room_id", roomId)
        .order("position", {
            ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (lastError) {
        throw lastError;
    }

    const { data, error } = await supabase
        .from("playlist_tracks")
        .insert({
            room_id: roomId,
            track_id: song.id,
            title: song.title,
            artist: song.artist,
            image_url: song.cover,
            audio_url: song.audioUrl,
            duration: Math.round(song.duration),
            position: lastSong ? lastSong.position + 1 : 0,
            added_by: userName,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

// --------------------------------------------------
// Remove song
// --------------------------------------------------

export async function removeSongFromRoom(
    roomId: string,
    trackId: string,
) {
    const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("room_id", roomId)
        .eq("track_id", trackId);

    if (error) {
        throw error;
    }
}

/*
 * Saves the YouTube video found for a queued song, so nobody in the
 * room has to look it up (and spend API quota) again.
 */
export async function updateTrackAudio(
    roomId: string,
    trackId: string,
    audioUrl: string,
) {
    const { error } = await supabase
        .from("playlist_tracks")
        .update({ audio_url: audioUrl })
        .eq("room_id", roomId)
        .eq("track_id", trackId);

    if (error) {
        throw error;
    }
}

// --------------------------------------------------
// Playback
// --------------------------------------------------

export async function getPlayback(
    roomId: string,
): Promise<PlaybackRow | null> {
    const { data, error } = await supabase
        .from("room_playback")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

export async function updatePlayback(
    roomId: string,
    playback: {
        trackId: string | null;
        isPlaying: boolean;
        position: number;
        userName: string;
    },
) {
    const { error } = await supabase
        .from("room_playback")
        .upsert(
            {
                room_id: roomId,
                track_id: playback.trackId,
                is_playing: playback.isPlaying,
                position: playback.position,
                updated_at: new Date().toISOString(),
                updated_by: playback.userName,
            },
            {
                onConflict: "room_id",
            },
        );

    if (error) {
        throw error;
    }
}
