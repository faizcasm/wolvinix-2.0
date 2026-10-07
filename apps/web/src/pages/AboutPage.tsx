import { Link, useNavigate } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Flag,
  Gamepad2,
  MessageSquare,
  Newspaper,
  Quote,
  Rocket,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Emblem3D from "@/components/three/Emblem3D";
import { ParticleField } from "@/components/three/ParticleField";
import { BrandMark } from "@/components/layout/Navigation";
import { Avatar, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/* --------------------------------- Data ---------------------------------- */

const features = [
  {
    icon: Newspaper,
    title: "Feed",
    copy: "Clips, builds and hot takes in one stream — no algorithm deciding what your friends see.",
  },
  {
    icon: Users,
    title: "Clans",
    copy: "Recruit a roster, set a motto and run your clan with leader-only tools.",
  },
  {
    icon: MessageSquare,
    title: "Live chat",
    copy: "Real-time conversations with presence, typing indicators and read receipts.",
  },
  {
    icon: Gamepad2,
    title: "Game stats",
    copy: "Log your in-game name, score and level for every title you play.",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    copy: "Ranked ladders across the whole network, with your own row highlighted.",
  },
  {
    icon: Clapperboard,
    title: "Stories",
    copy: "24-hour moments from your sessions, seen by the people who follow you.",
  },
];

type Status = "shipped" | "progress" | "next";

const roadmap: Array<{ phase: string; title: string; copy: string; status: Status }> = [
  {
    phase: "Phase 01",
    title: "Feed, profiles & follows",
    copy: "The foundation: posting, media, follows, bookmarks and hashtags.",
    status: "shipped",
  },
  {
    phase: "Phase 02",
    title: "Clans, chat & stories",
    copy: "Communities with ranks, realtime messaging and ephemeral stories.",
    status: "shipped",
  },
  {
    phase: "Phase 03",
    title: "Game stats & leaderboards",
    copy: "Per-game records feeding global rankings and season recaps.",
    status: "progress",
  },
  {
    phase: "Phase 04",
    title: "Tournaments & public API",
    copy: "Community-run brackets plus an API so your tools can plug in.",
    status: "next",
  },
];

const statusTone: Record<Status, { label: string; tone: "lime" | "accent" | "neutral" }> = {
  shipped: { label: "Shipped", tone: "lime" },
  progress: { label: "In progress", tone: "accent" },
  next: { label: "Next up", tone: "neutral" },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 240, damping: 26 } },
};

/* --------------------------------- Page ----------------------------------- */

