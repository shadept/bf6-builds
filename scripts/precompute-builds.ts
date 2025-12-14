// scripts/precompute-upgrade-paths.ts
//
// Usage (ts-node):
//   npx ts-node scripts/precompute-upgrade-paths.ts kord-6p67 m5a3 ak15
//
// Or compile then run:
//   npx tsc scripts/precompute-upgrade-paths.ts --outDir dist
//   node dist/precompute-upgrade-paths.js kord-6p67 m5a3 ak15
//
// Input folders (relative to project root):
//   .cache/weapons/<weaponId>.json
//   .cache/premium-modifiers/<weaponId>.json
//
// Output folder:
//   .cache/precomputed-upgrade-paths/<weaponId>.json

import * as fs from "node:fs";
import * as path from "node:path";

const MAX_LEVEL = 40;
const MAX_POINTS = 100;

// Configuration for progression algorithm
const CONFIG = {
  FOCUSED_THRESHOLD: 0.2,         // Stat weight threshold for "focused" builds
  ALIGNMENT_SCORE_MAX: 50,        // Max bonus for stat alignment
  COST_EFFICIENCY_MAX: 30,        // Max bonus for cost efficiency
  ONE_OFF_PENALTY: -50,           // Penalty for misaligned expensive items
  COMPLEMENTARY_BONUS: 15,        // Bonus for universally useful items
  POINT_RESERVE: 10,              // Reserve for late-unlocking target items
};

// Scopes that should never be selected (terrible options)
const BANNED_SCOPES: string[] = [
  // Add scope IDs here that are universally bad
  // User can identify these after reviewing progression output
];

// ---------- Types ----------

interface AttachmentStats {
  movementSpeed?: number;
  adsSpeed?: number;
  horizontalRecoilControl?: number;
  verticalRecoilControl?: number;
  [key: string]: unknown;
}

interface PremiumAttachment {
  id: string;
  name: string;
  summaryName?: string;
  slotId: string;
  description?: string;
  point: number;
  unlockAtWeaponLevel: number;
  slot?: {
    id: string;
    name: string;
  };
  attachmentStats?: AttachmentStats;
}

interface AttachmentScore {
  attachmentId: string;
  score: number;
}

interface PremiumModifiers {
  attachmentScores: AttachmentScore[];
  recommendedMagazineCapacity?: number;
}

interface PremiumMetaFile {
  premiumModifiers: PremiumModifiers;
  mandatorySlots: string[];
  attachments: PremiumAttachment[];
  scopeTierList: string[];
}

interface BuildAttachmentRef {
  id: string;
  slotId: string;
  point?: number;
  unlockAtWeaponLevel?: number;
}

interface WeaponBuild {
  id: string;
  description?: string;
  playstyleId?: string;
  playstyle?: {
    id: string;
    name: string;
    description?: string;
  };
  attachments: BuildAttachmentRef[];
}

interface WeaponFile {
  id: string;
  name: string;
  builds: WeaponBuild[];
}

interface LevelState {
  level: number;
  loadout: Record<string, string>; // slotId -> attachmentId
  totalPoints: number;
}

interface BuildProgressionOutput {
  buildId: string;
  description?: string;
  playstyleId?: string;
  playstyle?: WeaponBuild["playstyle"];
  levels: {
    level: number;
    totalPoints: number;
    attachments: { slotId: string; attachmentId: string }[];
  }[];
}

interface WeaponProgressionOutput {
  weaponId: string;
  name: string;
  buildProgressions: BuildProgressionOutput[];
}

/**
 * Statistical profile of a build's characteristics.
 * Used to determine which filler attachments align with the build's focus.
 */
interface BuildStatProfile {
  // Primary build characteristics (boolean flags)
  isRecoilFocused: boolean;        // Build emphasizes recoil control
  isMobilityFocused: boolean;      // Build emphasizes movement/ADS speed
  isStealthFocused: boolean;       // Build emphasizes stealth mechanics
  isRangeFocused: boolean;         // Build emphasizes range/velocity
  isHipFireFocused: boolean;       // Build emphasizes hip-fire accuracy

  // Weighted stat priorities (0-1 scale, higher = more focused)
  recoilWeight: number;            // Combined recoil control weight
  mobilityWeight: number;          // Combined mobility weight
  stealthWeight: number;           // Stealth features weight
  rangeWeight: number;             // Range enhancement weight
  hipFireWeight: number;           // Hip-fire enhancement weight

  // Scope characteristics
  finalScopeId: string;            // Target scope attachment ID
  finalScopeZoom: number;          // Target scope zoom level (0=iron, 1=1x, etc.)

  // Muzzle device characteristics
  hasSuppressor: boolean;          // Final build uses suppressor
  hasFlashHider: boolean;          // Final build uses flash hider

  // Context from weapon/build metadata
  playstyleId?: string;            // Build's playstyle ID (e.g., "best-loadout")
  weaponGroupId?: string;          // Weapon's group ID (e.g., "long-range")
}

/**
 * A single step in the scope progression plan.
 * Represents which scope to use starting at a given level.
 */
interface ScopeProgressionStep {
  minLevel: number;                // Use this scope starting at this level
  scopeId: string;                 // Scope attachment ID to use
  zoomLevel: number;               // Zoom level of this scope
  reason: string;                  // Human-readable reason for selection (for debugging)
}

/**
 * Complete scope progression plan for a build.
 * Defines which scopes to use at different weapon levels.
 */
interface ScopeProgressionPlan {
  scopeSteps: ScopeProgressionStep[];
}

// ---------- Generic validation helpers ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------- Validation: premium-modifiers file ----------

