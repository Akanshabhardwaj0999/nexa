import { ArrowRight, Headphones, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import FormPage from "../components/ui/FormPage";
import {
    footerLinkClass,
    inputClass,
    labelClass,
    primaryButtonClass,
} from "../components/ui/formStyles";
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
        <FormPage
            icon={<Headphones size={28} />}
            eyebrow={
                <>
                    <Sparkles size={13} />
                    Start a shared room
                </>
            }
            title="Create your room"
            description="Create a private space and invite someone to listen with you."
            footer={
                <button
                    onClick={() => navigate("/join")}
                    className={footerLinkClass}
                >
                    Have a room code?{" "}
                    <span className="text-violet-300">Join a room</span>
                </button>
            }
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateRoom();
                }}
            >
                <label htmlFor="create-name" className={labelClass}>
                    Your name
                </label>

                <input
                    id="create-name"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                    }}
                    placeholder="Enter your name"
                    maxLength={30}
                    autoComplete="given-name"
                    enterKeyHint="go"
                    className={`mt-3 ${inputClass}`}
                />

                {error && (
                    <p className="mt-3 text-sm text-red-300/80">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isCreating}
                    className={`mt-5 ${primaryButtonClass}`}
                >
                    {isCreating ? "Creating room..." : "Create room"}

                    {!isCreating && <ArrowRight size={17} />}
                </button>
            </form>
        </FormPage>
    );
}

export default CreateRoom;