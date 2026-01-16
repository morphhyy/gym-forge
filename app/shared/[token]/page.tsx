"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useState } from "react";
import {
  Dumbbell,
  Calendar,
  Copy,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { getDayName } from "@/app/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SharedPlanPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { isSignedIn, isLoaded } = useAuth();
  const [isCopying, setIsCopying] = useState(false);

  const sharedPlan = useQuery(api.plans.getSharedPlan, { shareToken: token });
  const copyPlan = useMutation(api.plans.copySharedPlan);

  const handleCopyPlan = async () => {
    if (!isSignedIn) return;

    setIsCopying(true);
    try {
      await copyPlan({ shareToken: token });
      toast.success("Plan copied to your account!");
      router.push("/plan");
    } catch (error) {
      toast.error("Failed to copy plan");
    } finally {
      setIsCopying(false);
    }
  };

  // Loading state
  if (sharedPlan === undefined || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Plan not found
  if (sharedPlan === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Plan Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This shared plan may have been removed or the link is invalid.
            </p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Plan Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-primary text-sm mb-2">
              <Calendar className="w-4 h-4" />
              Shared Workout Plan
            </div>
            <h1 className="text-3xl font-bold mb-2">{sharedPlan.name}</h1>
            <p className="text-muted-foreground">
              Created {new Date(sharedPlan.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Copy to Account CTA */}
          <div className="card bg-primary/5 border-primary/20 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-semibold mb-1">Want to use this plan?</h2>
                <p className="text-sm text-muted-foreground">
                  Copy it to your account to track your workouts
                </p>
              </div>
              {isSignedIn ? (
                <Button onClick={handleCopyPlan} disabled={isCopying}>
                  {isCopying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy to My Plans
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <SignInButton mode="modal">
                    <Button variant="secondary">Sign In</Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button>
                      Sign Up
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>

          {/* Plan Days Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {sharedPlan.days.map((day) => (
              <div
                key={day.weekday}
                className={`card ${day.exercises.length === 0 ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{getDayName(day.weekday)}</h3>
                    {day.name && (
                      <p className="text-sm text-primary">{day.name}</p>
                    )}
                  </div>
                  <span className="badge badge-secondary">
                    {day.exercises.length} exercise
                    {day.exercises.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {day.exercises.length > 0 ? (
                  <div className="space-y-2">
                    {day.exercises.map((exercise, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                      >
                        <span className="text-sm">
                          {exercise.exercise?.name ?? "Unknown Exercise"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {exercise.sets.length}x{exercise.sets[0]?.repsTarget}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Rest Day</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <nav className="flex items-center justify-between px-6 py-5 border-b border-border">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <Dumbbell className="w-6 h-6 text-background" />
        </div>
        <span className="text-xl font-bold tracking-tight">GymForge</span>
      </Link>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-6 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Shared via GymForge</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Create your own plan
        </Link>
      </div>
    </footer>
  );
}
