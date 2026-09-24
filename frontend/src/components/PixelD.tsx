// The "Pixel D": seven emerald cells drawing a D on a 3×3 grid, with a
// marigold dot as the eighth cell — a coin, and a nod to the flag's star.
export default function PixelD({
  size = 8,
  gap,
  onDark = false,
}: {
  size?: number;
  gap?: number;
  onDark?: boolean;
}) {
  const cell = onDark ? "#1FBF84" : "#087A54";
  const g = gap ?? Math.max(2, Math.round(size * 0.25));
  const radius = Math.max(1.5, Math.round(size * 0.3));

  const cells = [cell, cell, "dot", cell, null, cell, cell, cell, null];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(3, ${size}px)`,
        gap: `${g}px`,
      }}
    >
      {cells.map((c, i) =>
        c === "dot" ? (
          <div
            key={i}
            style={{ width: size, height: size, background: "#F2B233", borderRadius: "50%" }}
          />
        ) : (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              background: c ?? "transparent",
              borderRadius: radius,
            }}
          />
        )
      )}
    </div>
  );
}
