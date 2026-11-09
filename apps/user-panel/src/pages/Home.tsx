import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { theme } from "antd";
import { brand, toast, useAppSelector } from "@repo/shared";
import { ArrowRight, Check, FileUp, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { InstantApiCard, type Target } from "../components/InstantApiCard";
import JumpBackIn from "../components/JumpBackIn";

interface Stat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: LucideIcon;
}

/** Hardcoded for now, replace with real data later. */
// const STATS: Stat[] = [
//   { label: "Total Collaborators", value: "20", delta: "+12", up: true, icon: Users },
//   { label: "Active projects", value: "342", delta: "+5%", up: true, icon: FolderOpenDot },
//   { label: "Active APIs", value: "78", delta: "-2", up: true, icon: ShieldCheck },
//   { label: "Changes today", value: "57", delta: "-3%", up: false, icon: ScrollText },
// ];

const METHODS: [string, string][] = [
  ["GET", "text-sky-600 bg-sky-500/10 dark:text-sky-400"],
  ["POST", "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"],
  ["PUT", "text-amber-600 bg-amber-500/10 dark:text-amber-400"],
  ["PATCH", "text-violet-600 bg-violet-500/10 dark:text-violet-400"],
  ["DELETE", "text-rose-600 bg-rose-500/10 dark:text-rose-400"],
];

/** Translucent version of any css color. */
const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export default function Home() {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const user = useAppSelector((s) => s.auth.user); // can be null for a moment after a refresh
  const isAuthed = !!accessToken;

  const navigate = useNavigate();
  const { token } = theme.useToken();
  const accent = token.colorPrimary;
  const gradient = `linear-gradient(90deg, ${brand.primary}, ${brand.primary} 45%, ${token.colorInfo})`;

  const [target, setTarget] = useState<Target>({});
  useEffect(() => {
    if (!isAuthed) setTarget({}); // forget the selection on logout
  }, [isAuthed]);

  const buildFromScratch = () => {
    if (!isAuthed) {
      navigate("/login");
      return;
    }
    const { project, collection } = target;
    if (!project || !collection) {
      toast.warning("Select a project and collection", {
        description: "You must select a project and collection before creating an API.",
      });
      return;
    }
    navigate(`/projects/${project.id}/collections/${collection.id}/apis`);
  };

  const path = [target.workspace?.name, target.project?.name, target.collection?.name].filter(Boolean).join(" / ");

  return (
    <div className="mx-auto max-w-screen-xl space-y-12">
      <section className="relative isolate p-5 pb-4 pt-10 text-center md:pt-14">
        {/* ring + glow backdrop, uses theme tokens so it matches the rest of the app */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 size-[65rem] -translate-x-1/2 -translate-y-[26rem] rounded-full border border-line"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${alpha(token.colorInfo, 10)}, transparent 62%)`,
              maskImage: "linear-gradient(#000 45%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(#000 45%, transparent 95%)",
            }}
          />
        </div>

        <div className="mx-auto mt-20 inline-flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.25em] text-muted">
          <span className="size-2.5 rounded-full" style={{ background: accent }} />
          {isAuthed ? `Welcome back${user ? `, ${user.firstname}` : ""}` : "Zero configuration"}
        </div>

        <h1 className="mx-auto mt- max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-content sm:text-5xl md:text-6xl">
          One click.{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradient, WebkitTextFillColor: "transparent" }}>
            Instant CRUD API.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted md:text-xl">
          A working API in under two minutes, or design every endpoint yourself.
        </p>

        <div className="mx-auto mt-10 max-w-4xl">
          <InstantApiCard isAuthed={isAuthed} onChange={setTarget} />

          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
            {["5 CRUD endpoints", "25 records of sample data", "Live in seconds"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4" style={{ color: accent }} /> {t}
              </li>
            ))}
          </ul>
        </div>

        {isAuthed &&
          <div className="mx-auto mt-10 max-w-4xl">
            <JumpBackIn />
          </div>
        }

        {/* other ways */}
        <div className="mx-auto mt-10 flex max-w-4xl items-center gap-6">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Or start another way</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mx-auto mt-6 grid max-w-4xl gap-4 text-left md:grid-cols-2">
          <button
            type="button"
            onClick={buildFromScratch}
            className="group flex flex-col gap-4 rounded-2xl border border-line p-5 transition hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ background: alpha(token.colorBgContainer, 70) }}
          >
            <span className="flex w-full items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl border border-line bg-content/5" style={{ color: token.colorInfo }}>
                <SlidersHorizontal className="size-5" />
              </span>
              <span className="flex-1 text-lg font-semibold text-content">Build from scratch</span>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-0.5" />
            </span>
            <span className="text-sm text-muted">An empty collection. Add endpoints with any method, then define the request, the response, schemas and rules.</span>
            <span className="flex flex-wrap gap-2">
              {METHODS.map(([m, cls]) => (
                <span key={m} className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold ${cls}`}>{m}</span>
              ))}
            </span>
          </button>

          <div aria-disabled className="flex flex-col gap-4 rounded-2xl border border-line p-5 opacity-70" style={{ background: alpha(token.colorBgContainer, 70) }}>
            <span className="flex w-full items-center gap-4">
              <span className="grid size-11 place-items-center rounded-xl border border-line bg-content/5" style={{ color: accent }}>
                <FileUp className="size-5" />
              </span>
              <span className="flex-1 text-lg font-semibold text-content">Import OpenAPI or Swagger</span>
            </span>
            <span className="flex flex-wrap gap-2 text-sm text-content">
              <span className="rounded-full border border-line bg-content/5 px-3 py-1">OpenAPI 3.0 · 3.1</span>
              <span className="rounded-full border border-line bg-content/5 px-3 py-1">Swagger 2.0</span>
            </span>
            <span className="flex items-center justify-between rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
              Drop a .yaml or .json file, or paste a URL
              <span className="font-semibold" style={{ color: token.colorInfo }}>Coming soon</span>
            </span>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-4xl text-center text-sm text-muted">
          {path ? (
            <>
              Everything creates into <strong className="font-semibold text-content">{path}</strong>. You can move things later.
            </>
          ) : (
            "Pick where to create above, or sign in to get started."
          )}
        </p>
      </section>
      {/* 
      {isAuthed && (
        <section className="space-y-3 pb-8">
          <h2 className="text-sm font-medium text-muted">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => {
              const Icon = s.icon;
              const Trend = s.up ? TrendingUp : TrendingDown;
              return (
                <div key={s.label} className="rounded-2xl border border-line p-4 transition hover:-translate-y-0.5 hover:bg-primary/5 md:p-5" style={{ background: alpha(token.colorBgContainer, 60) }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">{s.label}</span>
                    <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: token.colorPrimaryBg, color: accent }}>
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-3xl font-semibold tracking-tight text-content">{s.value}</span>
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: s.up ? token.colorSuccess : token.colorError }}>
                      <Trend className="size-3.5" />
                      {s.delta}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )} */}

      <p className="pb-6 text-center text-sm text-muted">Free during early access · Desktop browsers</p>
    </div>
  );
}