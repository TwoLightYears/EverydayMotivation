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
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: block; src: url(${staticFile(
  "fonts/inter-latin-400-normal.woff2",
)}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: block; src: url(${staticFile(
  "fonts/inter-latin-500-normal.woff2",
)}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: block; src: url(${staticFile(
  "fonts/inter-latin-600-normal.woff2",
)}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: normal; font-weight: 500; font-display: block; src: url(${staticFile(
  "fonts/playfair-display-latin-500-normal.woff2",
)}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-display: block; src: url(${staticFile(
  "fonts/playfair-display-latin-500-italic.woff2",
)}) format('woff2'); }
`;

// ── Palette (from the concept's brief) ────────────────────────────────
const INK = "#070C15";
const PANEL = "#0C121D";
const SILICA = "#F2E8D0";
const SILICA_DIM = "#B8B09C";
const GOLD = "#F5B942";
const TEAL = "#4CB8C4";
const BRONZE = "#A67C00";
const GRAY = "#6D7684";
const RETICLE = "#2A3242";
const RETICLE_MAJOR = "#3A465C";

// ── Layout: 1080 × 1350 portrait ──────────────────────────────────────
const W = 1080;
const H = 1350;

// Inspection frame — the "microscope viewport"
const FRAME = { x: 60, y: 148, w: 960, h: 780 };
const CENTER = { x: FRAME.x + FRAME.w / 2, y: FRAME.y + FRAME.h / 2 };

// Diatom disc — three concentric zones, hex pore lattice grows outward
const R_OUTER = 340; // outer rim of frustule
const R_MID = 232; // mid pore-zone
const R_INNER = 118; // innermost cribellum (the 45 nm ring)

type Pore = { x: number; y: number; r: number; ring: 0 | 1 | 2 };

// Precompute a hex-packed grid clipped to the frustule disc, then bucket
// by ring so we can time-reveal from centre outwards.
const buildPores = (): Pore[] => {
  const pores: Pore[] = [];
  const step = 16; // grid pitch — small enough to feel like a lattice
  const rSmall = 4.4; // outer/mid pore radius
  const rTiny = 2.4; // innermost cribellum pore radius (looks finer)
  const hx = step;
  const hy = step * Math.sqrt(3) / 2;
  const cols = Math.ceil((R_OUTER * 2) / hx) + 2;
  const rows = Math.ceil((R_OUTER * 2) / hy) + 2;
  for (let j = -rows; j <= rows; j++) {
    for (let i = -cols; i <= cols; i++) {
      const x = i * hx + (j % 2 === 0 ? 0 : hx / 2);
      const y = j * hy;
      const d = Math.hypot(x, y);
      if (d > R_OUTER - 6) continue;

      if (d < R_INNER - 4) {
        // Innermost cribellum — denser, finer pores on a half-pitch lattice
        // We already placed one grid; add an extra offset copy for density.
        pores.push({ x, y, r: rTiny, ring: 0 });
      } else if (d < R_MID - 4) {
        pores.push({ x, y, r: rSmall, ring: 1 });
      } else if (d < R_OUTER - 12) {
        pores.push({ x, y, r: rSmall * 1.05, ring: 2 });
      }
    }
  }
  // Denser cribellum overlay (half-pitch offset) — sells the "finer inside" reading
  for (let j = -rows; j <= rows; j++) {
    for (let i = -cols; i <= cols; i++) {
      const x = i * hx + hx / 4 + (j % 2 === 0 ? hx / 2 : 0);
      const y = j * hy + hy / 2;
      const d = Math.hypot(x, y);
      if (d < R_INNER - 4) pores.push({ x, y, r: rTiny, ring: 0 });
    }
  }
  return pores;
};

const PORES: Pore[] = buildPores();

const hexPath = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timeline (seconds) ─────────────────────────────────────────
  // 0.00 – card in, reticle draws
  // 0.30 – frustule ring
  // 0.55 – pores etch outward
  // 2.20 – callout leader snaps in
  // 2.70 – hook line fades in
  const reticleT = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ringT = interpolate(frame, [fps * 0.3, fps * 1.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Etch progress: 0 at t=0.55s, 1 at t=2.05s — grows from centre outward
  const etch = interpolate(frame, [fps * 0.55, fps * 2.05], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const etchRadius = etch * (R_OUTER + 8);

  // Scanline sweeps once during etching
  const scanT = interpolate(frame, [fps * 0.4, fps * 2.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanY = -R_OUTER + scanT * R_OUTER * 2;
  const scanOpacity = interpolate(
    scanT,
    [0, 0.05, 0.95, 1],
    [0, 0.9, 0.9, 0],
  );

  const calloutSpring = spring({
    frame: frame - fps * 2.2,
    fps,
    config: { damping: 180, mass: 0.7, stiffness: 120 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(frame, [fps * 2.7, fps * 3.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <span>Everyday Motivation · No. 067</span>
        <span style={{ color: TEAL }}>2026 · 08 · 29</span>
      </div>

      {/* Inspection viewport + specimen */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* subtle radial vignette on the viewport */}
          <radialGradient id="viewport" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#0F1520" />
            <stop offset="75%" stopColor={PANEL} />
            <stop offset="100%" stopColor="#080D16" />
          </radialGradient>

          {/* frustule radial: cream centre, gold-bronze edge (chloroplast + rim) */}
          <radialGradient id="frustule" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#FAF3DE" stopOpacity={0.14} />
            <stop offset="55%" stopColor={GOLD} stopOpacity={0.09} />
            <stop offset="100%" stopColor={BRONZE} stopOpacity={0.18} />
          </radialGradient>

          {/* thin-film teal ring highlight — kept soft */}
          <radialGradient id="rim-teal" cx="50%" cy="50%" r="50%">
            <stop offset="90%" stopColor={TEAL} stopOpacity={0} />
            <stop offset="97%" stopColor={TEAL} stopOpacity={0.32} />
            <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
          </radialGradient>

          {/* clip: pores only visible inside the growing etch radius */}
          <clipPath id="etch-clip">
            <circle cx={CENTER.x} cy={CENTER.y} r={etchRadius} />
          </clipPath>

          {/* clip: reticle grid stays inside the viewport rectangle */}
          <clipPath id="viewport-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>

          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>

          <filter id="pore-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Viewport panel */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#viewport)"
        />

        {/* Reticle: fine grid + major grid, drawn with a wipe */}
        <g clipPath="url(#viewport-clip)" opacity={reticleT}>
          {/* fine grid */}
          {(() => {
            const step = 24;
            const lines: React.ReactNode[] = [];
            for (let x = FRAME.x; x <= FRAME.x + FRAME.w; x += step) {
              lines.push(
                <line
                  key={`vf-${x}`}
                  x1={x}
                  y1={FRAME.y}
                  x2={x}
                  y2={FRAME.y + FRAME.h}
                  stroke={RETICLE}
                  strokeWidth={0.6}
                />,
              );
            }
            for (let y = FRAME.y; y <= FRAME.y + FRAME.h; y += step) {
              lines.push(
                <line
                  key={`hf-${y}`}
                  x1={FRAME.x}
                  y1={y}
                  x2={FRAME.x + FRAME.w}
                  y2={y}
                  stroke={RETICLE}
                  strokeWidth={0.6}
                />,
              );
            }
            return lines;
          })()}
          {/* major grid */}
          {(() => {
            const step = 96;
            const lines: React.ReactNode[] = [];
            for (let x = FRAME.x; x <= FRAME.x + FRAME.w; x += step) {
              lines.push(
                <line
                  key={`vm-${x}`}
                  x1={x}
                  y1={FRAME.y}
                  x2={x}
                  y2={FRAME.y + FRAME.h}
                  stroke={RETICLE_MAJOR}
                  strokeWidth={1}
                />,
              );
            }
            for (let y = FRAME.y; y <= FRAME.y + FRAME.h; y += step) {
              lines.push(
                <line
                  key={`hm-${y}`}
                  x1={FRAME.x}
                  y1={y}
                  x2={FRAME.x + FRAME.w}
                  y2={y}
                  stroke={RETICLE_MAJOR}
                  strokeWidth={1}
                />,
              );
            }
            return lines;
          })()}

          {/* central crosshair */}
          <line
            x1={CENTER.x - 34}
            y1={CENTER.y}
            x2={CENTER.x + 34}
            y2={CENTER.y}
            stroke={TEAL}
            strokeOpacity={0.9}
            strokeWidth={1}
          />
          <line
            x1={CENTER.x}
            y1={CENTER.y - 34}
            x2={CENTER.x}
            y2={CENTER.y + 34}
            stroke={TEAL}
            strokeOpacity={0.9}
            strokeWidth={1}
          />
        </g>

        {/* Frame border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#2E3849"
          strokeWidth={1}
        />

        {/* Corner fiducials (photomask alignment marks) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g
            key={`fid-${i}`}
            stroke={GOLD}
            strokeWidth={1.5}
            fill="none"
            opacity={reticleT}
          >
            <line x1={cx} y1={cy} x2={cx + sx * 30} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 30} />
            <circle cx={cx + sx * 18} cy={cy + sy * 18} r={5} />
            <line
              x1={cx + sx * 12}
              y1={cy + sy * 18}
              x2={cx + sx * 24}
              y2={cy + sy * 18}
            />
            <line
              x1={cx + sx * 18}
              y1={cy + sy * 12}
              x2={cx + sx * 18}
              y2={cy + sy * 24}
            />
          </g>
        ))}

        {/* Specimen: Coscinodiscus frustule */}
        <g transform={`translate(${CENTER.x}, ${CENTER.y})`}>
          {/* soft biological halo — hint of chloroplast gold */}
          <circle
            cx={0}
            cy={0}
            r={R_OUTER + 22}
            fill="url(#frustule)"
            opacity={ringT * 0.75}
          />

          {/* Outer rim (three-layer diatom edge suggested by three arcs) */}
          <circle
            cx={0}
            cy={0}
            r={R_OUTER}
            fill="none"
            stroke={SILICA}
            strokeOpacity={0.6 * ringT}
            strokeWidth={1.8}
          />
          <circle
            cx={0}
            cy={0}
            r={R_OUTER - 8}
            fill="none"
            stroke={SILICA_DIM}
            strokeOpacity={0.35 * ringT}
            strokeWidth={1}
          />
          <circle
            cx={0}
            cy={0}
            r={R_OUTER + 6}
            fill="url(#rim-teal)"
            opacity={ringT}
          />

          {/* Two subtler zone-dividers — mid & innermost cribellum */}
          <circle
            cx={0}
            cy={0}
            r={R_MID}
            fill="none"
            stroke={SILICA_DIM}
            strokeOpacity={0.28 * ringT}
            strokeWidth={0.8}
            strokeDasharray="3 4"
          />
          <circle
            cx={0}
            cy={0}
            r={R_INNER}
            fill="none"
            stroke={TEAL}
            strokeOpacity={0.55 * ringT}
            strokeWidth={1.1}
          />

          {/* Pore lattice — clipped by the growing etch radius */}
          <g clipPath="url(#etch-clip)" transform={`translate(${CENTER.x * 0}, ${CENTER.y * 0})`}>
            {/*
              We're already translated to CENTER; the clip is in root coords,
              so wrap pores in a group that's translated to CENTER too so their
              coords line up with the clip circle.
            */}
          </g>

          {/* Because clip-paths use root user space, render pores in root
              coords via an inner <g> that reverts the local translate. */}
        </g>

        {/* Pore lattice — rendered in root coordinates so the clip circle
            (also root coords) lines up exactly. */}
        <g clipPath="url(#etch-clip)">
          <g transform={`translate(${CENTER.x}, ${CENTER.y})`}>
            {/* Silica plate under the pores — a warm cream disc */}
            <circle
              cx={0}
              cy={0}
              r={R_OUTER - 6}
              fill={SILICA}
              opacity={0.06}
            />

            {/* Innermost cribellum: a slightly warmer cream disc */}
            <circle
              cx={0}
              cy={0}
              r={R_INNER}
              fill={SILICA}
              opacity={0.11}
            />

            {/* Pores — outer/mid as hex apertures, innermost as tiny dots */}
            {PORES.map((p, i) => {
              if (p.ring === 0) {
                return (
                  <circle
                    key={`p-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill={INK}
                    stroke={SILICA}
                    strokeOpacity={0.9}
                    strokeWidth={0.5}
                  />
                );
              }
              return (
                <path
                  key={`p-${i}`}
                  d={hexPath(p.x, p.y, p.r)}
                  fill={INK}
                  stroke={SILICA}
                  strokeOpacity={0.85}
                  strokeWidth={0.5}
                />
              );
            })}

            {/* A faint gold cast just inside the rim — chloroplast hint.
                Kept narrow + low-alpha so it doesn't muddy the field. */}
            <circle
              cx={0}
              cy={0}
              r={R_OUTER - 14}
              fill="none"
              stroke={GOLD}
              strokeOpacity={0.09}
              strokeWidth={8}
              filter="url(#soft)"
            />
          </g>
        </g>

        {/* Scan-line sweep across the specimen (photolithography exposure) */}
        <g opacity={scanOpacity}>
          <line
            x1={CENTER.x - R_OUTER - 20}
            y1={CENTER.y + scanY}
            x2={CENTER.x + R_OUTER + 20}
            y2={CENTER.y + scanY}
            stroke={TEAL}
            strokeWidth={1}
            strokeOpacity={0.9}
          />
          <line
            x1={CENTER.x - R_OUTER - 20}
            y1={CENTER.y + scanY}
            x2={CENTER.x + R_OUTER + 20}
            y2={CENTER.y + scanY}
            stroke={TEAL}
            strokeWidth={14}
            strokeOpacity={0.06}
            filter="url(#pore-glow)"
          />
        </g>

        {/* Callout to the innermost cribellum ring */}
        {calloutSpring > 0.02 && (() => {
          // Anchor point on the innermost ring (upper-left of centre)
          const ax = CENTER.x - R_INNER * 0.72;
          const ay = CENTER.y - R_INNER * 0.72;
          // Leader elbow → up-and-left into the empty corner
          const ex = FRAME.x + 118;
          const ey = FRAME.y + 118;
          const boxW = 208;
          const boxH = 60;
          const bx = ex - boxW / 2;
          const by = ey - boxH - 8;

          const revealX = ax + (ex - ax) * calloutSpring;
          const revealY = ay + (ey - ay) * calloutSpring;

          return (
            <g>
              {/* dashed leader */}
              <line
                x1={ax}
                y1={ay}
                x2={revealX}
                y2={revealY}
                stroke={TEAL}
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />
              {/* anchor dot */}
              <circle cx={ax} cy={ay} r={3.5} fill={TEAL} />
              <circle cx={ax} cy={ay} r={8} fill="none" stroke={TEAL} strokeOpacity={0.4} strokeWidth={1} />

              {/* label chip */}
              <g opacity={calloutSpring}>
                <rect
                  x={bx}
                  y={by}
                  width={boxW}
                  height={boxH}
                  rx={2}
                  fill={INK}
                  stroke={TEAL}
                  strokeWidth={1.2}
                />
                <text
                  x={bx + 14}
                  y={by + 22}
                  fill={GRAY}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={3}
                  fontWeight={600}
                >
                  CRIBELLUM · INNER SIEVE
                </text>
                <text
                  x={bx + 14}
                  y={by + 46}
                  fill={SILICA}
                  fontFamily={inter}
                  fontSize={20}
                  letterSpacing={1}
                  fontWeight={600}
                >
                  ⌀ ~45 nm
                </text>
              </g>
            </g>
          );
        })()}

        {/* N marker — feels like inspection convention */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 30})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3}
        >
          <text textAnchor="start">N</text>
          <line
            x1={5}
            y1={6}
            x2={5}
            y2={24}
            stroke={GRAY}
            strokeWidth={1.2}
          />
          <polygon points={`2,9 5,2 8,9`} fill={GOLD} />
        </g>

        {/* Scale bar in nm */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 190}, ${
            FRAME.y + FRAME.h - 32
          })`}
          stroke={GRAY}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          <line x1={0} y1={0} x2={130} y2={0} strokeWidth={1.2} />
          <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
          <line x1={65} y1={-3} x2={65} y2={3} strokeWidth={1.2} />
          <line x1={130} y1={-5} x2={130} y2={5} strokeWidth={1.2} />
          <text x={140} y={4} stroke="none">
            50 µM
          </text>
        </g>

        {/* Caption strip under the viewport */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 24})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · COSCINODISCUS WAILESII · VALVE FACE, DIC</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={TEAL}
            opacity={0.85}
          >
            HEX PORE LATTICE · 3-LAYER SIEVE
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 972,
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
            color: TEAL,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Master Etcher
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 74,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The glass shell
          <br />
          patterned at 45 nm.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The single-celled alga{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>
            Coscinodiscus wailesii
          </span>{" "}
          secretes a three-layered silica frustule whose innermost sieve —
          the <span style={{ color: TEAL, fontWeight: 600 }}>cribellum</span>{" "}
          — is perforated by a hexagonal array of pores roughly{" "}
          <span style={{ color: SILICA, fontWeight: 600 }}>45 nm</span> wide:
          a lattice patterned biologically at the fineness of modern
          semiconductor lithography.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 34,
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
        <span>Losic et al. · J. Porous Mater. 14 (2007)</span>
        <span>
          <span style={{ color: TEAL }}>◆</span> Biogenic photomask
        </span>
      </div>
    </AbsoluteFill>
  );
};
