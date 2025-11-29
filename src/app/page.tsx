import { getTierList } from "@/lib/api";
import { WeaponList } from "@/components/weapon-list";
import { AlertTriangle } from "lucide-react";

export default async function Home() {
  const tierList = await getTierList();

  if (!tierList) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 gap-2">
        <AlertTriangle />
        <span>Failed to load weapon data. Please try again later.</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12 space-y-4">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-bf-blue to-white font-display">
          BF6 UPGRADES
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Tactical weapon analysis and upgrade recommendations.
          Select a weapon to view the optimal loadout path.
        </p>
      </header>

      <WeaponList data={tierList.data} />
    </main>
  );
}
