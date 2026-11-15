// Vite's import.meta.glob, used to hand convex-test the function modules.
// (vite/client types aren't resolvable from the project root under pnpm.)
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>;
}
