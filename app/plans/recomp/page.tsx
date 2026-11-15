import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Repeat,
  Timer,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { DumbbellIcon } from "@/app/components/dumbbell-icon";
import {
  PLAN_PDF_FILENAME,
  PLAN_PDF_URL,
  deskFixes,
  exerciseGifSrc,
  keyRules,
  kitchenRules,
  mealPlan,
  nutrition,
  progression,
  split,
  swaps,
  whyThisSplit,
  workouts,
  type DayKind,
  type Exercise,
  type MealPlanDay,
  type Workout,
} from "./data";

const description =
  "A free 5-day push/pull/legs + upper/lower recomp plan with animated exercise demos, calorie and macro targets, and a 7-day Nepali meal plan. Built for going from ~80 kg to 72 kg while building muscle.";

export const metadata: Metadata = {
  title: "Free 5-Day Recomp Plan - GymForge",
  description,
  openGraph: { title: "Free 5-Day Recomp Plan - GymForge", description, type: "article" },
  twitter: { card: "summary", title: "Free 5-Day Recomp Plan - GymForge", description },
};

const pill = "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full";

const kindStyle: Record<DayKind, { tile: string; badge: string; label: string }> = {
  pump: { tile: "border-primary/40 bg-primary-muted", badge: "bg-primary-muted text-primary", label: "Pump" },
  heavy: { tile: "border-amber-500/40 bg-amber-500/10", badge: "bg-amber-500/15 text-amber-400", label: "Heavy" },
  rest: { tile: "border-border bg-card", badge: "bg-muted text-muted-foreground", label: "Rest" },
};

function PdfButton({ className = "" }: { className?: string }) {
  return (
    <a href={PLAN_PDF_URL} download={PLAN_PDF_FILENAME} className={`btn btn-secondary ${className}`}>
      <Download className="w-4 h-4" />
      Download PDF
    </a>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">{eyebrow}</div>
      <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
      {children ? <p className="text-muted-foreground mt-3 max-w-2xl">{children}</p> : null}
    </div>
  );
}

function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="relative bg-[#EEF1F8]">
        <Image
          src={exerciseGifSrc(exercise.gif)}
          alt={`Animated demo: ${exercise.name}`}
          width={360}
          height={240}
          unoptimized
          className="w-full h-auto block"
        />
        <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-[#0B2A6F] text-white text-xs font-bold flex items-center justify-center">
          {index}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h4 className="font-semibold leading-snug">
          {exercise.name}
          {exercise.alt ? <span className="text-muted-foreground font-normal"> {exercise.alt}</span> : null}
        </h4>
        <div className="flex items-center justify-between text-sm">
          <span className="font-mono font-semibold text-primary">{exercise.sets}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Timer className="w-3.5 h-3.5" />
            rest {exercise.rest}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{exercise.cue}</p>
      </div>
    </article>
  );
}

