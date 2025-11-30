"use client";

import { useState, useMemo } from "react";
import { WeaponCard } from "@/components/weapon-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierListResponseSchema } from "@/lib/schemas";
import { z } from "zod";
import { Search } from "lucide-react";
import weaponDetailsData from "@/../data/weapon-details.json";

type TierListData = z.infer<typeof TierListResponseSchema>;

interface WeaponListProps {
    data: TierListData;
}

const TIERS = ["META", "A", "B", "C", "D"];

export function WeaponList({ data }: WeaponListProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Create a map of weapon ID to weapon details
    const weaponsMap = useMemo(() => {
        const map = new Map();
        (weaponDetailsData as any[]).forEach((weapon: any) => {
            map.set(weapon.id, weapon);
        });
        return map;
    }, []);

    // Extract unique weapon types from all weapons in the tierlist
    const weaponTypes = useMemo(() => {
        const typesMap = new Map<string, string>();
        Object.values(data.ranking).flat().forEach((weaponId: any) => {
            const weapon = weaponsMap.get(weaponId);
            if (weapon?.type) {
                typesMap.set(weapon.type.toLowerCase(), weapon.type);
            }
        });
        return Array.from(typesMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [data.ranking, weaponsMap]);

    return (
        <div className="space-y-8">
            {/* Search Bar */}
            <div className="relative max-w-md">
                <div className="relative bg-bf-panel border border-slate-800 shadow-sm overflow-hidden">
                    {/* Tech decoration borders */}
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-bf-blue/30 z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-bf-blue/30 z-10 pointer-events-none" />

                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Search weapons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedType === null ? "default" : "outline"}
                    onClick={() => setSelectedType(null)}
                    size="sm"
                >
                    ALL
                </Button>
                {weaponTypes.map(([typeId, typeName]) => (
                    <Button
                        key={typeId}
                        variant={selectedType === typeId ? "default" : "outline"}
                        onClick={() => setSelectedType(typeId)}
                        size="sm"
                        className="uppercase"
                    >
                        {typeName}
                    </Button>
                ))}
            </div>

            {/* Tier Sections */}
            <div className="space-y-12">
                {TIERS.map((tier) => {
                    const tierWeaponIds = data.ranking[tier] || [];

                    // Map weapon IDs to weapon details
                    let weapons = tierWeaponIds
                        .map((weaponId: string) => weaponsMap.get(weaponId))
                        .filter(Boolean);

                    // Filter by weapon type
                    if (selectedType) {
                        weapons = weapons.filter(
                            (weapon: any) => weapon.type?.toLowerCase() === selectedType
                        );
                    }

                    // Filter by search query (case insensitive)
                    if (searchQuery.trim()) {
                        weapons = weapons.filter((weapon: any) =>
                            weapon.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                    }

                    if (weapons.length === 0) return null;

                    return (
                        <section key={tier} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-bold text-bf-blue font-display">
                                    {tier} TIER
                                </h2>
                                <div className="h-px flex-grow bg-slate-800" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {weapons.map((weapon: any) => (
                                    <WeaponCard
                                        key={weapon.id}
                                        weapon={weapon}
                                        tier={tier}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
