import { cn } from "@/lib/utils";

interface PointsDisplayProps {
    usedPoints: number;
    maxPoints?: number;
}

export function PointsDisplay({ usedPoints, maxPoints = 100 }: PointsDisplayProps) {
    const pointsPerTriangle = 5;
    const trianglesPerSquare = 2;
    const pointsPerSquare = pointsPerTriangle * trianglesPerSquare; // 10 points per square
    const totalSquares = maxPoints / pointsPerSquare; // 100 / 10 = 10 squares

    return (
        <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalSquares }).map((_, squareIndex) => {
                // Calculate how many points are used in this square
                const squareStartPoints = squareIndex * pointsPerSquare;
                const squareEndPoints = squareStartPoints + pointsPerSquare;
                const pointsInThisSquare = Math.max(0, Math.min(pointsPerSquare, usedPoints - squareStartPoints));

                // Each triangle = 5 points
                // First triangle fills when we have >= 5 points in this square
                // Second triangle fills when we have >= 10 points in this square
                const fillTopTriangle = pointsInThisSquare >= 5;
                const fillBottomTriangle = pointsInThisSquare >= 10;

                return (
                    <div key={squareIndex} className="relative w-4 h-4">
                        {/* Square split into 2 triangles with gap */}
                        <svg viewBox="0 0 10 10" className="w-full h-full">
                            {/* Top-left triangle (first 5 points) - inset from diagonal */}
                            <path
                                d="M 0 0 L 9 0 L 0 9 Z"
                                className={cn(
                                    fillTopTriangle ? "fill-slate-400 stroke-slate-400" : "fill-slate-700 stroke-slate-700"
                                )}
                                strokeWidth="0.5"
                            />
                            {/* Bottom-right triangle (second 5 points) - inset from diagonal */}
                            <path
                                d="M 10 1 L 10 10 L 1 10 Z"
                                className={cn(
                                    fillBottomTriangle ? "fill-slate-400 stroke-slate-400" : "fill-slate-700 stroke-slate-700"
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