function WorkoutBlock({ workout, day }: { workout: Workout; day: number }) {
  const style = kindStyle[workout.kind];
  return (
    <div id={workout.id} className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h3 className="text-xl sm:text-2xl font-bold">
          Day {day} · {workout.title}
        </h3>
        <span className={`${pill} ${style.badge}`}>{workout.weekday}</span>
        <span className={`${pill} ${style.badge}`}>{style.label}</span>
      </div>
      <p className="text-muted-foreground mb-5">{workout.summary}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workout.exercises.map((exercise, i) => (
          <ExerciseCard key={exercise.gif} exercise={exercise} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function MealDayCard({ day }: { day: MealPlanDay }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{day.day}</h4>
          <span className={`${pill} ${day.training ? "bg-primary-muted text-primary" : "bg-muted text-muted-foreground"}`}>
            {day.tag}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          ~{day.kcal.toLocaleString("en-US")} kcal · <span className="text-primary font-medium">~{day.protein} g protein</span>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {day.entries.map((entry, i) =>
          entry.type === "train" ? (
            <li
              key={`train-${i}`}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-center text-primary bg-primary-muted"
            >
              Train · 60 min · drink 500–750 ml water
            </li>
          ) : (
            <li key={`${entry.meal}-${i}`} className="px-4 py-3 grid grid-cols-[4.5rem_1fr] sm:grid-cols-[6.5rem_1fr_auto] gap-x-3 gap-y-1">
              <div className="text-sm">
                <div className="font-semibold">{entry.meal}</div>
                <div className="text-xs text-muted-foreground font-mono">{entry.time}</div>
              </div>
              <div className="text-sm">{entry.food}</div>
              <div className="col-start-2 sm:col-start-3 text-xs sm:text-sm text-muted-foreground sm:text-right whitespace-nowrap">
                {entry.kcal} kcal · <span className="text-foreground">{entry.protein} g P</span>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export default function RecompPlanPage() {
  const totalExercises = workouts.reduce((n, w) => n + w.exercises.length, 0);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <DumbbellIcon />
            <span className="text-xl font-bold tracking-tight">GymForge</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <a href={PLAN_PDF_URL} download={PLAN_PDF_FILENAME} className="btn btn-ghost">
                <Download className="w-4 h-4" />
                PDF
              </a>
            </span>
            <Link href="/sign-up" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto pt-14 pb-16 sm:pt-20 sm:pb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-muted rounded-full text-primary text-sm font-medium mb-6">
            <Flame className="w-4 h-4" />
            Free plan · no sign-up needed
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            5-Day Recomp Plan
            <span className="block text-primary mt-1">~80 → 72 kg</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            A push / pull / legs + upper / lower split and a 7-day Nepali meal plan, built to lose fat and build
            muscle at the same time. Dal bhat stays on the plate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <a href="#workouts" className="btn btn-primary text-base px-6 py-3">
              See the workouts
              <ArrowRight className="w-5 h-5" />
            </a>
            <PdfButton className="text-base px-6 py-3" />
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              { v: "5×", l: "Gym days / week" },
              { v: nutrition.calories.toLocaleString("en-US"), l: "kcal / day*" },
              { v: `${nutrition.macros[0].grams} g`, l: "Protein / day" },
              { v: "16–19", l: "Weeks to goal" },
            ].map((s) => (
              <div key={s.l} className="card">
                <dd className="text-2xl sm:text-3xl font-bold text-primary">{s.v}</dd>
                <dt className="text-sm text-muted-foreground mt-1">{s.l}</dt>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground mt-3">*Example numbers for an ~80 kg lifter. See nutrition below for your own.</p>
        </div>
      </header>

      {/* Weekly split */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Training split" title="Push · Pull · Legs · Upper · Lower" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {split.map((d) => {
              const style = kindStyle[d.kind];
              const Icon = d.kind === "rest" ? Moon : d.kind === "heavy" ? TrendingUp : Dumbbell;
              const workout = workouts.find((w) => w.title === d.label);
              const tile = (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d.short}</span>
                    <Icon className={`w-4 h-4 ${d.kind === "heavy" ? "text-amber-400" : d.kind === "pump" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="font-bold text-lg">{d.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{d.focus}</div>
                </>
              );
              return workout ? (
                <a key={d.short} href={`#${workout.id}`} className={`rounded-xl border p-4 transition-colors hover:border-primary ${style.tile}`}>
                  {tile}
                </a>
              ) : (
                <div key={d.short} className={`rounded-xl border p-4 ${style.tile}`}>
                  {tile}
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-8">
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Why this split
              </h3>
              <ul className="space-y-2">
                {whyThisSplit.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-primary" /> Cardio &amp; steps
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="text-foreground font-medium">Daily:</span> 8–10k steps. Walk 10 min after each meal.</li>
                <li><span className="text-foreground font-medium">2–3× a week:</span> 20–30 min zone 2 (incline walk or bike), after lifting or on Wednesday.</li>
                <li><span className="text-foreground font-medium">Avoid:</span> hard intervals the day before Legs or Lower.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Workouts */}
      <section id="workouts" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Workouts" title={`5 sessions · ${totalExercises} exercises`}>
            Each exercise has a looping demo of one rep. Light-blue limbs are the far-side arm or leg.
          </SectionHeading>
          <div className="space-y-14">
            {workouts.map((w, i) => (
              <WorkoutBlock key={w.id} workout={w} day={i + 1} />
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" /> Effort &amp; progression
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {progression.map((p) => (
                <div key={p.title} className="card">
                  <div className="font-semibold mb-1">{p.title}</div>
                  <p className="text-sm text-muted-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nutrition */}
      <section id="nutrition" className="scroll-mt-16 py-16 sm:py-20 px-4 sm:px-6 bg-card/50 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Nutrition" title="Daily targets">
            {nutrition.pace}
          </SectionHeading>

          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
            <div className="card">
              <div className="text-sm text-muted-foreground">Example for an ~80 kg lifter</div>
              <div className="text-4xl font-bold text-primary mt-1">
                {nutrition.calories.toLocaleString("en-US")} <span className="text-lg text-muted-foreground font-medium">kcal / day</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Maintenance ≈ {nutrition.maintenance.toLocaleString("en-US")} kcal
              </div>
              <div className="mt-5 space-y-3">
                {nutrition.macros.map((m) => (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-muted-foreground">
                        {m.grams} g · {m.percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${m.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-6 mt-5 text-sm">
                <div>
                  <span className="text-muted-foreground">Fibre</span> <span className="font-medium">{nutrition.fibre}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Water</span> <span className="font-medium">{nutrition.water}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-5 p-3 rounded-lg bg-muted/50">
                <span className="text-foreground font-medium">Your own numbers:</span> {nutrition.formula}
              </p>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-4">The 5 things that decide your result</h3>
              <ol className="space-y-3">
                {keyRules.map((rule, i) => (
                  <li key={rule} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary-muted text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Meal plan */}
      <section id="meals" className="scroll-mt-16 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="7-day meal plan" title="Nepali food, portioned for a cut">
            Times are an example for an afternoon session: “−1 h” and “+30 m” are relative to when you train. Half
            the plate is protein and vegetables, about a quarter is rice.
          </SectionHeading>
          <div className="grid lg:grid-cols-2 gap-4">
            {mealPlan.map((d) => (
              <MealDayCard key={d.day} day={d} />
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-primary" /> Kitchen rules
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {kitchenRules.map((r) => (
                  <li key={r} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3">Swaps (same protein)</h3>
              <dl className="space-y-2 text-sm">
                {swaps.map((s) => (
                  <div key={s.from} className="grid grid-cols-[6.5rem_1fr] gap-2">
                    <dt className="font-medium">{s.from}</dt>
                    <dd className="text-muted-foreground">{s.to}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Footprints className="w-4 h-4 text-primary" /> If you sit all day
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {deskFixes.map((r) => (
                  <li key={r} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-card/50 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Take the plan to the gym</h2>
          <p className="text-muted-foreground mb-8">
            Grab the 12-page PDF with the shopping list and a 16-week tracker, or build the split in GymForge and log
            every set.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/sign-up" className="btn btn-primary text-base px-6 py-3">
              Track it in GymForge
              <ArrowRight className="w-5 h-5" />
            </Link>
            <PdfButton className="text-base px-6 py-3" />
          </div>
          <p className="text-xs text-muted-foreground mt-8">
            General fitness guidance, not medical advice. Check with a doctor before starting if you have a health
            condition or injury.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <DumbbellIcon />
            <span className="font-semibold">GymForge</span>
          </Link>
          <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} GymForge. Built for lifters.</p>
        </div>
      </footer>
    </div>
  );
}
