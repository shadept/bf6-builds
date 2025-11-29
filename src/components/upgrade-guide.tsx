"use client";

import { useState, useMemo, useEffect } from "react";
import { WeaponSchema, BuildSchema, PremiumModifiersSchema } from "@/lib/schemas";
import { z } from "zod";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Zap, Minus, Plus } from "lucide-react";
import {
    getAllAttachments,
    groupAttachmentsBySlot,
    getActiveAttachments
} from "@/lib/upgrade-logic";
import { PointsDisplay } from "@/components/points-display";

type Weapon = z.infer<typeof WeaponSchema>;
type Build = z.infer<typeof BuildSchema>;
type PremiumModifiers = z.infer<typeof PremiumModifiersSchema>;

interface UpgradeGuideProps {
    weapon: Weapon;
    premiumModifiers?: PremiumModifiers | null;
}

export function UpgradeGuide({ weapon, premiumModifiers }: UpgradeGuideProps) {
    const [level, setLevel] = useState(1);
    const [selectedBuildIndex, setSelectedBuildIndex] = useState(0);
    const maxLevel = 40;

    // Sort builds: "Best Loadout" first, then alphabetically
    const builds = useMemo(() => {
        const weaponBuilds = weapon.builds || [];
        return [...weaponBuilds].sort((a, b) => {
            const nameA = a.playstyle?.name || a.name || "";
            const nameB = b.playstyle?.name || b.name || "";

            // "Best Loadout" always comes first
            if (nameA.toLowerCase().includes("best loadout")) return -1;
            if (nameB.toLowerCase().includes("best loadout")) return 1;

            // Otherwise sort alphabetically
            return nameA.localeCompare(nameB);
        });
    }, [weapon.builds]);

    const selectedBuild = builds[selectedBuildIndex] || null;

    // Load selected build index from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(`weapon-${weapon.id}-build`);
        if (stored) {
            const index = parseInt(stored, 10);
            if (index >= 0 && index < builds.length) {
                setSelectedBuildIndex(index);
            }
        }
    }, [weapon.id, builds.length]);

    // Save selected build index to localStorage
    const handleBuildChange = (index: number) => {
        setSelectedBuildIndex(index);
        localStorage.setItem(`weapon-${weapon.id}-build`, index.toString());
    };

    // Get all available attachments using the upgrade logic
    const allAttachments = useMemo(
        () => getAllAttachments(premiumModifiers, builds, selectedBuild),
        [premiumModifiers, builds, selectedBuild]
    );

    // Group attachments by slot
    const slotProgression = useMemo(
        () => groupAttachmentsBySlot(allAttachments),
        [allAttachments]
    );

    // Get active attachments at current level
    const activeAttachments = useMemo(
        () => getActiveAttachments(slotProgression, level, selectedBuild),
        [slotProgression, level, selectedBuild]
    );

    const totalPoints = activeAttachments.reduce((sum, att) => sum + att.point, 0);
    const isOverLimit = totalPoints > 100;

    if (!selectedBuild) {
        return (
            <div className="text-center p-8 text-slate-500">
                No recommended builds found for this weapon.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Playstyle Selector */}
            {builds.length > 1 && (
                <div>
                    <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Select Playstyle</h3>
                    <div className="flex flex-wrap gap-2">
                        {builds.map((build, index) => (
                            <button
                                key={build.id}
                                onClick={() => handleBuildChange(index)}
                                className={cn(
                                    "px-4 py-2 rounded-lg font-display uppercase text-sm transition-all",
                                    selectedBuildIndex === index
                                        ? "bg-bf-blue text-white border border-bf-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        : "bg-bf-panel text-slate-400 border border-slate-700 hover:border-bf-blue/50 hover:text-white"
                                )}
                            >
                                {build.playstyle?.name || build.name || `Build ${index + 1}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Level Slider */}
            <Card className="border-bf-blue/20 bg-bf-panel/50">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Weapon Level</span>
                        <span className="text-bf-blue text-4xl font-mono">{level}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setLevel(Math.max(1, level - 1))}
                            disabled={level === 1}
                            className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg border transition-all",
                                level === 1
                                    ? "border-slate-700 text-slate-600 cursor-not-allowed"
                                    : "border-bf-blue text-bf-blue hover:bg-bf-blue hover:text-white"
                            )}
                            aria-label="Decrease level"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <Slider
                            value={[level]}
                            onValueChange={(vals) => setLevel(vals[0])}
                            min={1}
                            max={maxLevel}
                            step={1}
                            className="flex-1 py-4"
                        />
                        <button
                            onClick={() => setLevel(Math.min(maxLevel, level + 1))}
                            disabled={level === maxLevel}
                            className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg border transition-all",
                                level === maxLevel
                                    ? "border-slate-700 text-slate-600 cursor-not-allowed"
                                    : "border-bf-blue text-bf-blue hover:bg-bf-blue hover:text-white"
                            )}
                            aria-label="Increase level"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                        Adjust the slider to see the progression of attachments in the <strong>{selectedBuild.playstyle?.name || "Selected Loadout"}</strong>.
                    </p>
                </CardContent>
            </Card>

            {/* Stats / Points */}
            <Card className={cn("border-bf-blue/20", isOverLimit && "border-red-500/50")}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400 uppercase flex items-center justify-between">
                        <span>Points Used</span>
                        <span className={cn("text-2xl font-mono", isOverLimit ? "text-red-500" : "text-white")}>
                            {totalPoints}
                            <span className="text-slate-500 text-base"> / 100</span>
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <PointsDisplay usedPoints={totalPoints} />
                    {isOverLimit && (
                        <div className="flex items-center gap-2 text-red-400 text-xs mt-3">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Over capacity!</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attachments Grid - Show ONLY active attachments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeAttachments
                    .slice()
                    .sort((a, b) => {
                        // Sort by slot name for consistent grouping
                        const slotA = a.slot?.name || "";
                        const slotB = b.slot?.name || "";
                        return slotA.localeCompare(slotB);
                    })
                    .map((att) => {
                        const isJustUnlocked = att.unlockAtWeaponLevel === level;

                        return (
                            <Card
                                key={att.id}
                                className={cn(
                                    "transition-all duration-300 relative",
                                    isJustUnlocked
                                        ? "border-bf-blue bg-bf-blue/10 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                        : "border-slate-700 bg-slate-800/50"
                                )}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="text-[10px] border-slate-600">
                                            {att.slot?.name || "Attachment"}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-slate-600">
                                            Lvl {att.unlockAtWeaponLevel}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg mt-2 text-white">
                                        {att.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-slate-400 line-clamp-2 flex-1">
                                            {att.description || "No description"}
                                        </p>
                                        <div className="flex items-center gap-1 text-bf-orange font-mono font-bold ml-2">
                                            <Zap className="w-3 h-3" />
                                            {att.point}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
            </div>
        </div>
    );
}
