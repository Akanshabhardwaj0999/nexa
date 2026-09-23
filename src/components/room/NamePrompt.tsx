import { ArrowRight, Headphones } from "lucide-react";
import { useState } from "react";

interface NamePromptProps {
    roomCode: string;
    onSubmit: (name: string) => void;
}

function NamePrompt({
    roomCode,
    onSubmit,
}: NamePromptProps) {
    const [name, setName] = useState("");

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#08080c] px-5 text-white">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[140px]" />
                <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[160px]" />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();

                    if (name.trim()) {
                        onSubmit(name.trim());
                    }
                }}
                className="relative w-full max-w-md"
            >
                <div className="mb-7 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
                        <Headphones size={28} />
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/30">
                        You're invited to room {roomCode}
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        What's your name?
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-white/40">
                        So your friend knows who's listening.
                    </p>
                </div>

                <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        maxLength={30}
                        autoFocus
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/25"
                    />

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                    >
                        Join room
                        <ArrowRight size={17} />
                    </button>
                </div>
            </form>
        </main>
    );
}

export default NamePrompt;
