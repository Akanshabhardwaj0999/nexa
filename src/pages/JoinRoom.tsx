import {
    ArrowRight,
    ChevronLeft,
    Link2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    joinRoom,
    saveUserName,
} from "../services/room";

function JoinRoom() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState(() =>
        (searchParams.get("code") || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6),
    );
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState("");

    const handleJoinRoom = async () => {
        const trimmedName = name.trim();
        const normalizedCode = roomCode.trim().toUpperCase();

        if (!trimmedName) {
            setError("Please enter your name.");
            return;
        }

        if (!normalizedCode) {
            setError("Please enter a room code.");
            return;
        }

        try {
            setIsJoining(true);
            setError("");

            saveUserName(trimmedName);

            const room = await joinRoom(
                normalizedCode,
                trimmedName,
            );

            navigate(`/room/${room.roomCode}`);
        } catch (error) {
            console.error(error);

            if (
                error instanceof Error &&
                error.message === "Room not found"
            ) {
                setError(
                    "Room not found. Check the room code.",
                );
            } else {
                setError(
                    "Unable to join room. Please try again.",
                );
            }
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#08080c] text-white">

            {/* Ambient background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[160px]" />

                <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex h-20 items-center border-b border-white/5 px-6 sm:px-10">

                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
                >
                    <ChevronLeft size={17} />
                    Back
                </button>

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
                        <span className="text-sm font-bold">
                            N
                        </span>
                    </div>

                    <span className="text-lg font-semibold">
                        Nexa
                    </span>
                </div>
            </header>

            {/* Content */}
            <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-5">

                <div className="w-full max-w-md">

                    <div className="mb-7 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                            <Link2 size={27} />
                        </div>
                    </div>

                    <div className="text-center">

                        <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                            Listen together
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Join a room
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-white/40">
                            Enter the code shared by your
                            friend and start listening together.
                        </p>
                    </div>

                    <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">

                        {/* Name */}
                        <label className="text-xs uppercase tracking-[0.18em] text-white/30">
                            Your name
                        </label>

                        <input
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleJoinRoom();
                                }
                            }}
                            placeholder="Enter your name"
                            maxLength={30}
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                        />

                        {/* Room code */}
                        <label className="mt-6 block text-xs uppercase tracking-[0.18em] text-white/30">
                            Room code
                        </label>

                        <input
                            value={roomCode}
                            onChange={(e) => {
                                setRoomCode(
                                    e.target.value
                                        .toUpperCase()
                                        .replace(
                                            /[^A-Z0-9]/g,
                                            "",
                                        )
                                        .slice(0, 6),
                                );

                                setError("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleJoinRoom();
                                }
                            }}
                            placeholder="e.g. NEXA42"
                            maxLength={6}
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-center text-lg font-semibold tracking-[0.3em] text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                        />

                        {error && (
                            <p className="mt-3 text-center text-sm text-red-300/70">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleJoinRoom}
                            disabled={
                                isJoining ||
                                !name.trim() ||
                                roomCode.length !== 6
                            }
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                        >
                            {isJoining
                                ? "Joining room..."
                                : "Join room"}

                            {!isJoining && (
                                <ArrowRight size={17} />
                            )}
                        </button>
                    </div>

                    <button
                        onClick={() => navigate("/create")}
                        className="mx-auto mt-6 block text-sm text-white/30 transition hover:text-white"
                    >
                        Don't have a room?{" "}
                        <span className="text-white/60">
                            Create one
                        </span>
                    </button>
                </div>
            </div>
        </main>
    );
}

export default JoinRoom;