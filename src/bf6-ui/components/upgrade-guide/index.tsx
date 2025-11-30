"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Slider } from "@/bf6-ui/primitives/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/bf6-ui/primitives/card";
import { Badge } from "@/bf6-ui/primitives/badge";
import { Button } from "@/bf6-ui/primitives/button";
import { Heading } from "@/bf6-ui/primitives/typography/Heading";
import { AttachmentCard } from "@/bf6-ui/components/attachment-card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { PointsDisplay } from "@/bf6-ui/components/points-display";
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
    const HOLD_INITIAL_DELAY = 400;
    const HOLD_REPEAT_INTERVAL = 120;

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

    const adjustLevel = (delta: number) => {
        let didChange = false;
        setLevel(prev => {
            const next = Math.max(1, Math.min(maxLevel, prev + delta));
            didChange = next !== prev;
            return next;
        });
        return didChange;
    };

    const startHoldChange = (direction: 1 | -1) => {
        stopHold();
        const applied = adjustLevel(direction);
        if (!applied) return;

        holdTimeoutRef.current = setTimeout(() => {
            holdIntervalRef.current = setInterval(() => {
                const changed = adjustLevel(direction);
                if (!changed) {
                    stopHold();
                }
            }, HOLD_REPEAT_INTERVAL);
        }, HOLD_INITIAL_DELAY);
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
                    <Heading level={6} className="text-sm text-slate-400 tracking-wider mb-3">
                        Select Playstyle
                    </Heading>
                    <div className="flex flex-wrap gap-2">

                        {builds.map((build, index) => (
                            <Button
                                key={build.buildId}
                                onClick={() => handleBuildChange(index)}
                                variant={selectedBuildIndex === index ? "default" : "outline"}
                                size="sm"
                                className="uppercase"
                                type="button"
                            >
                                {build.playstyle?.name || build.description || `Build ${index + 1}`}
                            </Button>
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
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onMouseDown={() => startHoldChange(-1)}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={(event) => {
                                event.preventDefault();
                                startHoldChange(-1);
                            }}
                            onTouchEnd={stopHold}
                            onTouchCancel={stopHold}
                            disabled={level === 1}
                            aria-label="Decrease level"
                        >
                            <Minus className="w-5 h-5" />
                        </Button>
                        <Slider
                            value={[level]}
                            onValueChange={(vals) => setLevel(vals[0])}
                            min={1}
                            max={maxLevel}
                            step={1}
                            className="flex-1 py-4"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onMouseDown={() => startHoldChange(1)}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={(event) => {
                                event.preventDefault();
                                startHoldChange(1);
                            }}
                            onTouchEnd={stopHold}
                            onTouchCancel={stopHold}
                            disabled={level === maxLevel}
                            aria-label="Increase level"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
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
                        const slotA = a.slot?.name || a.slotId || "";
                        const slotB = b.slot?.name || b.slotId || "";
                        return slotA.localeCompare(slotB);
                    })
                    .map((att) => {
                        const status = att.status === "removed" ? "removed" : att.isNewlyAdded ? "new" : "active";

                        return (
                            <AttachmentCard
                                key={`${att.id}-${att.status}`}
                                name={att.name}
                                description={att.description}
                                slot={att.slot?.name || att.slotId}
                                points={att.status === "removed" ? 0 : att.point ?? 0}
                                unlockLevel={att.unlockAtWeaponLevel ?? level}
                                status={status}
                            />
                        );
                    })}
            </div>
        </div>
    );
}
