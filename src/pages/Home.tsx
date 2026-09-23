import { ArrowRight, Headphones, Sparkles, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
function Home() {
    const navigate = useNavigate();
  return (
    <main className="min-h-screen overflow-hidden bg-[#08080c] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[10%] top-[10%] h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[20%] h-96 w-96 rounded-full bg-cyan-400/10 blur-[140px]" />
        <div className="absolute bottom-[5%] left-[40%] h-80 w-80 rounded-full bg-violet-500/10 blur-[130px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <Headphones size={18} />
          </div>

          <span className="text-xl font-semibold tracking-tight">
            Nexa
          </span>
        </div>

        <button className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/80 backdrop-blur-md transition hover:bg-white/10">
          About
        </button>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-7xl items-center px-6 pb-20 pt-10 lg:px-10">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          
          {/* Left */}
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 backdrop-blur-md">
              <Sparkles size={15} />
              Music feels better together
            </div>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Your music.
              <br />
              <span className="text-white/40">
                Their vibe.
              </span>
              <br />
              One moment.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-white/50">
              Create a room, invite someone you love, and listen to the
              same song together — even when you're miles apart.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-wrap gap-4">
     <button
  onClick={() => navigate("/create")}
  className="group flex items-center gap-3 rounded-full bg-white px-7 py-3.5 font-medium text-black transition hover:scale-[1.02]"
>
  Create a room

  <ArrowRight
    size={18}
    className="transition-transform group-hover:translate-x-1"
  />
</button>

              <button
  onClick={() => navigate("/join")}
  className="rounded-full border border-white/10 bg-white/5 px-7 py-3.5 font-medium text-white/80 backdrop-blur-md transition hover:bg-white/10"
>
  Join a room
</button>
            </div>

            {/* Small stats */}
            <div className="mt-12 flex items-center gap-8 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>Listen together</span>
              </div>

              <div className="flex items-center gap-2">
                <Headphones size={16} />
                <span>Real-time sync</span>
              </div>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square max-w-[500px]">
              
              {/* Outer glow */}
              <div className="absolute inset-10 rounded-full bg-fuchsia-500/10 blur-[80px]" />

              {/* Main card */}
              <div className="absolute inset-12 rounded-[40px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
                
                {/* Album */}
                <div className="relative aspect-square overflow-hidden rounded-[28px] bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400">
                  <div className="absolute inset-0 bg-black/10" />

                  <div className="absolute bottom-6 left-6">
                    <p className="text-sm text-white/70">
                      NOW PLAYING
                    </p>

                    <h3 className="mt-1 text-2xl font-semibold">
                      Midnight Drive
                    </h3>

                    <p className="mt-1 text-sm text-white/70">
                      Nexa Session
                    </p>
                  </div>
                </div>

                {/* Player */}
                <div className="px-2 pt-5">
                  <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[58%] rounded-full bg-white" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Midnight Drive
                      </p>

                      <p className="text-xs text-white/40">
                        Nexa Session
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                      ▶
                    </div>
                  </div>
                </div>
              </div>

              {/* Friend indicator */}
              <div className="absolute -right-2 top-24 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#15151c]/80 px-4 py-3 shadow-xl backdrop-blur-xl">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 text-sm font-semibold text-black">
                  A
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Akansha is listening
                  </p>

                  <p className="text-xs text-white/40">
                    In sync · 00:42
                  </p>
                </div>
              </div>

              {/* Sync indicator */}
              <div className="absolute -bottom-2 -left-4 rounded-2xl border border-white/10 bg-[#15151c]/80 px-4 py-3 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="h-3 w-1 rounded-full bg-white/80" />
                    <span className="h-5 w-1 rounded-full bg-white" />
                    <span className="h-4 w-1 rounded-full bg-white/60" />
                    <span className="h-2 w-1 rounded-full bg-white/40" />
                  </div>

                  <span className="text-sm text-white/70">
                    Perfectly synced
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;