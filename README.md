# bf6-upgrades

Analyse BF6 weapon data and generate upgrade recommendations.
100 point system per weapon, new unlocks every few levels. Attatchments can be added until point limit (one per slot) but required replacing an existing attachement or downgrading another one before being inserted if no point left.

### Data Endpoint
List all weapons
https://app.battlefieldmeta.gg/api/tierlist?gameModeId=big-maps

Weapon specific details
https://app.battlefieldmeta.gg/api/weapons/{weapon_name}

Weapon attachments, playstyle and upgrade recommendations
https://app.battlefieldmeta.gg/api/premium-modifiers?tierListId=f5CvkV1cifewbB1mrnbMyQcEy0S2-big-maps&weaponId={weapon_name}

### Example
https://app.battlefieldmeta.gg/api/weapons/kord-6p67
