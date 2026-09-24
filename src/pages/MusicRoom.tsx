import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import LibraryPanel from "../components/room/LibraryPanel";
import NamePrompt from "../components/room/NamePrompt";
import MiniPlayer from "../components/room/MiniPlayer";
import NowPlaying from "../components/room/NowPlaying";
import RoomHeader from "../components/room/RoomHeader";
import PageBackground from "../components/ui/PageBackground";
import { useRoomChannel } from "../hooks/useRoomChannel";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
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
    updateTrackAudio,
} from "../services/room";
import { getVideoId, resolveSong, YouTubeError } from "../services/youtube";
import type { PlaybackMessage, Song } from "../types/music";

// Re-sync when the two listeners drift further apart than this (seconds).
const DRIFT_TOLERANCE = 0.6;

// How often the room leader shares its position while playing (ms).
const HEARTBEAT_INTERVAL = 4000;

// Ignore heartbeats this long after our own seek/play/pause (ms).
const HEARTBEAT_GRACE = 2500;

// Videos to try for one song before giving up (removed, blocked...).
const MAX_VIDEO_ATTEMPTS = 3;

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

    const [isResolving, setIsResolving] = useState(false);

    // Where to start a saved song that has no video loaded yet.
    const resumePositionRef = useRef(0);

    // Only the latest play request wins if YouTube lookups overlap.
    const playRequestRef = useRef(0);

    // Videos that failed to play, per song.
    const failedVideosRef = useRef<Record<string, string[]>>({});

    const player = useYouTubePlayer({
        onEnded: handleEnded,
        onExternalChange: handleExternalChange,
        onVideoError: handleVideoError,
    });

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
                    resumePositionRef.current = playback?.position ?? 0;

                    if (getVideoId(savedSong)) {
                        apply(savedSong.audioUrl, playback?.position ?? 0, false);
                    }
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

    /*
     * When we seek or pause, a heartbeat the leader sent just before
     * receiving our action can still arrive and would drag us back to
     * the old position, so ignore heartbeats for a moment after.
     */
    const lastLocalActionAt = useRef(0);

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

        if (kind === "action") {
            lastLocalActionAt.current = Date.now();
        }

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

    /*
     * Songs come from the catalog without a video; the first time one
     * is played we find it on YouTube and save the result.
     */
    async function playSong(song: Song, position = 0) {
        const request = ++playRequestRef.current;

        selectSong(song);
        setActivity("");

        let playable = song;

        if (!getVideoId(song)) {
            setIsResolving(true);

            try {
                playable = await resolveSong(song, failedVideosRef.current[song.id]);
            } catch (error) {
                if (request === playRequestRef.current) {
                    setIsResolving(false);
                    setActivity(
                        error instanceof YouTubeError
                            ? error.message
                            : "Couldn't play this song. Try another one.",
                    );
                }

                return;
            }

            if (request !== playRequestRef.current) {
                return;
            }

            setIsResolving(false);
        }

        selectSong(playable);
        player.apply(playable.audioUrl, position, true);
        broadcast(playable, true, position);
        rememberVideo(playable);
    }

    // Keep the video with the queued song (locally and for the room).
    function rememberVideo(song: Song) {
        const queued = playlistRef.current.find((item) => item.id === song.id);

        if (!queued) {
            addToPlaylist(song);
            return;
        }

        if (queued.audioUrl === song.audioUrl || !roomId) {
            return;
        }

        setPlaylist((list) =>
            list.map((item) => (item.id === song.id ? song : item)),
        );

        updateTrackAudio(roomId, song.id, song.audioUrl).catch((error) =>
            console.error("Unable to save video:", error),
        );
    }

    // Play / pause done by tapping the video itself.
    function handleExternalChange(isPlaying: boolean, position: number) {
        const song = currentSongRef.current;

        if (song) {
            broadcast(song, isPlaying, position);
        }
    }

    // The video can't be played here; try the next best match.
    function handleVideoError(videoId: string) {
        const song = currentSongRef.current;

        if (!song) {
            return;
        }

        const failed = [...(failedVideosRef.current[song.id] ?? []), videoId];
        failedVideosRef.current[song.id] = failed;

        if (failed.length >= MAX_VIDEO_ATTEMPTS) {
            setActivity(`"${song.title}" can't be played right now. Try another song.`);
            return;
        }

        playSong({ ...song, audioUrl: "" }, player.getCurrentTime());
    }

    function togglePlay() {
        const song = currentSongRef.current;

        if (!song) {
            return;
        }

        if (!getVideoId(song) || player.videoId !== getVideoId(song)) {
            playSong(song, resumePositionRef.current);
            resumePositionRef.current = 0;
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

        if (!getVideoId(song)) {
            resolveSong(song)
                .then((playable) =>
                    handleRemotePlayback({ ...message, song: playable }),
                )
                .catch((error) => console.error(error));
            return;
        }

        if (
            message.kind === "heartbeat" &&
            Date.now() - lastLocalActionAt.current < HEARTBEAT_GRACE
        ) {
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

        // Some mobile browsers throw for unsupported actions, which would
        // otherwise crash the whole page into a blank screen.
        const setHandler = (
            action: MediaSessionAction,
            handler: MediaSessionActionHandler | null,
        ) => {
            try {
                session.setActionHandler(action, handler);
            } catch {
                // action not supported on this browser
            }
        };

        setHandler("play", () => mediaActions.current.togglePlay());
        setHandler("pause", () => mediaActions.current.togglePlay());
        setHandler("nexttrack", () => mediaActions.current.skip(1));
        setHandler("previoustrack", () => mediaActions.current.skip(-1));

        return () => {
            (["play", "pause", "nexttrack", "previoustrack"] as const).forEach(
                (action) => setHandler(action, null),
            );
        };
    }, []);

    useEffect(() => {
        document.title = currentSong
            ? `${currentSong.title} · ${currentSong.artist} | Nexa`
            : `Room ${code} | Nexa`;

        if ("mediaSession" in navigator && typeof MediaMetadata !== "undefined" && currentSong) {
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

    // Show the mini player on small screens once the big one scrolls away.
    const nowPlayingRef = useRef<HTMLDivElement | null>(null);
    const [isNowPlayingVisible, setIsNowPlayingVisible] = useState(true);

    useEffect(() => {
        const element = nowPlayingRef.current;

        if (!element || typeof IntersectionObserver === "undefined") {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => setIsNowPlayingVisible(entry.isIntersecting),
            { rootMargin: "-40% 0px 0px 0px" },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [status]);

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
            <main className="relative flex min-h-dvh items-center justify-center bg-[#06050c] text-white">
                <PageBackground />

                <div className="relative text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-300" />

                    <p className="mt-4 text-sm text-white/50">
                        Entering your room...
                    </p>
                </div>
            </main>
        );
    }

    if (status === "not-found" || status === "error") {
        return (
            <main className="relative flex min-h-dvh items-center justify-center bg-[#06050c] px-5 text-white">
                <PageBackground />

                <div className="relative max-w-sm text-center">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        {status === "not-found"
                            ? "Room not found"
                            : "Something went wrong"}
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/50">
                        {status === "not-found"
                            ? `There's no room with the code ${code}. Check the code and try again.`
                            : "We couldn't load this room. Check your connection and try again."}
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() =>
                                status === "error"
                                    ? window.location.reload()
                                    : navigate("/join")
                            }
                            className="min-h-12 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:scale-[1.02]"
                        >
                            {status === "error" ? "Try again" : "Enter a code"}
                        </button>

                        <button
                            onClick={() => navigate("/")}
                            className="min-h-12 rounded-full border border-violet-400/50 px-6 py-3 text-sm text-white/80 transition hover:bg-violet-500/10"
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

    const miniDuration = player.duration || currentSong?.duration || 0;

    return (
        <main className="relative min-h-dvh overflow-x-hidden bg-[#06050c] text-white">
            <PageBackground />

            <RoomHeader
                roomCode={code}
                clientId={clientId}
                members={channel.members}
                isConnected={channel.isConnected}
                onHome={() => navigate("/")}
            />

            {/* Bottom padding leaves room for the mini player on phones. */}
            <div className="relative z-10 mx-auto grid max-w-7xl gap-6 px-4 pb-28 pt-4 sm:gap-8 sm:px-6 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8 lg:pb-10 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_440px]">
                <div ref={nowPlayingRef} className="min-w-0">
                    <button
                        onClick={() => navigate("/")}
                        className="mb-4 hidden w-fit items-center gap-2 text-sm text-white/40 transition hover:text-white sm:mb-6 sm:flex"
                    >
                        <ChevronLeft size={16} />
                        Leave room
                    </button>

                    <NowPlaying
                        song={currentSong}
                        playerMountRef={player.mountRef}
                        showVideo={Boolean(player.videoId) && player.videoId === getVideoId(currentSong)}
                        isResolving={isResolving}
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

            {currentSong && (
                <MiniPlayer
                    song={currentSong}
                    visible={!isNowPlayingVisible}
                    isPlaying={player.isPlaying}
                    isBuffering={player.isBuffering}
                    progress={miniDuration > 0 ? (player.currentTime / miniDuration) * 100 : 0}
                    canSkip={playlist.length > 0}
                    onTogglePlay={player.isBlocked ? unlockAudio : togglePlay}
                    onNext={() => skip(1)}
                    onOpen={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                />
            )}
        </main>
    );
}

export default MusicRoom;
