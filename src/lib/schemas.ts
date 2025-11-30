import { z } from "zod";

export const AttachmentStatsSchema = z.object({
    movementSpeed: z.number().optional(),
    adsSpeed: z.number().optional(),
    horizontalRecoilControl: z.number().optional(),
    verticalRecoilControl: z.number().optional(),
});

export const SlotSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const AttachmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    summaryName: z.string().nullable().optional(),
    slotId: z.string(),
    description: z.string().nullable().optional(),
    point: z.number(),
    unlockAtWeaponLevel: z.number(),
    slot: SlotSchema.optional(),
    attachmentStats: AttachmentStatsSchema.optional().nullable(),
});

export const PlaystyleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
});

export const BuildAttachmentSchema = z.object({
    id: z.string(),
    attachmentId: z.string(),
});

export const BuildSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    playstyleId: z.string(),
    playstyle: PlaystyleSchema.optional(),
    attachments: z.array(AttachmentSchema),
});

export const WeaponTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const WeaponGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export const WeaponSchema = z.object({
    id: z.string(),
    name: z.string(),
    weaponTypeId: z.string(),
    weaponGroupId: z.string(),
    description: z.string().nullable().optional(),
    unlockAtPlayerLevel: z.number().nullable().optional(),
    imageVersion: z.string().nullable().optional(),
    weaponType: WeaponTypeSchema.optional(),
    weaponGroup: WeaponGroupSchema.optional(),
    builds: z.array(BuildSchema).optional(),
});

export const TierListRankingSchema = z.record(z.string(), z.array(z.string()));

export const TierListResponseSchema = z.object({
    ranking: TierListRankingSchema,
});

export const WeaponDetailsResponseSchema = z.object({
    success: z.boolean(),
    data: WeaponSchema,
});

export const PremiumModifiersSchema = z.object({
    premiumModifiers: z.record(z.string(), z.any()).optional(),
    mandatorySlots: z.array(z.string()).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    bestBuild: z.object({
        attachments: z.array(AttachmentSchema).optional(),
    }).nullable().optional(),
    scopeTierList: z.array(z.string()).optional(),
    playstyles: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        attachments: z.array(AttachmentSchema).optional(),
    })).optional(),
});
