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

// ── Palette — the aurora's real emission-line colours ────────────────────
const NIGHT = "#050820";         // deep polar-night background
const NIGHT_2 = "#0B0F2F";       // one step lighter for panel base
const LEAD = "#02030B";          // lead came (near-black)
const LEAD_HI = "#1D1F3A";       // came highlight edge
const VIOLET = "#6E4CFF";        // 427.8 nm  N2+
const VIOLET_HI = "#B7A7FF";     // violet highlight
const GREEN = "#7CFF9A";         // 557.7 nm  O
const GREEN_HI = "#D8FFE0";      // green highlight
const CRIMSON = "#FF3D5A";       // 630.0 nm  O
const CRIMSON_HI = "#FFB8C1";    // crimson highlight
const STAR = "#EFE5FF";          // starlight / metadata
const DIM = "#7A7F99";           // secondary UI text

// ── Window geometry (portrait 1080 × 1350) ───────────────────────────────
// Outer window: Gothic lancet.
// Arch apex at (WCX, 130); shoulders at (WX0, 300)/(WX1, 300); base at y=920.
const WX0 = 100;
const WX1 = 980;
const WCX = (WX0 + WX1) / 2; // 540
const WY_APEX = 138;
const WY_SHOULDER = 320;
const WY_BASE = 920;

// Transoms — three panes stacked in altitude order (top = highest):
//   Pane 1 (top, arched):   y ∈ [WY_APEX, T1]     → 630 nm  O   >200 km
//   Pane 2 (middle):        y ∈ [T1, T2]          → 557.7 nm O  100–300 km
//   Pane 3 (bottom):        y ∈ [T2, WY_BASE]     → 427.8 nm N2+ <100 km
const T1 = 480;
const T2 = 700;

// Pointed Gothic lancet — two quadratics whose shared control point sits
// at (WCX, yShoulder) so tangents are horizontal at the shoulders and
// vertical at the apex, giving a clean sharp point.
const archCurve = (
  y1: number,
  yShoulder: number,
  yApex: number,
  x0: number = WX0,
  x1: number = WX1,
): string => {
  const xc = (x0 + x1) / 2;
  return [
    `M ${x0} ${y1}`,
    `L ${x0} ${yShoulder}`,
    `Q ${xc} ${yShoulder}, ${xc} ${yApex}`,
    `Q ${xc} ${yShoulder}, ${x1} ${yShoulder}`,
    `L ${x1} ${y1}`,
  ].join(" ");
};

const lancetPath = (inset: number): string => {
  return (
    archCurve(
      WY_BASE - inset,
      WY_SHOULDER + inset * 0.5,
      WY_APEX + inset,
      WX0 + inset,
      WX1 - inset,
    ) + " Z"
  );
};

const topPanePath = (y1: number): string =>
  archCurve(y1, WY_SHOULDER, WY_APEX) + " Z";

// ── Curtain rays ─────────────────────────────────────────────────────────
// A "curtain" is a stack of vertical rays with soft edges and per-ray phase,
// drifting laterally. Passed a color, a y-band, and a phase.
type Curtain = {
  color: string;
  hi: string;
  yTop: number;
  yBot: number;
  rays: number;
  seed: number;
};

// deterministic pseudorandom
const rand = (seed: number, i: number): number => {
  const x = Math.sin(seed * 977.13 + i * 39.19) * 43758.5453;
  return x - Math.floor(x);
};

