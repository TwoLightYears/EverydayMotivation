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

// Palette — taken from the concept's visual brief
const ABYSS = "#06111E";
const DEEP = "#0F2B4A";
const ICE = "#88B9D8";
const ICE_SOFT = "#B7D5E6";
const PLASMA = "#E9F2FA";
const GILL = "#F7B9BA";
const GRID = "#102235";
const GRID_MAJOR = "#17304A";
const GRAY = "#7F8EA2";

// ── Ice-crystal dendrite spec ─────────────────────────────────────────────
// Each dendrite grows outward from an anchor on the vial glass. A dendrite is
// a short trunk with 2–3 side-branches; growth is clamped by an AFGP ribbon
// which snaps into view at the trunk's tip when growth completes.
type Branch = { len: number; angle: number; at: number; sublen: number };
type Dendrite = {
  anchorX: number;
  anchorY: number;
  angle: number; // outward normal, degrees
  trunk: number;
  branches: Branch[];
  delay: number; // 0..1 within the grow span
};

const DENDRITES: Dendrite[] = [
  // Left wall of vial (anchorX = 536) — three asymmetric dendrites
  {
    anchorX: 536,
    anchorY: 500,
    angle: 174,
    trunk: 158,
    branches: [
      { len: 68, angle: -34, at: 0.42, sublen: 28 },
      { len: 54, angle: 38, at: 0.7, sublen: 22 },
    ],
    delay: 0.0,
  },
  {
    anchorX: 536,
    anchorY: 720,
    angle: 196,
    trunk: 112,
    branches: [
      { len: 48, angle: -40, at: 0.5, sublen: 20 },
      { len: 36, angle: 46, at: 0.78, sublen: 14 },
    ],
    delay: 0.15,
  },
  {
    anchorX: 536,
    anchorY: 920,
    angle: 182,
    trunk: 94,
    branches: [{ len: 42, angle: 36, at: 0.6, sublen: 16 }],
    delay: 0.28,
  },

  // Right wall of vial (anchorX = 740) — three asymmetric dendrites
  {
    anchorX: 740,
    anchorY: 460,
    angle: -4,
    trunk: 136,
    branches: [
      { len: 58, angle: 40, at: 0.4, sublen: 24 },
      { len: 44, angle: -36, at: 0.72, sublen: 18 },
    ],
    delay: 0.08,
  },
  {
    anchorX: 740,
    anchorY: 650,
    angle: 10,
    trunk: 170,
    branches: [
      { len: 64, angle: -34, at: 0.38, sublen: 26 },
      { len: 48, angle: 40, at: 0.66, sublen: 20 },
      { len: 32, angle: -72, at: 0.86, sublen: 14 },
    ],
    delay: 0.04,
  },
  {
    anchorX: 740,
    anchorY: 880,
    angle: -8,
    trunk: 100,
    branches: [
      { len: 44, angle: 36, at: 0.55, sublen: 18 },
    ],
    delay: 0.22,
  },
];

const deg = (d: number): number => (d * Math.PI) / 180;

type P = { x: number; y: number };
const polar = (origin: P, len: number, angle: number): P => ({
  x: origin.x + Math.cos(deg(angle)) * len,
  y: origin.y + Math.sin(deg(angle)) * len,
});

// Snow particles seeded deterministically
const SNOW: { x: number; y: number; r: number; sp: number; ph: number }[] =
  Array.from({ length: 60 }).map((_, i) => {
    const s = (n: number) => {
      const x = Math.sin(i * 912.3 + n * 71.9) * 43758.5453;
      return x - Math.floor(x);
    };
    return {
      x: s(1) * 1080,
      y: s(2) * 1350,
      r: 0.6 + s(3) * 1.6,
      sp: 6 + s(4) * 18,
      ph: s(5) * Math.PI * 2,
    };
  });

