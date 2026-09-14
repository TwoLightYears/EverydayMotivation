import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// Palette from the concept brief
const INK = "#0B0E13";
const GOLD = "#FFC857";
const MAGENTA = "#E85D91";
const TEAL = "#2FB6C8";
const VIOLET = "#7A8CFF";
const GRAY = "#8A8F99";
const TYPE_HI = "#F1F2F5";
const RULE = "#1F242D";

// -- colour helpers ---------------------------------------------------------
const hexToRgb = (h: string) => {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ] as const;
};
const rgbToHex = (r: number, g: number, b: number) => {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
};
const mix = (a: string, b: string, t: number) => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
};
const shade = (c: string, amount: number) => mix(c, INK, amount);
const tint = (c: string, amount: number) => mix(c, "#FFFFFF", amount);

// -- isometric projection --------------------------------------------------
const ISO_C = Math.cos(Math.PI / 6); // 0.866
const ISO_S = Math.sin(Math.PI / 6); // 0.5
type P3 = { x: number; y: number; z: number };
const iso = (p: P3, cx: number, cy: number) => ({
  x: cx + (p.x - p.z) * ISO_C,
  y: cy - p.y + (p.x + p.z) * ISO_S,
});

// -- stairs (bottom → top): outer half-side s, height range [y0,y1],
//    top-face colour, oxide thickness (nm), reflected wavelength (nm).
type Stair = {
  s: number;
  y0: number;
  y1: number;
  color: string;
  t: number;
  lambda: number;
};
const STAIRS: Stair[] = [
  { s: 168, y0:   0, y1:  22, color: MAGENTA,                     t: 178, lambda: 545 },
  { s: 148, y0:  22, y1:  44, color: mix(MAGENTA, GOLD, 0.4),     t: 152, lambda: 585 },
  { s: 128, y0:  44, y1:  66, color: GOLD,                        t: 128, lambda: 615 },
  { s: 108, y0:  66, y1:  88, color: tint(GOLD, 0.2),             t:  98, lambda: 575 },
  { s:  88, y0:  88, y1: 110, color: mix(GOLD, TEAL, 0.55),       t:  82, lambda: 520 },
  { s:  68, y0: 110, y1: 132, color: TEAL,                        t:  62, lambda: 490 },
  { s:  48, y0: 132, y1: 154, color: mix(TEAL, VIOLET, 0.55),     t:  48, lambda: 455 },
  { s:  28, y0: 154, y1: 176, color: VIOLET,                      t:  36, lambda: 435 },
];

// side faces (facing +x and +z, i.e. right and front) — darker
const rightFaceOf = (s: Stair) => shade(s.color, 0.55);
const frontFaceOf = (s: Stair) => shade(s.color, 0.42);