function parsePremiumMeta(raw: unknown, filePath: string): PremiumMetaFile {
  if (!isRecord(raw)) {
    throw new Error(`${filePath}: root is not an object`);
  }

  // mandatorySlots
  const mandatorySlotsRaw = raw.mandatorySlots;
  if (!Array.isArray(mandatorySlotsRaw)) {
    throw new Error(`${filePath}: "mandatorySlots" must be an array`);
  }
  const mandatorySlots = mandatorySlotsRaw.filter(
    (s): s is string => typeof s === "string"
  );
  if (!mandatorySlots.length) {
    throw new Error(`${filePath}: "mandatorySlots" must contain at least one slot id`);
  }

  // scopeTierList
  const scopeTierListRaw = raw.scopeTierList;
  if (!Array.isArray(scopeTierListRaw)) {
    throw new Error(`${filePath}: "scopeTierList" must be an array`);
  }
  const scopeTierList = scopeTierListRaw.filter(
    (s): s is string => typeof s === "string"
  );

  // attachments
  const attachmentsRaw = raw.attachments;
  if (!Array.isArray(attachmentsRaw)) {
    throw new Error(`${filePath}: "attachments" must be an array`);
  }

  const attachments: PremiumAttachment[] = attachmentsRaw.map((a, index) => {
    if (!isRecord(a)) {
      throw new Error(`${filePath}: attachments[${index}] is not an object`);
    }
    const id = a.id;
    const name = a.name;
    const slotId = a.slotId;
    const point = a.point;
    const unlock = a.unlockAtWeaponLevel;

    if (typeof id !== "string") {
      throw new Error(`${filePath}: attachments[${index}].id must be a string`);
    }
    if (typeof name !== "string") {
      throw new Error(`${filePath}: attachments[${index}].name must be a string`);
    }
    if (typeof slotId !== "string") {
      throw new Error(`${filePath}: attachments[${index}].slotId must be a string`);
    }
    if (typeof point !== "number") {
      throw new Error(`${filePath}: attachments[${index}].point must be a number`);
    }
    if (typeof unlock !== "number") {
      throw new Error(
        `${filePath}: attachments[${index}].unlockAtWeaponLevel must be a number`
      );
    }

    return {
      id,
      name,
      summaryName:
        typeof a.summaryName === "string" ? a.summaryName : undefined,
      slotId,
      description:
        typeof a.description === "string" ? a.description : undefined,
      point,
      unlockAtWeaponLevel: unlock,
      slot: isRecord(a.slot)
        ? {
          id: typeof a.slot.id === "string" ? a.slot.id : slotId,
          name:
            typeof a.slot.name === "string" ? a.slot.name : a.slot.id as string ?? slotId,
        }
        : undefined,
      attachmentStats: isRecord(a.attachmentStats)
        ? (a.attachmentStats as AttachmentStats)
        : undefined,
    };
  });

  // premiumModifiers
  const pmRaw = raw.premiumModifiers;
  let premiumModifiers: PremiumModifiers = { attachmentScores: [] };

  if (isRecord(pmRaw)) {
    const scoresRaw = pmRaw.attachmentScores;
    const scores: AttachmentScore[] = Array.isArray(scoresRaw)
      ? scoresRaw
        .filter(isRecord)
        .map((s, idx) => {
          const attachmentId = s.attachmentId;
          const score = s.score;
          if (typeof attachmentId !== "string" || typeof score !== "number") {
            throw new Error(
              `${filePath}: premiumModifiers.attachmentScores[${idx}] invalid`
            );
          }
          return { attachmentId, score };
        })
      : [];

    premiumModifiers = {
      attachmentScores: scores,
      recommendedMagazineCapacity:
        typeof pmRaw.recommendedMagazineCapacity === "number"
          ? pmRaw.recommendedMagazineCapacity
          : undefined,
    };
  }

  return {
    premiumModifiers,
    mandatorySlots,
    attachments,
    scopeTierList,
  };
}

// ---------- Validation: weapon file (builds) ----------

function parseWeaponFile(raw: unknown, filePath: string): WeaponFile {
  if (!isRecord(raw)) {
    throw new Error(`${filePath}: root is not an object`);
  }

  const id = raw.id;
  const name = raw.name;
  if (typeof id !== "string") {
    throw new Error(`${filePath}: "id" must be a string`);
  }
  if (typeof name !== "string") {
    throw new Error(`${filePath}: "name" must be a string`);
  }

  const buildsRaw = raw.builds;
  if (!Array.isArray(buildsRaw)) {
    throw new Error(`${filePath}: "builds" must be an array`);
  }

  const builds: WeaponBuild[] = buildsRaw.map((b, idx) => {
    if (!isRecord(b)) {
      throw new Error(`${filePath}: builds[${idx}] is not an object`);
    }
    if (typeof b.id !== "string") {
      throw new Error(`${filePath}: builds[${idx}].id must be a string`);
    }
    if (!Array.isArray(b.attachments)) {
      throw new Error(`${filePath}: builds[${idx}].attachments must be an array`);
    }

    const attachments: BuildAttachmentRef[] = b.attachments.map(
      (a, j): BuildAttachmentRef => {
        if (!isRecord(a)) {
          throw new Error(
            `${filePath}: builds[${idx}].attachments[${j}] is not an object`
          );
        }
        const attId = a.id;
        const slotId = a.slotId;
        if (typeof attId !== "string") {
          throw new Error(
            `${filePath}: builds[${idx}].attachments[${j}].id must be a string`
          );
        }
        if (typeof slotId !== "string") {
          throw new Error(
            `${filePath}: builds[${idx}].attachments[${j}].slotId must be a string`
          );
        }
        return {
          id: attId,
          slotId,
          point: typeof a.point === "number" ? a.point : undefined,
          unlockAtWeaponLevel:
            typeof a.unlockAtWeaponLevel === "number"
              ? a.unlockAtWeaponLevel
              : undefined,
        };
      }
    );

    return {
      id: b.id,
      description:
        typeof b.description === "string" ? b.description : undefined,
      playstyleId:
        typeof b.playstyleId === "string" ? b.playstyleId : undefined,
      playstyle: isRecord(b.playstyle)
        ? {
          id:
            typeof b.playstyle.id === "string"
              ? b.playstyle.id
              : "unknown-playstyle",
          name:
            typeof b.playstyle.name === "string"
              ? b.playstyle.name
              : "Unknown",
          description:
            typeof b.playstyle.description === "string"
              ? b.playstyle.description
              : undefined,
        }
        : undefined,
      attachments,
    };
  });

  if (!builds.length) {
    throw new Error(`${filePath}: "builds" cannot be empty`);
  }

  return { id, name, builds };
}

// ---------- Core helpers ----------

