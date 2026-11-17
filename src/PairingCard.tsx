import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
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

// Palette — from the concept's visual brief
const INK = "#0F1217";
const BOARD = "#141821";
const STONE_DARK = "#1D222A";
const STONE_MID = "#2B313B";
const STONE_WARM = "#3A3326";
const CRUST = "#5C4A2A";
const LICHEN = "#C9A24A";
const BONE = "#E8DCBE";
const BONE_DIM = "#B5A882";

// ── Hexagonal mosaic generation ───────────────────────────────────────
// Working in a 1080 × 900 "plan view" coordinate space then scaled into a
// frame on the 1080×1350 poster.

type Hex = {
  q: number;
  r: number;
  x: number;
  y: number;
  shade: string;
  sides: number; // 6 for a true hexagon, 5/7 for fault cells
  rotate: number;
};

const R = 48; // pointy-top hex radius (center to vertex)
const HEX_DX = Math.sqrt(3) * R; // horizontal step for pointy-top
const HEX_DY = 1.5 * R; // vertical step

// Pointy-top hex: vertices at 30°, 90°, 150°, 210°, 270°, 330°
const hexPoints = (cx: number, cy: number, r: number, sides = 6, rot = 0): string => {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const ang = ((360 / sides) * i + 30 + rot) * (Math.PI / 180);
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
};

