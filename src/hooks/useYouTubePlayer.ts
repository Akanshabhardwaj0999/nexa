import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { YOUTUBE_PREFIX } from "../services/youtube";

/*
 * Plays songs through YouTube's official embedded player (the IFrame
 * Player API). It exposes the same controls the room used with the
 * old <audio> player: apply / play / pause / seek and live state.
 */

interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(options: { videoId: string; startSeconds?: number }): void;
    cueVideoById(options: { videoId: string; startSeconds?: number }): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setVolume(volume: number): void;
    mute(): void;
    unMute(): void;
    destroy(): void;
}

interface YTNamespace {
    Player: new (
        element: HTMLElement,
        options: {
            width?: string;
            height?: string;
            playerVars?: Record<string, string | number>;
            events?: {
                onReady?: () => void;
                onStateChange?: (event: { data: number }) => void;
                onError?: (event: { data: number }) => void;
            };
        },
    ) => YTPlayer;
}

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

const STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

// If playback hasn't started this long after asking, the browser
// most likely blocked it until the user taps (autoplay policy).
const BLOCK_CHECK_DELAY = 3000;

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
    if (window.YT?.Player) {
        return Promise.resolve();
    }

    if (!apiPromise) {
        apiPromise = new Promise((resolve, reject) => {
            const previous = window.onYouTubeIframeAPIReady;

            window.onYouTubeIframeAPIReady = () => {
                previous?.();
                resolve();
            };

            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.async = true;
            script.onerror = () => {
                apiPromise = null;
                reject(new Error("Unable to load the YouTube player"));
            };

            document.head.appendChild(script);
        });
    }

    return apiPromise;
}

function parseVideoId(src: string) {
    return src.startsWith(YOUTUBE_PREFIX) ? src.slice(YOUTUBE_PREFIX.length) : null;
}

interface UseYouTubePlayerProps {
    onEnded?: () => void;
    // Play / pause done in the YouTube frame itself (tapping the video).
    onExternalChange?: (isPlaying: boolean, position: number) => void;
    // The video can't be played (removed, private, not embeddable).
    onVideoError?: (videoId: string) => void;
}

