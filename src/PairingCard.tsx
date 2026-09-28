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

// ── Palette — taken from the concept's visual brief ─────────────────────
const INK = "#050914";
const ATMOS = "#0F1826";
const GREEN = "#5CFF9E"; // 557.7 nm — atomic O
const RED = "#FF5566"; // 630.0 nm — atomic O
const VIOLET = "#8B7CFF"; // 427.8 nm — N₂⁺
const GRAY = "#8A94A6";
const RULE = "#1B2536";

// Sky panel (viewBox coords match the outer 1080×1350)
const SKY = { x: 60, y: 130, w: 960, h: 770 };
const HORIZON_Y = SKY.y + SKY.h - 130; // silhouetted arctic ridge line

// Sine helpers
const twoPi = Math.PI * 2;

// ── Aurora curtain builder ──────────────────────────────────────────────
// Build a single "curtain" as a wavy vertical band. `phase` shifts the
// horizontal wave; `xCenter` moves the whole ribbon; `width` sets thickness;
// `topY`/`bottomY` set vertical extent; `amp` controls sway magnitude.
type CurtainProps = {
  phase: number;
  xCenter: number;
  width: number;
  topY: number;
  bottomY: number;
  amp: number;
  segments?: number;
  freq?: number; // vertical frequency (waves per height)
};

