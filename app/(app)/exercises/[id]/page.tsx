"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Dumbbell, LineChart, ListOrdered, Repeat, Target } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = params.id as Id<"exercises">;
  const exercise = useQuery(api.exercises.getExerciseDetail, { exerciseId });

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/progress"))}
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );

  if (exercise === undefined) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  if (exercise === null) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {back}
        <div className="card text-center py-16">
          <p className="text-muted-foreground">Exercise not found</p>
        </div>
      </div>
    );
  }

  const instructions = exercise.instructions ?? [];
  const primary = exercise.primaryMuscles ?? [];
  const secondary = exercise.secondaryMuscles ?? [];
  const hasDetails =
    instructions.length > 0 || primary.length > 0 || exercise.alternatives.length > 0;

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      <div>
        {back}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">{exercise.name}</h1>
        <div className="flex flex-wrap gap-2 mt-2 text-sm">
          {exercise.muscleGroup && (
            <span className="px-2 py-0.5 rounded-md bg-primary-muted text-primary">
              {exercise.muscleGroup}
            </span>
          )}
          {exercise.equipment && (
            <span className="px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
              {exercise.equipment}
            </span>
          )}
          {!exercise.isGlobal && (
            <span className="px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
              Custom
            </span>
          )}
        </div>
      </div>

      {exercise.gifUrl && (
        <div className="rounded-xl border border-border overflow-hidden bg-[#EEF1F8] flex justify-center">
          <Image
            src={exercise.gifUrl}
            alt={`Animated demo: ${exercise.name}`}
            width={360}
            height={240}
            unoptimized
            className="w-full max-w-md h-auto block"
          />
        </div>
      )}

      {!hasDetails && (
        <div className="card text-center py-10">
          <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No library details for this exercise yet.</p>
        </div>
      )}

      {instructions.length > 0 && (
        <section className="card">
          <h2 className="flex items-center gap-2 font-semibold mb-3">
            <ListOrdered className="w-5 h-5 text-primary" />
            How to do it
          </h2>
          <ol className="space-y-2 list-decimal list-inside text-sm leading-relaxed">
            {instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {(primary.length > 0 || secondary.length > 0) && (
        <section className="card">
          <h2 className="flex items-center gap-2 font-semibold mb-3">
            <Target className="w-5 h-5 text-primary" />
            Muscles worked
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Primary</p>
              <div className="flex flex-wrap gap-2">
                {primary.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-md bg-primary-muted text-primary">
                    {m}
                  </span>
                ))}
              </div>
            </div>
            {secondary.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Secondary</p>
                <div className="flex flex-wrap gap-2">
                  {secondary.map((m) => (
                    <span key={m} className="px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {exercise.alternatives.length > 0 && (
        <section className="card">
          <h2 className="flex items-center gap-2 font-semibold mb-3">
            <Repeat className="w-5 h-5 text-primary" />
            Alternatives
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {exercise.alternatives.map((alt) => (
              <li key={alt.name}>
                {alt.exerciseId ? (
                  <Link
                    href={`/exercises/${alt.exerciseId}`}
                    className="inline-block px-3 py-1.5 rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {alt.name}
                  </Link>
                ) : (
                  <span className="inline-block px-3 py-1.5 rounded-lg border border-border text-muted-foreground">
                    {alt.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/progress/${exercise._id}`} className="btn btn-secondary text-sm w-fit">
        <LineChart className="w-4 h-4" />
        View my progress
      </Link>
    </div>
  );
}
