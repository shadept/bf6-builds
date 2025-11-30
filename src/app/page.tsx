import { WeaponList } from "@/bf6-ui/components/weapon-list";
import { Heading } from "@/bf6-ui/primitives/typography/Heading";
import { AlertTriangle } from "lucide-react";
import fs from "node:fs/promises";
import path from "node:path";
import { TierListResponseSchema } from "@/lib/schemas";

async function getStaticTierList() {
  try {
    const filePath = path.join(process.cwd(), "data", "tierlist.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(fileContent);
    // Validate with schema to ensure type safety
    const parsed = TierListResponseSchema.safeParse(data);
    if (parsed.success) {
      return parsed.data;
    }
    console.error("Static tierlist validation failed:", parsed.error);
    return null;
  } catch (error) {
    console.error("Failed to load static tierlist:", error);
    return null;
  }
}

export default async function Home() {
  const tierList = await getStaticTierList();

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
        <Heading
          level={1}
          className="tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-bf-blue to-white"
        >
          BF6 UPGRADES
        </Heading>
        <p className="text-slate-400 text-lg max-w-2xl">
          Tactical weapon analysis and upgrade recommendations.
          Select a weapon to view the optimal loadout path.
        </p>
      </header>

      <WeaponList data={tierList} />
    </main>
  );
}
