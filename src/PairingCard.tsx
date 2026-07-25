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

// ── Palette (from the visual brief) ─────────────────────────────────────
const INK = "#0B0E14";
const BOARD = "#11151E";
const GRID = "#1A2030";
const GRID_MAJOR = "#232A3D";
const GRAY = "#8A8F9C";
const CREAM = "#F1EEE4";

// Photonic-crystal palette stops — teal → green → gold → red-orange
const STOPS: { d: number; c: [number, number, number] }[] = [
  { d: 0.0, c: [15, 94, 122] }, // #0F5E7A teal
  { d: 0.35, c: [30, 148, 89] }, // #1E9459 green
  { d: 0.68, c: [245, 176, 36] }, // #F5B024 gold
  { d: 1.0, c: [226, 62, 29] }, // #E23E1D red-orange
];

const ACCENT = "#F5B024"; // headline accent

const paletteColor = (d: number): string => {
  const dd = Math.min(1, Math.max(0, d));
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (dd <= STOPS[i + 1].d) {
      const a = STOPS[i];
      const b = STOPS[i + 1];
      const t = (dd - a.d) / (b.d - a.d);
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  const last = STOPS[STOPS.length - 1].c;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
};

// ── Chameleon silhouette (coord space 1000 × 600, facing right) ─────────
// Single closed path — snout tip → casque → back → tail curl → belly → chin → close
const CHAMELEON_PATH = `
M 928 322
C 906 302 884 302 862 302
C 820 302 796 288 786 262
C 780 220 802 190 834 186
C 862 184 878 200 878 224
C 872 250 848 262 816 268
C 754 282 682 288 600 302
C 500 318 402 332 314 352
C 262 366 220 388 200 420
C 172 460 170 496 208 510
C 250 522 292 506 306 472
C 316 438 306 418 322 418
C 402 428 502 432 602 428
C 700 424 780 408 830 378
C 860 358 876 344 892 340
C 906 336 918 330 928 322 Z
`;

// Small overlapping shapes to complete the silhouette (legs, dorsal crest)
type SubShape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "polygon"; points: [number, number][] };

const CHAMELEON_SUBSHAPES: SubShape[] = [
  // Front leg + foot as one connected polygon (attaches into the belly)
  { kind: "polygon", points: [
    [688, 410], [758, 410],           // upper attach into belly
    [770, 445], [775, 485],           // outer thigh
    [780, 520],                        // knee outer
    [790, 540], [772, 548], [740, 546], // foot toes (mitten)
    [708, 548], [692, 540],           // foot underside
    [696, 515], [688, 480],           // inner shin
    [680, 445],                        // inner thigh
  ] },
  // Rear leg + foot
  { kind: "polygon", points: [
    [406, 412], [478, 412],
    [490, 448], [494, 490],
    [500, 522],
    [510, 544], [490, 550], [458, 548],
    [426, 550], [408, 542],
    [412, 518], [406, 484],
    [400, 448],
  ] },
];

// Dorsal crest — small triangles anchored INSIDE the back so they poke up as spikes
const DORSAL_CREST: SubShape[] = (() => {
  const spinePts: [number, number][] = [
    [820, 275], [780, 285], [720, 293], [660, 300], [590, 306],
    [510, 314], [430, 322], [360, 334],
  ];
  const out: SubShape[] = [];
  for (const [x, y] of spinePts) {
    out.push({
      kind: "polygon",
      points: [
        [x - 9, y + 10],
        [x + 9, y + 10],
        [x, y - 14],
      ],
    });
  }
  return out;
})();

// Approximate axis-aligned bounding box of the silhouette (chameleon coords)
const CHAM_BBOX = { x0: 140, y0: 170, x1: 940, y1: 540 };

// ── Hex grid inside silhouette ──────────────────────────────────────────
const HEX_SIDE = 20; // radius (flat-to-vertex)
const HEX_W = HEX_SIDE * Math.sqrt(3); // horizontal spacing (pointy-top)
const HEX_H = HEX_SIDE * 1.5; // vertical spacing

