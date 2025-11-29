import { AttachmentSchema, BuildSchema, PremiumModifiersSchema } from "./schemas";
import { z } from "zod";

type Attachment = z.infer<typeof AttachmentSchema>;
type Build = z.infer<typeof BuildSchema>;
type PremiumModifiers = z.infer<typeof PremiumModifiersSchema>;

/**
 * Extract zoom level from scope name (e.g., "CCO 2.00X" -> 2.0)
 */
function extractZoomLevel(scopeName: string): number | null {
    const match = scopeName.match(/(\d+\.?\d*)X/);
    if (match) {
        return parseFloat(match[1]);
    }
    // Handle variable scopes like "1-4X" - take the higher value
    const variableMatch = scopeName.match(/(\d+)-(\d+)X/);
    if (variableMatch) {
        return parseFloat(variableMatch[2]);
    }
    return null;
}

/**
 * Build recommended attachments from premium modifiers data using tier lists
 */
function buildRecommendedAttachments(
    premiumModifiers: PremiumModifiers | null | undefined
): Attachment[] {
    if (!premiumModifiers) return [];

    const premiumAttachments = premiumModifiers.attachments || [];
    const result: Attachment[] = [];

    // Get recommended scope: best-ranked scope that matches opticZoom hint
    const scopeTierList = premiumModifiers.scopeTierList || [];
    const targetZoom = premiumModifiers.premiumModifiers?.opticModifiers?.opticZoom;

    if (scopeTierList.length > 0 && targetZoom) {
        // Find the highest-ranked scope with matching zoom
        for (const scopeId of scopeTierList) {
            const scope = premiumAttachments.find(att => att.id === scopeId);
            if (scope) {
                const zoom = extractZoomLevel(scope.name);
                if (zoom && Math.abs(zoom - targetZoom) < 0.5) {
                    result.push(scope);
                    break;
                }
            }
        }
    }

    // TODO: Add logic for other slots using premiumModifiers hints
    // For now, we'll still use weapon endpoint builds for non-scope slots

    return result;
}

/**
 * Find the best matching level-0 default for a recommended attachment
 */
function findBestLevel0Default(
    slotId: string,
    recommendedAttachment: Attachment,
    premiumAttachments: Attachment[],
    premiumModifiers: PremiumModifiers | null | undefined
): Attachment | null {
    const level0Attachments = premiumAttachments.filter(
        att => (att.slot?.id || att.slotId) === slotId && att.unlockAtWeaponLevel === 0
    );

    if (level0Attachments.length === 0) return null;

    // For scopes: find level-0 scope with zoom closest to opticZoom hint
    if (slotId === 'scope' && premiumModifiers?.premiumModifiers?.opticModifiers?.opticZoom) {
        const targetZoom = premiumModifiers.premiumModifiers.opticModifiers.opticZoom;

        let closestScope: Attachment | null = null;
        let closestDiff = Infinity;

        for (const scope of level0Attachments) {
            const zoom = extractZoomLevel(scope.name);
            if (zoom) {
                const diff = Math.abs(zoom - targetZoom);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestScope = scope;
                }
            }
        }

        if (closestScope) return closestScope;
    }

    // For other slots: prefer "BASIC" or "STANDARD" attachments
    const standardAttachment = level0Attachments.find(att =>
        att.summaryName?.toUpperCase().includes('BASIC') ||
        att.summaryName?.toUpperCase().includes('STANDARD')
    );
    if (standardAttachment) return standardAttachment;

    // Fallback: lowest points
    level0Attachments.sort((a, b) => a.point - b.point);
    return level0Attachments[0];
}

/**
 * Get attachments for display:
 * - Recommended attachments (from premium modifiers tier lists + weapon builds)
 * - Best matching level-0 defaults
 */
