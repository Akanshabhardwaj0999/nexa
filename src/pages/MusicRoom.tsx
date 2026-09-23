import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import LibraryPanel from "../components/room/LibraryPanel";
import NamePrompt from "../components/room/NamePrompt";
import NowPlaying from "../components/room/NowPlaying";
import RoomHeader from "../components/room/RoomHeader";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useRoomChannel } from "../hooks/useRoomChannel";
import {
    addSongToRoom,
    getClientId,
    getPlayback,
    getPlaylist,
    getRoomByCode,
    getStoredUserName,
    joinRoom,
    removeSongFromRoom,
    saveUserName,
    updatePlayback,
} from "../services/room";
import type { PlaybackMessage, Song } from "../types/music";

// Re-sync when the two listeners drift further apart than this (seconds).
const DRIFT_TOLERANCE = 0.6;

// How often the room leader shares its position while playing (ms).
const HEARTBEAT_INTERVAL = 4000;

type RoomStatus = "loading" | "need-name" | "ready" | "not-found" | "error";

/*
 * Time a realtime message spent in transit. Device clocks can
 * disagree, so fall back to a typical delay when it looks wrong.
 */
function transitDelay(sentAt: number) {
    const seconds = (Date.now() - sentAt) / 1000;

    return seconds >= 0 && seconds < 2 ? seconds : 0.15;
}

