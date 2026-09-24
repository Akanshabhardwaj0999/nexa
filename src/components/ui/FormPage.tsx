import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import Brand from "./Brand";
import PageBackground from "./PageBackground";

/* Shared look for the create, join and name-prompt screens. */

interface FormPageProps {
    icon: ReactNode;
    eyebrow: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
    footer?: ReactNode;
    showBack?: boolean;
}

function FormPage({
    icon,
    eyebrow,
    title,
    description,
    children,
    footer,
    showBack = true,
}: FormPageProps) {
    const navigate = useNavigate();

    return (
        <main className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#06050c] text-white">
            <PageBackground />

            <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-5 sm:px-6 lg:px-12 lg:py-7">
                <Brand onClick={() => navigate("/")} />

                {showBack && (
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] py-2 pl-3 pr-4 text-sm text-white/70 backdrop-blur-md transition hover:border-white/30 hover:text-white"
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>
                )}
            </header>

            {/* On phones the form sits near the top so the keyboard doesn't cover it. */}
            <div className="relative z-10 flex flex-1 justify-center px-5 pb-12 pt-6 sm:items-center sm:pb-20 sm:pt-0">
                <div className="w-full max-w-md">
                    <div className="mb-6 flex justify-center sm:mb-7">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-500/10 text-violet-200 shadow-[0_0_40px_rgba(139,92,246,0.25)] sm:h-16 sm:w-16">
                            {icon}
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-200/60">
                            {eyebrow}
                        </div>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {title}
                        </h1>

                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/50 sm:text-base">
                            {description}
                        </p>
                    </div>

                    <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mt-10 sm:p-6">
                        {children}
                    </div>

                    {footer && <div className="mt-6 text-center">{footer}</div>}
                </div>
            </div>
        </main>
    );
}

export default FormPage;
