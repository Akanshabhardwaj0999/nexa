import { Headphones } from "lucide-react";

interface BrandProps {
    onClick?: () => void;
    // Hide the "Nexa" wordmark on small screens to save room.
    compact?: boolean;
    size?: "md" | "lg";
}

function Brand({ onClick, compact = false, size = "md" }: BrandProps) {
    const large = size === "lg";

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex shrink-0 items-center gap-3"
            aria-label="Nexa home"
        >
            <span
                className={`flex items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.12)] ${
                    large ? "h-11 w-11 lg:h-14 lg:w-14" : "h-10 w-10"
                }`}
            >
                <Headphones size={large ? 24 : 20} strokeWidth={2.4} />
            </span>

            <span
                className={`font-semibold tracking-tight ${
                    large ? "text-2xl lg:text-3xl" : "text-xl"
                } ${compact ? "hidden sm:block" : ""}`}
            >
                Nexa
            </span>
        </button>
    );
}

export default Brand;
