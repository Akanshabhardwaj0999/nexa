import { ArrowRight, Link2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import RoomFullDialog from "../components/room/RoomFullDialog";
import FormPage from "../components/ui/FormPage";
import {
    footerLinkClass,
    inputClass,
    labelClass,
    primaryButtonClass,
} from "../components/ui/formStyles";
import {
    joinRoom,
    RoomFullError,
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
    const [fullRoomCode, setFullRoomCode] = useState("");

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

            if (error instanceof RoomFullError) {
                setFullRoomCode(normalizedCode);
            } else if (
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
        <FormPage
            icon={<Link2 size={27} />}
            eyebrow="Listen together"
            title="Join a room"
            description="Enter the code shared by your friend and start listening together."
            footer={
                <button
                    onClick={() => navigate("/create")}
                    className={footerLinkClass}
                >
                    Don't have a room?{" "}
                    <span className="text-violet-300">Create one</span>
                </button>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleJoinRoom();
                }}
            >
                <label htmlFor="join-name" className={labelClass}>
                    Your name
                </label>

                <input
                    id="join-name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                    }}
                    placeholder="Enter your name"
                    maxLength={30}
                    autoComplete="given-name"
                    enterKeyHint="next"
                    className={`mt-3 ${inputClass}`}
                />

                <label htmlFor="join-code" className={`mt-6 ${labelClass}`}>
                    Room code
                </label>

                <input
                    id="join-code"
                    value={roomCode}
                    onChange={(e) => {
                        setRoomCode(
                            e.target.value
                                .toUpperCase()
                                .replace(/[^A-Z0-9]/g, "")
                                .slice(0, 6),
                        );

                        setError("");
                    }}
                    placeholder="e.g. NEXA42"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    className={`mt-3 ${inputClass} text-center !text-lg font-semibold tracking-[0.3em]`}
                />

                {error && (
                    <p className="mt-3 text-center text-sm text-red-300/80">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={
                        isJoining ||
                        !name.trim() ||
                        roomCode.length !== 6
                    }
                    className={`mt-5 ${primaryButtonClass}`}
                >
                    {isJoining ? "Joining room..." : "Join room"}

                    {!isJoining && <ArrowRight size={17} />}
                </button>
            </form>

            {fullRoomCode && (
                <RoomFullDialog
                    roomCode={fullRoomCode}
                    onClose={() => {
                        setFullRoomCode("");
                        setRoomCode("");
                    }}
                    onCreateRoom={() => navigate("/create")}
                />
            )}
        </FormPage>
    );
}

export default JoinRoom;