// draw one curtain via <rect>s with linear gradients + drift
const Curtains: React.FC<{
  c: Curtain;
  drift: number;
  gain: number;
  gradId: string;
  hiGradId: string;
}> = ({ c, drift, gain, gradId, hiGradId }) => {
  const rays: React.ReactElement[] = [];
  const paneW = WX1 - WX0;
  const paneH = c.yBot - c.yTop;
  for (let i = 0; i < c.rays; i++) {
    // Non-uniform positioning — jitter + clumping bias
    const clumpBias = Math.sin(i * 1.7 + c.seed) * 0.18;
    const baseX = WX0 + ((i + 0.5) / c.rays + clumpBias) * paneW;
    const jitter = (rand(c.seed, i) - 0.5) * 90;
    const localDrift = Math.sin(drift * 0.7 + rand(c.seed, i + 90) * 6.28) * 18;
    const x = baseX + jitter + localDrift;
    // Aggressive width variance — 20px thin rays up to 180px wide sheets
    const width = 22 + Math.pow(rand(c.seed, i + 200), 1.6) * 160;
    const alpha = (0.32 + rand(c.seed, i + 300) * 0.45) * gain;
    // Some rays extend the full pane, some only partially (like broken curtains)
    const startFrac = rand(c.seed, i + 400) * 0.22;
    const endFrac = 0.7 + rand(c.seed, i + 500) * 0.3;
    const yStart = c.yTop + paneH * startFrac;
    const yEnd = c.yTop + paneH * endFrac;
    rays.push(
      <g key={`r-${i}`} opacity={alpha}>
        <rect
          x={x - width / 2}
          y={yStart}
          width={width}
          height={yEnd - yStart}
          fill={`url(#${gradId})`}
        />
        <rect
          x={x - width / 6}
          y={yStart}
          width={width / 3}
          height={yEnd - yStart}
          fill={`url(#${hiGradId})`}
          opacity={0.5}
        />
      </g>,
    );
  }
  return <>{rays}</>;
};

