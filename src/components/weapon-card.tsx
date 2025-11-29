import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeaponSchema } from "@/lib/schemas";
import { z } from "zod";

type Weapon = z.infer<typeof WeaponSchema>;

interface WeaponCardProps {
    weapon: Weapon;
    tier: string;
}

export function WeaponCard({ weapon, tier }: WeaponCardProps) {
    return (
        <Card className="flex flex-col h-full hover:border-bf-blue/50 transition-colors group">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <Badge variant={tier === "META" ? "meta" : "secondary"} className="mb-2">
                        {tier} TIER
                    </Badge>
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                        {weapon.weaponType?.name || weapon.weaponTypeId}
                    </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-bf-blue transition-colors">
                    {weapon.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-slate-400 line-clamp-2">
                    {weapon.description || "No description available."}
                </p>
                <div className="mt-4 text-xs text-slate-500 uppercase tracking-wider">
                    {weapon.weaponGroup?.name}
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full" variant="default">
                    <Link href={`/weapon/${weapon.id}`}>
                        Upgrade Guide
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