// Clinical readout rows (left-column chart)
type Row = { k: string; v: string; emph?: boolean };
const CHART_ROWS: Row[] = [
  { k: "PATIENT", v: "CHAENOCEPHALUS ACERATUS" },
  { k: "FAMILY", v: "CHANNICHTHYIDAE" },
  { k: "HABITAT", v: "SOUTHERN OCEAN, −1.9 °C" },
  { k: "HEMOGLOBIN", v: "0.0 g/dL", emph: true },
  { k: "BLOOD COLOR", v: "TRANSLUCENT" },
  { k: "AFGP-8", v: "POSITIVE", emph: true },
  { k: "CARDIAC MASS", v: "220 % REFERENCE" },
  { k: "BLOOD VISCOSITY", v: "↓ 40 %" },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Timeline (seconds)
  const t0 = 0.2; // top band
  const t1 = 0.5; // vial glass fades in
  const t2 = 1.0; // fish silhouette appears
  const tGrowStart = 1.4;
  const tGrowSpan = 2.6; // dendrites grow out across this span
  const tTitle = 1.9;
  const tChart = 2.3;
  const tHook = 3.1;

  const vialOp = interpolate(
    frame,
    [t1 * fps, (t1 + 0.6) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const fishOp = interpolate(
    frame,
    [t2 * fps, (t2 + 0.7) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const metaOp = interpolate(frame, [t0 * fps, (t0 + 0.5) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const growT = Math.max(
    0,
    Math.min(1, (frame / fps - tGrowStart) / tGrowSpan),
  );
  const growEased = 1 - Math.pow(1 - growT, 3);

  const titleSpring = spring({
    frame: frame - tTitle * fps,
    fps,
    config: { damping: 180, mass: 0.9, stiffness: 110 },
  });

  const chartOp = interpolate(
    frame,
    [tChart * fps, (tChart + 0.6) * fps],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const hookOp = interpolate(
    frame,
    [tHook * fps, (tHook + 0.9) * fps],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fish bob: a small sinusoid, phase from frame
  const bob = Math.sin((frame / fps) * 0.9) * 6;

  // ── Vial geometry ──────────────────────────────────────────────────────
  // Vial is a rounded rectangle with a tapered neck and stopper on top.
  const VIAL = {
    cx: 638,
    top: 340,
    neckTop: 340,
    bottleTop: 400,
    bottom: 1050,
    halfW: 102,
  };
  const vialBodyPath = (() => {
    const { cx, bottleTop, bottom, halfW } = VIAL;
    const r = 12;
    const rb = 70;
    const left = cx - halfW;
    const right = cx + halfW;
    // top (neck meets body with gentle shoulder)
    return [
      `M ${left + r} ${bottleTop}`,
      `L ${right - r} ${bottleTop}`,
      `Q ${right} ${bottleTop} ${right} ${bottleTop + r}`,
      `L ${right} ${bottom - rb}`,
      `Q ${right} ${bottom} ${right - rb} ${bottom}`,
      `L ${left + rb} ${bottom}`,
      `Q ${left} ${bottom} ${left} ${bottom - rb}`,
      `L ${left} ${bottleTop + r}`,
      `Q ${left} ${bottleTop} ${left + r} ${bottleTop}`,
      `Z`,
    ].join(" ");
  })();

  const fluidTop = 440; // plasma meniscus
  const fluidClip = (() => {
    const { cx, bottom, halfW } = VIAL;
    const r = 12;
    const rb = 70;
    const left = cx - halfW + 6;
    const right = cx + halfW - 6;
    const top = fluidTop;
    return [
      `M ${left + r} ${top}`,
      `L ${right - r} ${top}`,
      `Q ${right} ${top} ${right} ${top + r}`,
      `L ${right} ${bottom - rb}`,
      `Q ${right} ${bottom - 2} ${right - rb} ${bottom - 2}`,
      `L ${left + rb} ${bottom - 2}`,
      `Q ${left} ${bottom - 2} ${left} ${bottom - rb}`,
      `L ${left} ${top + r}`,
      `Q ${left} ${top} ${left + r} ${top}`,
      `Z`,
    ].join(" ");
  })();

  // ── Icefish silhouette — a bold, outlined scientific drawing. ───────────
  // Nose points LEFT. Body is a long tapered cigar with a visibly crocodile-
  // like head, two low dorsals, one anal fin, a huge fan-shaped pectoral,
  // and a clearly forked caudal fin. Drawn with an ice-blue stroke so it
  // reads as line art against the pale plasma.
  const fishY = 720 + bob;
  const fishX = VIAL.cx;
  const strokeC = ICE;
  const fish = (
    <g
      transform={`translate(${fishX}, ${fishY}) rotate(16) scale(0.6)`}
      opacity={fishOp}
    >
      {/* Soft shadow under the specimen */}
      <ellipse cx={0} cy={32} rx={150} ry={6} fill={ABYSS} opacity={0.3} />

      {/* Pectoral fin — large fan, behind body */}
      <path
        d="M -56 10 Q -92 36 -70 50 Q -42 48 -22 24 Z"
        fill={ICE_SOFT}
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.75}
      />
      <g stroke={strokeC} strokeWidth={0.6} opacity={0.55} fill="none">
        <path d="M -42 18 Q -62 32 -68 48" />
        <path d="M -32 20 Q -52 34 -58 48" />
        <path d="M -22 22 Q -40 34 -48 48" />
      </g>

      {/* First dorsal fin (shorter, higher) */}
      <path
        d="M -30 -16 Q -14 -34 10 -32 Q 14 -22 -4 -18 Z"
        fill={PLASMA}
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.9}
      />
      {/* Second dorsal (longer, lower) */}
      <path
        d="M 30 -14 Q 60 -24 100 -14 Q 94 -8 60 -10 Z"
        fill={PLASMA}
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.9}
      />
      {/* Anal fin (bottom-back) */}
      <path
        d="M 46 18 Q 70 30 100 18 Q 90 14 60 14 Z"
        fill={PLASMA}
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.85}
      />

      {/* Body — long outlined silhouette with a pike-like head */}
      <path
        d="
          M -148 2
          C -136 -8, -118 -14, -92 -16
          C -58 -18, -14 -16, 32 -12
          C 76 -8, 112 -4, 142 -2
          C 158 -1, 158 1, 142 2
          C 112 4, 76 8, 32 12
          C -14 16, -58 18, -92 16
          C -118 14, -136 10, -148 2
          Z
        "
        fill={PLASMA}
        stroke={strokeC}
        strokeWidth={1.4}
        opacity={0.95}
      />

      {/* Belly subtle shade */}
      <path
        d="M -116 10 C -70 18, -10 18, 50 14 C 100 10, 130 6, 142 2 L 142 2 C 112 4, 76 8, 32 12 C -14 16, -58 18, -92 16 C -108 15, -116 12, -116 10 Z"
        fill={ICE_SOFT}
        opacity={0.35}
      />

      {/* Caudal peduncle narrowing (where tail attaches) */}
      <path
        d="M 134 -4 L 144 0 L 134 4"
        fill="none"
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.55}
      />
      {/* Forked caudal fin — two clear lobes */}
      <g>
        <path
          d="M 144 0 L 198 -22 Q 192 -8 184 0 Z"
          fill={PLASMA}
          stroke={strokeC}
          strokeWidth={1.1}
          opacity={0.9}
        />
        <path
          d="M 144 0 L 198 22 Q 192 8 184 0 Z"
          fill={PLASMA}
          stroke={strokeC}
          strokeWidth={1.1}
          opacity={0.9}
        />
        <path
          d="M 150 -4 L 190 -18 M 150 4 L 190 18 M 160 0 L 182 0"
          stroke={strokeC}
          strokeWidth={0.6}
          opacity={0.45}
          fill="none"
        />
      </g>

      {/* Head: operculum curve + jaw line (crocodile-pike) */}
      <path
        d="M -108 -14 Q -116 0 -106 14"
        fill="none"
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.75}
      />
      <path
        d="M -148 2 Q -124 12 -100 10"
        fill="none"
        stroke={strokeC}
        strokeWidth={1}
        opacity={0.7}
      />
      <path
        d="M -148 2 Q -126 -6 -100 -10"
        fill="none"
        stroke={strokeC}
        strokeWidth={0.5}
        opacity={0.4}
      />

      {/* Opercular blush — gills (the sole warm note) */}
      <path
        d="M -112 -8 Q -102 -14 -92 -10 Q -90 2 -102 8 Q -114 4 -112 -8 Z"
        fill={GILL}
        opacity={0.78}
      />
      <path
        d="M -108 -8 Q -100 -12 -94 -8 Q -92 1 -100 4 Q -108 2 -108 -8 Z"
        fill="#F79498"
        opacity={0.9}
      />

      {/* Lateral line */}
      <path
        d="M -92 0 Q 20 2, 134 1"
        stroke={strokeC}
        strokeOpacity={0.4}
        strokeWidth={0.8}
        fill="none"
      />

      {/* Eye */}
      <circle cx={-126} cy={-6} r={3.2} fill={ABYSS} />
      <circle cx={-127} cy={-7} r={1} fill={PLASMA} />

    </g>
  );

  // ── Dendrite path builder ──────────────────────────────────────────────
  const dendriteGeom = (d: Dendrite) => {
    const origin: P = { x: d.anchorX, y: d.anchorY };
    const tip = polar(origin, d.trunk, d.angle);
    const trunkPath = `M ${origin.x} ${origin.y} L ${tip.x} ${tip.y}`;
    const branchPaths = d.branches.map((b) => {
      const start = polar(origin, d.trunk * b.at, d.angle);
      const bAngle = d.angle + b.angle;
      const bEnd = polar(start, b.len, bAngle);
      // small sub-branch
      const subStart = polar(start, b.len * 0.6, bAngle);
      const subAngle = bAngle - Math.sign(b.angle) * 55;
      const subEnd = polar(subStart, b.sublen, subAngle);
      return {
        main: `M ${start.x} ${start.y} L ${bEnd.x} ${bEnd.y}`,
        sub: `M ${subStart.x} ${subStart.y} L ${subEnd.x} ${subEnd.y}`,
        tip: bEnd,
      };
    });
    return { trunkPath, branchPaths, tip };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: ABYSS, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Deep-ocean background: subtle grid + radial vignette + snow ── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="bg-vignette" cx="55%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#0A1A2B" />
            <stop offset="60%" stopColor={ABYSS} />
            <stop offset="100%" stopColor="#02080E" />
          </radialGradient>
          <pattern
            id="grid"
            x={0}
            y={0}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={0}
            y={0}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ICE} stopOpacity={0.6} />
            <stop offset="30%" stopColor={PLASMA} stopOpacity={0.08} />
            <stop offset="70%" stopColor={PLASMA} stopOpacity={0.08} />
            <stop offset="100%" stopColor={ICE} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id="plasma" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B3A5A" stopOpacity={0.92} />
            <stop offset="60%" stopColor="#163251" stopOpacity={0.92} />
            <stop offset="100%" stopColor="#102844" stopOpacity={0.95} />
          </linearGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ICE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={ICE} stopOpacity={0} />
          </radialGradient>

          <filter id="ice-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="fluid-clip">
            <path d={fluidClip} />
          </clipPath>
        </defs>

        <rect width="1080" height="1350" fill="url(#bg-vignette)" />
        <rect width="1080" height="1350" fill="url(#grid)" opacity={0.55} />
        <rect width="1080" height="1350" fill="url(#grid-major)" opacity={0.8} />

        {/* Snow particles */}
        {SNOW.map((p, i) => {
          const y = (p.y + ((frame / fps) * p.sp * 10)) % 1350;
          const x =
            p.x + Math.sin((frame / fps) * 0.6 + p.ph) * 8;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={p.r}
              fill={PLASMA}
              opacity={0.35}
            />
          );
        })}

        {/* Cold halo behind vial */}
        <circle
          cx={VIAL.cx}
          cy={720}
          r={420}
          fill="url(#halo)"
          opacity={0.55}
        />

        {/* ── Ice dendrites behind the vial (so they appear to emerge from edges) ── */}
        <g filter="url(#ice-glow)">
          {DENDRITES.map((d, i) => {
            const localT = Math.max(
              0,
              Math.min(1, (growEased - d.delay) / 0.42),
            );
            const trunk = dendriteGeom(d);
            const trunkDraw = d.trunk * localT;
            return (
              <g key={`den-${i}`}>
                <line
                  x1={d.anchorX}
                  y1={d.anchorY}
                  x2={polar({ x: d.anchorX, y: d.anchorY }, trunkDraw, d.angle).x}
                  y2={polar({ x: d.anchorX, y: d.anchorY }, trunkDraw, d.angle).y}
                  stroke={ICE}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                {trunk.branchPaths.map((b, j) => {
                  const branch = d.branches[j];
                  const start = polar(
                    { x: d.anchorX, y: d.anchorY },
                    d.trunk * branch.at,
                    d.angle,
                  );
                  if (localT < branch.at + 0.02) return null;
                  const bLocal = Math.min(
                    1,
                    (localT - branch.at) / (1 - branch.at + 0.001),
                  );
                  const bAngle = d.angle + branch.angle;
                  const bEnd = polar(start, branch.len * bLocal, bAngle);
                  // sub
                  const subStart = polar(start, branch.len * 0.6, bAngle);
                  const subAngle = bAngle - Math.sign(branch.angle) * 55;
                  const subProg = Math.max(
                    0,
                    Math.min(1, (localT - (branch.at + 0.1)) / 0.3),
                  );
                  const subEnd = polar(subStart, branch.sublen * subProg, subAngle);
                  return (
                    <g key={`b-${i}-${j}`}>
                      <line
                        x1={start.x}
                        y1={start.y}
                        x2={bEnd.x}
                        y2={bEnd.y}
                        stroke={ICE}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        opacity={0.85}
                      />
                      {subProg > 0 && (
                        <line
                          x1={subStart.x}
                          y1={subStart.y}
                          x2={subEnd.x}
                          y2={subEnd.y}
                          stroke={ICE_SOFT}
                          strokeWidth={0.9}
                          strokeLinecap="round"
                          opacity={0.75}
                        />
                      )}
                    </g>
                  );
                })}
                {/* AFGP ribbon at trunk tip — snaps in when trunk is complete */}
                {localT >= 1 && (() => {
                  const tipP = polar(
                    { x: d.anchorX, y: d.anchorY },
                    d.trunk,
                    d.angle,
                  );
                  const perp = d.angle + 90;
                  const r1 = polar(tipP, 7, perp);
                  const r2 = polar(tipP, -7, perp);
                  const r3 = polar(tipP, 0, d.angle);
                  const r4 = polar(r3, 8, d.angle);
                  // tiny zig-zag ribbon through the tip
                  return (
                    <g>
                      <circle cx={tipP.x} cy={tipP.y} r={6} fill={ABYSS} />
                      <circle
                        cx={tipP.x}
                        cy={tipP.y}
                        r={6}
                        fill="none"
                        stroke={GILL}
                        strokeWidth={1.4}
                        opacity={0.95}
                      />
                      <path
                        d={`M ${r1.x} ${r1.y} L ${r2.x} ${r2.y} L ${r4.x} ${r4.y}`}
                        fill="none"
                        stroke={GILL}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>

        {/* ── Vial ─────────────────────────────────────────────────────── */}
        <g opacity={vialOp}>
          {/* Vial stopper */}
          <rect
            x={VIAL.cx - 72}
            y={340}
            width={144}
            height={34}
            rx={6}
            fill={DEEP}
            stroke={ICE}
            strokeWidth={1.2}
          />
          <rect
            x={VIAL.cx - 72}
            y={354}
            width={144}
            height={4}
            fill={GILL}
            opacity={0.75}
          />
          <rect
            x={VIAL.cx - 60}
            y={330}
            width={120}
            height={14}
            rx={3}
            fill={DEEP}
            stroke={ICE}
            strokeWidth={1}
          />
          {/* Vial body (glass) */}
          <path
            d={vialBodyPath}
            fill="url(#plasma)"
            stroke={ICE}
            strokeWidth={1.6}
          />
          <path
            d={vialBodyPath}
            fill="url(#glass)"
            opacity={0.5}
          />

          {/* Fluid inside */}
          <g clipPath="url(#fluid-clip)">
            <rect
              x={VIAL.cx - VIAL.halfW}
              y={fluidTop}
              width={VIAL.halfW * 2}
              height={VIAL.bottom - fluidTop}
              fill="url(#plasma)"
              opacity={0.9}
            />
            {/* Meniscus highlight */}
            <ellipse
              cx={VIAL.cx}
              cy={fluidTop + 2}
              rx={VIAL.halfW - 6}
              ry={5}
              fill={PLASMA}
              opacity={0.25}
            />
            {/* Fish inside clip */}
            {fish}
            {/* Volume ticks — only in the upper third, out of the fish's way */}
            <g
              stroke={ICE_SOFT}
              strokeWidth={1}
              opacity={0.5}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
            >
              {[500, 450, 400, 350].map((v, i) => {
                const y = fluidTop + 36 + i * 44;
                const major = v % 100 === 0;
                return (
                  <g key={v}>
                    <line
                      x1={VIAL.cx - VIAL.halfW + 8}
                      y1={y}
                      x2={VIAL.cx - VIAL.halfW + (major ? 26 : 16)}
                      y2={y}
                    />
                    {major && (
                      <text
                        x={VIAL.cx - VIAL.halfW + 32}
                        y={y + 3.5}
                        textAnchor="start"
                        fill={ICE_SOFT}
                        stroke="none"
                        opacity={0.7}
                      >
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={VIAL.cx - VIAL.halfW + 8}
                y={fluidTop + 220}
                fontSize={9}
                letterSpacing={3}
                fontWeight={600}
                fill={ICE_SOFT}
                stroke="none"
                opacity={0.5}
              >
                ML
              </text>
            </g>
          </g>

          {/* Highlight on left edge of glass */}
          <path
            d={`M ${VIAL.cx - VIAL.halfW + 3} 410 L ${VIAL.cx - VIAL.halfW + 3} 1000`}
            stroke={PLASMA}
            strokeWidth={1}
            strokeOpacity={0.35}
          />
          <path
            d={`M ${VIAL.cx + VIAL.halfW - 3} 410 L ${VIAL.cx + VIAL.halfW - 3} 1000`}
            stroke={ICE}
            strokeWidth={1}
            strokeOpacity={0.5}
          />

          {/* Vial label — sits low on the vial, below the fish */}
          <g transform={`translate(${VIAL.cx - 86}, 968)`}>
            <rect
              x={0}
              y={0}
              width={172}
              height={62}
              fill={ABYSS}
              opacity={0.78}
              stroke={ICE}
              strokeWidth={1}
            />
            <rect
              x={0}
              y={0}
              width={6}
              height={62}
              fill={GILL}
              opacity={0.8}
            />
            <text
              x={14}
              y={18}
              fill={ICE_SOFT}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.4}
              fontWeight={600}
            >
              SPECIMEN · 017
            </text>
            <text
              x={14}
              y={36}
              fill={PLASMA}
              fontFamily={inter}
              fontSize={12}
              letterSpacing={1.2}
              fontWeight={500}
            >
              C. ACERATUS
            </text>
            <text
              x={14}
              y={52}
              fill={GILL}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2.2}
              fontWeight={600}
            >
              Hb 0.0 g/dL · EDTA 4 mL
            </text>
          </g>
        </g>

        {/* ── Left column: hematology chart ─────────────────────────── */}
        <g opacity={chartOp}>
          <g transform={`translate(80, 400)`}>
            {/* Chart header rule */}
            <line
              x1={0}
              y1={0}
              x2={360}
              y2={0}
              stroke={ICE}
              strokeWidth={1}
              opacity={0.7}
            />
            <text
              x={0}
              y={-14}
              fill={ICE}
              fontFamily={inter}
              fontSize={11}
              letterSpacing={4}
              fontWeight={600}
            >
              HEMATOLOGY REPORT
            </text>
            <text
              x={360}
              y={-14}
              textAnchor="end"
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={3}
              fontWeight={500}
            >
              № 017
            </text>

            {CHART_ROWS.map((r, i) => {
              const y = 28 + i * 44;
              const localOp = interpolate(
                frame,
                [(tChart + i * 0.08) * fps, (tChart + 0.5 + i * 0.08) * fps],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              return (
                <g key={r.k} opacity={localOp}>
                  <text
                    x={0}
                    y={y}
                    fill={GRAY}
                    fontFamily={inter}
                    fontSize={10}
                    letterSpacing={2.6}
                    fontWeight={500}
                  >
                    {r.k}
                  </text>
                  <text
                    x={0}
                    y={y + 20}
                    fill={r.emph ? GILL : PLASMA}
                    fontFamily={inter}
                    fontSize={16}
                    letterSpacing={0.6}
                    fontWeight={r.emph ? 600 : 500}
                  >
                    {r.v}
                  </text>
                  <line
                    x1={0}
                    y1={y + 30}
                    x2={360}
                    y2={y + 30}
                    stroke={GRID_MAJOR}
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* Signature line */}
            <g transform="translate(0, 408)">
              <line
                x1={0}
                y1={0}
                x2={180}
                y2={0}
                stroke={GRAY}
                strokeWidth={1}
              />
              <text
                x={0}
                y={16}
                fill={GRAY}
                fontFamily={inter}
                fontSize={9}
                letterSpacing={3}
                fontWeight={500}
              >
                ATTENDING · ICEFISH
              </text>
            </g>
          </g>
        </g>

        {/* ── Caption strip below vial baseline ─────────────────────── */}
        <g
          transform={`translate(80, 1075)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
          opacity={chartOp * 0.9}
        >
          <text>FIG. 2 · AFGP-ARRESTED ICE GROWTH, IN VITRO</text>
          <text x={920} textAnchor="end" fill={ICE}>
            BINDING = IRREVERSIBLE
          </text>
        </g>
      </svg>

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
          opacity: metaOp,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ICE }}>2026 · 10 · 30</span>
      </div>

      {/* ── Type lockup (title + hook) ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1140,
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
            color: ICE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F2F6FB", letterSpacing: 5 }}>
            Hematologist
          </span>
        </div>

        <div
          style={{
            color: "#F4F7FB",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 60,
            lineHeight: 0.98,
            letterSpacing: -0.9,
            fontStyle: "italic",
            maxWidth: 920,
          }}
        >
          The clear-blooded clinician.
        </div>
      </div>

      {/* ── Hook paragraph pinned to the bottom ─────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 48,
          color: "#C7D1DD",
          fontFamily: inter,
          fontSize: 15,
          lineHeight: 1.42,
          fontWeight: 400,
          maxWidth: 920,
          opacity: hookOp,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            color: GRAY,
            fontFamily: inter,
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 500,
            marginBottom: 10,
          }}
        >
          <span>Channichthyidae · Southern Ocean</span>
          <span>
            <span style={{ color: GILL }}>●</span> AFGP binds, lattice halts
          </span>
        </div>
        The crocodile icefish is the only vertebrate on Earth with no{" "}
        <span style={{ color: GILL, fontWeight: 600 }}>hemoglobin</span> — its
        blood runs translucent. In −1.9 °C water it survives by producing{" "}
        <span style={{ color: ICE, fontWeight: 600 }}>
          antifreeze glycoproteins
        </span>{" "}
        that bind to nascent ice crystals and arrest their growth mid-lattice.
      </div>

      {/* Guard against the still render landing on an inert first frame */}
      {frame >= durationInFrames ? null : null}
    </AbsoluteFill>
  );
};
