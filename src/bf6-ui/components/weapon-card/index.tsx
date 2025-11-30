import Link from "next/link";
import Image from "next/image";
import { Panel } from "@/bf6-ui/primitives/panel";
import { Heading } from "@/bf6-ui/primitives/typography/Heading";
import { Text } from "@/bf6-ui/primitives/typography/Text";
import { Badge } from "@/bf6-ui/primitives/badge";
import { Button } from "@/bf6-ui/primitives/button";
import { z } from "zod";
import { WeaponSchema } from "@/lib/schemas";

type Weapon = z.infer<typeof WeaponSchema>;

interface WeaponCardProps {
  weapon: Weapon;
  tier: string;
}

export function WeaponCard({ weapon, tier }: WeaponCardProps) {
  return (
    <Panel variant="subtle" className="flex flex-col h-full hover:border-bf-blue/50 transition-colors group">
      <div className="p-6 pb-2">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={tier === "META" ? "meta" : "secondary"}>{tier} TIER</Badge>
          <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
            {weapon.weaponType?.name || weapon.weaponTypeId}
          </Badge>
        </div>
        <Heading level={3} className="group-hover:text-bf-blue transition-colors text-xl">
          {weapon.name}
        </Heading>
      </div>

      <div className="px-6 pb-4 flex-grow">
        <div className="relative w-full h-32 mb-4 bg-slate-900/50 rounded-md overflow-hidden">
          <Image
            src={`/assets/weapons/${weapon.id}.png`}
            alt={weapon.name}
            fill
            className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <Text variant="muted" className="line-clamp-2">
          {weapon.description || "No description available."}
        </Text>
        <Text variant="xs" className="mt-4 uppercase tracking-wider text-slate-500">
          {weapon.weaponGroup?.name}
        </Text>
      </div>

      <div className="p-6 pt-0 mt-auto">
        <Button asChild className="w-full" variant="default">
          <Link href={`/weapon/${weapon.id}`}>Upgrade Guide</Link>
        </Button>
      </div>
    </Panel>
  );
}
