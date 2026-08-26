import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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
const STAGE = "#100A08";
const PAPER = "#F1E4C7";
const INK = "#3A2416";
const CRIMSON = "#C9432B";
const SEAFOAM = "#8FA9AE";
const DIM = "#6B4B36";

// ── Hero silhouette ────────────────────────────────────────────────────────
// A stylised Mimic Octopus caught mid-costume: the LEFT half of the animal
// still curls octopus-like (soft, tentacular, dotted with suckers); the RIGHT
// half has already stiffened into the ray-like fin-spines of a lion-fish, its
// stripes stretched into fin bands. The mantle silhouette itself is elongated
// like a real cephalopod (not a beach-ball head).

const OctopusHero: React.FC<{ cx: number; cy: number; s: number }> = ({
  cx,
  cy,
  s,
}) => {
  // Left tentacles: organic sweeping curves, all rooted at the mantle chin
  // (roughly x ∈ [-80..-10], y ∈ [40..78]), drifting down-and-out, no
  // self-intersecting loops.
  const octoArms: { d: string; w: number; taper: number }[] = [
    {
      // Uppermost arm — reaches farthest left
      d: "M -78,44 C -170,60 -240,80 -280,140 C -290,190 -260,230 -220,240",
      w: 26,
      taper: 0.5,
    },
    {
      d: "M -68,64 C -150,110 -210,160 -220,230 C -222,278 -190,300 -150,310",
      w: 22,
      taper: 0.45,
    },
    {
      d: "M -46,74 C -100,150 -140,210 -120,280 C -100,325 -60,345 -20,340",
      w: 20,
      taper: 0.4,
    },
    {
      d: "M -20,78 C -34,160 -60,230 -30,300 C -10,338 30,346 70,330",
      w: 18,
      taper: 0.35,
    },
  ];

  // Right side: lion-fish fin rays — straight-ish, tapered, ending in a tip.
  const rays: { angle: number; length: number; w: number }[] = [
    { angle: -35, length: 260, w: 10 },
    { angle: -18, length: 300, w: 12 },
    { angle: 0, length: 320, w: 14 },
    { angle: 18, length: 300, w: 12 },
    { angle: 36, length: 270, w: 10 },
    { angle: 55, length: 230, w: 9 },
    { angle: 75, length: 190, w: 8 },
  ];

  // Mantle path — a real cephalopod mantle: distinctly narrow, pointed top,
  // widening to the "shoulders" around the eye zone, narrowing to a chin at
  // the arm base. Reads unmistakably as an octopus head, not a balloon.
  const mantle = `
    M 0,-240
    C 26,-238 52,-220 72,-180
    C 102,-120 122,-70 122,-20
    C 122,26 100,54 70,66
    C 44,76 22,78 0,78
    C -22,78 -44,76 -70,66
    C -100,54 -122,26 -122,-20
    C -122,-70 -102,-120 -72,-180
    C -52,-220 -26,-238 0,-240
    Z`;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${s})`}>
      <defs>
        <clipPath id="mantle-clip">
          <path d={mantle} />
        </clipPath>
        <linearGradient id="ray-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PAPER} stopOpacity={1} />
          <stop offset="100%" stopColor={PAPER} stopOpacity={0.85} />
        </linearGradient>
      </defs>

      {/* ── LEFT: octopus arms (drawn first so they sit behind mantle) ── */}
      {octoArms.map((a, i) => (
        <g key={`octo-${i}`}>
          <path
            d={a.d}
            stroke={PAPER}
            strokeWidth={a.w}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Tapered secondary stroke to fake taper */}
          <path
            d={a.d}
            stroke={STAGE}
            strokeWidth={a.w * 0.15}
            fill="none"
            strokeLinecap="round"
            opacity={0.25}
          />
        </g>
      ))}
      {/* Suckers on octopus side — small paper dots along inner arm curves */}
      {[
        [-190, 65],
        [-240, 100],
        [-270, 160],
        [-250, 220],
        [-155, 130],
        [-200, 180],
        [-215, 235],
        [-180, 290],
        [-100, 190],
        [-125, 250],
        [-105, 305],
        [-58, 330],
        [-40, 210],
        [-40, 270],
        [-5, 320],
        [45, 335],
      ].map(([x, y], i) => (
        <circle key={`sk-${i}`} cx={x} cy={y} r={4.5} fill={INK} opacity={0.55} />
      ))}

      {/* ── RIGHT: lion-fish rays — straight rigid spines from mantle base ── */}
      {rays.map((r, i) => {
        const rad = (r.angle * Math.PI) / 180;
        // Origin on right shoulder of mantle (matches new mantle chin)
        const ox = 30;
        const oy = 60;
        const x2 = ox + Math.cos(rad) * r.length;
        const y2 = oy + Math.sin(rad) * r.length;
        // Slight bezier bow outward for the middle rays
        const bowAmount = Math.sin(((i + 1) / (rays.length + 1)) * Math.PI) * 30;
        const bx = ox + Math.cos(rad) * r.length * 0.5 - Math.sin(rad) * bowAmount;
        const by = oy + Math.sin(rad) * r.length * 0.5 + Math.cos(rad) * bowAmount;
        const path = `M ${ox} ${oy} Q ${bx} ${by} ${x2} ${y2}`;
        return (
          <g key={`ray-${i}`}>
            {/* Membrane fill between adjacent rays would be nice but complex;
                instead we draw each ray as a wedge triangle for solidity. */}
            <path
              d={path}
              stroke={PAPER}
              strokeWidth={r.w}
              fill="none"
              strokeLinecap="round"
            />
            {/* Cross-hatched bands (the mimic's signature) along each ray */}
            {[0.35, 0.55, 0.75].map((t, j) => {
              const bxp = ox + (x2 - ox) * t + Math.sin(rad) * (bowAmount * (1 - Math.abs(t - 0.5) * 2)) * 0;
              const byp = oy + (y2 - oy) * t + Math.cos(rad) * (bowAmount * (1 - Math.abs(t - 0.5) * 2)) * 0;
              const bandLen = r.w * 3.2;
              return (
                <line
                  key={j}
                  x1={bxp + Math.sin(rad) * (bandLen / 2)}
                  y1={byp - Math.cos(rad) * (bandLen / 2)}
                  x2={bxp - Math.sin(rad) * (bandLen / 2)}
                  y2={byp + Math.cos(rad) * (bandLen / 2)}
                  stroke={INK}
                  strokeWidth={r.w * 0.55}
                  strokeLinecap="butt"
                />
              );
            })}
            {/* Sharp tip */}
            <circle cx={x2} cy={y2} r={r.w * 0.55} fill={CRIMSON} opacity={0.72} />
          </g>
        );
      })}

      {/* ── MANTLE ── */}
      <path d={mantle} fill={PAPER} />

      {/* Broken banding on mantle — alternating slabs on left (octopus side)
          and rays on right (lion-fish side), split at x = 0. Both stop short
          of the eye zone so the eyes read cleanly.  */}
      <g clipPath="url(#mantle-clip)">
        {/* Left half: fat horizontal slabs, only above the eye zone */}
        {[-220, -180, -140, -100, -60].map((y, i) => (
          <rect key={`bL-${i}`} x={-140} y={y} width={144} height={22} fill={INK} />
        ))}
        {/* Divider column faint */}
        <rect x={-1} y={-240} width={2} height={330} fill={INK} opacity={0.28} />
        {/* Right half: narrower vertical stripes echoing lion-fish body */}
        {[8, 30, 52, 74, 96].map((x) => (
          <rect key={`bR-${x}`} x={x} y={-240} width={12} height={330} fill={INK} />
        ))}
        {/* Ink-free horizontal band across eye zone so the eyes sit on paper */}
        <rect x={-140} y={-50} width={280} height={44} fill={PAPER} />
      </g>

      {/* Highlight on top of mantle — subtle */}
      <path
        d="M -34,-228 C -12,-238 14,-238 34,-226"
        stroke={PAPER}
        strokeOpacity={0.55}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyes — placed on the sides of the mantle base like a real octopus */}
      <g>
        <ellipse cx={-56} cy={-30} rx={18} ry={12} fill={STAGE} />
        <ellipse cx={56} cy={-30} rx={18} ry={12} fill={STAGE} />
        {/* horizontal slit pupil */}
        <rect x={-68} y={-32} width={24} height={3} fill={PAPER} opacity={0.85} />
        <rect x={44} y={-32} width={24} height={3} fill={PAPER} opacity={0.85} />
        {/* eye rims */}
        <ellipse
          cx={-56}
          cy={-30}
          rx={18}
          ry={12}
          fill="none"
          stroke={INK}
          strokeWidth={2}
        />
        <ellipse
          cx={56}
          cy={-30}
          rx={18}
          ry={12}
          fill="none"
          stroke={INK}
          strokeWidth={2}
        />
      </g>

      {/* Center "seam" — a thin line down mantle indicating the split */}
      <line
        x1={0}
        y1={-220}
        x2={0}
        y2={60}
        stroke={CRIMSON}
        strokeOpacity={0.42}
        strokeWidth={1.4}
        strokeDasharray="4 6"
      />
    </g>
  );
};

// ── Cast-list mini silhouettes ─────────────────────────────────────────────

const OctopusMini: React.FC<{ fill: string }> = ({ fill }) => (
  <g fill={fill}>
    <ellipse cx={0} cy={-10} rx={20} ry={26} />
    <circle cx={-8} cy={-8} r={2.4} fill={STAGE} />
    <circle cx={8} cy={-8} r={2.4} fill={STAGE} />
    {[-30, -18, -6, 6, 18, 30].map((a) => {
      const rad = (a * Math.PI) / 180;
      const x1 = Math.sin(rad) * 8;
      const y1 = 14;
      const x2 = Math.sin(rad) * 22;
      const y2 = 36;
      const x3 =
        Math.sin(rad) * 28 + Math.cos(rad) * (a > 0 ? 6 : -6);
      const y3 = 52;
      return (
        <path
          key={a}
          d={`M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}`}
          stroke={fill}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
      );
    })}
  </g>
);

const LionfishMini: React.FC<{ fill: string; accent: string }> = ({
  fill,
  accent,
}) => (
  <g>
    <ellipse cx={0} cy={4} rx={22} ry={11} fill={fill} />
    <path d="M 22 4 L 38 -8 L 38 16 Z" fill={fill} />
    {[-20, -14, -8, -2, 4, 10, 16].map((x, i) => (
      <line
        key={i}
        x1={x}
        y1={-4}
        x2={x + (x < 0 ? -1.5 : 1.5) * (2 + i * 0.4)}
        y2={-26}
        stroke={fill}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    ))}
    {[-16, -8, 0, 8, 16].map((x, i) => (
      <line
        key={`p-${i}`}
        x1={x}
        y1={12}
        x2={x + (x < 0 ? -1 : 1) * (3 + i * 0.4)}
        y2={28}
        stroke={fill}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    ))}
    {[-12, -4, 4, 12].map((x) => (
      <rect key={x} x={x} y={-8} width={2.5} height={24} fill={accent} />
    ))}
    <circle cx={-14} cy={2} r={2.2} fill={STAGE} />
  </g>
);

const SoleMini: React.FC<{ fill: string; accent: string }> = ({
  fill,
  accent,
}) => (
  <g>
    <ellipse cx={0} cy={12} rx={30} ry={7} fill={fill} />
    <path d="M -28 12 L -42 4 L -42 20 Z" fill={fill} />
    {[-18, -8, 2, 12, 22].map((x) => (
      <rect key={x} x={x - 1.4} y={5} width={2.8} height={14} fill={accent} />
    ))}
    <circle cx={16} cy={9} r={2.2} fill={STAGE} />
    <circle cx={20} cy={12} r={2.2} fill={STAGE} />
  </g>
);

const SnakeMini: React.FC<{ fill: string; accent: string }> = ({
  fill,
  accent,
}) => (
  <g>
    <path
      d="M -40 20 Q -25 -8 -10 12 T 20 8 T 44 12"
      stroke={fill}
      strokeWidth={10}
      fill="none"
      strokeLinecap="round"
    />
    {[
      { x: -34, y: 14, r: -20 },
      { x: -18, y: -2, r: 20 },
      { x: -2, y: 8, r: 0 },
      { x: 14, y: 10, r: 10 },
      { x: 30, y: 12, r: 0 },
    ].map((b, i) => (
      <g key={i} transform={`translate(${b.x}, ${b.y}) rotate(${b.r})`}>
        <rect x={-1.5} y={-6} width={3} height={12} fill={accent} />
      </g>
    ))}
    <circle cx={44} cy={12} r={6} fill={fill} />
    <circle cx={47} cy={11} r={1.4} fill={STAGE} />
  </g>
);

type CastItem = {
  key: string;
  name: string;
  role: string;
  Icon: React.FC;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const CYCLE = fps * 4.5;
  const stageT = (frame % CYCLE) / CYCLE;
  const active = Math.floor(stageT * 4);

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const heroSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 180, mass: 1.1 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const castOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const spotlightBreath =
    1 + Math.sin((frame / fps) * 1.6) * 0.04 * castOpacity;

  // ── Layout ──
  // Metadata band          : y 40–90
  // Stage box              : y 110..720
  // FIG. caption strip     : y 738..758
  // Cast strip (with tab)  : y 800..930
  // Title lockup           : y 970..1170
  // Footer                 : y 1290..
  const STAGE_BOX = { x: 60, y: 110, w: 960, h: 610 };
  const CAST_BOX = { x: 60, y: 810, w: 960, h: 130 };

  const cast: CastItem[] = [
    {
      key: "octopus",
      name: "Octopus",
      role: "the base form",
      Icon: () => <OctopusMini fill={PAPER} />,
    },
    {
      key: "lionfish",
      name: "Lion-fish",
      role: "the venomous ray-fin",
      Icon: () => <LionfishMini fill={PAPER} accent={CRIMSON} />,
    },
    {
      key: "sole",
      name: "Banded sole",
      role: "the toxic flatfish",
      Icon: () => <SoleMini fill={PAPER} accent={INK} />,
    },
    {
      key: "seasnake",
      name: "Sea-snake",
      role: "the neurotoxic serpent",
      Icon: () => <SnakeMini fill={PAPER} accent={INK} />,
    },
  ];

  const cellW = CAST_BOX.w / 4;

  return (
    <AbsoluteFill style={{ backgroundColor: STAGE, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: PAPER,
          opacity: 0.7,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CRIMSON, opacity: 0.95 }}>2026 · 08 · 26</span>
      </div>

      {/* Stage + hero */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="spot" cx="50%" cy="18%" r="80%">
            <stop offset="0%" stopColor="#3E2A1C" stopOpacity={1} />
            <stop offset="45%" stopColor="#1B110A" stopOpacity={1} />
            <stop offset="100%" stopColor={STAGE} stopOpacity={1} />
          </radialGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0} />
            <stop offset="100%" stopColor={INK} stopOpacity={0.7} />
          </linearGradient>
          <radialGradient id="hero-halo" cx="50%" cy="35%" r="52%">
            <stop offset="0%" stopColor={PAPER} stopOpacity={0.22} />
            <stop offset="60%" stopColor={PAPER} stopOpacity={0.05} />
            <stop offset="100%" stopColor={PAPER} stopOpacity={0} />
          </radialGradient>
          {/* Volumetric spotlight cone */}
          <linearGradient id="cone" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={PAPER} stopOpacity={0.16} />
            <stop offset="100%" stopColor={PAPER} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Stage rectangle */}
        <rect
          x={STAGE_BOX.x}
          y={STAGE_BOX.y}
          width={STAGE_BOX.w}
          height={STAGE_BOX.h}
          fill="url(#spot)"
        />
        {/* Floor gradient — implies ground */}
        <rect
          x={STAGE_BOX.x}
          y={STAGE_BOX.y + STAGE_BOX.h * 0.55}
          width={STAGE_BOX.w}
          height={STAGE_BOX.h * 0.45}
          fill="url(#floor)"
        />

        {/* Volumetric cone from top-center */}
        <polygon
          points={`${STAGE_BOX.x + STAGE_BOX.w / 2 - 30},${STAGE_BOX.y}
                   ${STAGE_BOX.x + STAGE_BOX.w / 2 + 30},${STAGE_BOX.y}
                   ${STAGE_BOX.x + STAGE_BOX.w / 2 + 260},${STAGE_BOX.y + STAGE_BOX.h}
                   ${STAGE_BOX.x + STAGE_BOX.w / 2 - 260},${STAGE_BOX.y + STAGE_BOX.h}`}
          fill="url(#cone)"
        />

        {/* Thin frame */}
        <rect
          x={STAGE_BOX.x + 0.5}
          y={STAGE_BOX.y + 0.5}
          width={STAGE_BOX.w - 1}
          height={STAGE_BOX.h - 1}
          fill="none"
          stroke={PAPER}
          strokeOpacity={0.16}
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [STAGE_BOX.x, STAGE_BOX.y, 1, 1],
            [STAGE_BOX.x + STAGE_BOX.w, STAGE_BOX.y, -1, 1],
            [STAGE_BOX.x, STAGE_BOX.y + STAGE_BOX.h, 1, -1],
            [STAGE_BOX.x + STAGE_BOX.w, STAGE_BOX.y + STAGE_BOX.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={CRIMSON} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Halo behind hero */}
        <g
          style={{
            transformOrigin: `${STAGE_BOX.x + STAGE_BOX.w / 2}px ${
              STAGE_BOX.y + STAGE_BOX.h * 0.5
            }px`,
            transform: `scale(${spotlightBreath})`,
          }}
        >
          <circle
            cx={STAGE_BOX.x + STAGE_BOX.w / 2}
            cy={STAGE_BOX.y + STAGE_BOX.h * 0.5}
            r={370}
            fill="url(#hero-halo)"
          />
        </g>

        {/* Stage cue label — small caps, top-left inside frame */}
        <g
          transform={`translate(${STAGE_BOX.x + 26}, ${STAGE_BOX.y + 34})`}
          fill={PAPER}
          fillOpacity={0.55}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.5}
        >
          <text>ACT I · SCENE I</text>
        </g>
        <g
          transform={`translate(${STAGE_BOX.x + STAGE_BOX.w - 26}, ${
            STAGE_BOX.y + 34
          })`}
          fill={PAPER}
          fillOpacity={0.55}
          fontFamily={inter}
          fontSize={11}
          fontWeight={600}
          letterSpacing={3.5}
          textAnchor="end"
        >
          <text>SULAWESI · 15 M DEPTH</text>
        </g>

        {/* Hero octopus, mid-transformation */}
        <g
          style={{
            transformOrigin: `${STAGE_BOX.x + STAGE_BOX.w / 2}px ${
              STAGE_BOX.y + STAGE_BOX.h * 0.55
            }px`,
            transform: `scale(${interpolate(heroSpring, [0, 1], [0.94, 1])})`,
            opacity: heroSpring,
          }}
        >
          <OctopusHero
            cx={STAGE_BOX.x + STAGE_BOX.w / 2}
            cy={STAGE_BOX.y + 290}
            s={0.9}
          />
        </g>

        {/* "Half / Half" annotation ticks */}
        <g
          fill={PAPER}
          fillOpacity={0.35}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={600}
        >
          <text
            x={STAGE_BOX.x + 26}
            y={STAGE_BOX.y + STAGE_BOX.h - 26}
          >
            LEFT · TENTACLES
          </text>
          <text
            x={STAGE_BOX.x + STAGE_BOX.w - 26}
            y={STAGE_BOX.y + STAGE_BOX.h - 26}
            textAnchor="end"
            fill={CRIMSON}
            fillOpacity={0.85}
          >
            RIGHT · FIN RAYS
          </text>
        </g>

        {/* Caption strip just below the stage */}
        <g
          transform={`translate(${STAGE_BOX.x}, ${
            STAGE_BOX.y + STAGE_BOX.h + 30
          })`}
          fill={PAPER}
          fillOpacity={0.55}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ONE ANIMAL, MID-CHARACTER</text>
          <text
            x={STAGE_BOX.w}
            textAnchor="end"
            fill={CRIMSON}
            opacity={0.9}
          >
            15+ MODELS ON FILE
          </text>
        </g>

        {/* Cast list strip — 4 cells */}
        <g
          opacity={castOpacity}
          transform={`translate(${CAST_BOX.x}, ${CAST_BOX.y})`}
        >
          {/* "THE CAST" tab well above the top rule so no collision */}
          <g transform={`translate(0, -16)`}>
            <text
              fill={PAPER}
              fillOpacity={0.7}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={4}
              fontWeight={600}
            >
              THE CAST · IV ROLES
            </text>
          </g>
          {/* top rule */}
          <line
            x1={0}
            y1={0}
            x2={CAST_BOX.w}
            y2={0}
            stroke={PAPER}
            strokeOpacity={0.22}
          />
          {/* bottom rule */}
          <line
            x1={0}
            y1={CAST_BOX.h}
            x2={CAST_BOX.w}
            y2={CAST_BOX.h}
            stroke={PAPER}
            strokeOpacity={0.22}
          />

          {cast.map((c, i) => {
            const x = i * cellW;
            const isActive = i === active;
            return (
              <g key={c.key} transform={`translate(${x}, 0)`}>
                {isActive && (
                  <rect
                    x={4}
                    y={4}
                    width={cellW - 8}
                    height={CAST_BOX.h - 8}
                    fill={PAPER}
                    fillOpacity={0.06}
                  />
                )}
                {i > 0 && (
                  <line
                    x1={0}
                    y1={14}
                    x2={0}
                    y2={CAST_BOX.h - 14}
                    stroke={PAPER}
                    strokeOpacity={0.16}
                  />
                )}
                <text
                  x={18}
                  y={26}
                  fill={isActive ? CRIMSON : PAPER}
                  fillOpacity={isActive ? 1 : 0.55}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={16}
                  fontWeight={500}
                >
                  {["I", "II", "III", "IV"][i]}
                </text>
                <g
                  transform={`translate(${cellW / 2}, ${CAST_BOX.h / 2 - 8})`}
                >
                  <g opacity={isActive ? 1 : 0.5}>
                    <c.Icon />
                  </g>
                </g>
                <text
                  x={cellW / 2}
                  y={CAST_BOX.h - 30}
                  textAnchor="middle"
                  fill={PAPER}
                  fillOpacity={isActive ? 0.95 : 0.7}
                  fontFamily={inter}
                  fontSize={11}
                  letterSpacing={2.6}
                  fontWeight={600}
                >
                  {c.name.toUpperCase()}
                </text>
                <text
                  x={cellW / 2}
                  y={CAST_BOX.h - 14}
                  textAnchor="middle"
                  fill={PAPER}
                  fillOpacity={0.45}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontSize={12}
                  fontWeight={500}
                >
                  {c.role}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 985,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [18, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: CRIMSON,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: PAPER, letterSpacing: 5 }}>Method Actor</span>
        </div>

        <div
          style={{
            color: PAPER,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 74,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The eight-armed
          <br />
          impersonator.
        </div>

        <div
          style={{
            marginTop: 24,
            color: PAPER,
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity * 0.88,
          }}
        >
          On the sandy silt of Sulawesi,{" "}
          <span style={{ color: CRIMSON, fontWeight: 600 }}>
            Thaumoctopus mimicus
          </span>{" "}
          rearranges its arms, shifts its stripe pattern, and even changes its
          swim gait to impersonate at least fifteen defended species — the
          only known animal that plays so many characters at once.
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
          color: PAPER,
          opacity: 0.55,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Norman, Finn &amp; Tregenza · Proc. R. Soc. B 268 (2001)</span>
        <span>
          <span style={{ color: CRIMSON }}>●</span> Dynamic behavioural mimicry
        </span>
      </div>
    </AbsoluteFill>
  );
};
