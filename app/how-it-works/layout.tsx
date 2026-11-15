import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - GymForge",
  description:
    "Learn how GymForge helps you create AI-powered workout plans, track every set and rep, log nutrition with AI food scanning, and visualize your progress with charts.",
  openGraph: {
    title: "How It Works - GymForge",
    description:
      "Learn how GymForge helps you create AI-powered workout plans, track every set and rep, log nutrition with AI food scanning, and visualize your progress with charts.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works - GymForge",
    description:
      "Learn how GymForge helps you create AI-powered workout plans, track every set and rep, log nutrition with AI food scanning, and visualize your progress with charts.",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
