import * as fs from "node:fs";
import * as path from "node:path";

// Types based on schemas and existing scripts
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

interface WeaponBuild {
    id: string;
    name?: string;
    description?: string;
    playstyleId?: string;
    playstyle?: {
        id: string;
        name: string;
        description?: string;
    };
    attachments: {
        id: string;
        slotId: string;
        description?: string;
    }[];
}

interface Weapon {
    id: string;
    name: string;
    weaponTypeId: string;
    weaponGroupId: string;
    description?: string;
    unlockAtPlayerLevel?: number;
    imageVersion?: string;
    weaponType?: {
        id: string;
        name: string;
    };
    weaponGroup?: {
        id: string;
        name: string;
    };
    builds?: WeaponBuild[];
}

interface WeaponDetails {
    id: string;
    name: string;
    description?: string;
    image: string;
    type: string;
    group: string;
    attachments: PremiumAttachment[];
}

function readJson(filePath: string): any {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
}

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function main() {
    const ROOT = process.cwd();
    const WEAPONS_DIR = path.join(ROOT, ".cache", "weapons");
    const PREMIUM_DIR = path.join(ROOT, ".cache", "premium-modifiers");
    const OUTPUT_DIR = path.join(ROOT, "data");
    const OUTPUT_FILE = path.join(OUTPUT_DIR, "weapon-details.json");

    // Get list of weapons from data/weapon_list.json if it exists, otherwise scan directory
    let weaponIds: string[] = [];
    const weaponListPath = path.join(ROOT, "data", "weapon_list.json");

    if (fs.existsSync(weaponListPath)) {
        weaponIds = readJson(weaponListPath);
    } else {
        console.log("weapon_list.json not found, scanning .cache/weapons...");
        const files = fs.readdirSync(WEAPONS_DIR);
        weaponIds = files
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(".json", ""));
    }

    const allWeaponDetails: WeaponDetails[] = [];

    for (const weaponId of weaponIds) {
        const weaponPath = path.join(WEAPONS_DIR, `${weaponId}.json`);
        const premiumPath = path.join(PREMIUM_DIR, `${weaponId}.json`);

        if (!fs.existsSync(weaponPath)) {
            console.warn(`Skipping ${weaponId}: missing weapon file at ${weaponPath}`);
            continue;
        }

        try {
            const weaponData = readJson(weaponPath) as Weapon;
            let attachments: PremiumAttachment[] = [];

            if (fs.existsSync(premiumPath)) {
                const premiumData = readJson(premiumPath);
                if (premiumData.attachments && Array.isArray(premiumData.attachments)) {
                    attachments = premiumData.attachments;
                }
            } else {
                console.warn(`Warning: No premium modifiers found for ${weaponId}, attachments list will be empty.`);
            }

            // Extract descriptions from weapon builds if available
            if (weaponData.builds && Array.isArray(weaponData.builds)) {
                const descriptionMap = new Map<string, string>();

                for (const build of weaponData.builds) {
                    if (build.attachments && Array.isArray(build.attachments)) {
                        for (const buildAtt of build.attachments) {
                            if (buildAtt.id && buildAtt.description) {
                                descriptionMap.set(buildAtt.id, buildAtt.description);
                            }
                        }
                    }
                }

                // Update attachments with descriptions from builds
                for (const att of attachments) {
                    if ((!att.description || att.description === "") && descriptionMap.has(att.id)) {
                        att.description = descriptionMap.get(att.id);
                    }
                }
            }

            const details: WeaponDetails = {
                id: weaponData.id,
                name: weaponData.name,
                description: weaponData.description || undefined,
                image: `/assets/weapons/${weaponData.id}.png`,
                type: weaponData.weaponType?.name || weaponData.weaponTypeId,
                group: weaponData.weaponGroup?.name || weaponData.weaponGroupId,
                attachments: attachments
            };

            allWeaponDetails.push(details);
            console.log(`Processed ${weaponId}`);

        } catch (err) {
            console.error(`Error processing weapon "${weaponId}":`, err);
        }
    }

    ensureDir(OUTPUT_DIR);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allWeaponDetails, null, 2), "utf8");
    console.log(`\nSuccessfully generated weapon details for ${allWeaponDetails.length} weapons.`);
    console.log(`Output written to: ${OUTPUT_FILE}`);

    // Process and simplify tierlist.json
    const TIERLIST_CACHE = path.join(ROOT, ".cache", "tierlist.json");
    const TIERLIST_OUTPUT = path.join(OUTPUT_DIR, "tierlist.json");
    if (fs.existsSync(TIERLIST_CACHE)) {
        const tierlistData = readJson(TIERLIST_CACHE);

        // Extract only the ranking information (weapon IDs and their tiers)
        const simplifiedTierlist = {
            ranking: tierlistData?.data?.tierList?.ranking || {}
        };

        fs.writeFileSync(TIERLIST_OUTPUT, JSON.stringify(simplifiedTierlist, null, 2), "utf8");
        console.log(`Simplified and copied tierlist.json to ${TIERLIST_OUTPUT}`);
    } else {
        console.warn("Warning: .cache/tierlist.json not found.");
    }
}

main();
