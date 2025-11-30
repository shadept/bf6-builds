import { Panel } from "@/bf6-ui/primitives/panel";
import { Heading } from "@/bf6-ui/primitives/typography/Heading";
import { Text } from "@/bf6-ui/primitives/typography/Text";
import { Badge } from "@/bf6-ui/primitives/badge";
import { Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentCardProps {
  name: string;
  description?: string;
  slot: string;
  points: number;
  unlockLevel: number;
  status: "active" | "new" | "removed";
}

export function AttachmentCard({ name, description, slot, points, unlockLevel, status }: AttachmentCardProps) {
  const variant =
    status === "removed"
      ? "destructive"
      : status === "new"
        ? "accent"
        : "subtle";

  return (
    <Panel variant={variant} className="transition-all duration-300 p-4 relative">
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="text-[10px] border-slate-600">
          {slot}
        </Badge>
        {status === "removed" ? (
          <Badge variant="destructive" className="text-[10px] animate-pulse">
            REMOVED
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-slate-600">
            Lvl {unlockLevel}
          </Badge>
        )}
      </div>

      <Heading level={4} className={cn(status === "removed" ? "text-red-400 line-through" : "text-white", "mt-1 text-lg")}>{name}</Heading>

      <div className="mt-2 flex items-start justify-between gap-2">
        <Text variant="muted" className="line-clamp-2 flex-1">
          {description || "No description"}
        </Text>
        <div className="flex items-center gap-1 text-bf-orange font-mono font-bold ml-2 whitespace-nowrap">
            <Zap className="w-3 h-3" />
            {points}
          </div>
      </div>
    </Panel>
  );
}