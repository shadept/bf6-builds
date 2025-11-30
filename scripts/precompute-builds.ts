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

// ---------- Per-level loadout, before final build lock-in ----------

function buildLoadoutForLevel(
  meta: PremiumMetaFile,
  build: WeaponBuild,
  level: number
): { loadout: Record<string, string>; totalPoints: number } {
  const attachments = meta.attachments;
  const mandatorySlots = meta.mandatorySlots || [];
  const bannedPatterns = computeBannedPatterns(meta.premiumModifiers);
  const attachmentsById = buildIdMap(attachments);

  const unlocked = attachments.filter(
    (a) => a.unlockAtWeaponLevel <= level
  );

  const targetBySlot: Record<string, string> = {};
  for (const ref of build.attachments) {
    targetBySlot[ref.slotId] = ref.id;
  }

  const loadout: Record<string, string> = {};

  // Step 1: equip target attachments that are unlocked
  for (const ref of build.attachments) {
    const metaAtt = attachmentsById[ref.id];
    if (!metaAtt) continue;
    if (metaAtt.unlockAtWeaponLevel <= level) {
      loadout[metaAtt.slotId] = metaAtt.id;
    }
  }

  // Step 2: fill mandatory slots
  for (const slotId of mandatorySlots) {
    if (loadout[slotId]) continue;
    const candidates = unlocked.filter(
      (a) => a.slotId === slotId && !isBannedAsFiller(a, bannedPatterns)
    );
    if (!candidates.length) continue;
    candidates.sort((a, b) => {
      if (a.point !== b.point) return b.point - a.point; // prefer more points
      return a.unlockAtWeaponLevel - b.unlockAtWeaponLevel;
    });
    loadout[slotId] = candidates[0].id;
  }

  // Step 3: filler (side attachments, lasers, etc.)
  const usedSlots = new Set(Object.keys(loadout));
  const fillerCandidates = unlocked.filter(
    (a) => !isBannedAsFiller(a, bannedPatterns)
  );

  fillerCandidates.sort((a, b) => {
    if (a.point !== b.point) return b.point - a.point;
    return a.unlockAtWeaponLevel - b.unlockAtWeaponLevel;
  });

  let totalPoints = sumPoints(loadout, attachmentsById);

  for (const a of fillerCandidates) {
    if (usedSlots.has(a.slotId)) continue;       // <-- crucial fix
    if (totalPoints + a.point > MAX_POINTS) continue;
    loadout[a.slotId] = a.id;
    usedSlots.add(a.slotId);
    totalPoints += a.point;
  }

  // Safety: recompute from final loadout to avoid any drift
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

  const totalPoints = sumPoints(loadout, attachmentsById);
  return { loadout, totalPoints };
}

// ---------- Build progression per build ----------

function computeProgressionForBuild(
  meta: PremiumMetaFile,
  build: WeaponBuild
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
      const { loadout, totalPoints } = buildExactFinal(meta, build);
      state = { level, loadout, totalPoints };
    } else {
      const { loadout, totalPoints } = buildLoadoutForLevel(meta, build, level);
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

import weaponIds from "../data/weapon_list.json";

function main(): void {
  const ROOT = process.cwd();
  const WEAPONS_DIR = path.join(ROOT, ".cache", "weapons");
  const PREMIUM_DIR = path.join(ROOT, ".cache", "premium-modifiers");
  const OUTPUT_DIR = path.join(ROOT, "data", "precomputed-upgrade-paths");

  ensureDir(OUTPUT_DIR);

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
          const levels = computeProgressionForBuild(meta, build);

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