export function getAllAttachments(
    premiumModifiers: PremiumModifiers | null | undefined,
    builds: Build[],
    selectedBuild: Build | null
): Attachment[] {
    // If no build is selected, return empty
    if (!selectedBuild) return [];

    const premiumAttachments = premiumModifiers?.attachments || [];
    const result: Attachment[] = [];
    const seenSlots = new Set<string>();

    // Get recommended scope from premium modifiers tier list (if available)
    if (premiumModifiers) {
        const recommendedFromPremium = buildRecommendedAttachments(premiumModifiers);
        recommendedFromPremium.forEach(att => {
            result.push(att);
            seenSlots.add(att.slot?.id || att.slotId);
        });
    }

    // Add recommended attachments from the selected build
    selectedBuild.attachments.forEach(att => {
        const slotId = att.slot?.id || att.slotId;
        if (!seenSlots.has(slotId)) {
            result.push(att);
            seenSlots.add(slotId);
        }
    });

    // For each slot, find and add the best matching level-0 default (if premium modifiers available)
    if (premiumAttachments.length > 0) {
        seenSlots.forEach(slotId => {
            const recommendedForSlot = result.find(att => (att.slot?.id || att.slotId) === slotId);
            if (!recommendedForSlot) return;

            const bestDefault = findBestLevel0Default(slotId, recommendedForSlot, premiumAttachments, premiumModifiers);

            if (bestDefault) {
                // Only add if it's not already in the result
                const alreadyExists = result.some(att => att.id === bestDefault.id);
                if (!alreadyExists) {
                    result.push(bestDefault);
                }
            }
        });
    }

    console.log('\n=== FILTERED ATTACHMENTS ===');
    console.log('Build:', selectedBuild?.playstyle?.name || 'Unknown');
    console.log('Premium modifiers:', premiumModifiers ? 'Available' : 'Not available (using weapon build data only)');
    console.log('OpticZoom hint:', premiumModifiers?.premiumModifiers?.opticModifiers?.opticZoom || 'none');

    const bySlot = new Map<string, Attachment[]>();
    result.forEach(att => {
        const slotId = att.slot?.id || att.slotId;
        if (!bySlot.has(slotId)) bySlot.set(slotId, []);
        bySlot.get(slotId)!.push(att);
    });

    bySlot.forEach((atts, slotId) => {
        console.log(`\n${slotId}:`);
        atts.sort((a, b) => a.unlockAtWeaponLevel - b.unlockAtWeaponLevel).forEach(att => {
            const zoom = extractZoomLevel(att.name);
            console.log(`  - ${att.name} (lvl ${att.unlockAtWeaponLevel}, ${att.point}pts${zoom ? `, ${zoom}X` : ''})`);
        });
    });

    return result;
}

/**
 * Group attachments by slot and sort by unlock level
 */
export function groupAttachmentsBySlot(
    attachments: Attachment[]
): Map<string, Attachment[]> {
    const bySlot = new Map<string, Attachment[]>();

    attachments.forEach(att => {
        const slotId = att.slot?.id || att.slotId;
        if (!bySlot.has(slotId)) {
            bySlot.set(slotId, []);
        }
        bySlot.get(slotId)!.push(att);
    });

    // Sort each slot's attachments by unlock level
    bySlot.forEach((atts) => {
        atts.sort((a, b) => a.unlockAtWeaponLevel - b.unlockAtWeaponLevel);
    });

    return bySlot;
}

/**
 * Get the active attachment for a slot at a given level
 * With filtered attachments, we only have 2 options per slot:
 * 1. Level-0 default (lowest point)
 * 2. Recommended attachment from build
 */
export function getActiveAttachmentForSlot(
    slotAttachments: Attachment[],
    level: number,
    recommendedAttachment?: Attachment
): Attachment | null {
    // Get all unlocked attachments for this slot (should be max 2: default + recommended)
    const unlocked = slotAttachments.filter(att => att.unlockAtWeaponLevel <= level);

    if (unlocked.length === 0) return null;

    const slotName = slotAttachments[0]?.slot?.name || slotAttachments[0]?.slotId;
    console.log(`\n[Level ${level}] ${slotName}:`);
    console.log('  Available:', slotAttachments.map(a => `${a.name} (lvl ${a.unlockAtWeaponLevel})`).join(', '));
    console.log('  Unlocked:', unlocked.map(a => `${a.name} (lvl ${a.unlockAtWeaponLevel})`).join(', '));
    console.log('  Recommended:', recommendedAttachment?.name || 'none');

    if (recommendedAttachment) {
        // Check if the recommended attachment is unlocked yet
        const recommendedUnlocked = unlocked.find(att => att.id === recommendedAttachment.id);

        if (recommendedUnlocked) {
            console.log('  → Using RECOMMENDED:', recommendedUnlocked.name);
            // Use the recommended attachment once it's unlocked
            return recommendedUnlocked;
        } else {
            // Use the level-0 default (should be the first unlocked)
            // Sort by level to ensure we get the lowest level one
            const sorted = [...unlocked].sort((a, b) => a.unlockAtWeaponLevel - b.unlockAtWeaponLevel);
            console.log('  → Using DEFAULT:', sorted[0].name);
            return sorted[0];
        }
    } else {
        console.log('  → Using fallback:', unlocked[0].name);
        // No recommended attachment for this slot (shouldn't happen with our filtering)
        return unlocked[0];
    }
}

/**
 * Get all active attachments at a given level for a build
 */
export function getActiveAttachments(
    slotProgression: Map<string, Attachment[]>,
    level: number,
    selectedBuild?: Build | null
): Attachment[] {
    const active: Attachment[] = [];

    slotProgression.forEach((attachments, slotId) => {
        // Find the recommended attachment for this slot from the selected build
        const recommendedAtt = selectedBuild?.attachments.find(
            att => (att.slot?.id || att.slotId) === slotId
        );

        const activeAtt = getActiveAttachmentForSlot(attachments, level, recommendedAtt);
        if (activeAtt) {
            active.push(activeAtt);
        }
    });

    return active;
}