function groupBySlot(
  attachments: PremiumAttachment[]
): Record<string, PremiumAttachment[]> {
  const bySlot: Record<string, PremiumAttachment[]> = {};
  for (const a of attachments) {
    if (!bySlot[a.slotId]) bySlot[a.slotId] = [];
    bySlot[a.slotId].push(a);
  }
  return bySlot;
}

function buildIdMap(
  attachments: PremiumAttachment[]
): Record<string, PremiumAttachment> {
  const map: Record<string, PremiumAttachment> = {};
  for (const a of attachments) {
    map[a.id] = a;
  }
  return map;
}

function computeBannedPatterns(premiumModifiers: PremiumModifiers): string[] {
  return (premiumModifiers.attachmentScores || [])
    .filter((s) => typeof s.score === "number" && s.score < 0)
    .map((s) => s.attachmentId);
}

function isBannedAsFiller(
  attachment: PremiumAttachment,
  bannedPatterns: string[]
): boolean {
  return bannedPatterns.some((pat) => attachment.id.includes(pat));
}

function sumPoints(
  loadout: Record<string, string>,
  attachmentsById: Record<string, PremiumAttachment>
): number {
  let total = 0;
  for (const slotId of Object.keys(loadout)) {
    const attId = loadout[slotId];
    if (!attId) continue;
    const a = attachmentsById[attId];
    if (a) total += a.point || 0;
  }
  return total;
}

