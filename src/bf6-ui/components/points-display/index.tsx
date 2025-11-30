import { cn } from "@/lib/utils";

interface PointsDisplayProps {
  usedPoints: number;
  maxPoints?: number;
}

export function PointsDisplay({ usedPoints, maxPoints = 100 }: PointsDisplayProps) {
  const pointsPerTriangle = 5;
  const trianglesPerSquare = 2;
  const pointsPerSquare = pointsPerTriangle * trianglesPerSquare;
  const totalSquares = maxPoints / pointsPerSquare;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: totalSquares }).map((_, squareIndex) => {
        const squareStartPoints = squareIndex * pointsPerSquare;
        const squareEndPoints = squareStartPoints + pointsPerSquare;
        const pointsInThisSquare = Math.max(
          0,
          Math.min(pointsPerSquare, usedPoints - squareStartPoints)
        );
        const fillTopTriangle = pointsInThisSquare >= 5;
        const fillBottomTriangle = pointsInThisSquare >= 10;
        return (
          <div key={squareIndex} className="relative w-4 h-4">
            <svg viewBox="0 0 10 10" className="w-full h-full">
              <path
                d="M 0 0 L 9 0 L 0 9 Z"
                className={cn(
                  fillTopTriangle
                    ? "fill-slate-400 stroke-slate-400"
                    : "fill-slate-700 stroke-slate-700"
                )}
                strokeWidth="0.5"
              />
              <path
                d="M 10 1 L 10 10 L 1 10 Z"
                className={cn(
                  fillBottomTriangle
                    ? "fill-slate-400 stroke-slate-400"
                    : "fill-slate-700 stroke-slate-700"
                )}
                strokeWidth="0.5"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