function MusicRoom() {
    const { roomCode = "" } = useParams();
    const code = roomCode.toUpperCase();
    const navigate = useNavigate();

    const [clientId] = useState(getClientId);
    const [userName, setUserName] = useState(getStoredUserName);
    const [status, setStatus] = useState<RoomStatus>("loading");
    const [roomId, setRoomId] = useState<string | null>(null);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [activity, setActivity] = useState("");

    // Latest values for realtime handlers and audio callbacks.
    const currentSongRef = useRef<Song | null>(null);
    const playlistRef = useRef<Song[]>([]);

    useEffect(() => {
        playlistRef.current = playlist;
    }, [playlist]);

    const player = useAudioPlayer({ onEnded: handleEnded });

    const channel = useRoomChannel({
        roomId: status === "ready" ? roomId : null,
        clientId,
        userName,
        onPlayback: handleRemotePlayback,
        onPlaylistChanged: refreshPlaylist,
        onSyncRequest: handleSyncRequest,
    });

    // --------------------------------------------------
    // Load room
    // --------------------------------------------------

    const { apply } = player;

    useEffect(() => {
        let cancelled = false;

        async function loadRoom() {
            try {
                setStatus("loading");

                const room = await getRoomByCode(code);

                if (cancelled) {
                    return;
                }

                if (!room) {
                    setStatus("not-found");
                    return;
                }

                if (!userName) {
                    setStatus("need-name");
                    return;
                }

                // Makes sure people opening a shared link are members too.
                await joinRoom(code, userName);

                const [songs, playback] = await Promise.all([
                    getPlaylist(room.id),
                    getPlayback(room.id),
                ]);

                if (cancelled) {
                    return;
                }

                setPlaylist(songs);

                // Resume where the room left off, paused. If a friend is
                // online they'll send the live position once we connect.
                const savedSong = songs.find(
                    (song) => song.id === playback?.track_id,
                );

                if (savedSong) {
                    currentSongRef.current = savedSong;
                    setCurrentSong(savedSong);
                    apply(savedSong.audioUrl, playback?.position ?? 0, false);
                }

                setRoomId(room.id);
                setStatus("ready");
            } catch (error) {
                console.error("Unable to load room:", error);

                if (!cancelled) {
                    setStatus("error");
                }
            }
        }

        loadRoom();

        return () => {
            cancelled = true;
        };
    }, [code, userName, apply]);

    // --------------------------------------------------
    // Sending playback
    // --------------------------------------------------

    function selectSong(song: Song | null) {
        currentSongRef.current = song;
        setCurrentSong(song);
    }

    function broadcast(
        song: Song | null,
        isPlaying: boolean,
        position: number,
        kind: PlaybackMessage["kind"] = "action",
        to?: string,
    ) {
        channel.sendPlayback({
            kind,
            song,
            isPlaying,
            position,
            sentAt: Date.now(),
            clientId,
            userName,
            to,
        });

        // Persist real actions so someone joining later can resume.
        if (kind === "action" && roomId) {
            updatePlayback(roomId, {
                trackId: song?.id ?? null,
                isPlaying,
                position,
                userName,
            }).catch((error) =>
                console.error("Unable to save playback:", error),
            );
        }
    }

    // --------------------------------------------------
    // Local actions (always broadcast to the other listener)
    // --------------------------------------------------

    function playSong(song: Song) {
        selectSong(song);
        player.apply(song.audioUrl, 0, true);
        broadcast(song, true, 0);
        setActivity("");

        if (!playlistRef.current.some((item) => item.id === song.id)) {
            addToPlaylist(song);
        }
    }

    function togglePlay() {
        const song = currentSongRef.current;

        if (!song) {
            return;
        }

        const position = player.getCurrentTime();

        if (player.isPlaying) {
            player.pause();
            broadcast(song, false, position);
        } else {
            player.play();
            broadcast(song, true, position);
        }
    }

    function seekTo(time: number) {
        const song = currentSongRef.current;

        if (!song) {
            return;
        }

        player.seek(time);
        broadcast(song, player.isPlaying, time);
    }

    function skip(direction: 1 | -1) {
        const list = playlistRef.current;

        if (list.length === 0) {
            return;
        }

        const index = list.findIndex(
            (song) => song.id === currentSongRef.current?.id,
        );

        const nextIndex =
            index === -1
                ? 0
                : (index + direction + list.length) % list.length;

        playSong(list[nextIndex]);
    }

    function handleEnded() {
        const list = playlistRef.current;
        const index = list.findIndex(
            (song) => song.id === currentSongRef.current?.id,
        );

        // Both listeners reach the end together and pick the same next
        // song, so the duplicate message is harmless.
        if (index !== -1 && index < list.length - 1) {
            playSong(list[index + 1]);
        }
    }

    async function unlockAudio() {
        // Runs from a tap, so the browser now allows playback.
        await player.play();
        channel.requestSync();
    }

    // --------------------------------------------------
    // Remote playback
    // --------------------------------------------------

    function handleRemotePlayback(message: PlaybackMessage) {
        if (message.clientId === clientId) {
            return;
        }

        if (message.to && message.to !== clientId) {
            return;
        }

        const song = message.song;

        if (!song) {
            return;
        }

        if (message.kind === "action") {
            setActivity(
                `${message.userName} ${
                    message.isPlaying ? "is playing" : "paused"
                } ${song.title}`,
            );
        }

        const position =
            message.position +
            (message.isPlaying ? transitDelay(message.sentAt) : 0);

        const sameTrack = currentSongRef.current?.id === song.id;

        if (sameTrack && player.isPlaying === message.isPlaying) {
            const drift = Math.abs(player.getCurrentTime() - position);

            if (drift > DRIFT_TOLERANCE) {
                player.seek(position);
            }

            return;
        }

        // Don't keep retrying autoplay every heartbeat; wait for a tap.
        if (message.kind === "heartbeat" && player.isBlocked) {
            return;
        }

        selectSong(song);
        player.apply(song.audioUrl, position, message.isPlaying);
    }

    function handleSyncRequest(fromClientId: string) {
        const song = currentSongRef.current;

        if (!song) {
            return;
        }

        broadcast(
            song,
            player.isPlaying,
            player.getCurrentTime(),
            "sync",
            fromClientId,
        );
    }

    /*
     * The earliest listener in the room acts as the clock and
     * shares its position regularly so the other one can correct
     * drift (buffering, slow devices, etc).
     */
    const isLeader = channel.members[0]?.clientId === clientId;
    const hasPartner = channel.members.length > 1;
    const { sendPlayback } = channel;
    const { getCurrentTime } = player;

    useEffect(() => {
        if (!isLeader || !hasPartner || !player.isPlaying) {
            return;
        }

        const interval = setInterval(() => {
            sendPlayback({
                kind: "heartbeat",
                song: currentSongRef.current,
                isPlaying: true,
                position: getCurrentTime(),
                sentAt: Date.now(),
                clientId,
                userName,
            });
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, [
        isLeader,
        hasPartner,
        player.isPlaying,
        sendPlayback,
        getCurrentTime,
        clientId,
        userName,
    ]);

    // --------------------------------------------------
    // Playlist
    // --------------------------------------------------

    async function refreshPlaylist() {
        if (!roomId) {
            return;
        }

        try {
            setPlaylist(await getPlaylist(roomId));
        } catch (error) {
            console.error("Unable to refresh playlist:", error);
        }
    }

    async function addToPlaylist(song: Song) {
        if (!roomId) {
            return;
        }

        // Update locally first for a snappy UI.
        setPlaylist((list) =>
            list.some((item) => item.id === song.id)
                ? list
                : [...list, song],
        );

        try {
            await addSongToRoom(roomId, song, userName);
            channel.sendPlaylistChanged();
        } catch (error) {
            console.error("Unable to add song:", error);
            refreshPlaylist();
        }
    }

    async function removeFromPlaylist(song: Song) {
        if (!roomId) {
            return;
        }

        setPlaylist((list) =>
            list.filter((item) => item.id !== song.id),
        );

        try {
            await removeSongFromRoom(roomId, song.id);
            channel.sendPlaylistChanged();
        } catch (error) {
            console.error("Unable to remove song:", error);
            refreshPlaylist();
        }
    }

    // --------------------------------------------------
    // Lock screen / media keys
    // --------------------------------------------------

    const mediaActions = useRef({ togglePlay, skip });

    useEffect(() => {
        mediaActions.current = { togglePlay, skip };
    });

    useEffect(() => {
        if (!("mediaSession" in navigator)) {
            return;
        }

        const session = navigator.mediaSession;

        session.setActionHandler("play", () => mediaActions.current.togglePlay());
        session.setActionHandler("pause", () => mediaActions.current.togglePlay());
        session.setActionHandler("nexttrack", () => mediaActions.current.skip(1));
        session.setActionHandler("previoustrack", () => mediaActions.current.skip(-1));

        return () => {
            (["play", "pause", "nexttrack", "previoustrack"] as const).forEach(
                (action) => session.setActionHandler(action, null),
            );
        };
    }, []);

    useEffect(() => {
        document.title = currentSong
            ? `${currentSong.title} · ${currentSong.artist} | Nexa`
            : `Room ${code} | Nexa`;

        if ("mediaSession" in navigator && currentSong) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artist,
                album: `Nexa room ${code}`,
                artwork: currentSong.cover
                    ? [{ src: currentSong.cover, sizes: "480x480" }]
                    : [],
            });
        }

        return () => {
            document.title = "Nexa";
        };
    }, [currentSong, code]);

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    if (status === "need-name") {
        return (
            <NamePrompt
                roomCode={code}
                onSubmit={(name) => {
                    saveUserName(name);
                    setUserName(name);
                }}
            />
        );
    }

    if (status === "loading") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#08080c] text-white">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />

                    <p className="mt-4 text-sm text-white/40">
                        Entering your room...
                    </p>
                </div>
            </main>
        );
    }

    if (status === "not-found" || status === "error") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#08080c] px-5 text-white">
                <div className="max-w-sm text-center">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        {status === "not-found"
                            ? "Room not found"
                            : "Something went wrong"}
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/40">
                        {status === "not-found"
                            ? `There's no room with the code ${code}. Check the code and try again.`
                            : "We couldn't load this room. Check your connection and try again."}
                    </p>

                    <div className="mt-8 flex justify-center gap-3">
                        <button
                            onClick={() =>
                                status === "error"
                                    ? window.location.reload()
                                    : navigate("/join")
                            }
                            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:scale-[1.02]"
                        >
                            {status === "error" ? "Try again" : "Enter a code"}
                        </button>

                        <button
                            onClick={() => navigate("/")}
                            className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/70 transition hover:bg-white/10"
                        >
                            Home
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const partner = channel.members.find(
        (member) => member.clientId !== clientId,
    );

    const activityText =
        activity ||
        (partner
            ? `Listening together with ${partner.userName}`
            : "Share the room code to invite a friend");

    return (
        <main className="min-h-screen bg-[#08080c] text-white">
            {/* Ambient background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[140px]" />

                <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[160px]" />
            </div>

            <RoomHeader
                roomCode={code}
                clientId={clientId}
                members={channel.members}
                isConnected={channel.isConnected}
                onHome={() => navigate("/")}
            />

            <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-5 lg:grid-cols-[1fr_400px] lg:px-8 lg:py-8">
                <div>
                    <button
                        onClick={() => navigate("/")}
                        className="mb-6 flex w-fit items-center gap-2 text-sm text-white/30 transition hover:text-white"
                    >
                        <ChevronLeft size={16} />
                        Leave room
                    </button>

                    <NowPlaying
                        song={currentSong}
                        isPlaying={player.isPlaying}
                        isBuffering={player.isBuffering}
                        isBlocked={player.isBlocked}
                        currentTime={player.currentTime}
                        duration={player.duration}
                        volume={player.volume}
                        canSkip={playlist.length > 0}
                        activity={activityText}
                        onTogglePlay={togglePlay}
                        onSeek={seekTo}
                        onNext={() => skip(1)}
                        onPrevious={() => skip(-1)}
                        onVolume={player.setVolume}
                        onUnlock={unlockAudio}
                    />
                </div>

                <LibraryPanel
                    playlist={playlist}
                    currentSongId={currentSong?.id ?? null}
                    isPlaying={player.isPlaying}
                    onPlay={playSong}
                    onAdd={addToPlaylist}
                    onRemove={removeFromPlaylist}
                />
            </div>
        </main>
    );
}

export default MusicRoom;