export default function AboutPage() {
  const navigate = useNavigate();
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-background min-h-dvh">
        {/* Nav */}
        <header className="border-border glass sticky top-0 z-40 border-b">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark className="h-8 w-8" />
              <span className="font-display text-lg font-bold">
                wolvinix<span className="text-accent">.</span>
              </span>
            </Link>
            <nav className="text-muted ml-auto hidden items-center gap-6 text-sm sm:flex">
              <a href="#mission" className="hover:text-foreground transition-colors">
                Mission
              </a>
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#roadmap" className="hover:text-foreground transition-colors">
                Roadmap
              </a>
              <a href="#contact" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </nav>
            <Button
              size="sm"
              variant="gradient"
              className="ml-auto sm:ml-4"
              onClick={() => navigate("/auth")}
            >
              Get started
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 py-14 sm:px-6 lg:py-24">
          <ParticleField className="absolute inset-0 -z-10" density={60} />
          <div
            aria-hidden="true"
            className="from-brand-500/15 absolute inset-x-0 top-0 -z-20 h-80 bg-gradient-to-b to-transparent"
          />

          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
            >
              <Emblem3D className="mx-auto h-52 w-full max-w-lg sm:h-64" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 220, damping: 26 }}
              className="font-display text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl"
            >
              Where gamers <span className="text-gradient">become a pack</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="text-muted mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
            >
              Wolvinix is the social network built around what players actually do — squad up, share
              the session, track the numbers and settle the score.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => navigate("/auth")}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Join the pack
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => scrollTo("features")}
              >
                What's inside
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section id="mission" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="card relative overflow-hidden p-6 sm:p-10"
          >
            <Quote
              className="text-brand-500/10 absolute -top-4 -right-4 h-28 w-28"
              aria-hidden="true"
            />
            <motion.p
              variants={rise}
              className="text-accent text-xs font-semibold tracking-widest uppercase"
            >
              Our mission
            </motion.p>
            <motion.h2
              variants={rise}
              className="font-display mt-3 text-2xl leading-snug font-bold sm:text-3xl"
            >
              Give every player one home for their whole gaming life.
            </motion.h2>
            <motion.p
              variants={rise}
              className="text-muted mt-4 max-w-3xl text-sm leading-relaxed sm:text-base"
            >
              Gamers live across a dozen apps: clips in one, squads in another, stats in a
              spreadsheet nobody reads. Wolvinix pulls it together into a single identity — a
              profile that carries your clans, records and reputation wherever you play. No
              engagement traps, no noise: just the people you game with and proof of the hours you
              put in.
            </motion.p>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={rise} className="max-w-2xl">
              <p className="text-accent text-xs font-semibold tracking-widest uppercase">
                What's inside
              </p>
              <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl">
                Six tools, one account
              </h2>
              <p className="text-muted mt-2 text-sm sm:text-base">
                Everything below ships today — no waitlist, no paid tier hiding the good parts.
              </p>
            </motion.div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    variants={rise}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="card relative overflow-hidden p-5 transition-shadow hover:shadow-lg"
                  >
                    <span className="from-brand-500/25 to-accent/20 text-brand-500 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-display mt-4 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-muted mt-1.5 text-sm leading-relaxed">{feature.copy}</p>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={rise} className="max-w-2xl">
              <p className="text-accent text-xs font-semibold tracking-widest uppercase">Roadmap</p>
              <h2 className="font-display mt-3 text-2xl font-bold sm:text-3xl">
                Where the pack is heading
              </h2>
            </motion.div>

            <ol className="border-border relative mt-8 space-y-6 border-l pl-6 sm:pl-8">
              {roadmap.map((entry) => {
                const tone = statusTone[entry.status];
                return (
                  <motion.li key={entry.phase} variants={rise} className="relative">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ring-background absolute top-1.5 -left-[34px] flex h-4 w-4 items-center justify-center rounded-full ring-4 sm:-left-[42px]",
                        entry.status === "shipped"
                          ? "bg-lime"
                          : entry.status === "progress"
                            ? "bg-accent"
                            : "bg-surface-3",
                      )}
                    />
                    <div className="card p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-subtle text-xs font-semibold tracking-wider uppercase">
                          {entry.phase}
                        </span>
                        <Badge tone={tone.tone}>{tone.label}</Badge>
                      </div>
                      <h3 className="font-display mt-1.5 text-base font-semibold sm:text-lg">
                        {entry.title}
                      </h3>
                      <p className="text-muted mt-1 text-sm leading-relaxed">{entry.copy}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        </section>

        {/* Founder */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="card grid gap-6 p-6 sm:p-10 lg:grid-cols-[auto_1fr] lg:items-center"
          >
            <div className="relative mx-auto lg:mx-0">
              <span
                aria-hidden="true"
                className="from-brand-500 via-accent to-lime absolute -inset-2 rounded-full bg-gradient-to-br opacity-60 blur-[3px]"
              />
              <Avatar name="Faizan Hameed" size="2xl" className="relative" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold">Faizan Hameed</h2>
                <Badge tone="brand">Founder</Badge>
              </div>
              <p className="text-subtle mt-1 text-sm">Building Wolvinix, one patch at a time</p>

              <p className="text-muted mt-4 text-sm leading-relaxed sm:text-base">
                Wolvinix started as a simple frustration: every game has a profile, a rank and a
                record, but none of them talk to each other — and none of them show the people you
                actually play with. Faizan set out to build the profile he wanted for himself: one
                identity that carries your clan, your clips and your stats across every title you
                touch.
              </p>
              <p className="text-muted mt-3 text-sm leading-relaxed sm:text-base">
                He writes the product, the API and most of the pixels, and reads every piece of
                feedback that lands. If something feels off in your pack, it's likely already on his
                desk.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Sparkles className="text-warning h-4 w-4 self-center" aria-hidden="true" />
                <span className="text-subtle text-xs">
                  Product · Design · Engineering — all in one seat for now.
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA / contact */}
        <section id="contact" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="border-gradient rounded-2xl p-6 text-center sm:p-10"
          >
            <Flag className="text-lime mx-auto h-8 w-8" aria-hidden="true" />
            <h2 className="font-display mt-4 text-2xl font-bold sm:text-3xl">
              Your pack is one click away
            </h2>
            <p className="text-muted mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
              Create an account, claim your handle and bring your crew. Questions or feedback? Reach
              the team at{" "}
              <a
                href="mailto:hello@wolvinix.app"
                className="text-accent hover:text-brand-500 font-medium transition-colors"
              >
                hello@wolvinix.app
              </a>{" "}
              — we read everything.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => navigate("/auth")}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              >
                Create your account
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => navigate("/auth?mode=login")}
              >
                I already have one
              </Button>
            </div>

            <div className="text-subtle mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Check className="text-lime h-3.5 w-3.5" aria-hidden="true" />
                Free forever
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Rocket className="text-accent h-3.5 w-3.5" aria-hidden="true" />
                New features every month
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flag className="text-brand-500 h-3.5 w-3.5" aria-hidden="true" />
                Built by gamers, for gamers
              </span>
            </div>
          </motion.div>
        </section>

        <footer className="border-border border-t px-4 py-8 sm:px-6">
          <div className="text-subtle mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs sm:flex-row">
            <span className="inline-flex items-center gap-2">
              <BrandMark className="h-6 w-6" />
              Wolvinix 2.0
            </span>
            <span>© {new Date().getFullYear()} Wolvinix. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
