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
const SPACE = "#050716";
const SPACE_MID = "#0F1738";
const SPACE_DEEP = "#020310";
const AMBER = "#E9B871";
const AMBER_DEEP = "#B78246";
const CREAM = "#F2E6C9";
const RED = "#D64545";
const GRAY = "#7B8399";
const HAIR = "#1A2246";

// ── Seeded star field ─────────────────────────────────────────────────
const rand = (s: number): number => {
  const x = Math.sin(s * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

type Star = { x: number; y: number; r: number; base: number; twinkle: number };
const makeStars = (n: number): Star[] => {
  const out: Star[] = [];
  for (let i = 0; i < n; i++) {
    const rr = Math.pow(rand(i + 1.7), 3);
    out.push({
      x: rand(i * 3.1 + 0.5) * 880,
      y: rand(i * 7.7 + 1.3) * 780,
      r: 0.4 + rr * 1.9,
      base: 0.3 + rand(i * 2.2 + 5) * 0.6,
      twinkle: rand(i * 4.4 + 9),
    });
  }
  return out;
};
const STARS = makeStars(220);

// Orbital ring tick callouts — mission-patch data.
// Angles kept off the vertical/horizontal so text lands cleanly in quadrants
// inside the porthole safe area.
type Callout = { angle: number; label: string; big?: boolean };
const CALLOUTS: Callout[] = [
  { angle: -74, label: "FOTON-M3", big: true }, // top-right — mission name
  { angle: -18, label: "LEO · 258 KM" }, // right
  { angle: 62, label: "10 DAYS" }, // bottom-right
  { angle: 118, label: "VAC · UV" }, // bottom-left
  { angle: 198, label: "TUN STATE" }, // left
];

// ── Tardigrade profile — dorsal-lateral silhouette in a 440×260 local box.
// The body arches over 4 stubby legs (near-side of 4 pairs); head to the right,
// mouth-stylet visible at the front. Coordinates chosen to read as the classic
// "water bear" pose used in scientific illustration.
const bodyOutlinePath =
  // Start at the tail tip (left) and travel clockwise: over the arched back,
  // around a smooth rounded head with a small terminal snout aperture, then
  // back under the belly to the tail. No chin-bulge.
  "M 42 154 " +
  "C 28 112, 50 72, 96 60 " + // rear hump climbing to the back
  "C 160 44, 232 42, 296 50 " + // long back arch
  "C 328 54, 354 66, 370 86 " + // shoulder rise
  "C 382 102, 386 122, 380 142 " + // head crown → cheek
  "C 374 158, 358 170, 336 176 " + // head sweeps down
  "C 316 180, 292 178, 268 178 " + // shoulder-to-belly
  "C 232 178, 190 190, 146 196 " + // belly bulge
  "C 108 200, 74 196, 54 186 " + // rear underbelly
  "C 42 178, 38 168, 42 154 Z";

// Body segment dividers — cuticle articulation from head → tail. Curves that
// follow the arch of the back and drape under the belly, spaced roughly evenly.
const segmentDividers: string[] = [
  "M 92 66 C 86 108, 90 156, 108 196",
  "M 158 52 C 152 100, 158 158, 172 198",
  "M 224 48 C 222 100, 228 160, 240 194",
  "M 292 52 C 292 102, 296 158, 304 186",
  "M 340 66 C 342 110, 340 154, 336 176",
];

// Leg definitions — the near-side of 4 pairs (front→back), each with a foot + claws.
type Leg = { rootX: number; rootY: number; angle: number; len: number; size: number };
const LEGS: Leg[] = [
  { rootX: 310, rootY: 174, angle: 72, len: 52, size: 1.05 }, // pair I (front, angled forward)
  { rootX: 246, rootY: 190, angle: 92, len: 56, size: 1.1 }, // pair II
  { rootX: 176, rootY: 196, angle: 100, len: 58, size: 1.1 }, // pair III
  { rootX: 72, rootY: 190, angle: 132, len: 56, size: 1.05 }, // pair IV (rear, splayed back)
];

type Point = { x: number; y: number };
const polar = (cx: number, cy: number, r: number, deg: number): Point => {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
};

const legPath = (l: Leg): string => {
  const tip = polar(l.rootX, l.rootY, l.len, l.angle);
  const w = 18 * l.size;
  // Two-sided path forming a stubby cone
  const left = polar(l.rootX, l.rootY, w / 2, l.angle - 90);
  const right = polar(l.rootX, l.rootY, w / 2, l.angle + 90);
  const tipLeft = polar(tip.x, tip.y, w * 0.34, l.angle - 90);
  const tipRight = polar(tip.x, tip.y, w * 0.34, l.angle + 90);
  return (
    `M ${left.x} ${left.y} ` +
    `C ${left.x} ${(left.y + tipLeft.y) / 2}, ${tipLeft.x - 2} ${tipLeft.y - 2}, ${tipLeft.x} ${tipLeft.y} ` +
    `Q ${tip.x} ${tip.y + 6 * l.size}, ${tipRight.x} ${tipRight.y} ` +
    `C ${(right.x + tipRight.x) / 2} ${(right.y + tipRight.y) / 2}, ${right.x} ${right.y}, ${right.x} ${right.y} Z`
  );
};

const legClaws = (l: Leg): string => {
  const tip = polar(l.rootX, l.rootY, l.len + 2, l.angle);
  const c1 = polar(tip.x, tip.y, 7, l.angle - 18);
  const c2 = polar(tip.x, tip.y, 8, l.angle + 4);
  const c3 = polar(tip.x, tip.y, 7, l.angle + 24);
  return (
    `M ${tip.x} ${tip.y} L ${c1.x} ${c1.y} ` +
    `M ${tip.x} ${tip.y} L ${c2.x} ${c2.y} ` +
    `M ${tip.x} ${tip.y} L ${c3.x} ${c3.y}`
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Loop param (0..1)
  const loop = (frame % durationInFrames) / durationInFrames;

  // Subtle floating — sine over full loop
  const bobY = Math.sin(loop * Math.PI * 2) * 8;
  const rockDeg = Math.sin(loop * Math.PI * 2 + 0.6) * 2.4;
  const orbitDeg = loop * 360 * 0.08; // slow drift

  // Entrance
  const bootSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Layout constants
  const PORT = { x: 100, y: 150, w: 880, h: 780 }; // porthole viewport
  const ORBIT_CX = PORT.x + PORT.w / 2;
  const ORBIT_CY = PORT.y + PORT.h / 2 - 4; // near-centre; callouts sit inside the frame
  const OUTER_R = 300;
  const MID_R = 236;
  const INNER_R = 180;

  // Tardigrade transform — local coords 440×240, we translate + scale + rotate.
  // We want it centered on ORBIT_CX, ORBIT_CY, roughly 380px wide.
  const T_SCALE = 0.92;
  const T_LOCAL_W = 440;
  const T_LOCAL_H = 240;
  const tardX = ORBIT_CX - (T_LOCAL_W * T_SCALE) / 2 + 6;
  const tardY = ORBIT_CY - (T_LOCAL_H * T_SCALE) / 2 - 4 + bobY;

  return (
    <AbsoluteFill style={{ backgroundColor: SPACE, fontFamily: inter }}>
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
          opacity: interpolate(bootSpring, [0, 1], [0, 1]),
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 07 · 23</span>
      </div>

      {/* Deep space + porthole */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Space vignette inside porthole */}
          <radialGradient id="space-vignette" cx="50%" cy="46%" r="70%">
            <stop offset="0%" stopColor={SPACE_MID} stopOpacity={1} />
            <stop offset="55%" stopColor={SPACE} stopOpacity={1} />
            <stop offset="100%" stopColor={SPACE_DEEP} stopOpacity={1} />
          </radialGradient>

          {/* Amber body gradient — subtle top-lit sheen */}
          <linearGradient id="amber-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CREAM} stopOpacity={1} />
            <stop offset="45%" stopColor={AMBER} stopOpacity={1} />
            <stop offset="100%" stopColor={AMBER_DEEP} stopOpacity={1} />
          </linearGradient>

          <radialGradient id="body-glow" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.25} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>

          {/* Porthole clip */}
          <clipPath id="port-clip">
            <rect
              x={PORT.x}
              y={PORT.y}
              width={PORT.w}
              height={PORT.h}
              rx={12}
            />
          </clipPath>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Porthole background */}
        <g clipPath="url(#port-clip)">
          <rect
            x={PORT.x}
            y={PORT.y}
            width={PORT.w}
            height={PORT.h}
            fill="url(#space-vignette)"
          />

          {/* Stars */}
          <g transform={`translate(${PORT.x}, ${PORT.y})`}>
            {STARS.map((s, i) => {
              const twinkle =
                s.base +
                Math.sin(loop * Math.PI * 2 * (0.6 + s.twinkle * 1.4) + s.twinkle * 6) *
                  0.25;
              return (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={CREAM}
                  opacity={Math.max(0.08, Math.min(1, twinkle)) * bootSpring}
                />
              );
            })}
          </g>

          {/* Orbital rings */}
          <g
            transform={`translate(${ORBIT_CX}, ${ORBIT_CY}) rotate(${orbitDeg})`}
            opacity={bootSpring}
          >
            <circle
              r={OUTER_R}
              cx={0}
              cy={0}
              fill="none"
              stroke={HAIR}
              strokeWidth={1}
            />
            <circle
              r={MID_R}
              cx={0}
              cy={0}
              fill="none"
              stroke={HAIR}
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            <circle
              r={INNER_R}
              cx={0}
              cy={0}
              fill="none"
              stroke={HAIR}
              strokeWidth={1}
              strokeDasharray="1 4"
            />

            {/* Tick marks around outer ring */}
            {Array.from({ length: 72 }).map((_, i) => {
              const a = (i * 360) / 72;
              const isBig = i % 6 === 0;
              const inner = OUTER_R - (isBig ? 12 : 6);
              const p1 = polar(0, 0, OUTER_R, a - 90);
              const p2 = polar(0, 0, inner, a - 90);
              return (
                <line
                  key={i}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isBig ? GRAY : HAIR}
                  strokeWidth={isBig ? 1.4 : 1}
                />
              );
            })}
          </g>

          {/* Ring callouts (counter-rotate so text stays upright) */}
          {CALLOUTS.map((c, i) => {
            const p = polar(ORBIT_CX, ORBIT_CY, OUTER_R + 22, c.angle);
            const tick1 = polar(ORBIT_CX, ORBIT_CY, OUTER_R + 2, c.angle);
            const tick2 = polar(ORBIT_CX, ORBIT_CY, OUTER_R + 16, c.angle);
            // decide text anchor by quadrant
            const anchor: "start" | "middle" | "end" =
              c.angle > -60 && c.angle < 60
                ? "start"
                : c.angle > 120 || c.angle < -120
                  ? "end"
                  : "middle";
            const dx = anchor === "start" ? 6 : anchor === "end" ? -6 : 0;
            const dy = c.angle > -30 && c.angle < 30 ? 4 : c.angle > 150 || c.angle < -150 ? 4 : 4;
            const revealAt = 0.35 + i * 0.08;
            const reveal = interpolate(
              bootSpring,
              [revealAt - 0.35, revealAt],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            return (
              <g key={i} opacity={reveal}>
                <line
                  x1={tick1.x}
                  y1={tick1.y}
                  x2={tick2.x}
                  y2={tick2.y}
                  stroke={c.big ? RED : GRAY}
                  strokeWidth={c.big ? 1.6 : 1.2}
                />
                <text
                  x={p.x + dx}
                  y={p.y + dy}
                  textAnchor={anchor}
                  fill={c.big ? RED : GRAY}
                  fontFamily={inter}
                  fontSize={c.big ? 12 : 10.5}
                  fontWeight={c.big ? 700 : 500}
                  letterSpacing={c.big ? 4 : 3}
                >
                  {c.label}
                </text>
              </g>
            );
          })}

          {/* Ambient glow behind the animal */}
          <ellipse
            cx={ORBIT_CX}
            cy={ORBIT_CY + bobY}
            rx={230}
            ry={130}
            fill="url(#body-glow)"
          />

          {/* Tardigrade */}
          <g
            transform={
              `translate(${tardX}, ${tardY}) ` +
              `scale(${T_SCALE}) ` +
              `rotate(${rockDeg}, ${T_LOCAL_W / 2}, ${T_LOCAL_H / 2})`
            }
            opacity={bootSpring}
          >
            {/* Legs — drawn BEHIND body */}
            {LEGS.map((l, i) => (
              <g key={`leg-${i}`}>
                <path
                  d={legPath(l)}
                  fill={AMBER_DEEP}
                  stroke="#7A5528"
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
                <path
                  d={legClaws(l)}
                  stroke="#5A3D1E"
                  strokeWidth={1.2}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            ))}
            {/* Body outer stroke */}
            <path
              d={bodyOutlinePath}
              fill="url(#amber-body)"
              stroke="#7A5528"
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            {/* Body segment articulation lines */}
            {segmentDividers.map((d, i) => (
              <path
                key={`seg-${i}`}
                d={d}
                stroke="#8A5F30"
                strokeWidth={0.9}
                strokeOpacity={0.42}
                fill="none"
              />
            ))}
            {/* Dorsal highlight along the arched back */}
            <path
              d="M 92 82 C 170 60, 260 54, 340 76"
              stroke={CREAM}
              strokeWidth={5}
              strokeOpacity={0.32}
              fill="none"
              strokeLinecap="round"
            />
            {/* Mouth stylet — small terminal aperture at the head tip */}
            <g>
              <ellipse
                cx={378}
                cy={140}
                rx={6}
                ry={4.5}
                fill={AMBER_DEEP}
                stroke="#7A5528"
                strokeWidth={1.1}
              />
              <ellipse cx={378} cy={140} rx={2}   ry={1.4} fill={SPACE} />
              {/* Two stylet needles hinting into the pharynx */}
              <line
                x1={374}
                y1={139}
                x2={354}
                y2={132}
                stroke="#5A3D1E"
                strokeWidth={0.9}
              />
              <line
                x1={374}
                y1={142}
                x2={354}
                y2={148}
                stroke="#5A3D1E"
                strokeWidth={0.9}
              />
            </g>
            {/* Faint gut trace — visible through cuticle */}
            <path
              d="M 84 150 C 170 140, 260 140, 336 148"
              stroke={AMBER_DEEP}
              strokeWidth={2.2}
              strokeOpacity={0.4}
              fill="none"
            />
          </g>

          {/* Porthole cross-hair */}
          <g stroke={HAIR} strokeWidth={1}>
            <line
              x1={ORBIT_CX - 14}
              y1={ORBIT_CY - OUTER_R - 34}
              x2={ORBIT_CX + 14}
              y2={ORBIT_CY - OUTER_R - 34}
            />
            <line
              x1={ORBIT_CX}
              y1={ORBIT_CY - OUTER_R - 42}
              x2={ORBIT_CX}
              y2={ORBIT_CY - OUTER_R - 26}
            />
          </g>
        </g>

        {/* Porthole frame */}
        <rect
          x={PORT.x + 0.5}
          y={PORT.y + 0.5}
          width={PORT.w - 1}
          height={PORT.h - 1}
          rx={12}
          fill="none"
          stroke="#1D2544"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [PORT.x, PORT.y, 1, 1],
            [PORT.x + PORT.w, PORT.y, -1, 1],
            [PORT.x, PORT.y + PORT.h, 1, -1],
            [PORT.x + PORT.w, PORT.y + PORT.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={RED} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Caption strip beneath the porthole */}
        <g
          transform={`translate(${PORT.x}, ${PORT.y + PORT.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · SPECIMEN IN ANHYDROBIOTIC TUN STATE</text>
          <text
            x={PORT.w}
            textAnchor="end"
            fill={AMBER}
            opacity={0.9}
          >
            SURVIVED 10 D · LEO · UV + VAC
          </text>
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
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: AMBER,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>Astronaut</span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The micronaut.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C6CCDA",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Dried into a barrel-shaped{" "}
          <span style={{ color: AMBER, fontWeight: 600 }}>tun</span>, the
          tardigrade rode ten days of open space aboard FOTON-M3 — hard vacuum
          plus unfiltered solar UV — and rehydrated back to life on Earth. Its
          Dsup protein wraps its DNA and blunts X-ray damage by ~40%.
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Jönsson et al. · Curr. Biol. 18 (2008) R729–R731</span>
        <span>
          <span style={{ color: RED }}>●</span> Mission · FOTON-M3
        </span>
      </div>
    </AbsoluteFill>
  );
};
