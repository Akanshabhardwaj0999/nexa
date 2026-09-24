import type { RealtimeChannel } from "@supabase/supabase-js";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { supabase } from "../lib/supabase";
import type {
    ChatMessage,
    PlaybackMessage,
    RoomMember,
} from "../types/music";

interface RoomChannelHandlers {
    onPlayback: (message: PlaybackMessage) => void;
    onPlaylistChanged: () => void;
    onSyncRequest: (fromClientId: string) => void;
    onChat: (message: ChatMessage) => void;
}

interface UseRoomChannelProps extends RoomChannelHandlers {
    roomId: string | null;
    clientId: string;
    userName: string;
}

/*
 * Shared channel per room. React StrictMode mounts effects twice,
 * and supabase.channel() returns the same (already subscribed)
 * channel for a topic, so we keep one connection per room and
 * delay its teardown slightly to survive the remount.
 */
interface ChannelEntry {
    channel: RealtimeChannel;
    userName: string;
    joinedAt: number;
    handlers: { current: RoomChannelHandlers };
    setMembers: { current: (members: RoomMember[]) => void };
    setConnected: { current: (connected: boolean) => void };
    teardownTimer?: ReturnType<typeof setTimeout>;
}

const channels = new Map<string, ChannelEntry>();

function readMembers(channel: RealtimeChannel): RoomMember[] {
    const state = channel.presenceState<RoomMember>();
    const byClient = new Map<string, RoomMember>();

    Object.values(state)
        .flat()
        .forEach((member) => {
            byClient.set(member.clientId, {
                clientId: member.clientId,
                userName: member.userName,
                joinedAt: member.joinedAt,
            });
        });

    return [...byClient.values()].sort(
        (a, b) => a.joinedAt - b.joinedAt,
    );
}

export function useRoomChannel({
    roomId,
    clientId,
    userName,
    ...handlers
}: UseRoomChannelProps) {
    const handlersRef = useRef<RoomChannelHandlers>(handlers);
    const entryRef = useRef<ChannelEntry | null>(null);

    const [members, setMembers] = useState<RoomMember[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        if (!roomId) {
            return;
        }

        const topic = `nexa-room-${roomId}`;
        let entry = channels.get(topic);

        if (entry) {
            clearTimeout(entry.teardownTimer);
            entry.handlers = handlersRef;
            entry.setMembers.current = setMembers;
            entry.setConnected.current = setIsConnected;

            if (entry.userName !== userName) {
                entry.userName = userName;
                entry.channel.track({
                    clientId,
                    userName,
                    joinedAt: entry.joinedAt,
                } satisfies RoomMember);
            }
        } else {
            const channel = supabase.channel(topic, {
                config: {
                    broadcast: { self: false },
                    presence: { key: clientId },
                },
            });

            const newEntry: ChannelEntry = {
                channel,
                userName,
                joinedAt: Date.now(),
                handlers: handlersRef,
                setMembers: { current: setMembers },
                setConnected: { current: setIsConnected },
            };

            channel
                .on("broadcast", { event: "playback" }, ({ payload }) =>
                    newEntry.handlers.current.onPlayback(
                        payload as PlaybackMessage,
                    ),
                )
                .on("broadcast", { event: "playlist" }, () =>
                    newEntry.handlers.current.onPlaylistChanged(),
                )
                .on("broadcast", { event: "sync-request" }, ({ payload }) =>
                    newEntry.handlers.current.onSyncRequest(
                        (payload as { clientId: string }).clientId,
                    ),
                )
                .on("broadcast", { event: "chat" }, ({ payload }) =>
                    newEntry.handlers.current.onChat(payload as ChatMessage),
                )
                .on("presence", { event: "sync" }, () =>
                    newEntry.setMembers.current(readMembers(channel)),
                )
                .subscribe(async (status) => {
                    const connected = status === "SUBSCRIBED";

                    newEntry.setConnected.current(connected);

                    if (!connected) {
                        return;
                    }

                    await channel.track({
                        clientId,
                        userName: newEntry.userName,
                        joinedAt: newEntry.joinedAt,
                    } satisfies RoomMember);

                    // Ask whoever is already here what's playing.
                    channel.send({
                        type: "broadcast",
                        event: "sync-request",
                        payload: { clientId },
                    });
                });

            entry = newEntry;
            channels.set(topic, entry);
        }

        entryRef.current = entry;

        return () => {
            const current = channels.get(topic);

            if (!current) {
                return;
            }

            current.teardownTimer = setTimeout(() => {
                channels.delete(topic);
                supabase.removeChannel(current.channel);
            }, 300);

            entryRef.current = null;
        };
    }, [roomId, clientId, userName]);

    const send = useCallback(
        (event: string, payload: object) => {
            const channel = entryRef.current?.channel;

            if (!channel) {
                return;
            }

            channel
                .send({ type: "broadcast", event, payload })
                .catch((error) =>
                    console.error(`Unable to send ${event}:`, error),
                );
        },
        [],
    );

    const sendPlayback = useCallback(
        (message: PlaybackMessage) => send("playback", message),
        [send],
    );

    const sendPlaylistChanged = useCallback(
        () => send("playlist", {}),
        [send],
    );

    const requestSync = useCallback(
        () => send("sync-request", { clientId }),
        [send, clientId],
    );

    const sendChat = useCallback(
        (message: ChatMessage) => send("chat", message),
        [send],
    );

    return {
        members,
        isConnected,
        sendPlayback,
        sendPlaylistChanged,
        requestSync,
        sendChat,
    };
}
