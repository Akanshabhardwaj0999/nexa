import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

interface UseAudioPlayerProps {
    onEnded?: () => void;
}

export function useAudioPlayer({
    onEnded,
}: UseAudioPlayerProps = {}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const onEndedRef = useRef(onEnded);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.8);

    /*
     * True when the browser refused to start playback because
     * the user hasn't interacted with the page yet (autoplay policy).
     */
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        onEndedRef.current = onEnded;
    }, [onEnded]);

    useEffect(() => {
        const audio = new Audio();

        audio.preload = "auto";
        audio.volume = 0.8;
        audioRef.current = audio;

        const handleTimeUpdate = () =>
            setCurrentTime(audio.currentTime);

        const handleDuration = () => {
            if (Number.isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const handlePlay = () => {
            setIsPlaying(true);
            setIsBlocked(false);
        };

        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);

        const handleEnded = () => {
            setIsPlaying(false);
            onEndedRef.current?.();
        };

        const listeners: [string, () => void][] = [
            ["timeupdate", handleTimeUpdate],
            ["loadedmetadata", handleDuration],
            ["durationchange", handleDuration],
            ["play", handlePlay],
            ["pause", handlePause],
            ["waiting", handleWaiting],
            ["playing", handlePlaying],
            ["canplay", handlePlaying],
            ["ended", handleEnded],
        ];

        listeners.forEach(([event, handler]) =>
            audio.addEventListener(event, handler),
        );

        return () => {
            audio.pause();

            listeners.forEach(([event, handler]) =>
                audio.removeEventListener(event, handler),
            );

            audio.removeAttribute("src");
            audio.load();
            audioRef.current = null;
        };
    }, []);

    const play = useCallback(async () => {
        const audio = audioRef.current;

        if (!audio || !audio.src) {
            return false;
        }

        try {
            await audio.play();
            return true;
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === "NotAllowedError"
            ) {
                setIsBlocked(true);
            } else if (
                !(
                    error instanceof DOMException &&
                    error.name === "AbortError"
                )
            ) {
                console.error("Unable to play audio:", error);
            }

            return false;
        }
    }, []);

    const pause = useCallback(() => {
        audioRef.current?.pause();
    }, []);

    const seek = useCallback((time: number) => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        audio.currentTime = Math.max(0, time);
        setCurrentTime(audio.currentTime);
    }, []);

    /*
     * Load a track (if it isn't already loaded), jump to a position
     * and play or pause. Used for both local and remote changes.
     */
    const apply = useCallback(
        async (
            src: string,
            position: number,
            shouldPlay: boolean,
        ) => {
            const audio = audioRef.current;

            if (!audio || !src) {
                return;
            }

            const requestedAt = performance.now();

            if (audio.src !== src) {
                audio.src = src;
                setCurrentTime(0);
                setDuration(0);
                setIsBuffering(true);
            }

            const seekToTarget = () => {
                // While the track loads, time keeps moving for the
                // other listener, so skip ahead by the load time.
                const elapsed = shouldPlay
                    ? (performance.now() - requestedAt) / 1000
                    : 0;

                audio.currentTime = Math.max(0, position + elapsed);
                setCurrentTime(audio.currentTime);
            };

            if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
                seekToTarget();
            } else {
                audio.addEventListener(
                    "loadedmetadata",
                    seekToTarget,
                    { once: true },
                );
            }

            if (shouldPlay) {
                await play();
            } else {
                audio.pause();
            }
        },
        [play],
    );

    const getCurrentTime = useCallback(
        () => audioRef.current?.currentTime ?? 0,
        [],
    );

    const setVolume = useCallback((value: number) => {
        const clamped = Math.min(1, Math.max(0, value));

        if (audioRef.current) {
            audioRef.current.volume = clamped;
        }

        setVolumeState(clamped);
    }, []);

    return {
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
