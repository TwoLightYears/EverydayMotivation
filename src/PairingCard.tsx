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

// Palette — from the concept brief
const INK = "#171009";
const PARCHMENT = "#1F160E";
const FLESH = "#F0B39D";
const FLESH_DEEP = "#C88670";
const IVORY = "#F5D89C";
const COPPER = "#B87333";
const COPPER_BRIGHT = "#D89250";
const GRAY = "#7C6250";
const GRID = "#241A11";
const GRID_MAJOR = "#2B1F14";

// ── Layout ─────────────────────────────────────────────────────────────
// 1080 × 1350 portrait.
// Top meta band          : 56
// Plate frame            : 70..870 (h 800, w 940)
// Type lockup            : 900..1230
// Footer                 : 1290..
const FRAME = { x: 70, y: 130, w: 940, h: 720 };

// Mole-rat silhouette path — a stylised right-facing profile drawn as an
// anatomical plate. Coordinate space: local, mounted into "specimen" panel.
const MOLE_PATH = `
M 742 168
C 736 150, 720 138, 696 132
C 682 118, 660 108, 636 106
C 612 96, 582 90, 548 90
C 500 84, 440 84, 380 92
C 320 100, 264 118, 214 140
C 176 156, 140 176, 112 194
C 96 202, 82 210, 66 214
C 52 218, 44 214, 44 208
C 46 200, 58 190, 78 186
C 100 180, 128 176, 156 174
C 128 190, 108 210, 100 232
C 96 242, 100 250, 112 250
C 138 250, 168 244, 196 236
C 232 250, 274 258, 320 262
C 330 274, 344 282, 360 284
C 388 288, 416 282, 434 268
C 456 274, 484 276, 512 276
C 522 288, 540 296, 560 296
C 588 296, 610 288, 622 274
C 646 268, 668 258, 686 244
C 706 228, 722 208, 732 190
C 736 184, 740 176, 742 168 Z
`;

// Snout / nose tip — small rounded triangle at the right end
const SNOUT_PATH = `
M 720 158
C 736 156, 748 160, 752 168
C 752 176, 744 180, 732 180
C 720 180, 712 174, 712 168
C 712 162, 716 158, 720 158 Z
`;

// Front paws (right side of body) — stubby digging paws with 3 claws
const FRONT_PAW_R_LEG = `M 592 288 C 592 300, 596 308, 604 312`;
const FRONT_PAW_R_CLAWS = `
M 602 310 L 599 320
M 606 311 L 605 322
M 610 310 L 613 320
`;
const FRONT_PAW_L_LEG = `M 550 286 C 548 300, 552 306, 560 310`;
const FRONT_PAW_L_CLAWS = `
M 559 308 L 556 316
M 562 309 L 562 318
M 565 308 L 568 316
`;

// Hind paw (left side / rump)
const HIND_PAW_LEG = `M 220 258 C 224 272, 232 282, 244 288`;
const HIND_PAW_CLAWS = `
M 242 285 L 240 295
M 246 285 L 246 298
M 250 285 L 253 295
`;

// Tail — thin wire curl at the left end
const TAIL_PATH = `
M 62 200
C 40 190, 22 172, 26 152
C 30 138, 44 132, 58 138
`;

// Wrinkles / skin folds
const WRINKLE_1 = `M 520 106 C 528 116, 538 122, 552 122`;
const WRINKLE_2 = `M 460 100 C 470 112, 486 118, 502 118`;
const WRINKLE_3 = `M 388 96 C 400 108, 418 116, 436 116`;
const WRINKLE_4 = `M 600 250 C 606 260, 616 266, 630 266`;

// Buck teeth (paired incisors) — visible past the snout
const TOOTH_PATH = `M 726 170 L 740 174 L 738 186 L 726 184 Z`;
const TOOTH_PATH_2 = `M 724 172 L 730 172 L 728 188 L 722 186 Z`;

// Eye
const EYE = { x: 668, y: 152, r: 3.2 };

// Nostril
const NOSTRIL = { x: 742, y: 168, r: 1.6 };

// Anatomy targets on the mole-rat coord space
const BRAIN = { x: 656, y: 148 };
const HEART = { x: 456, y: 200 };

// Sugar-hexagon coords (glucose / fructose)
const hex = (cx: number, cy: number, r: number) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
};