function loadoutsEqual(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

// ---------- Base loadout (level 0) ----------

function computeBaseLoadout(meta: PremiumMetaFile): Record<string, string> {
  const { attachments, mandatorySlots, scopeTierList } = meta;
  const bySlot = groupBySlot(attachments);

  const scopeRank: Record<string, number> = {};
  scopeTierList.forEach((id, idx) => {
    scopeRank[id] = idx;
  });

  const loadout: Record<string, string> = {};

  for (const slotId of mandatorySlots) {
    const all = bySlot[slotId] || [];
    if (!all.length) continue;

    let candidates = all.filter((a) => a.unlockAtWeaponLevel === 0);
    if (!candidates.length) {
      const minUnlock = Math.min(...all.map((a) => a.unlockAtWeaponLevel));
      candidates = all.filter((a) => a.unlockAtWeaponLevel === minUnlock);
    }

    let chosen: PremiumAttachment;

    if (slotId === "scope") {
      // Ranked by scopeTierList first, then by point
      candidates.sort((a, b) => {
        const ra = scopeRank[a.id] ?? Number.POSITIVE_INFINITY;
        const rb = scopeRank[b.id] ?? Number.POSITIVE_INFINITY;
        if (ra !== rb) return ra - rb;
        if (a.point !== b.point) return a.point - b.point;
        return a.id.localeCompare(b.id);
      });
      chosen = candidates[0];
    } else {
      // Cheapest+earliest mandatory part
      candidates.sort((a, b) => {
        if (a.unlockAtWeaponLevel !== b.unlockAtWeaponLevel) {
          return a.unlockAtWeaponLevel - b.unlockAtWeaponLevel;
        }
        if (a.point !== b.point) return a.point - b.point;
        return a.id.localeCompare(b.id);
      });
      chosen = candidates[0];
    }

    loadout[slotId] = chosen.id;
  }

  return loadout;
}

// ---------- Build analysis and smart progression ----------

/**
 * Analyze a build's stat priorities to guide filler selection.
 *
 * This function examines all attachments in the final build and aggregates their
 * stat modifiers to determine what the build focuses on (recoil control, mobility,
 * stealth, etc.). This profile is then used to select appropriate filler attachments
 * during progression.
 *
 * @param build - The weapon build to analyze
 * @param meta - Premium modifiers metadata
 * @param weaponGroupId - Weapon's group ID (e.g., "long-range", "close-range")
 * @returns Statistical profile of the build's characteristics
 */
function analyzeBuildStatPriorities(
  build: WeaponBuild,
  meta: PremiumMetaFile,
  weaponGroupId?: string
): BuildStatProfile {
  const attachmentsById = buildIdMap(meta.attachments);

  // Initialize stat accumulators
  let recoilScore = 0;
  let mobilityScore = 0;
  let stealthCount = 0;
  let rangeScore = 0;
  let hipFireScore = 0;

  // Track scope and muzzle device
  let finalScopeId = "";
  let finalScopeZoom = 0;
  let hasSuppressor = false;
  let hasFlashHider = false;

  // Iterate through all attachments in the final build
  for (const ref of build.attachments) {
    const att = attachmentsById[ref.id];
    if (!att) continue;

    const stats = att.attachmentStats;
    if (!stats) continue;

    // Aggregate recoil control stats (baseline is 1.0, improvements > 1.0)
    if (typeof stats.horizontalRecoilControl === "number") {
      recoilScore += (stats.horizontalRecoilControl - 1.0);
    }
    if (typeof stats.verticalRecoilControl === "number") {
      recoilScore += (stats.verticalRecoilControl - 1.0);
    }
    if (typeof stats.firstShotRecoilControl === "number") {
      recoilScore += (stats.firstShotRecoilControl - 1.0);
    }

    // Aggregate mobility stats (baseline is 1.0, improvements > 1.0)
    if (typeof stats.movementSpeed === "number") {
      mobilityScore += (stats.movementSpeed - 1.0);
    }
    if (typeof stats.adsSpeed === "number") {
      mobilityScore += (stats.adsSpeed - 1.0);
    }
    if (typeof stats.movementAdsSpeed === "number") {
      mobilityScore += (stats.movementAdsSpeed - 1.0);
    }
    if (typeof stats.weaponDrawSpeed === "number") {
      mobilityScore += (stats.weaponDrawSpeed - 1.0) * 0.5; // Lower weight
    }

    // Count stealth features (boolean flags)
    if (stats.hideInWorldSpotting === true) stealthCount++;
    if (stats.reduceMinimapDetectionRange === true) stealthCount++;

    // Aggregate range enhancement stats
    if (typeof stats.bulletVelocity === "number") {
      rangeScore += (stats.bulletVelocity - 1.0);
    }
    if (typeof stats.damageRange === "number") {
      rangeScore += (stats.damageRange - 1.0) * 0.5; // Lower weight
    }

    // Aggregate hip-fire stats
    if (typeof stats.hipFireAccuracy === "number") {
      hipFireScore += (stats.hipFireAccuracy - 1.0);
    }

    // Extract scope info (zoomLevel: 0 = iron sights, 1 = 1x, 1.75 = 1.75x, etc.)
    if (att.slotId === "scope") {
      finalScopeId = att.id;
      finalScopeZoom = typeof stats.zoomLevel === "number" ? stats.zoomLevel : 0;
      // Check for iron sights
      if (stats.isIronSight === true || att.name.toLowerCase().includes("iron")) {
        finalScopeZoom = 0;
      }
    }

    // Extract muzzle device info
    if (att.slotId === "muzzle") {
      const name = att.name.toLowerCase();
      if (name.includes("suppressor") || name.includes("silencer")) {
        hasSuppressor = true;
      } else if (name.includes("flash") && name.includes("hider")) {
        hasFlashHider = true;
      }
    }
  }

  // Normalize scores to 0-1 scale based on typical max values
  // (These max values are based on empirical analysis of builds)
  const recoilWeight = Math.min(Math.max(recoilScore / 0.8, 0), 1);    // Max ~0.8
  const mobilityWeight = Math.min(Math.max(mobilityScore / 0.6, 0), 1); // Max ~0.6
  const stealthWeight = Math.min(stealthCount / 3, 1);                  // Max 3 features
  const rangeWeight = Math.min(Math.max(rangeScore / 0.5, 0), 1);      // Max ~0.5
  const hipFireWeight = Math.min(Math.max(hipFireScore / 0.5, 0), 1);  // Max ~0.5

  // Determine if build is "focused" on a particular stat (threshold: 0.2)
  const isRecoilFocused = recoilWeight > CONFIG.FOCUSED_THRESHOLD;
  const isMobilityFocused = mobilityWeight > CONFIG.FOCUSED_THRESHOLD;
  const isStealthFocused = stealthWeight > CONFIG.FOCUSED_THRESHOLD;
  const isRangeFocused = rangeWeight > CONFIG.FOCUSED_THRESHOLD;
  const isHipFireFocused = hipFireWeight > CONFIG.FOCUSED_THRESHOLD;

  return {
    isRecoilFocused,
    isMobilityFocused,
    isStealthFocused,
    isRangeFocused,
    isHipFireFocused,
    recoilWeight,
    mobilityWeight,
    stealthWeight,
    rangeWeight,
    hipFireWeight,
    finalScopeId,
    finalScopeZoom,
    hasSuppressor,
    hasFlashHider,
    playstyleId: build.playstyleId,
    weaponGroupId,
  };
}

/**
 * Compute smart scope progression for a build.
 *
 * The key principle: Match the final scope's zoom level from the start.
 * - Snipers (5x-6x) start with high-zoom scopes, not iron sights
 * - LMGs/DMRs (2x-4x) start with mid-range scopes
 * - ARs/SMGs (1x-1.75x) start with low-zoom scopes
 * - Only use iron sights if the final build uses iron sights
 *
 * @param statProfile - Build's statistical profile
 * @param meta - Premium modifiers metadata
 * @returns Scope progression plan with steps for different levels
 */
function computeScopeProgression(
  statProfile: BuildStatProfile,
  meta: PremiumMetaFile
): ScopeProgressionPlan {
  const { finalScopeId, finalScopeZoom } = statProfile;
  const { attachments, scopeTierList } = meta;

  // Get all available scopes, filter out banned ones
  const allScopes = attachments.filter(
    (a) => a.slotId === "scope" && !BANNED_SCOPES.includes(a.id)
  );

  if (allScopes.length === 0) {
    return { scopeSteps: [] }; // No scopes available (shouldn't happen)
  }

  // Helper: Get zoom level from scope attachment
  const getZoomLevel = (scope: PremiumAttachment): number => {
    const stats = scope.attachmentStats;
    if (!stats) return 0;
    if (stats.isIronSight === true) return 0;
    if (typeof stats.zoomLevel === "number") return stats.zoomLevel;
    return 0;
  };

  // Group scopes by zoom level
  const scopesByZoom: Record<number, PremiumAttachment[]> = {};
  for (const scope of allScopes) {
    const zoom = getZoomLevel(scope);
    if (!scopesByZoom[zoom]) scopesByZoom[zoom] = [];
    scopesByZoom[zoom].push(scope);
  }

  // Sort each zoom group by: scopeTierList rank > point cost > unlock level
  const scopeRank: Record<string, number> = {};
  scopeTierList.forEach((id, idx) => {
    scopeRank[id] = idx;
  });

  for (const zoom in scopesByZoom) {
    scopesByZoom[zoom].sort((a, b) => {
      // First, prefer scopes in tier list (lower rank = better)
      const rankA = scopeRank[a.id] ?? Number.POSITIVE_INFINITY;
      const rankB = scopeRank[b.id] ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;

      // Then, prefer cheaper scopes
      if (a.point !== b.point) return a.point - b.point;

      // Finally, prefer earlier unlocks
      return a.unlockAtWeaponLevel - b.unlockAtWeaponLevel;
    });
  }

  // Helper: Find best scope in a zoom range
  const findBestScopeInRange = (
    minZoom: number,
    maxZoom: number,
    maxUnlockLevel: number = 0
  ): PremiumAttachment | null => {
    const candidates: PremiumAttachment[] = [];

    for (const zoom in scopesByZoom) {
      const z = parseFloat(zoom);
      if (z >= minZoom && z <= maxZoom) {
        candidates.push(...scopesByZoom[zoom]);
      }
    }

    // Filter by unlock level if specified
    const filtered =
      maxUnlockLevel > 0
        ? candidates.filter((s) => s.unlockAtWeaponLevel <= maxUnlockLevel)
        : candidates;

    // Return the best one (first after sorting)
    return filtered.length > 0 ? filtered[0] : null;
  };

  const scopeSteps: ScopeProgressionStep[] = [];

  // Determine zoom tier and create progression based on final scope
  if (finalScopeZoom === 0) {
    // Iron sights final build - stay on iron sights
    const ironSight = findBestScopeInRange(0, 0, 0);
    if (ironSight) {
      scopeSteps.push({
        minLevel: 0,
        scopeId: ironSight.id,
        zoomLevel: 0,
        reason: "Final build uses iron sights",
      });
    }
  } else if (finalScopeZoom >= 1 && finalScopeZoom <= 1.75) {
    // Close-mid range (1x-1.75x)
    // Start with cheapest scope in 1x-1.75x range unlocked at level 0
    const startScope = findBestScopeInRange(1, 1.75, 0);
    if (startScope) {
      scopeSteps.push({
        minLevel: 0,
        scopeId: startScope.id,
        zoomLevel: getZoomLevel(startScope),
        reason: "Start with scope matching final zoom tier (1x-1.75x)",
      });
    }

    // Add intermediate upgrades within the same zoom tier
    const midScope = findBestScopeInRange(1, 1.75, 10);
    if (midScope && midScope.id !== startScope?.id && midScope.id !== finalScopeId) {
      scopeSteps.push({
        minLevel: midScope.unlockAtWeaponLevel,
        scopeId: midScope.id,
        zoomLevel: getZoomLevel(midScope),
        reason: "Upgrade within zoom tier",
      });
    }
  } else if (finalScopeZoom >= 2 && finalScopeZoom <= 4) {
    // LMG/DMR range (2x-4x)
    // Start with cheapest 2x-3x scope
    const startScope = findBestScopeInRange(2, 3, 0);
    if (startScope) {
      scopeSteps.push({
        minLevel: 0,
        scopeId: startScope.id,
        zoomLevel: getZoomLevel(startScope),
        reason: "Start with scope matching final zoom tier (2x-4x)",
      });
    }

    // Upgrade to 3x-4x if available
    const midScope = findBestScopeInRange(3, 4, 15);
    if (midScope && midScope.id !== startScope?.id && midScope.id !== finalScopeId) {
      scopeSteps.push({
        minLevel: midScope.unlockAtWeaponLevel,
        scopeId: midScope.id,
        zoomLevel: getZoomLevel(midScope),
        reason: "Upgrade within zoom tier",
      });
    }
  } else if (finalScopeZoom >= 5) {
    // Sniper range (5x-6x+)
    // Start with cheapest 4x-6x scope
    const startScope = findBestScopeInRange(4, 8, 0);
    if (startScope) {
      scopeSteps.push({
        minLevel: 0,
        scopeId: startScope.id,
        zoomLevel: getZoomLevel(startScope),
        reason: "Start with scope matching sniper zoom tier (4x-6x+)",
      });
    }

    // Upgrade to higher zoom if available
    const midScope = findBestScopeInRange(6, 10, 15);
    if (midScope && midScope.id !== startScope?.id && midScope.id !== finalScopeId) {
      scopeSteps.push({
        minLevel: midScope.unlockAtWeaponLevel,
        scopeId: midScope.id,
        zoomLevel: getZoomLevel(midScope),
        reason: "Upgrade to higher zoom",
      });
    }
  }

  // Always end with the target scope (when it unlocks)
  const finalScope = allScopes.find((s) => s.id === finalScopeId);
  if (finalScope) {
    scopeSteps.push({
      minLevel: finalScope.unlockAtWeaponLevel,
      scopeId: finalScope.id,
      zoomLevel: getZoomLevel(finalScope),
      reason: "Target scope unlocked",
    });
  }

  // Remove duplicates (keep only first occurrence of each scope ID)
  const seen = new Set<string>();
  const uniqueSteps = scopeSteps.filter((step) => {
    if (seen.has(step.scopeId)) return false;
    seen.add(step.scopeId);
    return true;
  });

  // Sort by minLevel
  uniqueSteps.sort((a, b) => a.minLevel - b.minLevel);

  return { scopeSteps: uniqueSteps };
}

/**
 * Helper: Get the appropriate scope for a given weapon level.
 *
 * @param level - Current weapon level
 * @param scopePlan - Scope progression plan
 * @returns Scope ID to use at this level
 */
function getScopeForLevel(level: number, scopePlan: ScopeProgressionPlan): string | null {
  if (scopePlan.scopeSteps.length === 0) return null;

  // Find the latest scope step that is unlocked at this level
  let selectedScope: string | null = null;
  for (const step of scopePlan.scopeSteps) {
    if (step.minLevel <= level) {
      selectedScope = step.scopeId;
    } else {
      break; // Steps are sorted by minLevel, so we can stop here
    }
  }

  return selectedScope;
}

/**
 * Check if an attachment is an optic accessory.
 * Optic accessories (canted sights, AG coating, etc.) are gimmicky/niche
 * and should only be used if in final build.
 */
function isOpticAccessory(attachment: PremiumAttachment): boolean {
  return attachment.slotId === 'optic-accessory';
}

/**
 * Score a filler attachment based on alignment with the target build.
 *
 * This function evaluates how well an attachment fits as a "filler" during
 * weapon progression. It considers:
 * - Stat alignment: Does this attachment's stats match the build's focus?
 * - Cost efficiency: Is this attachment good value for its point cost?
 * - One-off prevention: Avoids expensive attachments that don't fit the final build
 * - Complementary value: Universal upgrades like magazines are always good
 * - Unlock timing: Earlier unlocks are preferred for longer use
 *
 * @param attachment - The attachment to score
 * @param statProfile - Build's statistical profile
 * @param targetBySlot - Map of slotId -> targetAttachmentId from final build
 * @param currentLevel - Current weapon level
 * @returns Score (higher = better fit as filler, negative = avoid)
 */
function scoreFillerAttachment(
  attachment: PremiumAttachment,
  statProfile: BuildStatProfile,
  targetBySlot: Record<string, string>,
  currentLevel: number
): number {
  const stats = attachment.attachmentStats;
  if (!stats) return 0; // No stats = neutral score

  // Check if this is an optic accessory and if final build uses optic accessories
  const isOpticAcc = isOpticAccessory(attachment);
  const finalBuildHasOpticAccessory = targetBySlot['optic-accessory'] !== undefined;

  let score = 0;

  // ========== Alignment Score (0-50 points) ==========
  // Bonus for stats that match the build's focus

  if (statProfile.isRecoilFocused) {
    if (typeof stats.horizontalRecoilControl === "number" && stats.horizontalRecoilControl > 1) {
      score += 10;
    }
    if (typeof stats.verticalRecoilControl === "number" && stats.verticalRecoilControl > 1) {
      score += 10;
    }
    if (typeof stats.firstShotRecoilControl === "number" && stats.firstShotRecoilControl > 1) {
      score += 5;
    }
  }

  if (statProfile.isMobilityFocused) {
    if (typeof stats.movementSpeed === "number" && stats.movementSpeed > 1) {
      score += 10;
    }
    if (typeof stats.adsSpeed === "number" && stats.adsSpeed > 1) {
      score += 10;
    }
    if (typeof stats.weaponDrawSpeed === "number" && stats.weaponDrawSpeed > 1) {
      score += 5;
    }
  }

  if (statProfile.isStealthFocused) {
    if (stats.hideInWorldSpotting === true) {
      score += 15;
    }
    if (stats.reduceMinimapDetectionRange === true) {
      score += 15;
    }
  }

  if (statProfile.isRangeFocused) {
    if (typeof stats.bulletVelocity === "number" && stats.bulletVelocity > 1) {
      score += 10;
    }
    if (typeof stats.damageRange === "number" && stats.damageRange > 1) {
      score += 5;
    }
  }

  if (statProfile.isHipFireFocused) {
    if (typeof stats.hipFireAccuracy === "number" && stats.hipFireAccuracy > 1) {
      score += 15;
    }
    // Lasers are good for hip-fire builds
    if (attachment.slotId === "right-accessory" || attachment.slotId === "left-accessory") {
      score += 10;
    }
  }

  // ========== Cost-Efficiency Score (0-30 points) ==========
  // Favor cheap attachments that provide good value

  const points = attachment.point || 0;
  if (points >= 5 && points <= 10) {
    score += 30; // Cheap, always good
  } else if (points >= 11 && points <= 15) {
    score += 20; // Moderate cost
  } else if (points >= 16 && points <= 25) {
    score += 10; // Expensive but okay for key stats
  } else if (points >= 26) {
    score -= 20; // Too expensive for filler
  }

  // ========== One-Off Penalties (-50 points) ==========
  // Avoid expensive attachments that don't fit the final build

  const attName = attachment.name.toLowerCase();

  // Suppressor/flash hider mismatch
  if (attachment.slotId === "muzzle") {
    const isSuppressor = attName.includes("suppressor") || attName.includes("silencer");
    const isFlashHider = attName.includes("flash") && attName.includes("hider");

    if (isSuppressor && statProfile.hasFlashHider && !statProfile.hasSuppressor) {
      score += CONFIG.ONE_OFF_PENALTY; // -50: Don't add suppressor if final has flash hider
    }
    if (isFlashHider && statProfile.hasSuppressor && !statProfile.hasFlashHider) {
      score += CONFIG.ONE_OFF_PENALTY; // -50: Don't add flash hider if final has suppressor
    }

    // If muzzle slot is not in target build, penalize but less severely
    if (!targetBySlot["muzzle"]) {
      score -= 30;
    }
  }

  // Optic accessories: Only use if final build has optic accessories
  if (isOpticAcc && !finalBuildHasOpticAccessory) {
    score += CONFIG.ONE_OFF_PENALTY * 2; // -100: Strong penalty to prevent optic accessories as fillers
  }

  // High-cost attachment that doesn't align with any stat focus
  if (points > 20) {
    const hasStatAlignment =
      (statProfile.isRecoilFocused && (stats.horizontalRecoilControl || stats.verticalRecoilControl)) ||
      (statProfile.isMobilityFocused && (stats.movementSpeed || stats.adsSpeed)) ||
      (statProfile.isStealthFocused && (stats.hideInWorldSpotting || stats.reduceMinimapDetectionRange)) ||
      (statProfile.isRangeFocused && (stats.bulletVelocity || stats.damageRange)) ||
      (statProfile.isHipFireFocused && stats.hipFireAccuracy);

    if (!hasStatAlignment) {
      score -= 40; // Expensive but doesn't help the build focus
    }
  }

  // ========== Complementary Bonus (+10-20 points) ==========
  // Universal upgrades that are always useful

  if (attachment.slotId === "magazine") {
    score += CONFIG.COMPLEMENTARY_BONUS; // +15: Magazines are always good
  }

  if (attachment.slotId === "grip" || attachment.slotId === "underbarrel") {
    if (statProfile.isRecoilFocused || statProfile.isRangeFocused) {
      score += 10; // Grips help recoil-focused builds
    }
  }

  if (attachment.slotId === "right-accessory" || attachment.slotId === "left-accessory") {
    if (statProfile.hipFireWeight > 0.1) {
      score += 10; // Lasers help any build with some hip-fire focus
    }
  }

  if (attachment.slotId === "ammunition" && points >= 5 && points <= 10) {
    score += 5; // Basic ammo upgrades are good
  }

  // ========== Unlock Timing (0-10 points) ==========
  // Prefer attachments unlocked earlier (more time to use them)

  const unlockLevel = attachment.unlockAtWeaponLevel;
  if (unlockLevel === 0) {
    score += 10; // Available immediately
  } else if (unlockLevel <= 10) {
    score += 5; // Unlocks early
  } else if (unlockLevel >= 21) {
    score -= 5; // Unlocks late, won't be useful for long
  }

  return score;
}

// ---------- Per-level loadout, before final build lock-in ----------

/**
 * Build loadout for a specific weapon level.
 *
 * This function creates a balanced loadout for a given level that:
 * 1. Includes target attachments that are unlocked
 * 2. Uses appropriate scopes from the scope progression plan
 * 3. Fills mandatory slots with stat-aligned attachments
 * 4. Adds cost-effective fillers that complement the final build
 *
 * @param meta - Premium modifiers metadata
 * @param build - Target weapon build
 * @param level - Current weapon level
 * @param statProfile - Build's statistical profile
 * @param scopePlan - Scope progression plan
 * @returns Loadout and total points for this level
 */
function buildLoadoutForLevel(
  meta: PremiumMetaFile,
  build: WeaponBuild,
  level: number,
  statProfile: BuildStatProfile,
  scopePlan: ScopeProgressionPlan
): { loadout: Record<string, string>; totalPoints: number } {
  const attachments = meta.attachments;
  const mandatorySlots = meta.mandatorySlots || [];
  const bannedPatterns = computeBannedPatterns(meta.premiumModifiers);
  const attachmentsById = buildIdMap(attachments);

  // Get all attachments unlocked at this level
  const unlocked = attachments.filter(
    (a) => a.unlockAtWeaponLevel <= level
  );

  // Map of slotId -> target attachment ID from final build
  const targetBySlot: Record<string, string> = {};
  for (const ref of build.attachments) {
    targetBySlot[ref.slotId] = ref.id;
  }

  const loadout: Record<string, string> = {};
  const lockedSlots = new Set<string>(); // Slots with target attachments

  // ========== STEP 1: Add Target Attachments ==========
  // Equip any final build attachments that are unlocked at this level
  for (const ref of build.attachments) {
    const metaAtt = attachmentsById[ref.id];
    if (!metaAtt) continue;

    if (metaAtt.unlockAtWeaponLevel <= level) {
      loadout[metaAtt.slotId] = metaAtt.id;
      lockedSlots.add(metaAtt.slotId); // Mark as locked (can't fill)
    }
  }

  // ========== STEP 2: Smart Scope Selection ==========
  // If scope slot is not locked (target scope not unlocked yet), use scope plan
  if (!lockedSlots.has("scope")) {
    const plannedScope = getScopeForLevel(level, scopePlan);
    if (plannedScope) {
      loadout["scope"] = plannedScope;
      lockedSlots.add("scope"); // Mark as locked
    }
  }

  // ========== STEP 3: Fill Mandatory Slots ==========
  // Fill mandatory slots with stat-aligned attachments
  for (const slotId of mandatorySlots) {
    if (lockedSlots.has(slotId)) continue; // Already filled with target or scope

    const candidates = unlocked.filter(
      (a) => a.slotId === slotId && !isBannedAsFiller(a, bannedPatterns)
    );
    if (candidates.length === 0) continue; // No candidates available

    // Score each candidate and select the best one
    const scored = candidates.map((att) => ({
      attachment: att,
      score: scoreFillerAttachment(att, statProfile, targetBySlot, level),
    }));

    scored.sort((a, b) => b.score - a.score); // Sort by score descending

    const best = scored[0];
    if (best) {
      loadout[slotId] = best.attachment.id;
      lockedSlots.add(slotId);
    }
  }

  // ========== STEP 4: Fill Optional Slots with Stats-Aware Fillers ==========
  // Add fillers that complement the build without exceeding point budget
  let totalPoints = sumPoints(loadout, attachmentsById);
  const maxAllowedPoints = MAX_POINTS - CONFIG.POINT_RESERVE; // Leave room for target attachments

  // Get remaining unlocked attachments (not in locked slots)
  const fillerCandidates = unlocked.filter(
    (a) =>
      !lockedSlots.has(a.slotId) && !isBannedAsFiller(a, bannedPatterns)
  );

  // Score and sort all filler candidates
  const scoredFillers = fillerCandidates.map((att) => ({
    attachment: att,
    score: scoreFillerAttachment(att, statProfile, targetBySlot, level),
  }));

  scoredFillers.sort((a, b) => b.score - a.score); // Sort by score descending

  // Add fillers with positive scores until we approach point limit
  for (const item of scoredFillers) {
    const att = item.attachment;

    // Stop if score is negative (bad fit)
    if (item.score <= 0) break;

    // Skip if slot already used
    if (lockedSlots.has(att.slotId)) continue;

    // Check if adding this would exceed point budget
    if (totalPoints + att.point > maxAllowedPoints) continue;

    // Add to loadout
    loadout[att.slotId] = att.id;
    lockedSlots.add(att.slotId);
    totalPoints += att.point;

    // Stop if we're close to limit
    if (totalPoints >= maxAllowedPoints) break;
  }

  // Final safety check: recompute total points
  totalPoints = sumPoints(loadout, attachmentsById);

  // ========== MANDATORY SLOT SAFETY CHECK ==========
  // Ensure ALL mandatory slots are filled, even if source build is invalid
  // This prevents weapons from being unusable due to missing mandatory attachments
  for (const slotId of mandatorySlots) {
    if (loadout[slotId]) continue; // Already has attachment

    // Find the cheapest unlocked attachment for this slot
    const candidates = unlocked.filter((a) => a.slotId === slotId);
    if (candidates.length === 0) continue; // No attachments available (shouldn't happen)

    // Sort by point cost (ascending) to get cheapest option
    candidates.sort((a, b) => a.point - b.point);
    const cheapest = candidates[0];

    loadout[slotId] = cheapest.id;
    console.warn(
      `[MANDATORY SLOT FIX] ${build.id} level ${level}: Added ${cheapest.id} to mandatory slot "${slotId}" (missing from target build)`
    );
  }

  // Recompute total points after mandatory slot fix
  totalPoints = sumPoints(loadout, attachmentsById);

  return { loadout, totalPoints };
}

// When the whole final build is unlocked, we use *exactly* that build.
function buildExactFinal(
  meta: PremiumMetaFile,
  build: WeaponBuild
): { loadout: Record<string, string>; totalPoints: number } {
  const attachmentsById = buildIdMap(meta.attachments);
  const loadout: Record<string, string> = {};

  for (const ref of build.attachments) {
    const metaAtt = attachmentsById[ref.id];
    if (!metaAtt) {
      // Unknown attachment ID in build (should be caught by validation, but double check)
      continue;
    }
    loadout[metaAtt.slotId] = metaAtt.id;
  }

  // ========== MANDATORY SLOT SAFETY CHECK ==========
  // Ensure ALL mandatory slots are filled, even if source build is invalid
  const mandatorySlots = meta.mandatorySlots || [];
  for (const slotId of mandatorySlots) {
    if (loadout[slotId]) continue; // Already has attachment

    // Find the cheapest attachment for this slot
    const candidates = meta.attachments.filter((a) => a.slotId === slotId);
    if (candidates.length === 0) continue; // No attachments available

    // Sort by point cost (ascending) to get cheapest option
    candidates.sort((a, b) => a.point - b.point);
    const cheapest = candidates[0];

    loadout[slotId] = cheapest.id;
    console.warn(
      `[MANDATORY SLOT FIX] ${build.id} final build: Added ${cheapest.id} to mandatory slot "${slotId}" (missing from target build)`
    );
  }

  const totalPoints = sumPoints(loadout, attachmentsById);
  return { loadout, totalPoints };
}

// ---------- Build progression per build ----------

/**
 * Compute the complete level-by-level progression for a build.
 *
 * This function generates a progression that:
 * 1. Analyzes the final build to determine stat priorities
 * 2. Creates a smart scope progression plan
 * 3. Builds level-appropriate loadouts using stats-aware filler selection
 * 4. Optimizes for minimal attachment churn and smooth progression
 *
 * @param meta - Premium modifiers metadata
 * @param build - Target weapon build
 * @param weapon - Weapon information (for weaponGroupId)
 * @returns Array of level states showing loadout at each level
 */
function computeProgressionForBuild(
  meta: PremiumMetaFile,
  build: WeaponBuild,
  weapon: WeaponFile
): LevelState[] {
  const attachmentsById = buildIdMap(meta.attachments);
  const targetMetaAttachments = build.attachments
    .map((r) => attachmentsById[r.id])
    .filter((x): x is PremiumAttachment => !!x);

  if (targetMetaAttachments.length !== build.attachments.length) {
    const missing = build.attachments
      .filter((r) => !attachmentsById[r.id])
      .map((r) => r.id);
    console.warn(
      `Warning: build "${build.id}" references unknown attachment IDs: ${missing.join(
        ", "
      )}`
    );
  }

  const finalUnlockLevel = targetMetaAttachments.reduce(
    (max, a) => Math.max(max, a.unlockAtWeaponLevel),
    0
  );

  // NEW: Analyze build characteristics and create scope progression plan
  const weaponGroupId = (weapon as unknown as { weaponGroupId?: string }).weaponGroupId;
  const statProfile = analyzeBuildStatPriorities(build, meta, weaponGroupId);
  const scopePlan = computeScopeProgression(statProfile, meta);

  const levels: LevelState[] = [];

  // Level 0: starting gun
  const baseLoadout = computeBaseLoadout(meta);
  levels.push({
    level: 0,
    loadout: baseLoadout,
    totalPoints: sumPoints(baseLoadout, attachmentsById),
  });

  for (let level = 1; level <= MAX_LEVEL; level++) {
    let state: LevelState;
    if (level >= finalUnlockLevel) {
      // Use exact final build once everything is unlocked
      const { loadout, totalPoints } = buildExactFinal(meta, build);
      state = { level, loadout, totalPoints };
    } else {
      // Use smart progression until final build is fully unlocked
      const { loadout, totalPoints } = buildLoadoutForLevel(
        meta,
        build,
        level,
        statProfile,
        scopePlan
      );
      state = { level, loadout, totalPoints };
    }

    const prev = levels[levels.length - 1];
    const changed = !loadoutsEqual(prev.loadout, state.loadout);

    // Skip redundant levels, but always include level 1 and MAX_LEVEL
    if (changed || level === 1 || level === MAX_LEVEL) {
      levels.push(state);
    }
  }

  return levels;
}

// ---------- Main ----------

/**
 * Get list of weapon IDs by scanning the cache directory.
 * This replaces the need for a static weapon_list.json file.
 *
 * @param cacheDir - Path to the .cache/weapons directory
 * @returns Array of weapon IDs (filenames without .json extension)
 */
function getWeaponIdsFromCache(cacheDir: string): string[] {
  if (!fs.existsSync(cacheDir)) {
    console.warn(`Cache directory not found: ${cacheDir}`);
    return [];
  }

  const files = fs.readdirSync(cacheDir);
  const weaponIds = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort();

  return weaponIds;
}

function main(): void {
  const ROOT = process.cwd();
  const WEAPONS_DIR = path.join(ROOT, ".cache", "weapons");
  const PREMIUM_DIR = path.join(ROOT, ".cache", "premium-modifiers");
  const OUTPUT_DIR = path.join(ROOT, "data", "precomputed-upgrade-paths");

  ensureDir(OUTPUT_DIR);

  // Get weapon IDs by scanning the cache directory
  const weaponIds = getWeaponIdsFromCache(WEAPONS_DIR);
  console.log(`Found ${weaponIds.length} weapons to process`);

  for (const weaponId of weaponIds) {
    const weaponPath = path.join(WEAPONS_DIR, `${weaponId}.json`);
    const premiumPath = path.join(PREMIUM_DIR, `${weaponId}.json`);

    if (!fs.existsSync(weaponPath)) {
      console.warn(`Skipping ${weaponId}: missing weapon file at ${weaponPath}`);
      continue;
    }
    if (!fs.existsSync(premiumPath)) {
      console.warn(
        `Skipping ${weaponId}: missing premium-modifiers file at ${premiumPath}`
      );
      continue;
    }

    try {
      const rawWeapon = readJson(weaponPath);
      const rawPremium = readJson(premiumPath);

      const weapon = parseWeaponFile(rawWeapon, weaponPath);
      const meta = parsePremiumMeta(rawPremium, premiumPath);

      const buildProgressions: BuildProgressionOutput[] = weapon.builds.map(
        (build) => {
          // Pass weapon to get weaponGroupId for analysis
          const levels = computeProgressionForBuild(meta, build, weapon);

          return {
            buildId: build.id,
            description: build.description,
            playstyleId: build.playstyleId,
            playstyle: build.playstyle,
            levels: levels.map((lvl) => ({
              level: lvl.level,
              totalPoints: lvl.totalPoints,
              attachments: Object.entries(lvl.loadout).map(
                ([slotId, attachmentId]) => ({
                  slotId,
                  attachmentId,
                })
              ),
            })),
          };
        }
      );

      const output: WeaponProgressionOutput = {
        weaponId: weapon.id,
        name: weapon.name,
        buildProgressions,
      };

      const outPath = path.join(OUTPUT_DIR, `${weaponId}.json`);
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
      console.log(`OK: wrote progression for ${weaponId} -> ${outPath}`);
    } catch (err) {
      console.error(
        `Error processing weapon "${weaponId}": ${err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}

main();
