import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Gamepad2, Sparkles, Trophy, Users, Zap } from "lucide-react";
import HeroScene from "@/components/three/HeroScene";
import { BrandMark } from "@/components/layout/Navigation";
import { LoginForm, SignupForm } from "@/features/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

/* ----------------------------- Animated counter ---------------------------- */

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1400;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className="tabular">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ------------------------------ Marketing side ----------------------------- */

const features = [
  {
    icon: Zap,
    title: "A feed that speaks gamer",
    copy: "Clips, screenshots and hot takes — no algorithm soup.",
  },
  { icon: Users, title: "Clans & squads", copy: "Find your people, set a motto, run the roster." },
  {
    icon: Trophy,
    title: "Stats & leaderboards",
    copy: "Track scores per game and climb the ranks.",
  },
  {
    icon: Sparkles,
    title: "Live chat & stories",
    copy: "Talk tactics in real time while you queue.",
  },
];

function MarketingPanel() {
  return (
    <section
      className={cn(
        "relative isolate flex min-h-[58vh] flex-col justify-between overflow-hidden",
        "px-5 py-8 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-12",
      )}
    >
      <HeroScene className="absolute inset-0 -z-20" />
      <div
        aria-hidden="true"
        className="from-background/35 via-background/80 to-background absolute inset-0 -z-10 bg-gradient-to-b"
      />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center gap-2.5"
      >
        <BrandMark className="h-9 w-9" />
        <span className="font-display text-xl font-bold tracking-tight">
          wolvinix<span className="text-accent">.</span>
        </span>
        <span className="border-border bg-surface-2/70 text-muted ml-auto rounded-full border px-3 py-1 text-[11px] font-medium lg:hidden">
          v2.0
        </span>
      </motion.div>

      <div className="relative max-w-xl py-10 lg:py-0">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border-brand-500/30 bg-brand-500/10 text-brand-600 mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
        >
          <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
          The social network for players
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 240, damping: 26 }}
          className="font-display text-4xl leading-[1.05] font-bold sm:text-5xl xl:text-6xl"
        >
          Where gamers <span className="text-gradient">become a pack</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted mt-4 max-w-md text-[15px] leading-relaxed"
        >
          One profile for every game you play — post your best clips, form a clan, track stats and
          settle who really is top of the lobby.
        </motion.p>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.28 } },
          }}
          className="mt-7 grid gap-3 sm:grid-cols-2"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.li
                key={feature.title}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                className="border-border bg-surface/60 flex items-start gap-3 rounded-xl border p-3 backdrop-blur-sm"
              >
                <span className="bg-brand-500/15 text-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{feature.title}</span>
                  <span className="text-muted mt-0.5 block text-xs leading-relaxed">
                    {feature.copy}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="relative"
      >
        <dl className="border-border grid grid-cols-3 gap-3 border-t pt-5">
          {[
            { to: 12400, suffix: "", label: "players in the pack" },
            { to: 860, suffix: "", label: "clans founded" },
            { to: 248, suffix: "K", label: "posts shared" },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-display text-gradient-static text-2xl font-bold sm:text-3xl">
                <Counter to={stat.to} suffix={stat.suffix} />
              </dd>
              <dd className="text-subtle mt-0.5 text-[11px] leading-tight sm:text-xs">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          to="/about"
          className="text-muted hover:text-foreground mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          See how Wolvinix works
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </motion.div>
    </section>
  );
}

/* -------------------------------- Auth side -------------------------------- */

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (next: Mode) => void }) {
  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "login", label: "Sign in" },
    { id: "signup", label: "Create account" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Sign in or create an account"
      className="border-border bg-surface-2 mb-6 flex rounded-xl border p-1"
    >
      {tabs.map((tab) => {
        const active = tab.id === mode;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-subtle hover:text-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId="auth-mode-pill"
                className="bg-surface ring-border absolute inset-0 rounded-lg shadow-sm ring-1"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const changeMode = (next: Mode) => {
    setSearchParams(next === "signup" ? { mode: "signup" } : {}, { replace: true });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-background min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]">
        <MarketingPanel />

        <section
          aria-label="Authentication"
          className="flex items-center justify-center px-4 py-10 sm:px-8 lg:px-10 lg:py-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="w-full max-w-md"
          >
            <div className="glass border-border rounded-2xl border p-5 shadow-lg sm:p-7">
              <ModeToggle mode={mode} onChange={changeMode} />

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {mode === "login" ? <LoginForm /> : <SignupForm />}
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="border-border bg-surface-2/60 mt-4 rounded-xl border border-dashed p-3.5"
            >
              <p className="text-muted text-xs leading-relaxed">
                <span className="text-foreground font-semibold">Demo hint —</span> this build has no
                seeded accounts. Create a real account above (or sign in with one you already made)
                to explore the pack.
              </p>
            </motion.div>

            <p className="text-subtle mt-5 text-center text-xs">
              Curious what we're building?{" "}
              <Link
                to="/about"
                className="text-accent hover:text-brand-500 font-medium transition-colors"
              >
                Read the mission
              </Link>
            </p>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
