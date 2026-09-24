/*
 * Soft purple / blue glow behind every page. Radial gradients are used
 * instead of large blur() filters, which are slow on phones.
 */
function PageBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
            {/* top-left magenta */}
            <div className="absolute -left-[12%] top-[5%] h-[480px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(168,40,200,0.5),transparent)]" />
            {/* top-right blue */}
            <div className="absolute -right-[8%] -top-[18%] h-[520px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(40,50,200,0.6),transparent)]" />
            {/* bottom-left violet/blue */}
            <div className="absolute -bottom-[25%] -left-[10%] h-[520px] w-[760px] rounded-full bg-[radial-gradient(closest-side,rgba(60,70,210,0.5),transparent)]" />
            {/* bottom-left magenta */}
            <div className="absolute -bottom-[30%] left-[5%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(170,40,190,0.45),transparent)]" />
            {/* bottom-center violet wave */}
            <div className="absolute -bottom-[22%] left-[30%] h-[460px] w-[900px] -rotate-6 rounded-[50%] bg-[radial-gradient(closest-side,rgba(110,50,230,0.5),transparent)]" />
            {/* bottom-right blue */}
            <div className="absolute -bottom-[25%] -right-[10%] h-[440px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(50,60,210,0.5),transparent)]" />
        </div>
    );
}

export default PageBackground;
