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

// Palette — taken from the concept's visual brief (diatom frustule under darkfield)
const INK = "#06202A";
const DEEP = "#0E3540";
const SILICA = "#D6EEE7";
const RIM = "#9BD5CF";
const AMBER = "#D89844";
const MUTED = "#6D8A91";

// ── Geometry helpers ─────────────────────────────────────────────────────
// A Coscinodiscus-style disc: concentric rings + radial costae + hexagonal pore lattice.
// Draws in a 1080-wide local coordinate space centred at (CX, CY) with radius R.
const CX = 540;
const CY = 530;
const R = 300; // outer silica rim
const R_INNER = R - 26; // inner wall where pore field begins
const R_PORE_OUTER = R - 40;
const R_PORE_INNER = 58; // central hyaline area

type Pore = { x: number; y: number; r: number; shellDist: number };

const buildPores = (): Pore[] => {
  // Hexagonal lattice, keep points inside the pore annulus, varying radius slightly by band.
  const pores: Pore[] = [];
  const step = 24; // pore pitch
  const hStep = step * Math.sqrt(3) / 2;
  for (let row = -22; row <= 22; row++) {
    const y = CY + row * hStep;
    const xOffset = (row & 1) === 0 ? 0 : step / 2;
    for (let col = -22; col <= 22; col++) {
      const x = CX + col * step + xOffset;
      const dx = x - CX;
      const dy = y - CY;
      const d = Math.hypot(dx, dy);
      if (d > R_PORE_OUTER || d < R_PORE_INNER) continue;
      // Pore radius drops a touch near the rim, grows a touch mid-shell.
      const t = (d - R_PORE_INNER) / (R_PORE_OUTER - R_PORE_INNER);
      const rad = 6.4 - Math.pow(t - 0.4, 2) * 4.2;
      pores.push({ x, y, r: Math.max(3.5, rad), shellDist: d });
    }
  }
  return pores;
};

// Radial costae (fine spoke-ridges that cross the pore field)
const COSTAE_COUNT = 72;
const buildCostae = (): Array<[number, number, number, number]> => {
  const lines: Array<[number, number, number, number]> = [];
  for (let i = 0; i < COSTAE_COUNT; i++) {
    const theta = (i / COSTAE_COUNT) * Math.PI * 2;
    const r0 = R_PORE_INNER + 2;
    const r1 = R_PORE_OUTER - 2;
    const x0 = CX + Math.cos(theta) * r0;
    const y0 = CY + Math.sin(theta) * r0;
    const x1 = CX + Math.cos(theta) * r1;
    const y1 = CY + Math.sin(theta) * r1;
    lines.push([x0, y0, x1, y1]);
  }
  return lines;
};

// Micro-tick marks along the outer rim (like a lens barrel)
const buildRimTicks = (): Array<[number, number, number, number, boolean]> => {
  const t: Array<[number, number, number, number, boolean]> = [];
  const count = 180;
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const major = i % 15 === 0;
    const r0 = R + 2;
    const r1 = r0 + (major ? 14 : 6);
    const x0 = CX + Math.cos(theta) * r0;
    const y0 = CY + Math.sin(theta) * r0;
    const x1 = CX + Math.cos(theta) * r1;
    const y1 = CY + Math.sin(theta) * r1;
    t.push([x0, y0, x1, y1, major]);
  }
  return t;
};

