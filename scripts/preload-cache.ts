import fs from 'fs';
import path from 'path';

const TIERLIST_URL = "https://app.battlefieldmeta.gg/api/tierlist?gameModeId=big-maps";
const WEAPON_URL = "https://app.battlefieldmeta.gg/api/weapons";
const PREMIUM_MODIFIERS_URL = "https://app.battlefieldmeta.gg/api/premium-modifiers";
const CACHE_DIR = path.join(process.cwd(), '.cache');
const WEAPONS_CACHE_DIR = path.join(CACHE_DIR, 'weapons');
const PREMIUM_MODIFIERS_CACHE_DIR = path.join(CACHE_DIR, 'premium-modifiers');

async function writeCache(filepath: string, data: any) {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

async function main() {
    console.log("Fetching tier list...");
    const res = await fetch(TIERLIST_URL);
    if (!res.ok) {
        throw new Error("Failed to fetch tierlist");
    }
    const tierlistData = await res.json();

    // Cache tierlist
    const tierlistCachePath = path.join(CACHE_DIR, 'tierlist.json');
    writeCache(tierlistCachePath, tierlistData);
    console.log(`✓ Cached tierlist to ${tierlistCachePath}`);

    const weapons = new Map<string, string>();

    // Extract all weapons from rankings
    if (tierlistData.data && tierlistData.data.rankings) {
        Object.values(tierlistData.data.rankings).forEach((tier: any) => {
            tier.forEach((item: any) => {
                if (item.weapon) {
                    weapons.set(item.weapon.id, item.weapon.name);
                }
            });
        });
    }

    console.log(`\nFound ${weapons.size} weapons. Fetching weapon details and premium modifiers...`);

    let successCount = 0;
    let failedWeapons = 0;
    let failedModifiers = 0;

    for (const [id, name] of weapons) {
        const weaponCachePath = path.join(WEAPONS_CACHE_DIR, `${id}.json`);

        // Skip if weapon already cached
        if (fs.existsSync(weaponCachePath)) {
            console.log(`⊘ Skipping ${name} (already cached)`);
            successCount++;

            // Still try to fetch premium modifiers if not cached
            const modifiersCachePath = path.join(PREMIUM_MODIFIERS_CACHE_DIR, `${id}.json`);
            if (!fs.existsSync(modifiersCachePath)) {
                try {
                    const modifiersUrl = `${PREMIUM_MODIFIERS_URL}?tierListId=${tierlistData.data.id}&weaponId=${id}`;
                    const modRes = await fetch(modifiersUrl);
                    if (modRes.ok) {
                        const modData = await modRes.json();
                        writeCache(modifiersCachePath, modData);
                        console.log(`  ✓ Cached premium modifiers for ${name}`);
                    }
                } catch (error) {
                    // Premium modifiers are optional, so just continue
                }
            }
            continue;
        }

        try {
            // Fetch weapon details
            console.log(`Fetching ${name} (${id})...`);
            const weaponRes = await fetch(`${WEAPON_URL}/${id}`);

            if (!weaponRes.ok) {
                console.error(`✗ Failed to fetch ${name}: ${weaponRes.statusText}`);
                failedWeapons++;
                continue;
            }

            const weaponData = await weaponRes.json();
            writeCache(weaponCachePath, weaponData.data);
            console.log(`  ✓ Cached weapon details`);
            successCount++;

            // Fetch premium modifiers (optional)
            try {
                const modifiersUrl = `${PREMIUM_MODIFIERS_URL}?tierListId=${tierlistData.data.id}&weaponId=${id}`;
                const modRes = await fetch(modifiersUrl);

                if (modRes.ok) {
                    const modData = await modRes.json();
                    const modifiersCachePath = path.join(PREMIUM_MODIFIERS_CACHE_DIR, `${id}.json`);
                    writeCache(modifiersCachePath, modData);
                    console.log(`  ✓ Cached premium modifiers`);
                } else {
                    console.log(`  ⊘ Premium modifiers not available (${modRes.status})`);
                }
            } catch (error) {
                console.log(`  ⊘ Premium modifiers not available`);
                failedModifiers++;
            }

        } catch (error) {
            console.error(`✗ Failed to fetch ${name}:`, error);
            failedWeapons++;
        }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Summary:`);
    console.log(`  Tierlist: ✓ Cached`);
    console.log(`  Weapons: ${successCount}/${weapons.size} cached`);
    if (failedWeapons > 0) {
        console.log(`  Failed weapons: ${failedWeapons}`);
    }
    console.log(`${'='.repeat(50)}`);
}

main().catch(console.error);
