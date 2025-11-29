import { TierListResponseSchema, WeaponDetailsResponseSchema, PremiumModifiersSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";

const TIERLIST_URL = "https://app.battlefieldmeta.gg/api/tierlist?gameModeId=big-maps";
const WEAPON_URL = "https://app.battlefieldmeta.gg/api/weapons";
const PREMIUM_MODIFIERS_URL = "https://app.battlefieldmeta.gg/api/premium-modifiers";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const WEAPONS_CACHE_DIR = path.join(CACHE_DIR, "weapons");
const PREMIUM_MODIFIERS_CACHE_DIR = path.join(CACHE_DIR, "premium-modifiers");

// Cache utility functions
async function getCachePath(type: "tierlist" | "weapon" | "premium-modifiers", id?: string): Promise<string> {
    if (type === "tierlist") {
        return path.join(CACHE_DIR, "tierlist.json");
    }
    if (type === "premium-modifiers") {
        return path.join(PREMIUM_MODIFIERS_CACHE_DIR, `${id}.json`);
    }
    return path.join(WEAPONS_CACHE_DIR, `${id}.json`);
}

async function readCache<T>(type: "tierlist" | "weapon" | "premium-modifiers", id?: string): Promise<T | null> {
    if (process.env.NODE_ENV !== 'development') return null;

    try {
        const cachePath = await getCachePath(type, id);
        const data = await fs.readFile(cachePath, "utf-8");
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function writeCache<T>(type: "tierlist" | "weapon" | "premium-modifiers", data: T, id?: string): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;

    try {
        const cachePath = await getCachePath(type, id);
        const dir = path.dirname(cachePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.warn(`Failed to write cache for ${type}${id ? ` (${id})` : ''}`, e);
    }
}

export async function getTierList() {
    try {
        const res = await fetch(TIERLIST_URL, {
            next: { tags: ["tierlist"], revalidate: 86400 }, // Cache for 24h
        });

        if (!res.ok) throw new Error("Failed to fetch tierlist");

        const data = await res.json();
        const parsed = TierListResponseSchema.safeParse(data);

        if (!parsed.success) {
            console.error("TierList validation failed:", parsed.error);
            return null;
        }

        // Cache tierlist to individual file
        await writeCache("tierlist", parsed.data);

        return parsed.data;
    } catch (error) {
        console.error("Error fetching tierlist:", error);
        return null;
    }
}

export async function getWeapon(id: string) {
    try {
        const res = await fetch(`${WEAPON_URL}/${id}`, {
            next: { tags: [`weapon-${id}`], revalidate: 86400 },
        });

        if (!res.ok) throw new Error(`Failed to fetch weapon ${id}`);

        const data = await res.json();
        const parsed = WeaponDetailsResponseSchema.safeParse(data);

        if (!parsed.success) {
            console.error(`Weapon ${id} validation failed:`, parsed.error);
            return null;
        }

        // Cache weapon to individual file
        await writeCache("weapon", parsed.data.data, id);

        return parsed.data.data;
    } catch (error) {
        console.error(`Error fetching weapon ${id}:`, error);
        return null;
    }
}

export async function refreshData() {
    "use server";
    revalidatePath("/", "layout");
}

export async function refreshWeapon(id: string) {
    "use server";
    revalidatePath(`/weapon/${id}`, "page");
}

export async function getPremiumModifiers(tierListId: string, weaponId: string) {
    try {
        const url = `${PREMIUM_MODIFIERS_URL}?tierListId=${tierListId}&weaponId=${weaponId}`;
        const res = await fetch(url, {
            next: { tags: [`premium-modifiers-${weaponId}`], revalidate: 86400 },
        });

        if (!res.ok) {
            console.warn(`Premium modifiers not available for ${weaponId} (${res.status})`);
            return null;
        }

        const data = await res.json();
        const parsed = PremiumModifiersSchema.safeParse(data);

        if (!parsed.success) {
            console.warn(`Premium modifiers ${weaponId} validation failed:`, parsed.error);
            return null;
        }

        // Cache premium modifiers to individual file
        await writeCache("premium-modifiers", parsed.data, weaponId);

        return parsed.data;
    } catch (error) {
        console.warn(`Premium modifiers not available for ${weaponId}:`, error);
        return null;
    }
}

export async function refreshPremiumModifiers(tierListId: string, weaponId: string) {
    "use server";
    revalidatePath(`/weapon/${weaponId}`, "page");
}