// Deterministic hash → 0..1
const hash2 = (a: number, b: number): number => {
  let h = 2166136261 ^ (a * 374761393) ^ (b * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
};

const toneForHex = (q: number, r: number): string => {
  const v = hash2(q, r);
  if (v < 0.05) return "#4A3C22"; // warm iron oxide
  if (v < 0.13) return STONE_WARM; // deeper warm
  if (v < 0.45) return STONE_DARK;
  if (v < 0.80) return STONE_MID;
  return "#3F4854"; // slightly brighter blue-gray
};

// Which cells wear a dusting of Xanthoria lichen (gold)
const hasLichen = (q: number, r: number): boolean => {
  const v = hash2(q + 50, r + 50);
  return v < 0.06;
};

// Build the mosaic. Pointy-top grid; axial coordinates (q,r).
const buildMosaic = (cx: number, cy: number, radius: number): Hex[] => {
  const cells: Hex[] = [];
  const range = 7;
  for (let q = -range; q <= range; q++) {
    for (let r = -range; r <= range; r++) {
      const s = -q - r;
      if (Math.abs(s) > range) continue;
      const x = cx + HEX_DX * (q + r / 2);
      const y = cy + HEX_DY * r;
      // keep inside a rounded disk, with a little buffer for cell radius
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius - R * 0.4) continue;
      const h = hash2(q + 100, r + 100);
      // Rare 5- or 7-sided "faults" among the hexagons
      let sides = 6;
      let rotate = 0;
      if (q === -2 && r === 3) {
        sides = 5;
        rotate = 10;
      } else if (q === 3 && r === -2) {
        sides = 7;
        rotate = -6;
      } else if (q === -3 && r === 0) {
        sides = 5;
        rotate = -14;
      } else if (q === 2 && r === 2) {
        sides = 7;
        rotate = 8;
      }
      cells.push({
        q,
        r,
        x,
        y,
        shade: toneForHex(q, r),
        sides,
        rotate: h * 2 - 1 + rotate, // tiny irregularity for realism
      });
    }
  }
  // Sort growth order by distance from center so cracks propagate outward.
  cells.sort((a, b) => {
    const da = Math.hypot(a.x - cx, a.y - cy);
    const db = Math.hypot(b.x - cx, b.y - cy);
    return da - db;
  });
  return cells;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──────────────────────────────────────────────────────────
  const GROW_START = fps * 0.1;
  const GROW_SPAN = fps * 2.2;
  const grow = (frame - GROW_START) / GROW_SPAN;

  const dividersSpring = spring({
    frame: frame - fps * 2.2,
    fps,
    config: { damping: 180, mass: 1.2, stiffness: 90 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350 portrait) ─────────────────────────────
  // Top metadata band: 56..
  // Plan frame        : 130..840 (h ≈ 710, w 960)
  // Title lockup      : 895..
  // Footer            : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 710 };

  // Mosaic plan space: 1080 × 900 → scaled into FRAME
  const PLAN_W = 1080;
  const PLAN_H = 900;
  const scale = FRAME.w / PLAN_W; // = ~0.8889

  const mosaicCX = PLAN_W / 2 - 30;
  const mosaicCY = PLAN_H / 2 - 40;
  const MOSAIC_R = 340;
  const cells = buildMosaic(mosaicCX, mosaicCY, MOSAIC_R);

  // ── 120° callout anchor: a 3-way joint between central hexes ────
  // Pointy-top joints are at the vertex-corners; one sits directly above the
  // centre at (cx, cy - R).
  const callAnchor = { x: mosaicCX, y: mosaicCY - R };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: BONE_DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: LICHEN }}>2026 · 11 · 17</span>
      </div>

      {/* Frame + plan drawing */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="board-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#1B202A" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          <pattern
            id="paper-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1A1F28" strokeWidth={1} />
          </pattern>

          <linearGradient id="col-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A414D" />
            <stop offset="100%" stopColor="#242933" />
          </linearGradient>

          <clipPath id="frame-clip">
            <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} />
          </clipPath>
        </defs>

        {/* Drafting board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#board-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#paper-grid)"
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2D333E"
          strokeWidth={1}
        />

        {/* Corner crop marks (lichen gold) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={LICHEN} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate title (top-left of plan) */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 36})`}
          fill={BONE_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
        >
          <text>PLATE III · PLAN VIEW · COLUMN JOINTS</text>
        </g>

        {/* Scale bar — bottom-left of frame */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + FRAME.h - 28})`}
          stroke={BONE_DIM}
          fill={BONE_DIM}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={100} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={50} y1={-3} x2={50} y2={3} strokeWidth={1.2} />
          <line x1={100} y1={-5} x2={100} y2={5} strokeWidth={1.2} />
          <text x={110} y={4} stroke="none">
            40 CM
          </text>
        </g>

        {/* Mosaic — scale plan space into FRAME (clipped to frame) */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y}) scale(${scale})`}
          clipPath="url(#frame-clip)"
          style={{ clipPath: "url(#frame-clip)" }}
        >
          {/* Faint under-circle (the mason's layout circle) */}
          <circle
            cx={mosaicCX}
            cy={mosaicCY}
            r={MOSAIC_R + 24}
            fill="none"
            stroke={CRUST}
            strokeOpacity={Math.min(0.35, Math.max(0, grow) * 0.45)}
            strokeWidth={1.1}
            strokeDasharray="4 6"
          />

          {/* Cells. Per-cell spring reveal from center outward. */}
          {cells.map((c, i) => {
            // Normalized distance from center (0 at center, 1 at radius)
            const d = Math.hypot(c.x - mosaicCX, c.y - mosaicCY);
            const dN = Math.min(1, d / MOSAIC_R);
            const localT = (grow - dN * 0.65) / 0.4;
            const appear = Math.max(0, Math.min(1, localT));
            const eased = 1 - Math.pow(1 - appear, 3);
            if (eased <= 0.001) return null;
            const r = R * 0.985; // tiny gap
            const points = hexPoints(c.x, c.y, r, c.sides, c.rotate);
            const isFault = c.sides !== 6;
            // Simulated directional light from top-left: brighten upper-left
            // edges, shade the lower-right ones. Build a highlight sliver.
            const topHiPoints = hexPoints(c.x - 1.4, c.y - 1.4, r, c.sides, c.rotate);
            const botShPoints = hexPoints(c.x + 1.6, c.y + 1.6, r, c.sides, c.rotate);
            const lichen = hasLichen(c.q, c.r);
            return (
              <g key={`hex-${i}`} opacity={eased}>
                {/* Lower-right ambient shadow (very subtle) */}
                <polygon
                  points={botShPoints}
                  fill="none"
                  stroke="#060810"
                  strokeOpacity={0.45}
                  strokeWidth={1.2}
                />
                {/* Base face */}
                <polygon
                  points={points}
                  fill={c.shade}
                  stroke={isFault ? CRUST : "#0A0D12"}
                  strokeWidth={isFault ? 1.5 : 1.1}
                />
                {/* Top-left sunlit edge */}
                <polygon
                  points={topHiPoints}
                  fill="none"
                  stroke={BONE}
                  strokeOpacity={0.09}
                  strokeWidth={0.8}
                />
                {/* Xanthoria lichen dusting on select cells */}
                {lichen && (
                  <>
                    <circle
                      cx={c.x - R * 0.35}
                      cy={c.y - R * 0.15}
                      r={R * 0.22}
                      fill={LICHEN}
                      opacity={0.42}
                    />
                    <circle
                      cx={c.x - R * 0.1}
                      cy={c.y - R * 0.45}
                      r={R * 0.12}
                      fill={LICHEN}
                      opacity={0.3}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Highlight the central hex more */}
          <polygon
            points={hexPoints(mosaicCX, mosaicCY, R * 0.985)}
            fill="url(#col-face)"
            stroke={LICHEN}
            strokeOpacity={Math.max(0, grow - 0.2) * 0.6}
            strokeWidth={1.4}
          />

          {/* ── 120° callout ─────────────────────────────────────── */}
          {(() => {
            const show = Math.max(0, Math.min(1, (grow - 0.85) * 3));
            if (show <= 0) return null;
            // The three joint arms meeting at callAnchor at 120° apart.
            // Angles relative to +x axis: 30°, 150°, 270° (pointy-top joint).
            const armLen = 70;
            const rays = [30, 150, 270].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return {
                x: callAnchor.x + armLen * Math.cos(a),
                y: callAnchor.y + armLen * Math.sin(a),
                a,
              };
            });
            // Arc between 30° and 150° (the top-interior 120° wedge)
            const arcR = 34;
            const a0 = (30 * Math.PI) / 180;
            const a1 = (150 * Math.PI) / 180;
            const ax0 = callAnchor.x + arcR * Math.cos(a0);
            const ay0 = callAnchor.y + arcR * Math.sin(a0);
            const ax1 = callAnchor.x + arcR * Math.cos(a1);
            const ay1 = callAnchor.y + arcR * Math.sin(a1);
            // Annotation anchor to the LEFT of the mosaic (empty quadrant).
            const annX = 60;
            const annY = callAnchor.y + 110;
            return (
              <g opacity={show}>
                {rays.map((p, i) => (
                  <line
                    key={`ray-${i}`}
                    x1={callAnchor.x}
                    y1={callAnchor.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={LICHEN}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))}
                <path
                  d={`M ${ax0} ${ay0} A ${arcR} ${arcR} 0 0 1 ${ax1} ${ay1}`}
                  fill="none"
                  stroke={LICHEN}
                  strokeWidth={1.6}
                />
                <text
                  x={callAnchor.x}
                  y={callAnchor.y - arcR - 10}
                  textAnchor="middle"
                  fill={LICHEN}
                  fontFamily={inter}
                  fontSize={22}
                  fontWeight={600}
                  letterSpacing={2}
                >
                  120°
                </text>
                {/* Leader out to annotation in LEFT margin */}
                {(() => {
                  const originX = callAnchor.x + armLen * Math.cos((150 * Math.PI) / 180);
                  const originY = callAnchor.y + armLen * Math.sin((150 * Math.PI) / 180);
                  const kinkX = annX + 40;
                  const kinkY = originY + 30;
                  return (
                    <>
                      <polyline
                        points={`${originX},${originY} ${kinkX},${kinkY} ${kinkX},${annY - 14}`}
                        fill="none"
                        stroke={LICHEN}
                        strokeWidth={1.1}
                      />
                      <circle cx={originX} cy={originY} r={3} fill={LICHEN} />
                    </>
                  );
                })()}
                <g>
                  <text
                    x={annX}
                    y={annY}
                    fill={LICHEN}
                    fontFamily={inter}
                    fontSize={14}
                    fontWeight={600}
                    letterSpacing={2.8}
                  >
                    3-WAY JOINT
                  </text>
                  <text
                    x={annX}
                    y={annY + 22}
                    fill={BONE_DIM}
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={500}
                    letterSpacing={2.4}
                  >
                    MIN-ENERGY
                  </text>
                  <text
                    x={annX}
                    y={annY + 38}
                    fill={BONE_DIM}
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={500}
                    letterSpacing={2.4}
                  >
                    FRACTURE
                  </text>
                </g>
              </g>
            );
          })()}

        </g>

        {/* ── Spec stamp (top-right of frame) — drawn in page coords so it
             sits reliably on top of the mosaic. ─────────────────────── */}
        {(() => {
          const show = dividersSpring;
          if (show <= 0.001) return null;
          const panelW = 270;
          const panelH = 150;
          const px = FRAME.x + FRAME.w - 26 - panelW;
          const py = FRAME.y + 54;
          const headerH = 16;
          const titleY = py + 36;
          const rowY = py + 68;
          const rowH = 26;
          return (
            <g opacity={show}>
              {/* Backdrop */}
              <rect
                x={px}
                y={py}
                width={panelW}
                height={panelH}
                rx={2}
                fill={INK}
                fillOpacity={0.96}
                stroke={LICHEN}
                strokeWidth={1.3}
              />
              {/* Header bar tint */}
              <rect
                x={px}
                y={py}
                width={panelW}
                height={headerH}
                fill={LICHEN}
                fillOpacity={0.18}
              />
              {/* Corner specimen-tag tick */}
              <polygon
                points={`${px + panelW},${py} ${px + panelW},${py + 14} ${px + panelW - 14},${py}`}
                fill={LICHEN}
              />
              {/* Title */}
              <text
                x={px + 18}
                y={titleY}
                fill={LICHEN}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={3}
              >
                SPEC · COLUMNAR BASALT
              </text>
              {/* Divider */}
              <line
                x1={px + 18}
                y1={titleY + 10}
                x2={px + panelW - 18}
                y2={titleY + 10}
                stroke={LICHEN}
                strokeOpacity={0.45}
                strokeWidth={1}
              />
              {/* Key-value rows */}
              {[
                ["JOINT ANGLE", "120°"],
                ["POLYGON", "HEXAGON"],
                ["FRACTURE", "MIN-ENERGY"],
              ].map(([k, v], i) => (
                <g key={`spec-${i}`}>
                  <text
                    x={px + 18}
                    y={rowY + i * rowH}
                    fill={BONE_DIM}
                    fontFamily={inter}
                    fontSize={11}
                    fontWeight={500}
                    letterSpacing={2.4}
                  >
                    {k}
                  </text>
                  <text
                    x={px + panelW - 18}
                    y={rowY + i * rowH}
                    textAnchor="end"
                    fill={BONE}
                    fontFamily={inter}
                    fontSize={12}
                    fontWeight={600}
                    letterSpacing={2.4}
                  >
                    {v}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Caption strip just below the drafting frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={BONE_DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · COLUMNAR JOINTING · BASALT, UNIFORM COOLING</text>
          <text x={FRAME.w} textAnchor="end" fill={LICHEN} opacity={0.9}>
            HALES · HONEYCOMB THEOREM · 1999
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: LICHEN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: BONE_DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: BONE, letterSpacing: 5 }}>Stonemason</span>
        </div>

        <div
          style={{
            color: "#F4EEDC",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The honeycomb
          <br />
          mason.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#CFC9B4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 890,
            opacity: hookOpacity,
          }}
        >
          As basaltic lava cools uniformly, contraction cracks seek the fracture pattern that spends the least elastic energy —{" "}
          <span style={{ color: LICHEN, fontWeight: 600 }}>a hexagonal tiling</span>
          {" "}— which is why the ~40,000 columns at the Giant's Causeway meet at 120°.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: BONE_DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Hales · Discrete &amp; Comp. Geom. 25 (2001) 1–22</span>
        <span>
          <span style={{ color: LICHEN }}>●</span> Hex = min-perimeter tile
        </span>
      </div>
    </AbsoluteFill>
  );
};
