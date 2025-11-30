import { UpgradeGuide } from "@/components/upgrade-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import fs from "node:fs/promises";
import path from "node:path";
import { StaticWeaponDetails, WeaponProgression } from "@/lib/static-types";

interface WeaponPageProps {
    params: Promise<{ id: string }>;
}

async function getStaticWeaponData(id: string) {
    try {
        // Read weapon details
        const detailsPath = path.join(process.cwd(), "data", "weapon-details.json");
        const detailsContent = await fs.readFile(detailsPath, "utf-8");
        const allDetails = JSON.parse(detailsContent) as StaticWeaponDetails[];
        const weapon = allDetails.find(w => w.id === id);

        if (!weapon) return null;

        // Read progression data
        const progressionPath = path.join(process.cwd(), "data", "precomputed-upgrade-paths", `${id}.json`);
        let progression: WeaponProgression | null = null;

        try {
            const progressionContent = await fs.readFile(progressionPath, "utf-8");
            progression = JSON.parse(progressionContent) as WeaponProgression;
        } catch (e) {
            console.warn(`No progression data found for ${id}`);
        }

        return { weapon, progression };
    } catch (error) {
        console.error(`Error loading static data for ${id}:`, error);
        return null;
    }
}

export default async function WeaponPage({ params }: WeaponPageProps) {
    const { id } = await params;

    const data = await getStaticWeaponData(id);

    if (!data || !data.weapon) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-red-500 gap-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle />
                    <span>Failed to load weapon data for {id}.</span>
                </div>
                <Button asChild variant="outline">
                    <Link href="/">Return to List</Link>
                </Button>
            </div>
        );
    }

    const { weapon, progression } = data;

    return (
        <main className="min-h-screen p-8 md:p-12 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8">
                <Button asChild variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-bf-blue">
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Weapons
                    </Link>
                </Button>

                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="relative w-80 h-24 bg-slate-900/30 rounded-lg border border-slate-800/50 overflow-hidden">
                        <Image
                            src={weapon.image}
                            alt={weapon.name}
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                {weapon.type}
                            </Badge>
                            <Badge variant="secondary" className="bg-bf-orange/10 text-bf-orange border border-bf-orange/20">
                                {weapon.group}
                            </Badge>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white font-display uppercase">
                            {weapon.name}
                        </h1>
                    </div>
                </div>

                <p className="mt-6 text-xl text-slate-400 max-w-3xl border-l-2 border-bf-blue pl-6">
                    {weapon.description || "No description available."}
                </p>
            </header>

            {/* Upgrade Guide */}
            <section className="mt-12">
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-3xl font-bold text-white font-display">
                        UPGRADE GUIDE
                    </h2>
                    <div className="h-px flex-grow bg-slate-800" />
                </div>

                {progression ? (
                    <UpgradeGuide weapon={weapon} progression={progression} />
                ) : (
                    <div className="text-slate-500">
                        No upgrade path available for this weapon.
                    </div>
                )}
            </section>
        </main>
    );
}
