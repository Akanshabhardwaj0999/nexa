import { MessageCircle, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ChatMessage, RoomMember } from "../../types/music";

const MAX_MESSAGE_LENGTH = 1000;

function formatClock(time: number) {
    return new Date(time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}

interface ChatPanelProps {
    open: boolean;
    clientId: string;
    members: RoomMember[];
    messages: ChatMessage[];
    isConnected: boolean;
    onSend: (text: string) => void;
    onClose: () => void;
}

/*
 * Chat between the people in the room. A bottom sheet on phones and a
 * panel under the header on bigger screens.
 */
function ChatPanel({
    open,
    clientId,
    members,
    messages,
    isConnected,
    onSend,
    onClose,
}: ChatPanelProps) {
    const [draft, setDraft] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const others = members.filter((member) => member.clientId !== clientId);

    // Keep the newest message in view.
    useEffect(() => {
        if (open) {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        }
    }, [open, messages.length]);

    useEffect(() => {
        // Phones open the keyboard on focus, which would hide the
        // messages; only focus straight away where there's room.
        if (open && window.matchMedia("(min-width: 640px)").matches) {
            inputRef.current?.focus();
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    const send = () => {
        const text = draft.trim();

        if (!text || !isConnected) {
            return;
        }

        onSend(text.slice(0, MAX_MESSAGE_LENGTH));
        setDraft("");
    };

    return (
        <>
            {/* Backdrop, phones only */}
            <div
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition sm:hidden ${
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden
            />

            <section
                role="dialog"
                aria-label="Room chat"
                aria-hidden={!open}
                className={`fixed inset-x-0 bottom-0 z-50 flex h-[80dvh] flex-col rounded-t-[28px] border border-white/10 bg-[#110f1c]/95 shadow-[0_-10px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition duration-300 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:h-[min(560px,calc(100dvh-104px))] sm:w-[380px] sm:rounded-[28px] lg:right-8 ${
                    open
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-full opacity-0 sm:translate-y-2"
                }`}
            >
                {/* Grab handle on phones */}
                <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />

                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-5 py-3 sm:py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-medium">
                            {others.length > 0
                                ? others.map((member) => member.userName).join(", ")
                                : "Room chat"}
                        </h2>

                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    others.length > 0 ? "bg-emerald-400" : "bg-white/20"
                                }`}
                            />
                            {!isConnected
                                ? "Connecting..."
                                : others.length > 0
                                  ? "Online now"
                                  : "Waiting for your friend to join"}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white"
                        aria-label="Close chat"
                        tabIndex={open ? 0 : -1}
                    >
                        <X size={18} />
                    </button>
                </header>

                <div
                    ref={listRef}
                    className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-4"
                >
                    {messages.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center text-center text-white/30">
                            <MessageCircle size={28} strokeWidth={1.5} />
                            <p className="mt-3 text-sm">No messages yet</p>
                            <p className="mt-1 text-xs text-white/20">
                                Say hi while you listen.
                            </p>
                        </div>
                    )}

                    {messages.map((message, index) => {
                        const mine = message.clientId === clientId;
                        const previous = messages[index - 1];
                        const startsRun = !previous || previous.clientId !== message.clientId;

                        return (
                            <div
                                key={message.id}
                                className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                                    startsRun && index > 0 ? "pt-2" : ""
                                }`}
                            >
                                {startsRun && !mine && (
                                    <span className="mb-1 px-3 text-xs text-white/40">
                                        {message.userName}
                                    </span>
                                )}

                                <div
                                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-5 ${
                                        mine
                                            ? "rounded-br-md bg-violet-500 text-white"
                                            : "rounded-bl-md bg-white/10 text-white/90"
                                    }`}
                                    title={formatClock(message.sentAt)}
                                >
                                    {message.text}
                                    <span
                                        className={`ml-2 inline-block translate-y-0.5 text-[10px] ${
                                            mine ? "text-white/60" : "text-white/35"
                                        }`}
                                    >
                                        {formatClock(message.sentAt)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                    className="flex shrink-0 items-end gap-2 border-t border-white/5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                    <textarea
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            // Enter sends, Shift+Enter adds a line.
                            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        rows={1}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder={isConnected ? "Message..." : "Connecting..."}
                        aria-label="Message"
                        enterKeyHint="send"
                        tabIndex={open ? 0 : -1}
                        className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-base text-white outline-none [field-sizing:content] placeholder:text-white/30 focus:border-violet-400/60 sm:text-sm"
                    />

                    <button
                        type="submit"
                        disabled={!draft.trim() || !isConnected}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white transition hover:bg-violet-400 disabled:bg-white/10 disabled:text-white/30"
                        aria-label="Send message"
                        tabIndex={open ? 0 : -1}
                    >
                        <SendHorizontal size={18} />
                    </button>
                </form>
            </section>
        </>
    );
}

export default ChatPanel;
