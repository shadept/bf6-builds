import { getWeapon, getPremiumModifiers, getTierList } from "@/lib/api";
import { UpgradeGuide } from "@/components/upgrade-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

interface WeaponPageProps {
    params: Promise<{ id: string }>;
}

export default async function WeaponPage({ params }: WeaponPageProps) {
    const { id } = await params;

    // Fetch weapon data and tier list in parallel
    const [weapon, tierListData] = await Promise.all([
        getWeapon(id),
        getTierList(),
    ]);

    // Get tierListId from the tier list data
    const tierListId = tierListData?.data?.tierList?.id || "f5CvkV1cifewbB1mrnbMyQcEy0S2-big-maps";

    // Fetch premium modifiers if weapon data is available
    const premiumModifiers = weapon ? await getPremiumModifiers(tierListId, id) : null;

    if (!weapon) {
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

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                {weapon.weaponType?.name}
                            </Badge>
                            <Badge variant="secondary" className="bg-bf-orange/10 text-bf-orange border border-bf-orange/20">
                                {weapon.weaponGroup?.name}
                            </Badge>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white font-display uppercase">
                            {weapon.name}
                        </h1>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Unlock Level</div>
                        <div className="text-3xl font-mono text-bf-blue">
                            {weapon.unlockAtPlayerLevel || "Starter"}
                        </div>
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

                <UpgradeGuide weapon={weapon} premiumModifiers={premiumModifiers} />
            </section>
        </main>
    );
}
