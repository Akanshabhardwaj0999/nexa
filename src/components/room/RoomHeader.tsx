import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";

import { getInviteLink } from "../../services/room";
import type { RoomMember } from "../../types/music";
import Brand from "../ui/Brand";

const AVATAR_COLORS = ["bg-fuchsia-400", "bg-cyan-400", "bg-violet-400", "bg-amber-300"];

interface RoomHeaderProps {
    roomCode: string;
    clientId: string;
    members: RoomMember[];
    isConnected: boolean;
    onHome: () => void;
}

function RoomHeader({
    roomCode,
    clientId,
    members,
    isConnected,
    onHome,
}: RoomHeaderProps) {
    const [copied, setCopied] = useState<"code" | "link" | null>(null);

    const copy = async (kind: "code" | "link") => {
        const text = kind === "code" ? roomCode : getInviteLink(roomCode);

        try {
            if (kind === "link" && navigator.share) {
                await navigator.share({
                    title: "Listen with me on Nexa",
                    text: `Join my Nexa room ${roomCode}`,
                    url: text,
                });
                return;
            }

            await navigator.clipboard.writeText(text);
            setCopied(kind);
            setTimeout(() => setCopied(null), 1800);
        } catch {
            // Share sheet dismissed or clipboard blocked.
        }
    };

    const partner = members.find((member) => member.clientId !== clientId);

    return (
        <header className="relative z-20 mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-20 sm:gap-3 sm:px-6 lg:px-8">
            <Brand onClick={onHome} compact />

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                    onClick={() => copy("code")}
                    title="Copy room code"
                    className="flex h-10 items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 text-sm text-white/80 transition hover:bg-violet-500/20 sm:px-4"
                >
                    <span className="font-medium tracking-[0.15em]">
                        {roomCode}
                    </span>

                    {copied === "code" ? (
                        <Check size={14} className="text-emerald-300" />
                    ) : (
                        <Copy size={14} />
                    )}
                </button>

                <div
                    className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-3"
                    title={members.map((member) => member.userName).join(", ")}
                >
                    <div className="flex -space-x-2">
                        {members.slice(0, 3).map((member, index) => (
                            <div
                                key={member.clientId}
                                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#101017] text-xs font-semibold text-black ${
                                    AVATAR_COLORS[index % AVATAR_COLORS.length]
                                }`}
                            >
                                {member.userName.charAt(0).toUpperCase()}
                            </div>
                        ))}

                        {members.length < 2 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-xs text-white/40">
                                ?
                            </div>
                        )}
                    </div>

                    <span className="hidden max-w-[140px] truncate text-xs text-white/50 md:block">
                        {!isConnected
                            ? "Connecting..."
                            : partner
                              ? `with ${partner.userName}`
                              : "Waiting for friend"}
                    </span>

                    <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                            isConnected ? "bg-emerald-400" : "bg-amber-300 animate-pulse"
                        }`}
                    />
                </div>

                <button
                    onClick={() => copy("link")}
                    title="Copy invite link"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                    {copied === "link" ? (
                        <Check size={16} className="text-emerald-300" />
                    ) : (
                        <Link2 size={16} />
                    )}
                </button>
            </div>
        </header>
    );
}

export default RoomHeader;
