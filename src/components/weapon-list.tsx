"use client";

import { useState } from "react";
import { WeaponCard } from "@/components/weapon-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierListResponseSchema, WeaponSchema } from "@/lib/schemas";
import { z } from "zod";
import { Search } from "lucide-react";

type TierListData = z.infer<typeof TierListResponseSchema>["data"];
type Weapon = z.infer<typeof WeaponSchema>;

interface WeaponListProps {
    data: TierListData;
}

const TIERS = ["META", "A", "B", "C", "D"];

export function WeaponList({ data }: WeaponListProps) {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Extract unique groups
    const groups = Array.from(
        new Set(
            (Object.values(data.rankings || {}) as { weapon: Weapon }[][])
                .flat()
                .map((item) => item.weapon.weaponGroupId)
        )
    ).sort();

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
                    variant={selectedGroup === null ? "default" : "outline"}
                    onClick={() => setSelectedGroup(null)}
                    size="sm"
                >
                    ALL
                </Button>
                {groups.map((group) => (
                    <Button
                        key={group}
                        variant={selectedGroup === group ? "default" : "outline"}
                        onClick={() => setSelectedGroup(group)}
                        size="sm"
                        className="uppercase"
                    >
                        {group.replace("-", " ")}
                    </Button>
                ))}
            </div>

            {/* Tier Sections */}
            <div className="space-y-12">
                {TIERS.map((tier) => {
                    const tierWeapons = data.rankings?.[tier] || [];
                    let filteredWeapons = tierWeapons;

                    // Filter by group
                    if (selectedGroup) {
                        filteredWeapons = filteredWeapons.filter(
                            (item) => item.weapon.weaponGroupId === selectedGroup
                        );
                    }

                    // Filter by search query (case insensitive)
                    if (searchQuery.trim()) {
                        filteredWeapons = filteredWeapons.filter((item) =>
                            item.weapon.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                    }

                    if (filteredWeapons.length === 0) return null;

                    return (
                        <section key={tier} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-bold text-bf-blue font-display">
                                    {tier} TIER
                                </h2>
                                <div className="h-px flex-grow bg-slate-800" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredWeapons.map((item) => (
                                    <WeaponCard
                                        key={item.weapon.id}
                                        weapon={item.weapon}
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