const hexPath = (cx: number, cy: number, s: number): string => {
  // pointy-top hex
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 2;
    pts.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]);
  }
  return "M " + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L ") + " Z";
};

type Hex = { cx: number; cy: number };
const HEX_CENTERS: Hex[] = (() => {
  const out: Hex[] = [];
  const yStart = CHAM_BBOX.y0 - HEX_H;
  const yEnd = CHAM_BBOX.y1 + HEX_H;
  const xStart = CHAM_BBOX.x0 - HEX_W;
  const xEnd = CHAM_BBOX.x1 + HEX_W;
  let row = 0;
  for (let cy = yStart; cy <= yEnd; cy += HEX_H) {
    const offset = row % 2 === 0 ? 0 : HEX_W / 2;
    for (let cx = xStart + offset; cx <= xEnd; cx += HEX_W) {
      out.push({ cx, cy });
    }
    row++;
  }
  return out;
})();

// ── Component ──────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global intro: hex mosaic fades in
  const introT = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
    durationInFrames: fps * 1.4,
  });

  // Wave phase — one full cycle every 4 s. Head is at right (large x), tail at
  // left; the wave sweeps head → tail. Set direction so higher x lights up
  // first for each cycle.
  const cyclePeriod = fps * 4;
  const wavePhase = (frame % cyclePeriod) / cyclePeriod;

  // Title / hook staggered reveal
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Page layout (1080 × 1350) ─────────────────────────────────────────
  // Top band       : 56..90
  // Specimen frame : 108..760 (h=652, w=960 @ x=60)
  // Title lockup   : 800..1160
  // Footer         : 1280..1310
  const FRAME = { x: 60, y: 108, w: 960, h: 652 };
  const CHAM_W = 1000;
  const CHAM_H = 600;
  // Fit chameleon into frame (contain); center vertically
  const scale = Math.min(FRAME.w / CHAM_W, FRAME.h / CHAM_H);
  const chamW = CHAM_W * scale;
  const chamH = CHAM_H * scale;
  const chamX = FRAME.x + (FRAME.w - chamW) / 2;
  const chamY = FRAME.y + 30; // sit a bit above center to leave headroom under the specimen frame

  // Precompute the wave-driven d for each hex
  // d ∈ [0,1], drives palette color.
  const bboxW = CHAM_BBOX.x1 - CHAM_BBOX.x0;
  const cells = HEX_CENTERS.map((h) => {
    // Normalized horizontal position (0 at tail, 1 at head)
    const u = (h.cx - CHAM_BBOX.x0) / bboxW;
    // Wave travels head→tail. Small vertical modulation for organic feel.
    const vMod = Math.sin(((h.cy - CHAM_BBOX.y0) / 60) * 1.3) * 0.06;
    const phase = 2 * Math.PI * (wavePhase - u * 0.9);
    const d = 0.5 + 0.5 * Math.sin(phase) + vMod;
    return { ...h, d };
  });

  // Microscope inset — dot lattice pulses in step with the wave
  // Spacing d nm: 130 (compressed / teal) → 190 (relaxed / red)
  const insetD = 0.5 + 0.5 * Math.sin(2 * Math.PI * wavePhase);
  const insetSpacingNm = 130 + insetD * 60; // 130..190
  const insetDotSpacing = 26 + insetD * 18; // 26..44 px within the inset
  const insetColor = paletteColor(insetD);

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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ACCENT }}>2026 · 07 · 25</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Grid patterns for the specimen board */}
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
            <path d="M 160 0 L 0 0 0 160" fill="none" stroke={GRID_MAJOR} strokeWidth={1} />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#151A26" stopOpacity={1} />
            <stop offset="100%" stopColor={BOARD} stopOpacity={1} />
          </radialGradient>

          {/* Chameleon silhouette as a mask (white = show, black = hide) */}
          <mask id="cham-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1350">
            <rect x="0" y="0" width="1080" height="1350" fill="black" />
            <g transform={`translate(${chamX}, ${chamY}) scale(${scale})`} fill="white" stroke="none">
              <path d={CHAMELEON_PATH} />
              {[...CHAMELEON_SUBSHAPES, ...DORSAL_CREST].map((s, i) =>
                s.kind === "ellipse" ? (
                  <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
                ) : (
                  <polygon
                    key={i}
                    points={s.points.map(([x, y]) => `${x},${y}`).join(" ")}
                  />
                ),
              )}
            </g>
          </mask>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Specimen board */}
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#board-vignette)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid-major)" />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2A3040"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={ACCENT} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Specimen label — upper-right of frame */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 22}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={600}
          textAnchor="end"
        >
          <text>SPECIMEN 03 · FURCIFER PARDALIS</text>
        </g>

        {/* Hexagonal photonic mosaic — masked to chameleon silhouette */}
        <g mask="url(#cham-mask)" opacity={introT}>
          <g transform={`translate(${chamX}, ${chamY}) scale(${scale})`}>
            {/* base dark fill inside silhouette (drawn in chameleon coords) */}
            <rect
              x={CHAM_BBOX.x0 - 40}
              y={CHAM_BBOX.y0 - 40}
              width={CHAM_BBOX.x1 - CHAM_BBOX.x0 + 80}
              height={CHAM_BBOX.y1 - CHAM_BBOX.y0 + 80}
              fill="#070A11"
            />
            {cells.map((c, i) => {
              const col = paletteColor(c.d);
              return (
                <React.Fragment key={i}>
                  <path d={hexPath(c.cx, c.cy, HEX_SIDE)} fill={col} opacity={0.92} />
                  <path
                    d={hexPath(c.cx, c.cy, HEX_SIDE * 0.55)}
                    fill={col}
                    opacity={0.5}
                  />
                </React.Fragment>
              );
            })}
          </g>
        </g>

        {/* Overlay details on top of the mosaic — eye, mouth, tail-curl spiral */}
        <g
          transform={`translate(${chamX}, ${chamY}) scale(${scale})`}
          opacity={introT}
        >
          {/* Eye — turreted, decorative overlay */}
          <circle cx={820} cy={244} r={22} fill={INK} stroke={CREAM} strokeWidth={2.5} />
          <circle cx={820} cy={244} r={12} fill={CREAM} />
          <circle cx={822} cy={242} r={4.5} fill={INK} />

          {/* Nostril */}
          <circle cx={908} cy={314} r={2.5} fill={INK} />

          {/* Mouth line */}
          <path
            d="M 928 322 C 900 335 870 340 840 336"
            fill="none"
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
          />

          {/* Tail-curl spiral accent — thin dark line spiraling into the tail tip */}
          <path
            d="M 200 470 C 195 500 220 520 250 512 C 285 500 300 470 285 448 C 275 435 258 435 258 452 C 258 462 268 465 275 460"
            fill="none"
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.55}
          />

          {/* Belly seam — subtle darker line separating belly from flank */}
          <path
            d="M 320 425 C 420 445 520 448 620 445 C 720 442 800 425 830 400"
            fill="none"
            stroke={INK}
            strokeOpacity={0.28}
            strokeWidth={2}
          />

          {/* Foot-toe indent lines (front + rear) — reads as zygodactyl grip */}
          <path
            d="M 728 548 L 732 530 M 748 548 L 748 530 M 768 548 L 764 530"
            stroke={INK}
            strokeOpacity={0.45}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <path
            d="M 446 550 L 450 532 M 468 550 L 466 532 M 488 550 L 484 532"
            stroke={INK}
            strokeOpacity={0.45}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </g>

        {/* ── Microscope inset — the engineer's blueprint ─────────────── */}
        {(() => {
          const insetX = FRAME.x + 160;
          const insetY = FRAME.y + 180;
          const insetR = 82;
          // Leader line source — a point on the chameleon's flank (mid-back)
          const flankX = chamX + 560 * scale;
          const flankY = chamY + 320 * scale;
          return (
            <g opacity={interpolate(frame, [fps * 0.6, fps * 1.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}>
              {/* Leader line from the chameleon's flank to the inset */}
              <line
                x1={flankX}
                y1={flankY}
                x2={insetX + insetR - 12}
                y2={insetY + 40}
                stroke={ACCENT}
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
              <circle cx={flankX} cy={flankY} r={3} fill={ACCENT} />
              {/* Viewfinder ring */}
              <circle cx={insetX} cy={insetY} r={insetR + 3} fill={INK} />
              <circle
                cx={insetX}
                cy={insetY}
                r={insetR}
                fill="#0E1524"
                stroke={ACCENT}
                strokeWidth={1.5}
              />
              {/* Crosshair ticks */}
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r1 = insetR - 8;
                const r2 = insetR + 6;
                return (
                  <line
                    key={deg}
                    x1={insetX + Math.cos(rad) * r1}
                    y1={insetY + Math.sin(rad) * r1}
                    x2={insetX + Math.cos(rad) * r2}
                    y2={insetY + Math.sin(rad) * r2}
                    stroke={ACCENT}
                    strokeWidth={1.3}
                  />
                );
              })}
              {/* Dot lattice (4×4) inside the viewfinder */}
              <g clipPath="url(#inset-clip)">
                {(() => {
                  const dots: React.ReactNode[] = [];
                  const N = 5;
                  const spacing = insetDotSpacing;
                  const start = -((N - 1) * spacing) / 2;
                  for (let i = 0; i < N; i++) {
                    for (let j = 0; j < N; j++) {
                      const dx = start + i * spacing;
                      const dy = start + j * spacing;
                      dots.push(
                        <circle
                          key={`${i}-${j}`}
                          cx={insetX + dx}
                          cy={insetY + dy}
                          r={4.2}
                          fill={insetColor}
                        />,
                      );
                    }
                  }
                  return dots;
                })()}
              </g>
              <defs>
                <clipPath id="inset-clip">
                  <circle cx={insetX} cy={insetY} r={insetR - 3} />
                </clipPath>
              </defs>

              {/* Spacing measurement callout — a small "d = ___ nm" tag beside the ring */}
              <g
                transform={`translate(${insetX + insetR + 18}, ${insetY - 6})`}
                fill={CREAM}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={2.4}
              >
                <text fill={GRAY} fontSize={10} letterSpacing={3.2}>
                  LATTICE SPACING
                </text>
                <text y={22} fill={ACCENT} fontSize={22} fontFamily={playfair} fontStyle="italic" fontWeight={500} letterSpacing={0}>
                  d = {insetSpacingNm.toFixed(0)} nm
                </text>
              </g>
            </g>
          );
        })()}

        {/* Caption strip just below the specimen frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · IRIDOPHORE MOSAIC · GUANINE NANOCRYSTAL LATTICE</text>
          <text x={FRAME.w} textAnchor="end" fill={ACCENT} opacity={0.9}>
            REFLECTED λ = f(d)
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 828,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: ACCENT,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Photonic Engineer</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The living
          <br />
          photonic crystal.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 920,
            opacity: hookOpacity,
          }}
        >
          The panther chameleon changes color by actively{" "}
          <span style={{ color: ACCENT, fontWeight: 600 }}>
            tuning the spacing of a guanine-nanocrystal lattice
          </span>{" "}
          inside its skin — walking the reflected wavelength from teal through
          gold to red exactly as coherent scattering predicts.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 40,
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
        <span>Teyssier et al. · Nature Communications 6:6368 (2015)</span>
        <span>
          <span style={{ color: ACCENT }}>●</span> d = 130 → 190 nm
        </span>
      </div>
    </AbsoluteFill>
  );
};
