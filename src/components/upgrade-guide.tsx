"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Zap, Minus, Plus, Trash2 } from "lucide-react";
import { PointsDisplay } from "@/components/points-display";
import { StaticWeaponDetails, WeaponProgression, StaticAttachment } from "@/lib/static-types";

interface UpgradeGuideProps {
    weapon: StaticWeaponDetails;
    progression: WeaponProgression;
}

interface DisplayAttachment extends StaticAttachment {
    status: "active" | "removed";
    isNewlyAdded?: boolean;
}

export function UpgradeGuide({ weapon, progression }: UpgradeGuideProps) {
    const [level, setLevel] = useState(1);
    const [selectedBuildIndex, setSelectedBuildIndex] = useState(0);

    // Hold-to-change level functionality
    const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const maxLevel = 40;

    // Sort builds: "Best Loadout" first, then alphabetically
    const builds = useMemo(() => {
        const buildProgressions = progression.buildProgressions || [];
        return [...buildProgressions].sort((a, b) => {
            const nameA = a.playstyle?.name || a.description || "";
            const nameB = b.playstyle?.name || b.description || "";

            // "Best Loadout" always comes first
            if (nameA.toLowerCase().includes("best loadout")) return -1;
            if (nameB.toLowerCase().includes("best loadout")) return 1;

            // Otherwise sort alphabetically
            return nameA.localeCompare(nameB);
        });
    }, [progression.buildProgressions]);

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

    // Handlers for hold-to-change level buttons
    const startHoldDecrement = () => {
        if (level === 1) return;

        // Initial decrement
        setLevel(prev => Math.max(1, prev - 1));

        // Start continuous decrement after a short delay
        holdTimeoutRef.current = setTimeout(() => {
            holdIntervalRef.current = setInterval(() => {
                setLevel(prev => {
                    const newLevel = Math.max(1, prev - 1);
                    if (newLevel === 1 && holdIntervalRef.current) {
                        clearInterval(holdIntervalRef.current);
                    }
                    return newLevel;
                });
            }, 150); // Change every 150ms (not too fast)
        }, 300); // Wait 300ms before starting continuous change
    };

    const startHoldIncrement = () => {
        if (level === maxLevel) return;

        // Initial increment
        setLevel(prev => Math.min(maxLevel, prev + 1));

        // Start continuous increment after a short delay
        holdTimeoutRef.current = setTimeout(() => {
            holdIntervalRef.current = setInterval(() => {
                setLevel(prev => {
                    const newLevel = Math.min(maxLevel, prev + 1);
                    if (newLevel === maxLevel && holdIntervalRef.current) {
                        clearInterval(holdIntervalRef.current);
                    }
                    return newLevel;
                });
            }, 150); // Change every 150ms (not too fast)
        }, 300); // Wait 300ms before starting continuous change
    };

    const stopHold = () => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopHold();
        };
    }, []);

    // Get active and removed attachments for the current level
    const displayAttachments = useMemo(() => {
        if (!selectedBuild) return [];

        // Get all level states sorted by level
        const sortedLevels = [...selectedBuild.levels].sort((a, b) => a.level - b.level);

        // Find the index of the current level state (last one <= current level)
        const currentIndex = sortedLevels.findLastIndex(l => l.level <= level);

        if (currentIndex === -1) return [];

        const currentLevelState = sortedLevels[currentIndex];
        const previousLevelState = currentIndex > 0 ? sortedLevels[currentIndex - 1] : null;

        // Get previous level's attachment IDs by slot for comparison
        const previousAttachmentsBySlot = new Map<string, string>();
        if (previousLevelState) {
            previousLevelState.attachments.forEach(ref => {
                previousAttachmentsBySlot.set(ref.slotId, ref.attachmentId);
            });
        }

        // Get active attachments and mark if they're newly added
        const activeRaw: (DisplayAttachment | null)[] = currentLevelState.attachments.map(slotRef => {
            const attachment = weapon.attachments.find(a => a.id === slotRef.attachmentId);
            if (!attachment) return null;

            // Check if this attachment is newly added at this level
            // It's new if: we're at the exact level where change happened AND
            // the previous level had a different attachment in this slot (or no attachment)
            const isNewlyAdded = currentLevelState.level === level &&
                previousLevelState !== null &&
                previousAttachmentsBySlot.get(slotRef.slotId) !== slotRef.attachmentId;

            return { ...attachment, status: "active" as const, isNewlyAdded };
        });

        const active = activeRaw.filter((a): a is DisplayAttachment => !!a);

        // Check for removed attachments
        const removed: DisplayAttachment[] = [];

        // We only show "removed" status if we are exactly at the level where the change occurred
        if (currentLevelState.level === level && currentIndex > 0) {
            const previousLevelState = sortedLevels[currentIndex - 1];

            // Find slots that were present in previous but missing in current
            const currentSlots = new Set(currentLevelState.attachments.map(a => a.slotId));

            previousLevelState.attachments.forEach(prevRef => {
                if (!currentSlots.has(prevRef.slotId)) {
                    const attachment = weapon.attachments.find(a => a.id === prevRef.attachmentId);
                    if (attachment) {
                        removed.push({ ...attachment, status: "removed" as const, isNewlyAdded: false });
                    }
                }
            });
        }

        return [...active, ...removed];

    }, [selectedBuild, level, weapon.attachments]);

    // Calculate points based only on ACTIVE attachments
    const totalPoints = displayAttachments
        .filter(a => a.status === "active")
        .reduce((sum, att) => sum + att.point, 0);

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
                                key={build.buildId}
                                onClick={() => handleBuildChange(index)}
                                className={cn(
                                    "px-4 py-2 rounded-lg font-display uppercase text-sm transition-all",
                                    selectedBuildIndex === index
                                        ? "bg-bf-blue text-white border border-bf-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        : "bg-bf-panel text-slate-400 border border-slate-700 hover:border-bf-blue/50 hover:text-white"
                                )}
                            >
                                {build.playstyle?.name || build.description || `Build ${index + 1}`}
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
                            onMouseDown={startHoldDecrement}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={startHoldDecrement}
                            onTouchEnd={stopHold}
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
                            onMouseDown={startHoldIncrement}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={startHoldIncrement}
                            onTouchEnd={stopHold}
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

            {/* Attachments Grid - Show active AND removed attachments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayAttachments
                    .slice()
                    .sort((a, b) => {
                        // Sort by slot name for consistent grouping
                        const slotA = a.slot?.name || a.slotId || "";
                        const slotB = b.slot?.name || b.slotId || "";
                        return slotA.localeCompare(slotB);
                    })
                    .map((att) => {
                        const isJustUnlocked = att.isNewlyAdded || false;
                        const isRemoved = att.status === "removed";

                        return (
                            <Card
                                key={`${att.id}-${att.status}`}
                                className={cn(
                                    "transition-all duration-300 relative",
                                    isRemoved
                                        ? "border-red-500/80 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                        : isJustUnlocked
                                            ? "border-bf-blue bg-bf-blue/10 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                            : "border-slate-700 bg-slate-800/50"
                                )}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="text-[10px] border-slate-600">
                                            {att.slot?.name || att.slotId}
                                        </Badge>
                                        {isRemoved ? (
                                            <Badge variant="destructive" className="text-[10px] animate-pulse">
                                                REMOVED
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] border-slate-600">
                                                Lvl {att.unlockAtWeaponLevel}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className={cn("text-lg mt-2", isRemoved ? "text-red-400 line-through decoration-red-500/50" : "text-white")}>
                                        {att.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-slate-400 line-clamp-2 flex-1">
                                            {att.description || "No description"}
                                        </p>
                                        {!isRemoved && (
                                            <div className="flex items-center gap-1 text-bf-orange font-mono font-bold ml-2">
                                                <Zap className="w-3 h-3" />
                                                {att.point}
                                            </div>
                                        )}
                                    </div>
                                    {isRemoved && (
                                        <div className="mt-3 flex items-center justify-center text-red-500 text-xs font-bold uppercase tracking-widest gap-2">
                                            <Trash2 className="w-3 h-3" />
                                            Unequip Item
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
            </div>
        </div>
    );
}