export function useYouTubePlayer({
    onEnded,
    onExternalChange,
    onVideoError,
}: UseYouTubePlayerProps = {}) {
    const [host, setHost] = useState<HTMLDivElement | null>(null);

    const playerRef = useRef<YTPlayer | null>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<(() => void) | null>(null);
    const videoIdRef = useRef<string | null>(null);

    // What we last asked for, to tell our own changes apart from taps
    // on the video.
    const wantPlayingRef = useRef(false);

    // While a new video loads, time keeps moving for the other
    // listener, so skip ahead by the load time once it starts.
    const loadSyncRef = useRef<{ position: number; requestedAt: number } | null>(null);
    const blockTimerRef = useRef<number | undefined>(undefined);
    const volumeRef = useRef(0.8);

    const callbacksRef = useRef({ onEnded, onExternalChange, onVideoError });

    useEffect(() => {
        callbacksRef.current = { onEnded, onExternalChange, onVideoError };
    }, [onEnded, onExternalChange, onVideoError]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.8);
    const [videoId, setVideoId] = useState<string | null>(null);

    // Attach to the element that should show the video.
    const mountRef = useCallback((element: HTMLDivElement | null) => {
        setHost(element);
    }, []);

    const armBlockCheck = useCallback(() => {
        window.clearTimeout(blockTimerRef.current);

        blockTimerRef.current = window.setTimeout(() => {
            const state = playerRef.current?.getPlayerState();

            if (
                wantPlayingRef.current &&
                state !== STATE.PLAYING &&
                state !== STATE.BUFFERING
            ) {
                setIsBlocked(true);
                setIsBuffering(false);
            }
        }, BLOCK_CHECK_DELAY);
    }, []);

    // Create the player once the video element is on the page.
    useEffect(() => {
        if (!host) {
            return;
        }

        let cancelled = false;

        // YouTube replaces the element it's given with an iframe, so
        // hand it a child React doesn't manage.
        const target = document.createElement("div");
        host.appendChild(target);

        const handleState = (state: number) => {
            const player = playerRef.current;

            if (!player) {
                return;
            }

            if (state === STATE.PLAYING) {
                window.clearTimeout(blockTimerRef.current);
                setIsPlaying(true);
                setIsBuffering(false);
                setIsBlocked(false);

                const sync = loadSyncRef.current;
                loadSyncRef.current = null;

                if (sync) {
                    const resumeAt =
                        sync.position + (performance.now() - sync.requestedAt) / 1000;

                    if (Math.abs(player.getCurrentTime() - resumeAt) > 1) {
                        player.seekTo(resumeAt, true);
                    }
                }

                if (!wantPlayingRef.current) {
                    wantPlayingRef.current = true;
                    callbacksRef.current.onExternalChange?.(true, player.getCurrentTime());
                }
            } else if (state === STATE.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);

                // Phones pause the video when the page is hidden; don't
                // pause the other listener because of that.
                if (wantPlayingRef.current && document.visibilityState === "visible") {
                    wantPlayingRef.current = false;
                    callbacksRef.current.onExternalChange?.(false, player.getCurrentTime());
                }
            } else if (state === STATE.BUFFERING) {
                setIsBuffering(true);
            } else if (state === STATE.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);
                wantPlayingRef.current = false;
                callbacksRef.current.onEnded?.();
            } else {
                setIsPlaying(false);
            }
        };

        loadYouTubeApi()
            .then(() => {
                if (cancelled || !window.YT) {
                    return;
                }

                playerRef.current = new window.YT.Player(target, {
                    width: "100%",
                    height: "100%",
                    playerVars: {
                        playsinline: 1,
                        controls: 0,
                        disablekb: 1,
                        rel: 0,
                        fs: 0,
                        iv_load_policy: 3,
                        modestbranding: 1,
                        origin: window.location.origin,
                    },
                    events: {
                        onReady: () => {
                            readyRef.current = true;
                            playerRef.current?.setVolume(volumeRef.current * 100);
                            pendingRef.current?.();
                            pendingRef.current = null;
                        },
                        onStateChange: (event) => handleState(event.data),
                        onError: () => {
                            window.clearTimeout(blockTimerRef.current);
                            setIsBuffering(false);
                            setIsPlaying(false);

                            if (videoIdRef.current) {
                                callbacksRef.current.onVideoError?.(videoIdRef.current);
                            }
                        },
                    },
                });
            })
            .catch((error) => console.error(error));

        return () => {
            cancelled = true;
            readyRef.current = false;
            window.clearTimeout(blockTimerRef.current);
            playerRef.current?.destroy();
            playerRef.current = null;
            videoIdRef.current = null;
            host.replaceChildren();
        };
    }, [host]);

    /*
     * Phones (and some battery savers) pause embedded videos while the
     * page is hidden. When the listener comes back, carry on playing
     * instead of leaving the song paused.
     */
    useEffect(() => {
        const handleVisibility = () => {
            const player = playerRef.current;

            if (
                document.visibilityState !== "visible" ||
                !player ||
                !readyRef.current ||
                !videoIdRef.current ||
                !wantPlayingRef.current
            ) {
                return;
            }

            const state = player.getPlayerState();

            if (state !== STATE.PLAYING && state !== STATE.BUFFERING && state !== STATE.ENDED) {
                player.playVideo();
                armBlockCheck();
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);

        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [armBlockCheck]);

    // Keep the time and length shown up to date.
    useEffect(() => {
        const interval = window.setInterval(() => {
            const player = playerRef.current;

            if (!player || !readyRef.current || !videoIdRef.current) {
                return;
            }

            setCurrentTime(player.getCurrentTime() || 0);

            const length = player.getDuration();

            if (length > 0) {
                setDuration(length);
            }
        }, 250);

        return () => window.clearInterval(interval);
    }, []);

    const play = useCallback(async () => {
        const player = playerRef.current;

        if (!player || !readyRef.current || !videoIdRef.current) {
            return false;
        }

        wantPlayingRef.current = true;
        player.playVideo();
        armBlockCheck();
        return true;
    }, [armBlockCheck]);

    const pause = useCallback(() => {
        wantPlayingRef.current = false;
        window.clearTimeout(blockTimerRef.current);

        if (readyRef.current) {
            playerRef.current?.pauseVideo();
        }
    }, []);

    const seek = useCallback((time: number) => {
        const position = Math.max(0, time);

        if (readyRef.current && videoIdRef.current) {
            playerRef.current?.seekTo(position, true);
        }

        setCurrentTime(position);
    }, []);

    /*
     * Load a video (if it isn't already loaded), jump to a position
     * and play or pause. Used for both local and remote changes.
     */
    const apply = useCallback(
        async (src: string, position: number, shouldPlay: boolean) => {
            const nextVideoId = parseVideoId(src);

            if (!nextVideoId) {
                return;
            }

            const run = () => {
                const player = playerRef.current;

                if (!player) {
                    return;
                }

                wantPlayingRef.current = shouldPlay;

                if (videoIdRef.current !== nextVideoId) {
                    videoIdRef.current = nextVideoId;
                    setVideoId(nextVideoId);
                    setCurrentTime(position);
                    setDuration(0);

                    if (shouldPlay) {
                        loadSyncRef.current = {
                            position,
                            requestedAt: performance.now(),
                        };
                        setIsBuffering(true);
                        player.loadVideoById({ videoId: nextVideoId, startSeconds: position });
                        armBlockCheck();
                    } else {
                        loadSyncRef.current = null;
                        player.cueVideoById({ videoId: nextVideoId, startSeconds: position });
                    }

                    return;
                }

                player.seekTo(position, true);
                setCurrentTime(position);

                if (shouldPlay) {
                    player.playVideo();
                    armBlockCheck();
                } else {
                    player.pauseVideo();
                }
            };

            if (readyRef.current) {
                run();
            } else {
                // The player is still starting; do this once it's ready.
                pendingRef.current = run;
            }
        },
        [armBlockCheck],
    );

    const getCurrentTime = useCallback(() => {
        if (!readyRef.current || !videoIdRef.current) {
            return 0;
        }

        return playerRef.current?.getCurrentTime() ?? 0;
    }, []);

    const setVolume = useCallback((value: number) => {
        const clamped = Math.min(1, Math.max(0, value));

        volumeRef.current = clamped;
        setVolumeState(clamped);

        const player = playerRef.current;

        if (player && readyRef.current) {
            player.setVolume(clamped * 100);

            if (clamped === 0) {
                player.mute();
            } else {
                player.unMute();
            }
        }
    }, []);

    return {
        mountRef,
        videoId,
        isPlaying,
        isBuffering,
        isBlocked,
        currentTime,
        duration,
        volume,
        play,
        pause,
        seek,
        apply,
        getCurrentTime,
        setVolume,
    };
}