const hexPath = (cx: number, cy: number, r: number) => {
  const p = hex(cx, cy, r);
  return `M ${p.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
};

// Vertex labels — "H", "OH", "CH2OH" etc. — real positional glucose/fructose diffs.
// Glucose (pyranose, aldose): C1 = CHO (top vertex is C1 with -H, -OH). Position C6 is -CH2OH outside ring.
// Fructose (furanose in body, but here we schematically show the ketose distinction with -CH2OH at C1).
// For a poster we render a stylised 6-ring with distinctive substituents.

// Vertex offset directions for a labelled hex (index 0 at top going clockwise)
const vertexLabelOffset = (i: number, r: number): [number, number] => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3;
  return [Math.cos(a) * (r + 18), Math.sin(a) * (r + 18)];
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ──
  // Beat 1: 0..1.0s  — plate frame + specimen line-in
  // Beat 2: 1.0..2.4s — organ glyphs light up
  // Beat 3: 1.4..3.6s — glucose→fructose transmutation
  // Beat 4: 3.6..5.0s — pulse loop; O2 ticker
  const t = frame / fps;

  const specimenReveal = Math.min(1, t / 1.0);
  const specimenEased = Easing.out(Easing.cubic)(specimenReveal);

  const brainSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 12, mass: 0.5 },
  });
  const heartSpring = spring({
    frame: frame - fps * 1.35,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const transmute = interpolate(t, [1.4, 3.4], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // O2 ticker: 21% → 0% between t=1.6..3.8
  const o2 = interpolate(t, [1.6, 3.8], [21, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Copper pulse along transmutation arrow after transmute finishes
  const pulseCycle = ((frame - fps * 3.4) % (fps * 2.4)) / (fps * 2.4);
  const pulseActive = t > 3.4;

  // ── Compose SVG plate ────────────────────────────────────────────────
  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 62,
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
        <span style={{ color: COPPER }}>2026 · 09 · 19</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern
            id="grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#231810" stopOpacity={1} />
            <stop offset="100%" stopColor={PARCHMENT} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="organ-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COPPER_BRIGHT} stopOpacity={0.85} />
            <stop offset="100%" stopColor={COPPER} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="flesh-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FLESH} stopOpacity={0.95} />
            <stop offset="100%" stopColor={FLESH_DEEP} stopOpacity={0.85} />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Plate background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#plate-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#33241A"
          strokeWidth={1}
        />

        {/* Corner cartouche ticks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={COPPER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 28} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 28} />
          </g>
        ))}

        {/* Plate title cartouche */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
        >
          <text textAnchor="start">PLATE III · SPECIMEN &amp; TRANSMUTATION</text>
        </g>

        {/* Plate index (top-right) */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 34})`}
          fill={COPPER}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
        >
          <text textAnchor="end">HETEROCEPHALUS GLABER · KHK · GLUT5</text>
        </g>

        {/* Divider between specimen (top) and reaction (bottom) inside the plate */}
        <line
          x1={FRAME.x + 40}
          y1={FRAME.y + 400}
          x2={FRAME.x + FRAME.w - 40}
          y2={FRAME.y + 400}
          stroke="#33241A"
          strokeWidth={1}
        />
        <text
          x={FRAME.x + 40}
          y={FRAME.y + 422}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          FIG. 1 · SPECIMEN IN PROFILE
        </text>
        <text
          x={FRAME.x + FRAME.w - 40}
          y={FRAME.y + 422}
          textAnchor="end"
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          FIG. 2 · METABOLIC TRANSMUTATION
        </text>

        {/* ── FIG.1: Specimen ─────────────────────────────────────── */}
        <g transform={`translate(${FRAME.x + 60}, ${FRAME.y + 62}) scale(1.02)`}>
          {/* Baseline under the mole-rat */}
          <line
            x1={20}
            y1={318}
            x2={760}
            y2={318}
            stroke={GRAY}
            strokeWidth={0.8}
            strokeDasharray="4 6"
            opacity={0.55}
          />

          {/* Body fill (drawn under the outline, appears after outline draws) */}
          <g
            opacity={interpolate(specimenReveal, [0.55, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <path d={MOLE_PATH} fill="url(#flesh-fill)" opacity={0.6} />
            <path d={SNOUT_PATH} fill={FLESH_DEEP} opacity={0.85} />
          </g>

          {/* Tail — draws first */}
          {(() => {
            const LEN = 120;
            const off = LEN * (1 - Math.min(1, specimenEased * 1.4));
            return (
              <path
                d={TAIL_PATH}
                fill="none"
                stroke={COPPER}
                strokeWidth={1.4}
                strokeDasharray={LEN}
                strokeDashoffset={off}
                strokeLinecap="round"
              />
            );
          })()}

          {/* Outline draws in */}
          {(() => {
            const LEN = 3200;
            const off = LEN * (1 - specimenEased);
            return (
              <>
                <path
                  d={MOLE_PATH}
                  fill="none"
                  stroke={COPPER}
                  strokeWidth={1.8}
                  strokeDasharray={LEN}
                  strokeDashoffset={off}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={SNOUT_PATH}
                  fill="none"
                  stroke={COPPER}
                  strokeWidth={1.4}
                  strokeDasharray={220}
                  strokeDashoffset={220 * (1 - specimenEased)}
                />
              </>
            );
          })()}

          {/* Paws — draw after body */}
          <g
            opacity={Math.min(1, Math.max(0, specimenReveal - 0.55) * 2.5)}
            stroke={COPPER}
            fill="none"
            strokeLinecap="round"
          >
            <g strokeWidth={1.6}>
              <path d={FRONT_PAW_R_LEG} />
              <path d={FRONT_PAW_L_LEG} />
              <path d={HIND_PAW_LEG} />
            </g>
            <g strokeWidth={1.1} stroke={COPPER_BRIGHT}>
              <path d={FRONT_PAW_R_CLAWS} />
              <path d={FRONT_PAW_L_CLAWS} />
              <path d={HIND_PAW_CLAWS} />
            </g>
          </g>

          {/* Skin-fold wrinkles */}
          <g
            opacity={Math.min(1, Math.max(0, specimenReveal - 0.65) * 3)}
            stroke={COPPER}
            strokeWidth={0.8}
            fill="none"
          >
            <path d={WRINKLE_1} />
            <path d={WRINKLE_2} />
            <path d={WRINKLE_3} />
            <path d={WRINKLE_4} />
          </g>

          {/* Teeth */}
          <g opacity={Math.min(1, Math.max(0, specimenReveal - 0.55) * 3)}>
            <path d={TOOTH_PATH} fill={IVORY} stroke={COPPER} strokeWidth={0.8} />
            <path d={TOOTH_PATH_2} fill={IVORY} stroke={COPPER} strokeWidth={0.8} />
          </g>

          {/* Eye */}
          <g opacity={Math.min(1, Math.max(0, specimenReveal - 0.6) * 3)}>
            <circle cx={EYE.x} cy={EYE.y} r={EYE.r} fill={INK} />
            <circle cx={EYE.x - 0.8} cy={EYE.y - 0.8} r={0.9} fill={IVORY} />
          </g>

          {/* Nostril */}
          <g opacity={Math.min(1, Math.max(0, specimenReveal - 0.6) * 3)}>
            <circle cx={NOSTRIL.x - 2} cy={NOSTRIL.y - 4} r={NOSTRIL.r} fill={INK} />
          </g>

          {/* Whiskers */}
          <g
            stroke={GRAY}
            strokeWidth={0.8}
            opacity={Math.min(1, Math.max(0, specimenReveal - 0.72) * 3)}
          >
            <line x1={748} y1={166} x2={806} y2={150} />
            <line x1={748} y1={172} x2={810} y2={172} />
            <line x1={748} y1={178} x2={806} y2={196} />
          </g>

          {/* Anatomy targets — brain & heart */}
          {/* Brain */}
          <g
            transform={`translate(${BRAIN.x}, ${BRAIN.y})`}
            opacity={brainSpring}
          >
            <circle
              r={26}
              fill="url(#organ-glow)"
              opacity={0.35 + 0.4 * brainSpring}
            />
            <circle
              r={8}
              fill={COPPER}
              stroke={COPPER_BRIGHT}
              strokeWidth={1.5}
              filter="url(#soft-glow)"
            />
            <text
              y={4}
              textAnchor="middle"
              fontFamily={playfair}
              fontSize={12}
              fill={IVORY}
              fontWeight={600}
            >
              ☿
            </text>
          </g>
          {/* Heart */}
          <g
            transform={`translate(${HEART.x}, ${HEART.y})`}
            opacity={heartSpring}
          >
            <circle
              r={26}
              fill="url(#organ-glow)"
              opacity={0.35 + 0.4 * heartSpring}
            />
            <circle
              r={8}
              fill={COPPER}
              stroke={COPPER_BRIGHT}
              strokeWidth={1.5}
              filter="url(#soft-glow)"
            />
            <text
              y={4}
              textAnchor="middle"
              fontFamily={playfair}
              fontSize={12}
              fill={IVORY}
              fontWeight={600}
            >
              ♀
            </text>
          </g>

          {/* Callout label — BRAIN (upper right) */}
          <g
            fontFamily={inter}
            fontSize={11}
            fill={IVORY}
            letterSpacing={3}
            fontWeight={600}
            opacity={Math.min(brainSpring, 1)}
          >
            <line
              x1={BRAIN.x + 4}
              y1={BRAIN.y - 8}
              x2={BRAIN.x + 40}
              y2={BRAIN.y - 46}
              stroke={COPPER}
              strokeWidth={1}
            />
            <line
              x1={BRAIN.x + 40}
              y1={BRAIN.y - 46}
              x2={BRAIN.x + 128}
              y2={BRAIN.y - 46}
              stroke={COPPER}
              strokeWidth={1}
            />
            <text x={BRAIN.x + 136} y={BRAIN.y - 42}>
              BRAIN · KHK↑
            </text>
          </g>

          {/* Callout label — HEART (lower left) */}
          <g
            fontFamily={inter}
            fontSize={11}
            fill={IVORY}
            letterSpacing={3}
            fontWeight={600}
            opacity={Math.min(heartSpring, 1)}
          >
            <line
              x1={HEART.x - 4}
              y1={HEART.y + 8}
              x2={HEART.x - 40}
              y2={HEART.y + 60}
              stroke={COPPER}
              strokeWidth={1}
            />
            <line
              x1={HEART.x - 40}
              y1={HEART.y + 60}
              x2={HEART.x - 160}
              y2={HEART.y + 60}
              stroke={COPPER}
              strokeWidth={1}
            />
            <text x={HEART.x - 168} y={HEART.y + 64} textAnchor="end">
              MYOCARDIUM · GLUT5↑
            </text>
          </g>

        </g>

        {/* ── FIG.2: Transmutation Diagram ───────────────────────── */}
        <g transform={`translate(${FRAME.x + 40}, ${FRAME.y + 450})`}>
          {(() => {
            const cxL = 150;
            const cxR = 780;
            const cy = 100;
            const R = 60;

            // Left hex (glucose) — solid at start, dissolves during transmute
            const leftAlpha = interpolate(transmute, [0, 0.5], [1, 0.15], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            // Right hex (fructose) — assembles during transmute
            const rightAlpha = interpolate(transmute, [0.4, 1], [0.15, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            // Copper particles migrating L→R
            const PARTICLES = 22;

            return (
              <g>
                {/* Glucose */}
                <g opacity={leftAlpha}>
                  <path
                    d={hexPath(cxL, cy, R)}
                    fill="none"
                    stroke={COPPER}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                  />
                  {/* Vertex substituents (glucose-style: aldose C1 top) */}
                  {["CHO", "H·OH", "OH·H", "H·OH", "H·OH", "CH₂OH"].map(
                    (lab, i) => {
                      const [dx, dy] = vertexLabelOffset(i, R);
                      return (
                        <text
                          key={i}
                          x={cxL + dx}
                          y={cy + dy + 4}
                          textAnchor="middle"
                          fontFamily={inter}
                          fontSize={10}
                          fill={IVORY}
                          letterSpacing={1.5}
                          fontWeight={500}
                        >
                          {lab}
                        </text>
                      );
                    },
                  )}
                  <text
                    x={cxL}
                    y={cy + 6}
                    textAnchor="middle"
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={22}
                    fill={IVORY}
                    fontWeight={500}
                  >
                    C₆H₁₂O₆
                  </text>
                  <text
                    x={cxL}
                    y={cy + R + 44}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={12}
                    fill={COPPER}
                    letterSpacing={5}
                    fontWeight={600}
                  >
                    GLUCOSE
                  </text>
                  <text
                    x={cxL}
                    y={cy + R + 60}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={10}
                    fill={GRAY}
                    letterSpacing={3}
                    fontWeight={500}
                  >
                    ALDOSE · C1 = CHO
                  </text>
                </g>

                {/* Fructose */}
                <g opacity={rightAlpha}>
                  <path
                    d={hexPath(cxR, cy, R)}
                    fill="none"
                    stroke={COPPER_BRIGHT}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                    filter="url(#soft-glow)"
                  />
                  {["CH₂OH", "C=O", "HO·H", "H·OH", "H·OH", "CH₂OH"].map(
                    (lab, i) => {
                      const [dx, dy] = vertexLabelOffset(i, R);
                      return (
                        <text
                          key={i}
                          x={cxR + dx}
                          y={cy + dy + 4}
                          textAnchor="middle"
                          fontFamily={inter}
                          fontSize={10}
                          fill={IVORY}
                          letterSpacing={1.5}
                          fontWeight={500}
                        >
                          {lab}
                        </text>
                      );
                    },
                  )}
                  <text
                    x={cxR}
                    y={cy + 6}
                    textAnchor="middle"
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={22}
                    fill={IVORY}
                    fontWeight={500}
                  >
                    C₆H₁₂O₆
                  </text>
                  <text
                    x={cxR}
                    y={cy + R + 44}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={12}
                    fill={COPPER_BRIGHT}
                    letterSpacing={5}
                    fontWeight={600}
                  >
                    FRUCTOSE
                  </text>
                  <text
                    x={cxR}
                    y={cy + R + 60}
                    textAnchor="middle"
                    fontFamily={inter}
                    fontSize={10}
                    fill={GRAY}
                    letterSpacing={3}
                    fontWeight={500}
                  >
                    KETOSE · C2 = C=O
                  </text>
                </g>

                {/* Migration particles */}
                {Array.from({ length: PARTICLES }).map((_, i) => {
                  const seed = ((i * 9301 + 49297) % 233280) / 233280;
                  const localStart = 0.1 + seed * 0.4;
                  const localEnd = localStart + 0.4;
                  const p = Math.max(
                    0,
                    Math.min(1, (transmute - localStart) / (localEnd - localStart)),
                  );
                  if (p <= 0 || p >= 1) return null;
                  const jitter = (seed - 0.5) * 60;
                  const x = cxL + R + 30 + (cxR - cxL - R * 2 - 60) * p;
                  const y =
                    cy +
                    Math.sin(p * Math.PI) * -40 +
                    jitter * Math.sin(p * Math.PI);
                  const r = 2 + Math.sin(p * Math.PI) * 2;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={r}
                      fill={COPPER_BRIGHT}
                      opacity={0.9}
                      filter="url(#soft-glow)"
                    />
                  );
                })}

                {/* Arrow shaft */}
                {(() => {
                  const x1 = cxL + R + 20;
                  const x2 = cxR - R - 20;
                  const ay = cy;
                  return (
                    <g>
                      <line
                        x1={x1}
                        y1={ay}
                        x2={x2}
                        y2={ay}
                        stroke={COPPER}
                        strokeWidth={1.6}
                      />
                      <polygon
                        points={`${x2} ${ay - 6}, ${x2 + 12} ${ay}, ${x2} ${ay + 6}`}
                        fill={COPPER}
                      />
                      {/* Enzyme label above arrow */}
                      <text
                        x={(x1 + x2) / 2}
                        y={ay - 16}
                        textAnchor="middle"
                        fontFamily={inter}
                        fontSize={12}
                        fill={COPPER_BRIGHT}
                        letterSpacing={4.5}
                        fontWeight={600}
                      >
                        KHK · GLUT5
                      </text>
                      {/* Condition below arrow (animated O₂) */}
                      <text
                        x={(x1 + x2) / 2}
                        y={ay + 26}
                        textAnchor="middle"
                        fontFamily={inter}
                        fontSize={11}
                        fill={GRAY}
                        letterSpacing={3.5}
                        fontWeight={500}
                      >
                        ANOXIA ·{" "}
                        <tspan
                          fill={o2 < 5 ? COPPER_BRIGHT : IVORY}
                          fontFamily={playfair}
                          fontStyle="italic"
                          fontWeight={500}
                          fontSize={14}
                          letterSpacing={0}
                        >
                          {o2.toFixed(1)}%
                        </tspan>{" "}
                        O₂ · 18 MIN
                      </text>
                      {/* Copper pulse dot */}
                      {pulseActive && (
                        <circle
                          cx={x1 + (x2 - x1) * pulseCycle}
                          cy={ay}
                          r={5}
                          fill={COPPER_BRIGHT}
                          filter="url(#soft-glow)"
                          opacity={0.9}
                        />
                      )}
                    </g>
                  );
                })()}
              </g>
            );
          })()}

        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 920,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: COPPER_BRIGHT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDE4D5", letterSpacing: 5 }}>Alchemist</span>
        </div>

        <div
          style={{
            color: "#F4EEDF",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The alchemist
          <br />
          beneath the ground.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C9BFAA",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Deprived of oxygen, the naked mole-rat{" "}
          <span style={{ color: FLESH, fontWeight: 600 }}>
            (Heterocephalus glaber)
          </span>{" "}
          rewires its brain and heart to burn{" "}
          <span style={{ color: COPPER_BRIGHT, fontWeight: 600 }}>fructose</span>{" "}
          — a plant-style pathway no other mammal uses — surviving up to{" "}
          <span style={{ color: COPPER_BRIGHT, fontWeight: 600 }}>
            18 minutes
          </span>{" "}
          of total anoxia.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Park et al. · Science 356 (2017) 307–311</span>
        <span>
          <span style={{ color: COPPER_BRIGHT }}>◈</span> Everyday Motivation
        </span>
      </div>
    </AbsoluteFill>
  );
};
