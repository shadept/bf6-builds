
const TIERLIST_URL = "https://app.battlefieldmeta.gg/api/tierlist?gameModeId=big-maps";

async function main() {
    const res = await fetch(TIERLIST_URL);
    if (!res.ok) {
        throw new Error("Failed to fetch tierlist");
    }
    const data = await res.json();

    if (data.data && data.data.rankings) {
        Object.values(data.data.rankings).forEach((tier: any) => {
            tier.forEach((item: any) => {
                if (item.weapon) {
                    if (item.weapon.name.toLowerCase().includes('mini') || item.weapon.id.toLowerCase().includes('mini')) {
                        console.log(`Found possible match: ID=${item.weapon.id}, Name=${item.weapon.name}`);
                    }
                }
            });
        });
    }
}

main().catch(console.error);