// -- component --------------------------------------------------------------
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Total build-in: ~1.4 s for stairs, then title/hook
  const STAIR_DELAY = 3;   // frames per stair
  const STAIR_DUR = 12;

  const titleSpring = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.9, fps * 2.6],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Crystal placement on the workspace plate
  const PLATE = { x: 60, y: 130, w: 960, h: 720 };
  const CRYSTAL_CX = 380; // inside the plate
  const CRYSTAL_CY = 620; // baseline y — near the bottom of the plate

  // Chip strip placement
  const CHIP_X = 640;
  const CHIP_Y0 = 226;
  const CHIP_W = 296;
  const CHIP_H = 68;
  const CHIP_GAP = 16;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Top metadata band ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GOLD }}>2026 · 09 · 14</span>
      </div>

      {/* ── Workspace plate + crystal + chip strip ─────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Faint drafting grid */}
          <pattern id="grid-fine" x={PLATE.x} y={PLATE.y} width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={RULE} strokeWidth={1} />
          </pattern>
          <pattern id="grid-major" x={PLATE.x} y={PLATE.y} width={160} height={160} patternUnits="userSpaceOnUse">
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#242A36" strokeWidth={1} />
          </pattern>

          <radialGradient id="plate-vignette" cx="35%" cy="55%" r="80%">
            <stop offset="0%" stopColor="#141822" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Ground shadow beneath the crystal */}
          <radialGradient id="ground-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000" stopOpacity={0.55} />
            <stop offset="60%" stopColor="#000" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Plate + grid */}
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#plate-vignette)" />
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#grid-fine)" />
        <rect x={PLATE.x} y={PLATE.y} width={PLATE.w} height={PLATE.h} fill="url(#grid-major)" />
        <rect x={PLATE.x + 0.5} y={PLATE.y + 0.5} width={PLATE.w - 1} height={PLATE.h - 1} fill="none" stroke="#2A303B" strokeWidth={1} />

        {/* Corner ticks */}
        {(
          [
            [PLATE.x, PLATE.y, 1, 1],
            [PLATE.x + PLATE.w, PLATE.y, -1, 1],
            [PLATE.x, PLATE.y + PLATE.h, 1, -1],
            [PLATE.x + PLATE.w, PLATE.y + PLATE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GOLD} strokeWidth={1.5} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Fig label inside the plate */}
        <text
          x={PLATE.x + 24}
          y={PLATE.y + 34}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3}
        >
          FIG. 1 · Bi(s) HOPPER CRYSTAL — TERRACE OXIDE
        </text>

        {/* Baseline rule under the crystal */}
        <line
          x1={PLATE.x + 40}
          y1={CRYSTAL_CY + 40}
          x2={PLATE.x + 540}
          y2={CRYSTAL_CY + 40}
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Ground shadow */}
        <ellipse
          cx={CRYSTAL_CX + PLATE.x - 60}
          cy={CRYSTAL_CY + 34}
          rx={240}
          ry={30}
          fill="url(#ground-shadow)"
        />


        {/* ── The bismuth hopper crystal ─────────────────────────────── */}
        {(() => {
          // origin of the crystal (world 0,0,0) in svg coords
          const OX = PLATE.x + CRYSTAL_CX - 60;
          const OY = CRYSTAL_CY;

          return STAIRS.map((stair, i) => {
            // Reveal per stair
            const startFrame = i * STAIR_DELAY;
            const local = Math.max(0, Math.min(1, (frame - startFrame) / STAIR_DUR));
            const eased = 1 - Math.pow(1 - local, 3);
            const yLift = (1 - eased) * 24;
            const op = eased;

            const s = stair.s;
            const yBot = stair.y0;
            const yTop = stair.y1;

            // Corners on the TOP face
            const A = iso({ x:  s, y: yTop, z: -s }, OX, OY); // back-right (top)
            const B = iso({ x:  s, y: yTop, z:  s }, OX, OY); // front-right (top)
            const C = iso({ x: -s, y: yTop, z:  s }, OX, OY); // front-left (top)
            const D = iso({ x: -s, y: yTop, z: -s }, OX, OY); // back-left (top)

            // Right side face (x = +s): from top A→B down to bottom
            const Bb = iso({ x:  s, y: yBot, z:  s }, OX, OY);
            const Ab = iso({ x:  s, y: yBot, z: -s }, OX, OY);
            // Front side face (z = +s): from top C→B down to bottom
            const Cb = iso({ x: -s, y: yBot, z:  s }, OX, OY);

            const topPath = `M ${A.x} ${A.y - yLift} L ${B.x} ${B.y - yLift} L ${C.x} ${C.y - yLift} L ${D.x} ${D.y - yLift} Z`;
            const rightPath = `M ${A.x} ${A.y - yLift} L ${B.x} ${B.y - yLift} L ${Bb.x} ${Bb.y - yLift} L ${Ab.x} ${Ab.y - yLift} Z`;
            const frontPath = `M ${C.x} ${C.y - yLift} L ${B.x} ${B.y - yLift} L ${Bb.x} ${Bb.y - yLift} L ${Cb.x} ${Cb.y - yLift} Z`;

            // Highlight rim along front edge of top face (subtle specular)
            const rimX1 = C.x;
            const rimY1 = C.y - yLift;
            const rimX2 = B.x;
            const rimY2 = B.y - yLift;

            return (
              <g key={i} opacity={op}>
                <path d={rightPath} fill={rightFaceOf(stair)} stroke={INK} strokeWidth={1} />
                <path d={frontPath} fill={frontFaceOf(stair)} stroke={INK} strokeWidth={1} />
                <path d={topPath} fill={stair.color} stroke={INK} strokeWidth={1} />
                {/* highlight along the front top-face edge */}
                <line
                  x1={rimX1}
                  y1={rimY1}
                  x2={rimX2}
                  y2={rimY2}
                  stroke={tint(stair.color, 0.55)}
                  strokeWidth={1.2}
                  opacity={0.9}
                />
              </g>
            );
          });
        })()}

        {/* Callouts: "Bi (s)" for the metal core, and "Bi₂O₃ FILM · d ≈ 30–250 nm"
            for the oxide skin.  Both fade in after the crystal materialises. */}
        {(() => {
          const OX = PLATE.x + CRYSTAL_CX - 60;
          const OY = CRYSTAL_CY;
          const showFrom = fps * 1.0;
          const op = interpolate(frame, [showFrom, showFrom + fps * 0.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // 1) Bi(s) at top peak — leader kinks right
          const top = iso({ x: 0, y: 176, z: 0 }, OX, OY);

          // 2) Oxide film — target midpoint of the front edge of stair-2's top face.
          //    Anchor the label inside the plate's LEFT margin so it never clips.
          const oxideStair = STAIRS[2];
          const target = iso(
            { x: -oxideStair.s * 0.4, y: oxideStair.y1, z: oxideStair.s },
            OX,
            OY,
          );
          const labelX = PLATE.x + 42;
          const kinkX = Math.max(labelX + 132, target.x - 60);
          const kinkY = target.y - 74;

          return (
            <g opacity={op}>
              {/* Bi(s) — top peak */}
              <line x1={top.x} y1={top.y - 6} x2={top.x + 40} y2={top.y - 44} stroke={GRAY} strokeWidth={1} />
              <line x1={top.x + 40} y1={top.y - 44} x2={top.x + 116} y2={top.y - 44} stroke={GRAY} strokeWidth={1} />
              <text
                x={top.x + 124}
                y={top.y - 40}
                fill={GRAY}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={3}
              >
                Bi (s)
              </text>

              {/* Bi₂O₃ oxide film — anchored bottom-left */}
              <circle cx={target.x} cy={target.y} r={4.2} fill="none" stroke={GOLD} strokeWidth={1.4} />
              <line x1={target.x - 3} y1={target.y - 3} x2={kinkX} y2={kinkY} stroke={GOLD} strokeWidth={1} />
              <line x1={kinkX} y1={kinkY} x2={labelX + 132} y2={kinkY} stroke={GOLD} strokeWidth={1} />
              <text
                x={labelX}
                y={kinkY - 4}
                fill={GOLD}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={3}
              >
                Bi₂O₃ FILM
              </text>
              <text
                x={labelX}
                y={kinkY + 14}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={500}
                letterSpacing={2.4}
              >
                d ≈ 30–250 nm
              </text>
            </g>
          );
        })()}

        {/* ── Chip strip (colourist's palette) ─────────────────────── */}
        {(() => {
          const CHIP_FROM_TOP = [
            STAIRS[7], // violet — thinnest
            STAIRS[5], // teal
            STAIRS[3], // pale gold
            STAIRS[2], // gold
            STAIRS[0], // magenta — thickest
          ];
          const legendY = CHIP_Y0 - 34;
          return (
            <g>
              <text
                x={PLATE.x + CHIP_X}
                y={legendY}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                fontWeight={600}
                letterSpacing={3}
              >
                COLOURIST'S CHIP STRIP
              </text>
              <text
                x={PLATE.x + CHIP_X}
                y={legendY + 18}
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                fontWeight={400}
                letterSpacing={2}
                opacity={0.7}
              >
                Bi₂O₃ film thickness · reflected λ
              </text>

              {CHIP_FROM_TOP.map((chip, i) => {
                const y = PLATE.y + CHIP_Y0 + i * (CHIP_H + CHIP_GAP);
                const revealStart = 6 + i * 3;
                const rev = interpolate(
                  frame,
                  [revealStart, revealStart + 14],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
                );
                const dx = (1 - rev) * 12;
                return (
                  <g key={i} opacity={rev} transform={`translate(${dx}, 0)`}>
                    {/* Swatch tile */}
                    <rect
                      x={PLATE.x + CHIP_X}
                      y={y}
                      width={CHIP_H}
                      height={CHIP_H}
                      fill={chip.color}
                    />
                    {/* Metadata block */}
                    <rect
                      x={PLATE.x + CHIP_X + CHIP_H}
                      y={y}
                      width={CHIP_W - CHIP_H}
                      height={CHIP_H}
                      fill="#101319"
                      stroke={RULE}
                      strokeWidth={1}
                    />
                    <text
                      x={PLATE.x + CHIP_X + CHIP_H + 14}
                      y={y + 26}
                      fill={TYPE_HI}
                      fontFamily={inter}
                      fontSize={17}
                      fontWeight={600}
                      letterSpacing={0.5}
                    >
                      {chip.t} nm
                    </text>
                    <text
                      x={PLATE.x + CHIP_X + CHIP_H + 14}
                      y={y + 48}
                      fill={GRAY}
                      fontFamily={inter}
                      fontSize={11}
                      fontWeight={500}
                      letterSpacing={2.4}
                    >
                      λ ≈ {chip.lambda} nm
                    </text>
                    {/* colour hex, right-aligned */}
                    <text
                      x={PLATE.x + CHIP_X + CHIP_W - 14}
                      y={y + CHIP_H - 12}
                      textAnchor="end"
                      fill="#4A5060"
                      fontFamily={inter}
                      fontSize={10}
                      fontWeight={500}
                      letterSpacing={2}
                    >
                      {chip.color.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* Bottom caption row inside the plate */}
        <text
          x={PLATE.x + 24}
          y={PLATE.y + PLATE.h - 22}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3}
        >
          THIN-FILM INTERFERENCE · 2 n d cos θ ≈ m λ
        </text>
        <text
          x={PLATE.x + PLATE.w - 24}
          y={PLATE.y + PLATE.h - 22}
          textAnchor="end"
          fill={GOLD}
          fontFamily={inter}
          fontSize={11}
          fontWeight={500}
          letterSpacing={3}
          opacity={0.85}
        >
          Bi · Z = 83 · m.p. 271.4 °C · n(Bi₂O₃) ≈ 2.2
        </text>
      </svg>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 900,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: TYPE_HI, letterSpacing: 5 }}>Colourist</span>
        </div>

        <div
          style={{
            color: TYPE_HI,
            fontFamily: playfair,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.98,
            letterSpacing: -1.6,
          }}
        >
          The mineral
          <br />
          that paints itself.
        </div>

        <div
          style={{
            marginTop: 34,
            color: "#C7CAD2",
            fontFamily: inter,
            fontSize: 20,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 860,
            opacity: hookOpacity,
          }}
        >
          The rainbow on a{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>bismuth</span> hopper
          crystal is not pigment. As the metal cools it grows a{" "}
          <span style={{ color: TEAL, fontWeight: 600 }}>Bi₂O₃</span> skin only
          tens to hundreds of nanometres thick — and each terrace's specific
          thickness{" "}
          <span style={{ color: MAGENTA, fontWeight: 600 }}>
            cancels a specific wavelength
          </span>{" "}
          by thin-film interference. Bismuth paints itself, one nanometre at a
          time.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Thin-film interference · Bi₂O₃ on Bi(s)</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: MAGENTA, display: "inline-block" }} />
            <span style={{ width: 10, height: 10, borderRadius: 10, background: GOLD, display: "inline-block" }} />
            <span style={{ width: 10, height: 10, borderRadius: 10, background: TEAL, display: "inline-block" }} />
            <span style={{ width: 10, height: 10, borderRadius: 10, background: VIOLET, display: "inline-block" }} />
          </span>
          <span>Terrace = Swatch</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