const curtainPath = ({
  phase,
  xCenter,
  width,
  topY,
  bottomY,
  amp,
  segments = 24,
  freq = 1.6,
}: CurtainProps): string => {
  const dy = (bottomY - topY) / segments;
  const rightPts: { x: number; y: number }[] = [];
  const leftPts: { x: number; y: number }[] = [];

  for (let i = 0; i <= segments; i++) {
    const y = topY + dy * i;
    const t = i / segments;
    // The sway is stronger in the middle of the ribbon
    const sway = Math.sin(t * twoPi * freq + phase) * amp;
    // Ribbon narrows slightly at top and bottom (envelope)
    const envelope = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
    const w = width * (0.55 + 0.45 * envelope);
    const cx = xCenter + sway;
    rightPts.push({ x: cx + w / 2, y });
    leftPts.push({ x: cx - w / 2, y });
  }
  // Build a smooth path down the right side, then up the left
  const smooth = (pts: { x: number; y: number }[]) => {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y} `;
    }
    return d;
  };
  return (
    `M ${rightPts[0].x} ${rightPts[0].y} ` +
    smooth(rightPts) +
    `L ${leftPts[leftPts.length - 1].x} ${leftPts[leftPts.length - 1].y} ` +
    smooth([...leftPts].reverse()) +
    "Z"
  );
};

// ── Star field (deterministic) ─────────────────────────────────────────
type Star = { x: number; y: number; r: number; a: number; twinklePhase: number };
const mulberry32 = (seed: number) => {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const STARS: Star[] = (() => {
  const rand = mulberry32(20260928);
  const out: Star[] = [];
  const count = 130;
  for (let i = 0; i < count; i++) {
    const x = SKY.x + 4 + rand() * (SKY.w - 8);
    const y = SKY.y + 8 + rand() * (SKY.h - 260); // keep stars above horizon
    const r = rand() < 0.9 ? 0.6 + rand() * 0.9 : 1.2 + rand() * 1.1;
    const a = 0.35 + rand() * 0.55;
    const twinklePhase = rand() * twoPi;
    out.push({ x, y, r, a, twinklePhase });
  }
  return out;
})();

// ── Mountain silhouette (deterministic) ────────────────────────────────
const MOUNTAIN_PATH = (() => {
  const rand = mulberry32(4271);
  const pts: [number, number][] = [];
  const baseY = SKY.y + SKY.h; // bottom of sky
  const start: [number, number] = [SKY.x, HORIZON_Y + 12];
  pts.push(start);
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = SKY.x + (SKY.w * i) / steps;
    // Low, gently rolling arctic ridge — no cartoon spikes
    const slow = Math.sin((i / steps) * Math.PI * 1.6) * 22;
    const jitter = (rand() - 0.5) * 10;
    const peak = 18 + Math.abs(Math.sin((i / steps) * Math.PI * 3.4)) * 24;
    const y = HORIZON_Y - peak + slow + jitter;
    pts.push([x, y]);
  }
  pts.push([SKY.x + SKY.w, HORIZON_Y + 12]);
  pts.push([SKY.x + SKY.w, baseY]);
  pts.push([SKY.x, baseY]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  d += " Z";
  return d;
})();

// ── Emission callouts (species / wavelength / colour) ──────────────────
type Callout = {
  id: string;
  species: string;
  wavelength: string;
  color: string;
  // Anchor on the curtain (in sky coords) that the leader points to
  anchor: { x: number; y: number };
  // Where the tag sits (right of the sky panel)
  tagY: number;
  // Order of appearance (fraction of scene t)
  order: number;
};
const CALLOUTS: Callout[] = [
  {
    id: "red",
    species: "O",
    wavelength: "630.0 nm",
    color: RED,
    anchor: { x: SKY.x + SKY.w * 0.58, y: SKY.y + 160 },
    tagY: SKY.y + 170,
    order: 0.0,
  },
  {
    id: "green",
    species: "O",
    wavelength: "557.7 nm",
    color: GREEN,
    anchor: { x: SKY.x + SKY.w * 0.58, y: SKY.y + 380 },
    tagY: SKY.y + 340,
    order: 0.12,
  },
  {
    id: "violet",
    species: "N₂⁺",
    wavelength: "427.8 nm",
    color: VIOLET,
    anchor: { x: SKY.x + SKY.w * 0.52, y: SKY.y + 545 },
    tagY: SKY.y + 505,
    order: 0.24,
  },
];

// ── Visible-spectrum ruler ─────────────────────────────────────────────
// Rendered as a thin horizontal bar. Range 400–700 nm; ticks at the
// three emission wavelengths.
const wavelengthToPos = (nm: number): number =>
  interpolate(nm, [400, 700], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// ── Main component ─────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Global sway phase (radians) — locked to composition duration for a clean loop
  const sway = (frame / durationInFrames) * twoPi;

  // Scene progress 0..1 across ~2.5s intro
  const introSpan = fps * 2.6;
  const t = Math.max(0, frame) / introSpan;

  // Title / hook / footer springs
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.85 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.95, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const auroraFade = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Build three curtain layers (back, mid, front)
  const curtains = [
    {
      xCenter: SKY.x + SKY.w * 0.40,
      width: 260,
      amp: 34,
      phase: sway,
      opacity: 0.55,
      freq: 1.2,
    },
    {
      xCenter: SKY.x + SKY.w * 0.55,
      width: 330,
      amp: 42,
      phase: sway + 1.1,
      opacity: 0.95,
      freq: 1.5,
    },
    {
      xCenter: SKY.x + SKY.w * 0.66,
      width: 210,
      amp: 26,
      phase: sway + 2.4,
      opacity: 0.60,
      freq: 1.8,
    },
  ];

  // Spectrum-ruler layout
  const RULER = { x: 80, y: 950, w: 620, h: 12 };
  const rulerBarOpacity = interpolate(
    frame,
    [fps * 1.3, fps * 2.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
        <span style={{ color: GREEN }}>2026 · 09 · 28</span>
      </div>

      {/* Sky + aurora SVG */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Sky vignette */}
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020510" />
            <stop offset="60%" stopColor="#060B18" />
            <stop offset="100%" stopColor={ATMOS} />
          </linearGradient>

          {/* Aurora curtain gradient: violet base rim, green core, red crown */}
          <linearGradient id="aurora-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity={0} />
            <stop offset="6%" stopColor={RED} stopOpacity={0.75} />
            <stop offset="20%" stopColor={RED} stopOpacity={0.55} />
            <stop offset="34%" stopColor={GREEN} stopOpacity={0.9} />
            <stop offset="70%" stopColor={GREEN} stopOpacity={1} />
            <stop offset="88%" stopColor={VIOLET} stopOpacity={0.55} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </linearGradient>

          {/* A softer overlay gradient for the back curtain */}
          <linearGradient id="aurora-grad-soft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RED} stopOpacity={0} />
            <stop offset="18%" stopColor={RED} stopOpacity={0.35} />
            <stop offset="45%" stopColor={GREEN} stopOpacity={0.55} />
            <stop offset="82%" stopColor={VIOLET} stopOpacity={0.35} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </linearGradient>

          <filter id="aurora-blur" x="-20%" y="-10%" width="140%" height="120%">
            <feGaussianBlur stdDeviation="14" />
          </filter>

          <filter
            id="aurora-blur-soft"
            x="-20%"
            y="-10%"
            width="140%"
            height="120%"
          >
            <feGaussianBlur stdDeviation="34" />
          </filter>

          {/* Ground glow — the curtain reflected on the atmosphere */}
          <linearGradient id="ground-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.28} />
            <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>

          <linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4B2A9E" />
            <stop offset="14%" stopColor="#5A5AE0" />
            <stop offset="30%" stopColor="#4FE0F0" />
            <stop offset="46%" stopColor="#5CFF9E" />
            <stop offset="62%" stopColor="#F4E85A" />
            <stop offset="80%" stopColor="#FF9040" />
            <stop offset="100%" stopColor="#E1354A" />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect
          x={SKY.x}
          y={SKY.y}
          width={SKY.w}
          height={SKY.h}
          fill="url(#sky-grad)"
        />

        {/* Sky frame — thin outer rule */}
        <rect
          x={SKY.x + 0.5}
          y={SKY.y + 0.5}
          width={SKY.w - 1}
          height={SKY.h - 1}
          fill="none"
          stroke="#1A2130"
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [SKY.x, SKY.y, 1, 1],
            [SKY.x + SKY.w, SKY.y, -1, 1],
            [SKY.x, SKY.y + SKY.h, 1, -1],
            [SKY.x + SKY.w, SKY.y + SKY.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GREEN} strokeWidth={1.5} fill="none" opacity={0.75}>
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Stars */}
        <g opacity={auroraFade}>
          {STARS.map((s, i) => {
            const tw =
              0.7 +
              0.3 *
                Math.sin(
                  (frame / durationInFrames) * twoPi * 2 + s.twinklePhase,
                );
            return (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#E9EEFF"
                opacity={s.a * tw}
              />
            );
          })}
        </g>

        {/* Aurora curtains — clipped to sky panel */}
        <clipPath id="sky-clip">
          <rect x={SKY.x} y={SKY.y} width={SKY.w} height={SKY.h} />
        </clipPath>
        <g clipPath="url(#sky-clip)" opacity={auroraFade}>
          {/* Very soft back-glow curtain */}
          {curtains.map((c, i) => (
            <path
              key={`soft-${i}`}
              d={curtainPath({
                phase: c.phase,
                xCenter: c.xCenter,
                width: c.width * 1.6,
                topY: SKY.y + 30,
                bottomY: HORIZON_Y - 10,
                amp: c.amp * 1.2,
                freq: c.freq,
              })}
              fill="url(#aurora-grad-soft)"
              opacity={c.opacity * 0.6}
              filter="url(#aurora-blur-soft)"
            />
          ))}
          {/* Mid glow */}
          {curtains.map((c, i) => (
            <path
              key={`mid-${i}`}
              d={curtainPath({
                phase: c.phase,
                xCenter: c.xCenter,
                width: c.width,
                topY: SKY.y + 30,
                bottomY: HORIZON_Y - 10,
                amp: c.amp,
                freq: c.freq,
              })}
              fill="url(#aurora-grad)"
              opacity={c.opacity * 0.85}
              filter="url(#aurora-blur)"
            />
          ))}
          {/* Bright cores — narrower */}
          {curtains.map((c, i) => (
            <path
              key={`core-${i}`}
              d={curtainPath({
                phase: c.phase,
                xCenter: c.xCenter,
                width: c.width * 0.35,
                topY: SKY.y + 30,
                bottomY: HORIZON_Y - 10,
                amp: c.amp,
                freq: c.freq,
              })}
              fill="url(#aurora-grad)"
              opacity={c.opacity}
            />
          ))}

          {/* Ground glow — subtle wash above horizon */}
          <rect
            x={SKY.x}
            y={HORIZON_Y - 90}
            width={SKY.w}
            height={110}
            fill="url(#ground-glow)"
            opacity={0.7}
          />

          {/* Mountain silhouette on top of the glow */}
          <path d={MOUNTAIN_PATH} fill="#03060D" />
        </g>

        {/* Emission-line callouts (drawn AFTER clip so they can extend right) */}
        {CALLOUTS.map((c) => {
          const localT = Math.max(0, Math.min(1, (t - 0.35 - c.order) / 0.18));
          const eased = 1 - Math.pow(1 - localT, 3);
          const tagX = SKY.x + SKY.w - 12; // right edge of sky panel
          const targetMidX = tagX - 16;
          const midX = c.anchor.x + (targetMidX - c.anchor.x) * eased;
          const vertEndY = c.tagY - 12; // stops ABOVE the tag text, never under it
          return (
            <g key={c.id} opacity={eased}>
              {/* Anchor pip on the curtain — soft halo + solid coloured core + white centre */}
              <circle
                cx={c.anchor.x}
                cy={c.anchor.y}
                r={16}
                fill={c.color}
                opacity={0.22}
              />
              <circle
                cx={c.anchor.x}
                cy={c.anchor.y}
                r={7}
                fill={c.color}
                opacity={1}
              />
              <circle
                cx={c.anchor.x}
                cy={c.anchor.y}
                r={2.4}
                fill="#FFFFFF"
                opacity={0.95}
              />
              {/* Leader: pip -> horizontal -> vertical ending above the tag */}
              <line
                x1={c.anchor.x + 6}
                y1={c.anchor.y}
                x2={midX}
                y2={c.anchor.y}
                stroke={c.color}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              <line
                x1={midX}
                y1={c.anchor.y}
                x2={midX}
                y2={vertEndY}
                stroke={c.color}
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              {/* Short tick where the vertical terminates */}
              <line
                x1={midX - 4}
                y1={vertEndY}
                x2={midX + 4}
                y2={vertEndY}
                stroke={c.color}
                strokeOpacity={0.9}
                strokeWidth={1.2}
              />
              {/* Tag block */}
              <g transform={`translate(${tagX}, ${c.tagY})`}>
                <text
                  textAnchor="end"
                  x={0}
                  y={0}
                  fill={c.color}
                  fontFamily={inter}
                  fontWeight={600}
                  fontSize={13}
                  letterSpacing={3.5}
                >
                  {c.wavelength.toUpperCase()}
                </text>
                <text
                  textAnchor="end"
                  x={0}
                  y={19}
                  fill={GRAY}
                  fontFamily={inter}
                  fontWeight={500}
                  fontSize={11}
                  letterSpacing={2.5}
                >
                  {c.species === "N₂⁺" ? "N2+  IONISED" : "O   ATOMIC"}
                </text>
              </g>
            </g>
          );
        })}

        {/* Caption strip below the sky panel */}
        <g
          transform={`translate(${SKY.x}, ${SKY.y + SKY.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · AURORAL EMISSION LINES OVER 65° N</text>
          <text
            x={SKY.w}
            textAnchor="end"
            fill={GREEN}
            opacity={0.9}
          >
            THERMOSPHERE · 100–300 KM
          </text>
        </g>

        {/* Visible-spectrum ruler */}
        <g opacity={rulerBarOpacity}>
          {/* Bar */}
          <rect
            x={RULER.x}
            y={RULER.y}
            width={RULER.w}
            height={RULER.h}
            rx={2}
            fill="url(#spectrum)"
            opacity={0.85}
          />
          <rect
            x={RULER.x + 0.5}
            y={RULER.y + 0.5}
            width={RULER.w - 1}
            height={RULER.h - 1}
            rx={2}
            fill="none"
            stroke="#101828"
            strokeWidth={1}
          />

          {/* End labels */}
          <text
            x={RULER.x}
            y={RULER.y - 8}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
          >
            400 NM
          </text>
          <text
            x={RULER.x + RULER.w}
            y={RULER.y - 8}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
            textAnchor="end"
          >
            700 NM
          </text>

          {/* Ticks at emission lines */}
          {[
            { nm: 427.8, color: VIOLET, label: "N₂⁺" },
            { nm: 557.7, color: GREEN, label: "O" },
            { nm: 630.0, color: RED, label: "O" },
          ].map((l) => {
            const px = RULER.x + wavelengthToPos(l.nm) * RULER.w;
            return (
              <g key={l.nm}>
                <line
                  x1={px}
                  y1={RULER.y - 6}
                  x2={px}
                  y2={RULER.y + RULER.h + 12}
                  stroke={l.color}
                  strokeWidth={1.6}
                />
                <circle
                  cx={px}
                  cy={RULER.y + RULER.h + 20}
                  r={4}
                  fill={l.color}
                />
                <text
                  x={px}
                  y={RULER.y + RULER.h + 42}
                  textAnchor="middle"
                  fill={l.color}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={2.5}
                >
                  {l.nm.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Right-side analogy label — makes the pairing legible */}
          <g
            transform={`translate(${RULER.x + RULER.w + 34}, ${RULER.y - 4})`}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            <text y={0}>EMISSION LINES</text>
            <text y={18} fill="#B8C2D2">
              — SAME AS A NEON TUBE.
            </text>
          </g>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1035,
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
            color: GREEN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Neon Sign Maker
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The sky wired
          <br />
          in noble gas.
        </div>

        <div
          style={{
            marginTop: 20,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Solar-wind electrons excite{" "}
          <span style={{ color: GREEN, fontWeight: 600 }}>oxygen</span> and{" "}
          <span style={{ color: VIOLET, fontWeight: 600 }}>nitrogen</span> in
          the thermosphere; the quantum-jump lines they emit — 428, 558,
          630 nm — are the exact ones a neon sign uses in a tube.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 32,
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
        <span>Chamberlain · Theory of Planetary Atmospheres</span>
        <span>
          <span style={{ color: GREEN }}>●</span> 557.7 nm dominant
        </span>
      </div>
    </AbsoluteFill>
  );
};
