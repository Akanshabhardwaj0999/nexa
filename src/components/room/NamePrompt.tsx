import { ArrowRight, Headphones } from "lucide-react";
import { useState } from "react";

import FormPage from "../ui/FormPage";
import { inputClass, primaryButtonClass } from "../ui/formStyles";

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
        <FormPage
            icon={<Headphones size={28} />}
            eyebrow={`You're invited to room ${roomCode}`}
            title="What's your name?"
            description="So your friend knows who's listening."
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();

                    if (name.trim()) {
                        onSubmit(name.trim());
                    }
                }}
            >
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    aria-label="Your name"
                    maxLength={30}
                    autoComplete="given-name"
                    enterKeyHint="go"
                    autoFocus
                    className={inputClass}
                />

                <button
                    type="submit"
                    disabled={!name.trim()}
                    className={`mt-5 ${primaryButtonClass}`}
                >
                    Join room
                    <ArrowRight size={17} />
                </button>
            </form>
        </FormPage>
    );
}

export default NamePrompt;
