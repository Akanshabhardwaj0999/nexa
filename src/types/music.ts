export type MusicSource = "jamendo" | "audius";

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  cover: string;
  audioUrl: string;
}

/*
 * Playback state shared between everyone in a room.
 */
export interface PlaybackMessage {
  kind: "action" | "heartbeat" | "sync";
  song: Song | null;
  isPlaying: boolean;
  position: number;
  sentAt: number;
  clientId: string;
  userName: string;
  // Set on "sync" replies so only the client that asked applies it.
  to?: string;
}

export interface RoomMember {
  clientId: string;
  userName: string;
  joinedAt: number;
}
