
import fs from 'fs';
import path from 'path';

const TIERLIST_URL = "https://app.battlefieldmeta.gg/api/tierlist?gameModeId=big-maps";
const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets', 'weapons');

async function downloadImage(url: string, filepath: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
}

async function main() {
    console.log("Fetching tier list...");
    const res = await fetch(TIERLIST_URL);
    if (!res.ok) {
        throw new Error("Failed to fetch tierlist");
    }
    const data = await res.json();

    if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    const weapons = new Map();

    // Extract all weapons from rankings
    if (data.data && data.data.rankings) {
        Object.values(data.data.rankings).forEach((tier: any) => {
            tier.forEach((item: any) => {
                if (item.weapon) {
                    weapons.set(item.weapon.id, item.weapon.name);
                }
            });
        });
    }

    console.log(`Found ${weapons.size} weapons.`);

    for (const [id, name] of weapons) {
        // Try different variations of the name if needed. 
        // The user said {weapon_name}, usually this means the display name but URL encoded.
        // Or sometimes it's a specific slug. 
        // Let's try the name directly first.

        // Some names might have special characters.
        // const encodedName = encodeURIComponent(name.replace(' ', '-').replace('.', '').toLowerCase());
        const imageUrl = `https://img.wzstats.gg/${id}/gunDisplayLoadouts`;
        const filename = path.join(ASSETS_DIR, `${id}.png`);

        if (fs.existsSync(filename)) {
            console.log(`Skipping ${name} (already exists)`);
            continue;
        }

        try {
            console.log(`Downloading ${name} from ${imageUrl}...`);
            await downloadImage(imageUrl, filename);
            console.log(`Saved ${name} to ${filename}`);
        } catch (error) {
            console.error(`Failed to download ${name}:`, error);
        }
    }
}

main().catch(console.error);
