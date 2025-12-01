# BF6 Upgrades

A web application for tracking and planning weapon upgrades in Battlefield 6. This tool helps players optimize their loadouts by providing detailed upgrade paths and recommendations based on meta data.

## Getting Started

### Prerequisites
- Node.js (v20 or later recommended)
- npm

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application
To start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Data Pipeline & Scripts

The project relies on a set of scripts to fetch, process, and prepare data for the application. These scripts are located in the `scripts/` directory.

### 1. Preload Cache
Fetches the latest tier lists, weapon details, and premium modifiers from the external API and stores them in the local `.cache` directory.
```bash
npx ts-node scripts/preload-cache.ts
```

### 2. Download Images
Downloads weapon images for all weapons found in the tier list to `public/assets/weapons`.
```bash
npx ts-node scripts/download-images.ts
```

### 3. Precompute Builds
Generates step-by-step upgrade paths for each weapon. This script uses the cached data to calculate the optimal loadout for every weapon level.
```bash
npx ts-node scripts/precompute-builds.ts
```

### 4. Generate Weapon Details
Aggregates the cached data into a single `data/weapon-details.json` file, which is used by the frontend to display weapon information.
```bash
npx ts-node scripts/generate-weapon-details.ts
```

## Attachment Allocation Algorithm

The **Attachment Allocation Algorithm** (found in `scripts/precompute-builds.ts`) is responsible for determining the best possible loadout for a weapon at any given level (0-40).

The goal is to maximize the weapon's effectiveness within the 100-point limit, while respecting unlock requirements and mandatory slot constraints.

### Logic Overview

For each level, the algorithm constructs a loadout using the following 3-step process:

#### 1. Target Priority
First, the algorithm attempts to equip attachments that are part of the final "Target Build" (the recommended meta build).
- If a target attachment is unlocked at the current level, it is equipped immediately.
- This ensures the player is always working towards the optimal end-game configuration.

#### 2. Mandatory Fill
Next, the algorithm checks for empty **mandatory slots** (e.g., Scope, Ammo, Barrel).
- If a mandatory slot is empty (because the target attachment isn't unlocked yet), the algorithm fills it with the best available temporary option.
- **Selection Criteria**:
    - Candidates are filtered to exclude "banned" fillers (attachments with negative scores).
    - Candidates are sorted by **Points (Descending)**, then by **Unlock Level (Ascending)**.
    - The highest-point option is chosen to maximize power, provided it fits within the point cap.

#### 3. Capacity Utilization (Filler)
Finally, if there are still unused points and empty slots (e.g., Underbarrel, Laser), the algorithm fills them to maximize the weapon's potential.
- It iterates through all remaining unlocked attachments that are not "banned".
- It greedily equips the highest-point attachments that fit into remaining empty slots and the remaining point budget.
- This ensures that even at low levels, the weapon uses its full 100-point potential.

### Base Loadout (Level 0)
For the starting level (Level 0), a special "Base Loadout" is generated.
- It selects the earliest unlocked attachment for each mandatory slot.
- For Scopes, it prioritizes the "Iron Sights" or the scope ranked lowest in the `scopeTierList`.
    - **Ranking Logic**: The rank is determined by the attachment's index in the `scopeTierList` array (0 = lowest/starting tier). The algorithm sorts available scopes by this index and picks the one with the lowest value.
- **Reasoning**: This simulates the **default/stock configuration** of the weapon (e.g., starting with Iron Sights) before the player actively chooses to upgrade to a better optic.

### Optimization
To reduce data size, the precomputation script only saves a new loadout state when the loadout actually changes compared to the previous level. However, Level 1 and Level 40 (Max) are always included for consistency.
