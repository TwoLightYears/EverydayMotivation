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

// Palette — from the concept's visual brief (a live M. septendecim on paper)
const PAPER = "#EFE3C6";
const PAPER_DEEP = "#E6D8B4";
const INK = "#0B0A08";
const CINNABAR = "#B22222";
const AMBER = "#E5A34A";
const AMBER_HI = "#F4C77C";
const SOIL = "#7A6A50";
const SOIL_LIGHT = "#A69679";

const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
};

// ── Cicada silhouette ────────────────────────────────────────────────
// Right-facing profile. Drawn in a local coord space centred on the
// thorax. Wings above the body, six legs below.
type CicadaProps = {
  wingFlap?: number; // 0..1 opens/closes wing angle a hair
  scale?: number;
  opacity?: number;
};
const Cicada: React.FC<CicadaProps> = ({
  wingFlap = 0,
  scale = 1,
  opacity = 1,
}) => {
  const wingLift = -3 - wingFlap * 4; // subtle upward lift on flutter
  return (
    <g transform={`scale(${scale})`} opacity={opacity}>
      {/* Ground shadow beneath the body */}
      <ellipse cx={-4} cy={20} rx={62} ry={4} fill={INK} opacity={0.18} />

      {/* Back wing (further from viewer) */}
      <g transform={`translate(0 ${wingLift})`}>
        <path
          d="M 34 -6 C 8 -34 -68 -46 -118 -30 C -108 -14 -80 -6 -60 -4 C -34 -2 -6 -2 26 -4 Z"
          fill={AMBER}
          fillOpacity={0.55}
          stroke={INK}
          strokeOpacity={0.85}
          strokeWidth={1.2}
        />
        {/* Back wing venation */}
        <path
          d="M -100 -26 Q -60 -18 -20 -8 M -70 -32 Q -40 -20 -6 -6 M -40 -36 Q -20 -22 4 -6"
          stroke={INK}
          strokeOpacity={0.35}
          strokeWidth={0.8}
          fill="none"
        />
      </g>

      {/* Legs — three visible in profile */}
      <path
        d="M 8 12 C 22 26 30 30 30 42
           M -14 14 C -6 30 4 34 8 44
           M -38 14 C -34 30 -30 34 -22 44"
        stroke={INK}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />

      {/* Body — thorax + tapered abdomen */}
      <path
        d="M -70 0
           C -74 -12 -50 -18 -30 -16
           C 0 -14 30 -14 46 -8
           C 56 -4 56 6 46 10
           C 30 16 0 16 -30 14
           C -50 12 -74 12 -70 0 Z"
        fill={INK}
      />
      {/* Abdomen segments (fine hair-lines) */}
      <path
        d="M -60 -10 L -60 10 M -46 -14 L -46 14 M -32 -15 L -32 15 M -18 -15 L -18 15 M -4 -15 L -4 15 M 10 -14 L 10 14 M 24 -13 L 24 13"
        stroke={PAPER}
        strokeOpacity={0.22}
        strokeWidth={0.9}
      />
      {/* A warm belly highlight for a hint of body colour */}
      <path
        d="M -66 6 C -30 12 20 12 44 6 C 42 12 20 14 -10 14 C -40 14 -60 12 -66 6 Z"
        fill={CINNABAR}
        fillOpacity={0.35}
      />

      {/* Head */}
      <ellipse cx={54} cy={-1} rx={18} ry={14} fill={INK} />

      {/* Compound eye — the hallmark red */}
      <circle cx={64} cy={-3} r={8} fill={CINNABAR} />
      <circle cx={66} cy={-5} r={2.2} fill={AMBER_HI} opacity={0.9} />

      {/* Front wing (nearer viewer) — brighter amber, slightly more forward */}
      <g transform={`translate(2 ${wingLift - 2})`}>
        <path
          d="M 30 -8 C 4 -38 -56 -50 -104 -34 C -96 -18 -70 -10 -46 -8 C -20 -6 6 -6 26 -8 Z"
          fill={AMBER_HI}
          fillOpacity={0.75}
          stroke={INK}
          strokeOpacity={0.9}
          strokeWidth={1.2}
        />
        <path
          d="M -86 -30 Q -50 -20 -14 -10 M -58 -36 Q -30 -22 2 -10 M -30 -40 Q -12 -24 14 -10 M -10 -38 Q 4 -22 22 -10"
          stroke={INK}
          strokeOpacity={0.4}
          strokeWidth={0.9}
          fill="none"
        />
      </g>
    </g>
  );
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing (in seconds) ────────────────────────────────────────────
  // 0.0 → grid frame draws in
  // 0.4 → sieve wave begins: composites strike-through, primes ignite
  // 2.2 → cicadas fly in, alight on 13 and 17
  // 3.0 → wing flutter breathes
  // 3.4 → title + hook fade in
  const gridSpring = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const sieveT = interpolate(frame, [fps * 0.4, fps * 2.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cicadaLandT = spring({
    frame: frame - fps * 2.2,
    fps,
    config: { damping: 15, mass: 0.9, stiffness: 90 },
  });
  const titleT = spring({
    frame: frame - fps * 3.4,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const hookT = interpolate(frame, [fps * 3.8, fps * 4.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const loopPhase = ((frame - fps * 2.6) / (fps * 2.4)) % 1;
  const flutter =
    frame > fps * 2.6
      ? Math.max(0, Math.sin(loopPhase * Math.PI * 2)) *
        Math.max(0, Math.min(1, (frame - fps * 2.6) / fps))
      : 0;

  // ── Frame + grid geometry ──────────────────────────────────────────
  const FRAME = { x: 60, y: 132, w: 960, h: 700 };
  const GRID_TOP_PAD = 250; // room for caption + cicada specimens above the grid
  const GRID_BOT_PAD = 30;
  const GRID_LEFT_PAD = 44;
  const GRID_RIGHT_PAD = 44;
  const GRID = {
    x: FRAME.x + GRID_LEFT_PAD,
    y: FRAME.y + GRID_TOP_PAD,
    w: FRAME.w - GRID_LEFT_PAD - GRID_RIGHT_PAD,
    h: FRAME.h - GRID_TOP_PAD - GRID_BOT_PAD,
  };
  const CELL_W = GRID.w / 10;
  const CELL_H = GRID.h / 10;

  const cellCentre = (n: number): { cx: number; cy: number } => {
    const col = (n - 1) % 10;
    const row = Math.floor((n - 1) / 10);
    return {
      cx: GRID.x + col * CELL_W + CELL_W / 2,
      cy: GRID.y + row * CELL_H + CELL_H / 2,
    };
  };

  // Reveal composites with a wave across the grid (top-left → bottom-right).
  const cellReveal = (n: number): number => {
    const norm = (n - 1) / 99;
    const t = (sieveT - norm * 0.8) / 0.2;
    return Math.max(0, Math.min(1, t));
  };

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Subtle paper grain via layered radial gradients (in SVG below) */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="paper-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#F4EAD1" stopOpacity={1} />
            <stop offset="70%" stopColor={PAPER} stopOpacity={1} />
            <stop offset="100%" stopColor={PAPER_DEEP} stopOpacity={1} />
          </radialGradient>

          <filter id="paper-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              values="0 0 0 0 0.05
                      0 0 0 0 0.04
                      0 0 0 0 0.02
                      0 0 0 0.06 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>

          {/* Cicada eye glow */}
          <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CINNABAR} stopOpacity={0.55} />
            <stop offset="100%" stopColor={CINNABAR} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Paper ground */}
        <rect x={0} y={0} width={1080} height={1350} fill="url(#paper-vignette)" />
        <rect x={0} y={0} width={1080} height={1350} fill={INK} filter="url(#paper-noise)" opacity={0.35} />

        {/* Top metadata band */}
        <g
          fontFamily={inter}
          fontSize={13}
          fontWeight={600}
          letterSpacing={4.6}
        >
          <text x={80} y={82} fill={SOIL}>
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text x={1000} y={82} fill={CINNABAR} textAnchor="end">
            2026 · 09 · 13
          </text>
        </g>

        {/* Thin rule under the metadata band */}
        <line
          x1={80}
          y1={100}
          x2={1000}
          y2={100}
          stroke={SOIL}
          strokeOpacity={0.35}
          strokeWidth={1}
        />

        {/* ── Plate frame ────────────────────────────────────────── */}
        <g opacity={gridSpring}>
          <rect
            x={FRAME.x}
            y={FRAME.y}
            width={FRAME.w}
            height={FRAME.h}
            fill="none"
            stroke={INK}
            strokeOpacity={0.85}
            strokeWidth={1.4}
          />
          {/* Inner hairline frame — plate style */}
          <rect
            x={FRAME.x + 10}
            y={FRAME.y + 10}
            width={FRAME.w - 20}
            height={FRAME.h - 20}
            fill="none"
            stroke={INK}
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />

          {/* Plate caption inside the frame */}
          <g fontFamily={inter} fontWeight={600} letterSpacing={4}>
            <text x={FRAME.x + 30} y={FRAME.y + 46} fill={INK} fontSize={13}>
              PLATE III · SIEVE OF ERATOSTHENES
            </text>
            <text
              x={FRAME.x + 30}
              y={FRAME.y + 66}
              fill={SOIL}
              fontSize={11}
              letterSpacing={3.5}
            >
              n ≤ 100
            </text>
          </g>

          {/* Sub-caption — sits to the right of the plate title */}
          <text
            x={FRAME.x + FRAME.w - 30}
            y={FRAME.y + 68}
            fill={SOIL}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={15}
            textAnchor="end"
          >
            after Eratosthenes of Cyrene, c. 240 B.C.
          </text>

          {/* ── Grid ────────────────────────────────────────────── */}
          {/* Faint grid lines */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={GRID.x + i * CELL_W}
              y1={GRID.y}
              x2={GRID.x + i * CELL_W}
              y2={GRID.y + GRID.h}
              stroke={SOIL}
              strokeOpacity={0.18}
              strokeWidth={0.8}
            />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={GRID.x}
              y1={GRID.y + i * CELL_H}
              x2={GRID.x + GRID.w}
              y2={GRID.y + i * CELL_H}
              stroke={SOIL}
              strokeOpacity={0.18}
              strokeWidth={0.8}
            />
          ))}

          {/* Cells: numerals + strike-throughs */}
          {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
            const { cx, cy } = cellCentre(n);
            const prime = isPrime(n);
            const reveal = cellReveal(n);
            const isPeriodic = n === 13 || n === 17;

            const numColor = prime ? CINNABAR : n === 1 ? SOIL_LIGHT : SOIL;
            const numOpacity = prime
              ? 0.65 + 0.35 * reveal
              : n === 1
                ? 0.55
                : 0.9 - 0.35 * reveal; // composites dim as they strike

            return (
              <g key={`cell-${n}`}>
                {/* Composite strike-through — animated dash reveal */}
                {!prime && n !== 1 && (
                  <line
                    x1={cx - CELL_W * 0.36}
                    y1={cy + CELL_H * 0.28}
                    x2={cx + CELL_W * 0.36}
                    y2={cy - CELL_H * 0.28}
                    stroke={SOIL}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeOpacity={0.75 * reveal}
                  />
                )}

                {/* Prime — soft aura on ignition (skip on the two feature cells) */}
                {prime && !isPeriodic && reveal > 0 && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={Math.min(CELL_W, CELL_H) * 0.44}
                    fill={CINNABAR}
                    fillOpacity={0.06 * reveal}
                  />
                )}

                <text
                  x={cx}
                  y={cy + (isPeriodic ? 14 : 12)}
                  textAnchor="middle"
                  fontFamily={playfair}
                  fontStyle={prime ? "italic" : "normal"}
                  fontWeight={isPeriodic ? 600 : 500}
                  fontSize={isPeriodic ? 40 : prime ? 34 : 30}
                  fill={numColor}
                  opacity={numOpacity}
                >
                  {n}
                </text>
              </g>
            );
          })}

        </g>

        {/* ── Cicada specimens above the grid, tethered to 13 & 17 ── */}
        {(() => {
          const c13 = cellCentre(13);
          const c17 = cellCentre(17);
          // Where the two specimens sit inside the plate (above the grid)
          const perch13 = { x: c13.cx, y: FRAME.y + 190 };
          const perch17 = { x: c17.cx, y: FRAME.y + 190 };

          // Cicadas fly in from off-frame and settle at their perch.
          const land13 = Math.max(0, Math.min(1, cicadaLandT));
          const land17 = Math.max(0, Math.min(1, cicadaLandT * 0.94));
          const off13x = (1 - land13) * -140;
          const off13y = (1 - land13) * -60;
          const off17x = (1 - land17) * 160;
          const off17y = (1 - land17) * -60;
          const cicadaScale = 0.68;

          // Highlight ring on the target cells (starts before cicada lands)
          const ringT = Math.min(1, sieveT * 1.2);

          return (
            <>
              {/* Highlight rings around 13 and 17 (subtle box + label tag) */}
              {[
                { c: c13, n: 13 },
                { c: c17, n: 17 },
              ].map(({ c, n }) => (
                <g key={`hl-${n}`} opacity={ringT}>
                  <rect
                    x={c.cx - CELL_W * 0.44}
                    y={c.cy - CELL_H * 0.44}
                    width={CELL_W * 0.88}
                    height={CELL_H * 0.88}
                    fill={CINNABAR}
                    fillOpacity={0.06}
                    stroke={CINNABAR}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                    rx={3}
                  />
                </g>
              ))}

              {/* Leader lines from cicadas down to their target cells */}
              <g opacity={Math.min(1, land13 * 0.95)}>
                <path
                  d={`M ${perch13.x} ${perch13.y + 42} C ${perch13.x} ${perch13.y + 60} ${c13.cx} ${c13.cy - CELL_H * 0.62} ${c13.cx} ${c13.cy - CELL_H * 0.44 - 4}`}
                  fill="none"
                  stroke={CINNABAR}
                  strokeOpacity={0.7}
                  strokeWidth={1.1}
                />
                <circle
                  cx={c13.cx}
                  cy={c13.cy - CELL_H * 0.44 - 4}
                  r={2.4}
                  fill={CINNABAR}
                />
              </g>
              <g opacity={Math.min(1, land17 * 0.95)}>
                <path
                  d={`M ${perch17.x} ${perch17.y + 42} C ${perch17.x} ${perch17.y + 60} ${c17.cx} ${c17.cy - CELL_H * 0.62} ${c17.cx} ${c17.cy - CELL_H * 0.44 - 4}`}
                  fill="none"
                  stroke={CINNABAR}
                  strokeOpacity={0.7}
                  strokeWidth={1.1}
                />
                <circle
                  cx={c17.cx}
                  cy={c17.cy - CELL_H * 0.44 - 4}
                  r={2.4}
                  fill={CINNABAR}
                />
              </g>

              {/* Specimen label between/near cicadas */}
              <g
                opacity={Math.min(1, land13 * 0.9)}
                fontFamily={inter}
                fontWeight={600}
                letterSpacing={2.6}
                fontSize={10}
                fill={INK}
                textAnchor="middle"
              >
                <text x={perch13.x} y={perch13.y - 66}>
                  M. TREDECIM
                </text>
                <text
                  x={perch13.x}
                  y={perch13.y - 52}
                  fill={SOIL}
                  fontWeight={500}
                  fontSize={9}
                >
                  BROOD XIX · 13-YR
                </text>
              </g>
              <g
                opacity={Math.min(1, land17 * 0.9)}
                fontFamily={inter}
                fontWeight={600}
                letterSpacing={2.6}
                fontSize={10}
                fill={INK}
                textAnchor="middle"
              >
                <text x={perch17.x} y={perch17.y - 66}>
                  M. SEPTENDECIM
                </text>
                <text
                  x={perch17.x}
                  y={perch17.y - 52}
                  fill={SOIL}
                  fontWeight={500}
                  fontSize={9}
                >
                  BROOD X · 17-YR
                </text>
              </g>

              {/* Cicada 13 (faces right) */}
              <g
                transform={`translate(${perch13.x + off13x} ${perch13.y + off13y})`}
                opacity={land13}
              >
                <Cicada scale={cicadaScale} wingFlap={flutter} />
              </g>

              {/* Cicada 17 (faces left — mirrored) */}
              <g
                transform={`translate(${perch17.x + off17x} ${perch17.y + off17y}) scale(-1 1)`}
                opacity={land17}
              >
                <Cicada scale={cicadaScale} wingFlap={flutter * 0.85} />
              </g>
            </>
          );
        })()}
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 895,
          opacity: titleT,
          transform: `translateY(${interpolate(titleT, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            color: CINNABAR,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SOIL, margin: "0 6px" }}>/</span>
          <span style={{ color: INK, letterSpacing: 5 }}>Number Theorist</span>
        </div>

        <div
          style={{
            color: INK,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          A savant of
          <br />
          the primes.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#2A2418",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookT,
          }}
        >
          North America's periodical cicadas emerge en masse only after{" "}
          <span style={{ color: CINNABAR, fontWeight: 600 }}>13</span> or{" "}
          <span style={{ color: CINNABAR, fontWeight: 600 }}>17</span> years
          underground — both prime. A predator whose population fluctuates on
          any 2- to 5-year rhythm cannot lock into resonance with a coprime
          brood, so the swarm's number itself is the defence.
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
          color: SOIL,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Goles, Schulz &amp; Markus · Complexity 6 (2001)</span>
        <span>
          <span style={{ color: CINNABAR }}>●</span> Prime = 17 yr cycle
        </span>
      </div>

      {/* Suppress unused-var warning for durationInFrames without lint noise */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
