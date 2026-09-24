import { HeartHandshake, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface RoomFullDialogProps {
    roomCode: string;
    onClose: () => void;
    onCreateRoom: () => void;
}

/*
 * Shown when someone tries to join a room that already has its two
 * people.
 */
function RoomFullDialog({ roomCode, onClose, onCreateRoom }: RoomFullDialogProps) {
    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKey);

        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // Rendered on <body> so blurred parents (backdrop-filter) can't trap it.
    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="room-full-title"
                aria-describedby="room-full-text"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm rounded-[28px] border border-white/10 bg-[#110f1c] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:pb-6"
            >
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                    <HeartHandshake size={26} />
                </div>

                <h2 id="room-full-title" className="mt-5 text-xl font-semibold tracking-tight">
                    Room already occupied
                </h2>

                <p id="room-full-text" className="mt-2 text-sm leading-6 text-white/50">
                    Room <span className="font-medium tracking-[0.15em] text-white/80">{roomCode}</span>{" "}
                    already has its two people. Nexa rooms are just for a couple, so
                    create your own room to listen with someone.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={onCreateRoom}
                        className="min-h-12 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:scale-[1.01]"
                    >
                        Create my own room
                    </button>

                    <button
                        onClick={onClose}
                        className="min-h-12 rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
                    >
                        Try another code
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default RoomFullDialog;
