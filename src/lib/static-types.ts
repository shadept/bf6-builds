export interface AttachmentStats {
    movementSpeed?: number;
    adsSpeed?: number;
    horizontalRecoilControl?: number;
    verticalRecoilControl?: number;
    [key: string]: unknown;
}

export interface StaticAttachment {
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

export interface StaticWeaponDetails {
    id: string;
    name: string;
    description?: string;
    image: string;
    type: string;
    group: string;
    attachments: StaticAttachment[];
}

export interface ProgressionLevel {
    level: number;
    totalPoints: number;
    attachments: {
        slotId: string;
        attachmentId: string;
    }[];
}

export interface BuildProgression {
    buildId: string;
    description?: string;
    playstyleId?: string;
    playstyle?: {
        id: string;
        name: string;
        description?: string;
    };
    levels: ProgressionLevel[];
}

export interface WeaponProgression {
    weaponId: string;
    name: string;
    buildProgressions: BuildProgression[];
}
