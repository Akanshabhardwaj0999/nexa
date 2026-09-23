import { ArrowRight, Headphones, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    createRoom,
    saveUserName,
} from "../services/room";

function CreateRoom() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const handleCreateRoom = async () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Please enter your name.");
            return;
        }

        try {
            setIsCreating(true);
            setError("");

            saveUserName(trimmedName);

            const room = await createRoom(trimmedName);

            navigate(`/room/${room.roomCode}`);
        } catch (error) {
            console.error(error);

            setError(
                "Unable to create room. Please try again.",
            );
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#08080c] text-white">

            {/* Ambient background */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 top-10 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[150px]" />

                <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[160px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex h-20 items-center justify-between border-b border-white/5 px-6 sm:px-10">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-3"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
                        <span className="text-sm font-bold">
                            N
                        </span>
                    </div>

                    <span className="text-lg font-semibold">
                        Nexa
                    </span>
                </button>
            </header>

            {/* Content */}
            <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center px-5">

                <div className="w-full max-w-md">

                    {/* Icon */}
                    <div className="mb-7 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                            <Headphones size={28} />
                        </div>
                    </div>

                    <div className="text-center">

                        <div className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-white/30">
                            <Sparkles size={13} />
                            Start a shared room
                        </div>

                        <h1 className="text-4xl font-semibold tracking-tight">
                            Create your room
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-white/40">
                            Create a private space and invite
                            someone to listen with you.
                        </p>
                    </div>

                    {/* Card */}
                    <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">

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
                                    handleCreateRoom();
                                }
                            }}
                            placeholder="Enter your name"
                            maxLength={30}
                            className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                        />

                        {error && (
                            <p className="mt-3 text-sm text-red-300/70">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isCreating
                                ? "Creating room..."
                                : "Create room"}

                            {!isCreating && (
                                <ArrowRight size={17} />
                            )}
                        </button>
                    </div>

                    {/* Join */}
                    <button
                        onClick={() => navigate("/join")}
                        className="mx-auto mt-6 block text-sm text-white/30 transition hover:text-white"
                    >
                        Have a room code?{" "}
                        <span className="text-white/60">
                            Join a room
                        </span>
                    </button>
                </div>
            </div>
        </main>
    );
}

export default CreateRoom;