# Integrate Premium Modifiers API

## Problem

The weapon details API is missing crucial data:
- **Level-0 default attachments** (e.g., FMJ ammo, BRAKE muzzle, CCO scope)
- **Mandatory slots** information
- **Best build** recommendations
- **Scope tier lists**
- **Special playstyles** (Lowest Recoil, Fastest ADS, Hip Fire)

## Solution

Fetch data from the `/premium-modifiers` endpoint which provides:
```
https://app.battlefieldmeta.gg/api/premium-modifiers?tierListId={tierListId}&weaponId={weaponId}
```

### Data Structure

```typescript
{
  premiumModifiers: { ...statistical/functional modifiers },
  mandatorySlots: ["barrel", "magazine", "ammunition", "scope"],
  attachments: [/* Level-0 defaults and unlocks */],
  bestBuild: {/* Recommended attachments */},
  scopeTierList: ["scope-id-1", "scope-id-2", ...],
  playstyles: [/* Special loadout configs */]
}
```

## Implementation

### 1. Update Schemas

#### [MODIFY] [schemas.ts](file:///c:/Users/Shade/Projects/bf6-upgrades/src/lib/schemas.ts)

Add schema for premium modifiers response.

### 2. Update API Layer  

#### [MODIFY] [api.ts](file:///c:/Users/Shade/Projects/bf6-upgrades/src/lib/api.ts)

- Add `getPremiumModifiers(tierListId, weaponId)` function
- Cache to `.cache/premium-modifiers/{weaponId}.json`
- Add `refreshPremiumModifiers(tierListId, weaponId)` for partial refresh

### 3. Integrate with Upgrade Guide

#### [MODIFY] [upgrade-guide.tsx](file:///c:/Users/Shade/Projects/bf6-upgrades/src/components/upgrade-guide.tsx)

- Fetch premium modifiers data
- Merge level-0 defaults into `enrichedAttachments`
- Use `mandatorySlots` for validation
- Display `bestBuild` recommendations

### 4. Update Weapon Detail Page

#### [MODIFY] [weapon/[id]/page.tsx](file:///c:/Users/Shade/Projects/bf6-upgrades/src/app/weapon/%5Bid%5D/page.tsx)

- Fetch both weapon details AND premium modifiers
- Pass both to UpgradeGuide component

## Verification

1. Verify level-0 defaults appear for KORD-6P67
2. Check FMJ (ammo), BRAKE (muzzle), CCO (scope) at level 0
3. Ensure progression works from defaults to final attachments
4. Test with multiple weapons
