import { IntensityScene } from "@/components/IntensityScene";

export default function TurbineTest() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Turbine animation test</h1>
        <p className="text-muted-foreground">
          Dev-only route to visually verify the wind turbine blades spin in place (no orbit).
        </p>
      </section>

      <section aria-label="Scene preview">
        {/* Pick a clean intensity so turbines render */}
        <IntensityScene intensity={80} index="low" />
      </section>
    </main>
  );
}