const PORES = buildPores();
const COSTAE = buildCostae();
const RIM_TICKS = buildRimTicks();

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────────
  const bodySpring = spring({
    frame,
    fps,
    config: { damping: 220, mass: 0.9, stiffness: 110 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 220, mass: 0.9 },
  });

  const roleOpacity = interpolate(frame, [fps * 0.2, fps * 0.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const metaOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Light-sweep across the disc — one primary motion that dramatises the hook.
  // Travels left→right across the frustule once over ~4 s, then holds.
  const sweepT = Math.min(1, Math.max(0, (frame - fps * 0.6) / (fps * 3.8)));
  const sweepEased = Easing.inOut(Easing.cubic)(sweepT);
  const sweepX = CX - R - 60 + sweepEased * (R * 2 + 120);
  const sweepWidth = R * 1.1;

  // Progressive illumination of pores — rim→centre reveal lit by the sweep.
  const poreT = Math.min(1, Math.max(0, (frame - fps * 0.4) / (fps * 2.2)));
  const poreEased = 1 - Math.pow(1 - poreT, 3);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Diatom plate ────────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep background vignette focuses the eye on the plate */}
          <radialGradient id="bg-vignette" cx="50%" cy="43%" r="65%">
            <stop offset="0%" stopColor={DEEP} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Soft outer glow around the frustule — darkfield backlight */}
          <radialGradient id="plate-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={RIM} stopOpacity={0.22} />
            <stop offset="60%" stopColor={RIM} stopOpacity={0.05} />
            <stop offset="100%" stopColor={RIM} stopOpacity={0} />
          </radialGradient>

          {/* Translucent inner glass — reads as backlit silica */}
          <radialGradient id="plate-body" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#E8F6F2" stopOpacity={0.14} />
            <stop offset="55%" stopColor={SILICA} stopOpacity={0.06} />
            <stop offset="100%" stopColor={SILICA} stopOpacity={0} />
          </radialGradient>

          {/* Centre hyaline area — a quiet silica medallion */}
          <radialGradient id="plate-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SILICA} stopOpacity={0.18} />
            <stop offset="80%" stopColor={SILICA} stopOpacity={0.06} />
            <stop offset="100%" stopColor={SILICA} stopOpacity={0} />
          </radialGradient>

          {/* Horizontal light-sweep gradient (clip mask for the pore illumination) */}
          <linearGradient id="sweep-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="35%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="65%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>

          {/* Mask for pore glow — just the sweep window */}
          <mask id="sweep-mask">
            <rect x={0} y={0} width={1080} height={1350} fill="#000" />
            <rect
              x={sweepX - sweepWidth / 2}
              y={CY - R - 20}
              width={sweepWidth}
              height={R * 2 + 40}
              fill="url(#sweep-grad)"
            />
          </mask>

          {/* Clip the inner pore field to a circular region */}
          <clipPath id="disc-clip">
            <circle cx={CX} cy={CY} r={R_INNER - 2} />
          </clipPath>

          {/* Soft blur for backlit edges */}
          <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="pore-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.4" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={1080} height={1350} fill="url(#bg-vignette)" />

        {/* Subtle margin grid — a glassblower's bench rule */}
        <g stroke={DEEP} strokeWidth={1} opacity={0.55}>
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={`vg-${i}`}
              x1={60 + i * 50}
              y1={180}
              x2={60 + i * 50}
              y2={930}
            />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line
              key={`hg-${i}`}
              x1={60}
              y1={180 + i * 50}
              x2={1020}
              y2={180 + i * 50}
            />
          ))}
        </g>

        {/* ── Corner crop marks (bench frame) ─────────────────────── */}
        {(
          [
            [80, 180, 1, 1],
            [1000, 180, -1, 1],
            [80, 930, 1, -1],
            [1000, 930, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`crop-${i}`} stroke={AMBER} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Plate halo */}
        <circle cx={CX} cy={CY} r={R + 90} fill="url(#plate-halo)" />

        {/* Horizontal baseline through disc centre — bench axis */}
        <line
          x1={120}
          y1={CY}
          x2={CX - R - 24}
          y2={CY}
          stroke={MUTED}
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="2 6"
        />
        <line
          x1={CX + R + 24}
          y1={CY}
          x2={960}
          y2={CY}
          stroke={MUTED}
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="2 6"
        />

        {/* Diameter annotation */}
        <g
          fill={MUTED}
          stroke={MUTED}
          strokeWidth={1}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={2.6}
          fontWeight={500}
        >
          <text
            x={CX - R - 44}
            y={CY - 4}
            textAnchor="end"
            stroke="none"
            opacity={0.75}
          >
            Ø 180 µm
          </text>
          <text
            x={CX + R + 44}
            y={CY - 4}
            textAnchor="start"
            stroke="none"
            opacity={0.75}
          >
            SIO₂ · nH₂O
          </text>
        </g>

        {/* ── Frustule body ───────────────────────────────────────── */}
        {/* Translucent inner glass */}
        <circle cx={CX} cy={CY} r={R - 2} fill="url(#plate-body)" />
        {/* Outer silica rim (double ring) */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={SILICA}
          strokeWidth={2.2}
          opacity={0.95}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R - 10}
          fill="none"
          stroke={SILICA}
          strokeWidth={1}
          opacity={0.55}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER}
          fill="none"
          stroke={SILICA}
          strokeWidth={1}
          opacity={0.55}
        />

        {/* Rim ticks */}
        {RIM_TICKS.map(([x0, y0, x1, y1, major], i) => (
          <line
            key={`tick-${i}`}
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
            stroke={major ? SILICA : RIM}
            strokeWidth={major ? 1.3 : 0.8}
            opacity={major ? 0.7 : 0.35}
          />
        ))}

        {/* Radial costae — behind the pore lattice */}
        <g clipPath="url(#disc-clip)" opacity={0.35}>
          {COSTAE.map(([x0, y0, x1, y1], i) => (
            <line
              key={`costa-${i}`}
              x1={x0}
              y1={y0}
              x2={x1}
              y2={y1}
              stroke={RIM}
              strokeWidth={0.6}
            />
          ))}
        </g>

        {/* ── Pore lattice (base layer: outlines) ───────────────── */}
        <g clipPath="url(#disc-clip)">
          {PORES.map((p, i) => {
            const normDist =
              (p.shellDist - R_PORE_INNER) /
              (R_PORE_OUTER - R_PORE_INNER);
            // Rim→centre reveal
            const localOpenT = Math.min(
              1,
              Math.max(0, poreEased * 1.6 - (1 - normDist) * 0.8),
            );
            if (localOpenT <= 0) return null;
            return (
              <circle
                key={`pore-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.r * (0.4 + 0.6 * localOpenT)}
                fill="none"
                stroke={SILICA}
                strokeWidth={1.25}
                opacity={0.55 + 0.4 * localOpenT}
              />
            );
          })}
        </g>

        {/* ── Pore lattice (lit layer: only visible under the sweep) ─ */}
        <g
          clipPath="url(#disc-clip)"
          mask="url(#sweep-mask)"
          filter="url(#pore-blur)"
        >
          {PORES.map((p, i) => {
            const normDist =
              (p.shellDist - R_PORE_INNER) /
              (R_PORE_OUTER - R_PORE_INNER);
            const localOpenT = Math.min(
              1,
              Math.max(0, poreEased * 1.6 - (1 - normDist) * 0.8),
            );
            if (localOpenT <= 0) return null;
            return (
              <circle
                key={`lit-${i}`}
                cx={p.x}
                cy={p.y}
                r={p.r * 0.95}
                fill={SILICA}
                opacity={0.9 * localOpenT}
              />
            );
          })}
        </g>

        {/* Central hyaline medallion */}
        <circle cx={CX} cy={CY} r={R_PORE_INNER} fill="url(#plate-core)" />
        <circle
          cx={CX}
          cy={CY}
          r={R_PORE_INNER}
          fill="none"
          stroke={SILICA}
          strokeWidth={1}
          opacity={0.7}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_PORE_INNER - 14}
          fill="none"
          stroke={RIM}
          strokeWidth={0.8}
          opacity={0.45}
        />
        {/* A tiny labelled central areola */}
        <circle cx={CX} cy={CY} r={6} fill={AMBER} opacity={0.9} />

        {/* ── Specular glint (traveling with the sweep) ───────────── */}
        {/* A thin crescent of light that reads like silica catching the
            sweep, clipped to the disc. */}
        <g clipPath="url(#disc-clip)" opacity={0.85}>
          <ellipse
            cx={sweepX}
            cy={CY}
            rx={8}
            ry={R_PORE_OUTER - 14}
            fill={SILICA}
            opacity={0.07}
            filter="url(#soft-blur)"
          />
          <ellipse
            cx={sweepX}
            cy={CY}
            rx={1.6}
            ry={R_PORE_OUTER - 22}
            fill="#FFFFFF"
            opacity={0.18}
          />
        </g>

        {/* ── Temperature callout (bench-note, left side) ─────────── */}
        <g opacity={interpolate(frame, [fps * 1.3, fps * 2.1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })}>
          {/* leader from a pore on the shell up-left into margin */}
          <line
            x1={CX - R * 0.46}
            y1={CY - R * 0.70}
            x2={CX - R - 36}
            y2={CY - R - 10}
            stroke={AMBER}
            strokeWidth={1.2}
          />
          <circle
            cx={CX - R * 0.46}
            cy={CY - R * 0.70}
            r={3}
            fill={AMBER}
          />
          <g transform={`translate(${CX - R - 38}, ${CY - R - 42})`}>
            <text
              x={0}
              y={0}
              textAnchor="end"
              fill={AMBER}
              fontFamily={inter}
              fontSize={10.5}
              letterSpacing={3.2}
              fontWeight={600}
            >
              BUILT AT
            </text>
            <text
              x={0}
              y={34}
              textAnchor="end"
              fill={SILICA}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={36}
              fontWeight={500}
            >
              15 °C
            </text>
          </g>

          {/* opposing note on the right, same baseline */}
          <g transform={`translate(${CX + R + 38}, ${CY - R - 42})`}>
            <text
              x={0}
              y={0}
              textAnchor="start"
              fill={MUTED}
              fontFamily={inter}
              fontSize={10.5}
              letterSpacing={3.2}
              fontWeight={600}
            >
              FURNACE
            </text>
            <text
              x={0}
              y={34}
              textAnchor="start"
              fill={MUTED}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={36}
              fontWeight={500}
              opacity={0.75}
            >
              1600 °C
            </text>
          </g>
        </g>

        {/* ── Scale bar + figure caption below the plate ──────────── */}
        <g
          transform={`translate(80, 960)`}
          fill={MUTED}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={bodySpring}
        >
          <g stroke={MUTED} strokeWidth={1.2}>
            <line x1={0} y1={0} x2={110} y2={0} />
            <line x1={0} y1={-5} x2={0} y2={5} />
            <line x1={55} y1={-3} x2={55} y2={3} />
            <line x1={110} y1={-5} x2={110} y2={5} />
          </g>
          <text x={120} y={4}>
            50 µm
          </text>
          <text x={920 - 80} y={4} textAnchor="end" fill={RIM} opacity={0.9}>
            FIG. 1 · COSCINODISCUS FRUSTULE, LIGHT-MICROGRAPH SCHEMATIC
          </text>
        </g>
      </svg>

      {/* ── Metadata band ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: "#8FA6AD",
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: AMBER }}>2026 · 10 · 17</span>
      </div>

      {/* ── Type lockup ──────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1000,
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
            color: AMBER,
            fontFamily: inter,
            fontSize: 12.5,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 600,
            opacity: roleOpacity,
          }}
        >
          Role <span style={{ color: MUTED, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F0F6F3", letterSpacing: 5 }}>
            Glassblower
          </span>
        </div>

        <div
          style={{
            color: "#F2F8F5",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 54,
            lineHeight: 1.0,
            letterSpacing: -1.1,
            fontStyle: "italic",
            maxWidth: 820,
          }}
        >
          The ambient-temperature
          <br />
          glassblower.
        </div>
      </div>

      {/* ── Hook paragraph ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1200,
          color: "#C4D5D1",
          fontFamily: inter,
          fontSize: 15.5,
          lineHeight: 1.45,
          fontWeight: 400,
          maxWidth: 880,
          opacity: hookOpacity,
        }}
      >
        A single-celled{" "}
        <span style={{ color: SILICA, fontWeight: 600 }}>diatom</span> secretes
        silaffin proteins that polymerise dissolved silicic acid into an
        opaline-glass shell, patterning its pores on a 40–200 nm scale that
        industrial glassmakers can only approach by melting silica at ~1600 °C.
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTED,
          fontFamily: inter,
          fontSize: 10.5,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Kröger et al. · Science 286 (1999) 1129–1132</span>
        <span>
          <span style={{ color: AMBER }}>●</span> Fucoxanthin ·{" "}
          <span style={{ color: SILICA }}>●</span> Silica
        </span>
      </div>
    </AbsoluteFill>
  );
};