// ── Component ────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stagger the panes: violet (low, first) → green (mid) → crimson (top).
  const gainBottom = spring({
    frame: frame - fps * 0.15,
    fps,
    config: { damping: 22, mass: 1.2, stiffness: 60 },
  });
  const gainMiddle = spring({
    frame: frame - fps * 0.75,
    fps,
    config: { damping: 22, mass: 1.2, stiffness: 60 },
  });
  const gainTop = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 22, mass: 1.4, stiffness: 55 },
  });

  const titleSpring = spring({
    frame: frame - fps * 2.0,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 2.5, fps * 3.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chromeOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Drift phase (seconds) — gently loops the curtains
  const drift = frame / fps;

  // Slow global breathing after all panes lit
  const breathe =
    0.94 +
    0.06 *
      Math.sin(interpolate(frame, [fps * 1.8, fps * 6], [0, Math.PI * 1.4]));

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, fontFamily: inter }}>
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
          color: DIM,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: chromeOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: GREEN }}>2026 · 07 · 03</span>
      </div>

      {/* ── Stained-glass window ─────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <clipPath id="lancet-clip">
            <path d={lancetPath(0)} />
          </clipPath>
          <clipPath id="pane-top">
            <path d={topPanePath(T1)} />
          </clipPath>
          <clipPath id="pane-mid">
            <rect x={WX0} y={T1} width={WX1 - WX0} height={T2 - T1} />
          </clipPath>
          <clipPath id="pane-bot">
            <rect x={WX0} y={T2} width={WX1 - WX0} height={WY_BASE - T2} />
          </clipPath>

          {/* Pane bases — deep glass gradients, richer bodies */}
          <radialGradient id="base-violet" cx="50%" cy="55%" r="75%">
            <stop offset="0%" stopColor={VIOLET} stopOpacity={0.55} />
            <stop offset="60%" stopColor="#1E1652" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#0A0A28" stopOpacity={1} />
          </radialGradient>
          <radialGradient id="base-green" cx="50%" cy="55%" r="75%">
            <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
            <stop offset="60%" stopColor="#0F3B2A" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#061A14" stopOpacity={1} />
          </radialGradient>
          <radialGradient id="base-crimson" cx="50%" cy="65%" r="85%">
            <stop offset="0%" stopColor={CRIMSON} stopOpacity={0.5} />
            <stop offset="60%" stopColor="#3B121F" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#160810" stopOpacity={1} />
          </radialGradient>

          {/* Curtain-ray gradients: soft-edged vertical bars */}
          {[
            { id: "ray-violet", c: VIOLET },
            { id: "ray-violet-hi", c: VIOLET_HI },
            { id: "ray-green", c: GREEN },
            { id: "ray-green-hi", c: GREEN_HI },
            { id: "ray-crimson", c: CRIMSON },
            { id: "ray-crimson-hi", c: CRIMSON_HI },
          ].map((g) => (
            <linearGradient
              key={g.id}
              id={g.id}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={g.c} stopOpacity={0} />
              <stop offset="50%" stopColor={g.c} stopOpacity={1} />
              <stop offset="100%" stopColor={g.c} stopOpacity={0} />
            </linearGradient>
          ))}
          {/* Vertical top→bottom softener (white = show, alpha = fade) */}
          <linearGradient id="ray-fade-v" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity={0} />
            <stop offset="18%" stopColor="white" stopOpacity={1} />
            <stop offset="82%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </linearGradient>
          <mask id="pane-vmask-top">
            <rect
              x={WX0}
              y={WY_APEX}
              width={WX1 - WX0}
              height={T1 - WY_APEX}
              fill="url(#ray-fade-v)"
            />
          </mask>
          <mask id="pane-vmask-mid">
            <rect
              x={WX0}
              y={T1}
              width={WX1 - WX0}
              height={T2 - T1}
              fill="url(#ray-fade-v)"
            />
          </mask>
          <mask id="pane-vmask-bot">
            <rect
              x={WX0}
              y={T2}
              width={WX1 - WX0}
              height={WY_BASE - T2}
              fill="url(#ray-fade-v)"
            />
          </mask>

          {/* Lead-came highlight edge */}
          <linearGradient id="came-edge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={LEAD_HI} />
            <stop offset="50%" stopColor={LEAD} />
            <stop offset="100%" stopColor={LEAD_HI} />
          </linearGradient>

          {/* Star sparkle */}
          <radialGradient id="star" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.9} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* ── Star field behind the window (subtle) ──────────────── */}
        <g opacity={chromeOpacity * 0.85}>
          {Array.from({ length: 42 }).map((_, i) => {
            const x = 40 + rand(11, i) * 1000;
            const y = 60 + rand(23, i) * 900;
            const r = 0.6 + rand(37, i) * 1.4;
            const twinkle =
              0.4 + 0.6 * Math.abs(Math.sin(drift * 1.3 + rand(41, i) * 6.28));
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill={STAR}
                opacity={0.35 * twinkle}
              />
            );
          })}
        </g>

        {/* ── Window (all clipped to the lancet) ─────────────────────── */}
        <g clipPath="url(#lancet-clip)" opacity={breathe}>
          {/* Deep glass base */}
          <rect
            x={WX0}
            y={WY_APEX}
            width={WX1 - WX0}
            height={WY_BASE - WY_APEX}
            fill={NIGHT_2}
          />

          {/* Pane 1 — TOP · crimson (630.0 nm · O) */}
          <g clipPath="url(#pane-top)" opacity={gainTop}>
            <path d={topPanePath(T1)} fill="url(#base-crimson)" />
            <g mask="url(#pane-vmask-top)">
              <Curtains
                c={{
                  color: CRIMSON,
                  hi: CRIMSON_HI,
                  yTop: WY_APEX,
                  yBot: T1,
                  rays: 9,
                  seed: 7,
                }}
                drift={drift}
                gain={gainTop}
                gradId="ray-crimson"
                hiGradId="ray-crimson-hi"
              />
            </g>
          </g>

          {/* Pane 2 — MIDDLE · green (557.7 nm · O) */}
          <g clipPath="url(#pane-mid)" opacity={gainMiddle}>
            <rect
              x={WX0}
              y={T1}
              width={WX1 - WX0}
              height={T2 - T1}
              fill="url(#base-green)"
            />
            <g mask="url(#pane-vmask-mid)">
              <Curtains
                c={{
                  color: GREEN,
                  hi: GREEN_HI,
                  yTop: T1,
                  yBot: T2,
                  rays: 8,
                  seed: 3,
                }}
                drift={drift + 0.5}
                gain={gainMiddle}
                gradId="ray-green"
                hiGradId="ray-green-hi"
              />
            </g>
          </g>

          {/* Pane 3 — BOTTOM · violet (427.8 nm · N2+) */}
          <g clipPath="url(#pane-bot)" opacity={gainBottom}>
            <rect
              x={WX0}
              y={T2}
              width={WX1 - WX0}
              height={WY_BASE - T2}
              fill="url(#base-violet)"
            />
            <g mask="url(#pane-vmask-bot)">
              <Curtains
                c={{
                  color: VIOLET,
                  hi: VIOLET_HI,
                  yTop: T2,
                  yBot: WY_BASE,
                  rays: 10,
                  seed: 19,
                }}
                drift={drift + 1.1}
                gain={gainBottom}
                gradId="ray-violet"
                hiGradId="ray-violet-hi"
              />
            </g>
          </g>
        </g>

        {/* ── Lead came ────────────────────────────────────────────── */}
        {/* Central vertical mullion */}
        <rect
          x={WCX - 7}
          y={WY_APEX + 4}
          width={14}
          height={WY_BASE - WY_APEX - 4}
          fill="url(#came-edge)"
          clipPath="url(#lancet-clip)"
        />
        {/* Transom bars */}
        <rect
          x={WX0}
          y={T1 - 6}
          width={WX1 - WX0}
          height={12}
          fill="url(#came-edge)"
          clipPath="url(#lancet-clip)"
        />
        <rect
          x={WX0}
          y={T2 - 6}
          width={WX1 - WX0}
          height={12}
          fill="url(#came-edge)"
          clipPath="url(#lancet-clip)"
        />

        {/* Outer frame (thick came) — round joins so the apex cusp doesn't
            miter-spike and the shoulder L-corners don't flare out. */}
        <path
          d={lancetPath(0)}
          fill="none"
          stroke={LEAD}
          strokeWidth={18}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={lancetPath(9)}
          fill="none"
          stroke={LEAD_HI}
          strokeWidth={1.2}
          strokeLinejoin="round"
          opacity={0.6}
        />

        {/* Apex tracery — a small oculus + three foils, hinting at a rose */}
        <g
          clipPath="url(#lancet-clip)"
          opacity={interpolate(
            frame,
            [fps * 1.6, fps * 2.2],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          )}
        >
          {(() => {
            const cx = WCX;
            const cy = WY_APEX + 78;
            const rOuter = 32;
            const rInner = 22;
            const foilR = 9;
            return (
              <g>
                {/* petal foils */}
                {[-90, 30, 150].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const fx = cx + Math.cos(rad) * (rInner - 3);
                  const fy = cy + Math.sin(rad) * (rInner - 3);
                  return (
                    <circle
                      key={deg}
                      cx={fx}
                      cy={fy}
                      r={foilR}
                      fill={NIGHT_2}
                      stroke={LEAD}
                      strokeWidth={3}
                    />
                  );
                })}
                <circle
                  cx={cx}
                  cy={cy}
                  r={rOuter}
                  fill="none"
                  stroke={LEAD}
                  strokeWidth={5}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rInner}
                  fill={NIGHT_2}
                  stroke={LEAD}
                  strokeWidth={3}
                />
                {/* faint star inside the oculus */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={STAR}
                  opacity={0.7}
                />
              </g>
            );
          })()}
        </g>

        {/* ── Altitude / spectrum labels ─────────────────────────────── */}
        {/* Right-side altitude ticks + species tags, per pane */}
        <g
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
          opacity={chromeOpacity}
        >
          {/* TOP pane label */}
          <g transform={`translate(${WX1 - 26}, ${WY_APEX + 78})`}>
            <text
              x={0}
              y={0}
              textAnchor="end"
              fill={CRIMSON_HI}
              opacity={gainTop * 0.95}
            >
              630.0 NM · O
            </text>
            <text
              x={0}
              y={18}
              textAnchor="end"
              fill={STAR}
              opacity={gainTop * 0.6}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
            >
              &gt; 200 KM
            </text>
          </g>
          {/* MIDDLE pane label */}
          <g transform={`translate(${WX1 - 26}, ${T1 + 44})`}>
            <text
              x={0}
              y={0}
              textAnchor="end"
              fill={GREEN_HI}
              opacity={gainMiddle * 0.95}
            >
              557.7 NM · O
            </text>
            <text
              x={0}
              y={18}
              textAnchor="end"
              fill={STAR}
              opacity={gainMiddle * 0.6}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
            >
              100 – 300 KM
            </text>
          </g>
          {/* BOTTOM pane label */}
          <g transform={`translate(${WX1 - 26}, ${T2 + 44})`}>
            <text
              x={0}
              y={0}
              textAnchor="end"
              fill={VIOLET_HI}
              opacity={gainBottom * 0.95}
            >
              427.8 NM · N₂⁺
            </text>
            <text
              x={0}
              y={18}
              textAnchor="end"
              fill={STAR}
              opacity={gainBottom * 0.6}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={500}
            >
              &lt; 100 KM
            </text>
          </g>
        </g>

        {/* Left-side altitude axis ticks */}
        <g
          stroke={STAR}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2}
          fontWeight={500}
          opacity={chromeOpacity * 0.45}
        >
          {[
            { y: WY_APEX + 78, label: "400 KM" },
            { y: T1 + 44, label: "250 KM" },
            { y: T2 + 44, label: "110 KM" },
          ].map((tk) => (
            <g key={tk.label}>
              <line
                x1={WX0 + 26}
                y1={tk.y - 4}
                x2={WX0 + 60}
                y2={tk.y - 4}
                strokeWidth={1}
              />
              <text
                x={WX0 + 26}
                y={tk.y + 12}
                fill={STAR}
                stroke="none"
              >
                {tk.label}
              </text>
            </g>
          ))}
        </g>

        {/* Small "spectrum" tag hanging off top-left of the arch */}
        <g
          transform={`translate(${WX0 - 4}, ${WY_APEX - 22})`}
          fill={DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.4}
          fontWeight={600}
          opacity={chromeOpacity}
        >
          <text>FIG. 1 · AURORAL SPECTRUM AS ALTITUDE ATLAS</text>
        </g>

        {/* ── Caption strip beneath the window ─────────────────────── */}
        <g
          transform={`translate(${WX0}, ${WY_BASE + 26})`}
          fill={DIM}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={chromeOpacity}
        >
          <text>EMISSION LINES · ATOMIC O + IONISED N₂</text>
          <text
            x={WX1 - WX0}
            textAnchor="end"
            fill={GREEN}
            opacity={0.85}
          >
            EVERY HUE IS A HEIGHT
          </text>
        </g>
      </svg>

      {/* ── Type lockup ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 984,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0],
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
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Stained-Glass Artist
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          Every hue
          <br />
          is a height.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          The aurora's colours label the sky. Atomic{" "}
          <span style={{ color: GREEN, fontWeight: 600 }}>oxygen</span> glows
          green at 557.7 nm from 100–300 km and crimson at 630 nm above ~200 km,
          while ionised{" "}
          <span style={{ color: VIOLET_HI, fontWeight: 600 }}>nitrogen</span>{" "}
          (N₂⁺) burns blue-violet at 427.8 nm below 100 km — a stained-glass
          window whose panes are atoms.
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
          color: DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: chromeOpacity,
        }}
      >
        <span>Störmer 1955 · Chamberlain 1961 · Aurora spectroscopy</span>
        <span>
          <span style={{ color: GREEN }}>●</span> Glass = atomic emission
        </span>
      </div>
    </AbsoluteFill>
  );
};
