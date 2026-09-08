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

// ── Palette (bristlecone) ────────────────────────────────────────────
const INK = "#12100C";
const PARCHMENT = "#E8DDC5";
const HEART = "#B27146";
const BARK = "#6E3618";
const NEEDLE = "#4A6642";

// Derived tints
const DIM = "#6E5F4A";       // muted parchment
const DEEP = "#1A140F";      // slightly warmer black for panels
const CAMBIUM = "#D7A16A";   // pale warm heartwood
const LATE = "#3A2418";      // latewood dark line

// ── Cross-section geometry ──────────────────────────────────────────
const CX = 540;
const CY = 1240;
const R_OUTER = 560;
const R_INNER = 5;
const N_BANDS = 150;

// Deterministic pseudo-noise so band widths jitter naturally
const noise = (i: number, salt: number): number => {
  const s = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

type Band = { inner: number; outer: number };
const buildBands = (): Band[] => {
  const raw: number[] = [];
  for (let i = 0; i < N_BANDS; i++) {
    // Wider bands early (fast juvenile growth), narrower as it ages
    const ageFactor = 1 - Math.pow(i / N_BANDS, 1.4) * 0.7;
    const jitter = 0.5 + noise(i, 3.1);
    raw.push(ageFactor * jitter);
  }
  const total = raw.reduce((a, b) => a + b, 0);
  const bands: Band[] = [];
  let acc = R_INNER;
  for (let i = 0; i < N_BANDS; i++) {
    const w = ((R_OUTER - R_INNER) * raw[i]) / total;
    bands.push({ inner: acc, outer: acc + w });
    acc += w;
  }
  return bands;
};
const BANDS = buildBands();

// ── Catalogued year markers ─────────────────────────────────────────
// years-before-2026 → radius; radial angle chosen so leaders don't collide
type Marker = {
  key: string;
  yearBP: number;
  angleDeg: number;      // svg angle (0=east, 90=south, 270=north)
  label: string;
  sub: string;
  side: "L" | "R";       // which side the tag anchors to
  labelY: number;        // y-coordinate for the tag
  labelX: number;        // x-coordinate for the tag anchor
  chronoOrder: number;   // reveal order (0 first)
};

const MARKERS: Marker[] = [
  {
    key: "germination",
    yearBP: 4855,
    angleDeg: 0, // unused — pith gets a curved leader
    label: "GERMINATION",
    sub: "c. 2833 BCE",
    side: "R",
    labelX: 820,
    labelY: 1130,
    chronoOrder: 0,
  },
  {
    key: "vesuvius",
    yearBP: 1947,
    angleDeg: 195,
    label: "VESUVIUS",
    sub: "79 CE · Pompeii",
    side: "L",
    labelX: 260,
    labelY: 990,
    chronoOrder: 1,
  },
  {
    key: "norman",
    yearBP: 960,
    angleDeg: 240,
    label: "NORMAN",
    sub: "1066 CE · Conquest",
    side: "L",
    labelX: 260,
    labelY: 570,
    chronoOrder: 2,
  },
  {
    key: "tambora",
    yearBP: 211,
    angleDeg: 275,
    label: "TAMBORA",
    sub: "1815 CE · no summer",
    side: "R",
    labelX: 820,
    labelY: 560,
    chronoOrder: 3,
  },
  {
    key: "present",
    yearBP: 0,
    angleDeg: 305,
    label: "PRESENT",
    sub: "2026 CE · alive",
    side: "R",
    labelX: 820,
    labelY: 660,
    chronoOrder: 4,
  },
];

const radiusForYearBP = (yearBP: number): number =>
  R_OUTER - (R_OUTER - R_INNER) * (yearBP / 4855);

const polar = (r: number, angleDeg: number): { x: number; y: number } => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

// Pre-compute marker geometry
type MarkerGeom = Marker & {
  ringR: number;
  ringPt: { x: number; y: number };
  edgePt: { x: number; y: number };
};
const MARKER_GEOM: MarkerGeom[] = MARKERS.map((m) => {
  const ringR = radiusForYearBP(m.yearBP);
  const ringPt = polar(ringR, m.angleDeg);
  // leader emerges past the disc rim along the same radial
  const edgePt = polar(R_OUTER + 30, m.angleDeg);
  return { ...m, ringR, ringPt, edgePt };
});

// ── Component ────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cross-section radial reveal: 0..1 as the disc grows out from pith
  const discGrow = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 220, mass: 1.4, stiffness: 60 },
  });
  const discR = R_OUTER * discGrow;

  // Title spring
  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 1.0, fps * 1.9], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Markers reveal in chronological order (pith → present)
  const markerStagger = 0.28; // seconds between reveals
  const markerStart = 1.6;    // seconds
  const markerReveal = (order: number): number => {
    return spring({
      frame: frame - fps * (markerStart + order * markerStagger),
      fps,
      config: { damping: 190, mass: 0.7 },
    });
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* ── Metadata band ────────────────────────────────────────── */}
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
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CAMBIUM }}>2026 · 09 · 08</span>
      </div>

      {/* Thin top rule */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 80,
          right: 80,
          height: 1,
          backgroundColor: "#2A2218",
        }}
      />

      {/* ── SVG canvas ───────────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Radial gradient across the disc — heartwood -> parchment -> bark */}
          <radialGradient id="disc-tone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BARK} stopOpacity={1} />
            <stop offset="18%" stopColor={HEART} stopOpacity={1} />
            <stop offset="60%" stopColor={CAMBIUM} stopOpacity={1} />
            <stop offset="92%" stopColor={PARCHMENT} stopOpacity={1} />
            <stop offset="100%" stopColor={BARK} stopOpacity={1} />
          </radialGradient>

          {/* Vignette to sink the disc into the paper black */}
          <radialGradient id="disc-vignette" cx="50%" cy="50%" r="52%">
            <stop offset="70%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor={INK} stopOpacity={0.6} />
          </radialGradient>

          {/* Clip to reveal disc growth */}
          <clipPath id="disc-clip">
            <circle cx={CX} cy={CY} r={Math.max(0, discR)} />
          </clipPath>

          {/* Soft paper texture — subtle grain via noisy overlay */}
          <pattern
            id="paper-grain"
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <rect width="6" height="6" fill={INK} />
            <circle cx={1.5} cy={2.2} r={0.35} fill="#1a1611" opacity={0.6} />
            <circle cx={4.4} cy={4.6} r={0.3} fill="#1a1611" opacity={0.5} />
          </pattern>

          <filter id="ring-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Subtle paper texture behind everything */}
        <rect width={1080} height={1350} fill="url(#paper-grain)" opacity={0.5} />

        {/* ── Cross-section (clipped to grow from pith) ─────────── */}
        <g clipPath="url(#disc-clip)">
          {/* Base tinted disc */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#disc-tone)" />

          {/* Earlywood/latewood bands drawn as ring strokes */}
          {BANDS.map((b, i) => {
            const rMid = (b.inner + b.outer) / 2;
            const w = b.outer - b.inner;
            // gently modulate tone along radius
            const t = i / (N_BANDS - 1);
            const shade =
              t < 0.15
                ? BARK
                : t < 0.55
                ? HEART
                : t < 0.9
                ? CAMBIUM
                : PARCHMENT;
            const jitter = noise(i, 7.2);
            const bandOpacity = 0.10 + jitter * 0.10;
            return (
              <circle
                key={`band-${i}`}
                cx={CX}
                cy={CY}
                r={rMid}
                fill="none"
                stroke={shade}
                strokeOpacity={bandOpacity}
                strokeWidth={Math.max(0.5, w)}
              />
            );
          })}

          {/* Dark latewood boundary line at each band's outer edge */}
          {BANDS.map((b, i) => {
            const jitter = noise(i, 11.3);
            // simulate drought years — some rings much thinner/darker
            const isDrought = noise(i, 17.4) > 0.86;
            return (
              <circle
                key={`late-${i}`}
                cx={CX}
                cy={CY}
                r={b.outer}
                fill="none"
                stroke={LATE}
                strokeOpacity={isDrought ? 0.85 : 0.35 + jitter * 0.15}
                strokeWidth={isDrought ? 0.9 : 0.5}
              />
            );
          })}

          {/* Radial hairline cracks — the weathered signature of P. longaeva */}
          {[24, 71, 128, 168, 205, 249, 291, 336].map((ang) => {
            const p1 = polar(20, ang);
            const p2 = polar(R_OUTER - 20, ang);
            const midR = 200 + (noise(ang, 5.7) - 0.5) * 40;
            const midA = ang + (noise(ang, 9.1) - 0.5) * 6;
            const midP = polar(midR, midA);
            return (
              <path
                key={`crack-${ang}`}
                d={`M ${p1.x} ${p1.y} Q ${midP.x} ${midP.y} ${p2.x} ${p2.y}`}
                stroke={LATE}
                strokeOpacity={0.35}
                strokeWidth={0.9}
                fill="none"
              />
            );
          })}

          {/* Pith — small dark heart at center */}
          <circle cx={CX} cy={CY} r={4} fill={LATE} />

          {/* Bark boundary — thicker outer band */}
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER - 1}
            fill="none"
            stroke={BARK}
            strokeOpacity={0.9}
            strokeWidth={4}
          />
          {/* Vignette on top */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#disc-vignette)" />
        </g>

        {/* ── Marker ticks + leader lines + tags ─────────────────── */}
        {MARKER_GEOM.map((m) => {
          const t = markerReveal(m.chronoOrder);
          if (t <= 0.001) return null;
          const opacity = Math.min(1, t);
          const isPith = m.key === "germination";
          const anchorX = m.labelX;
          const anchorY = m.labelY;
          const tagOpacity = Math.min(1, Math.max(0, (t - 0.7) / 0.3));

          // Position of the pith marker
          if (isPith) {
            // Curved leader from pith outward to the label
            const startX = CX;
            const startY = CY;
            const endX = anchorX - 14;
            const endY = anchorY;
            const ctrlX = (startX + endX) / 2 + 90;
            const ctrlY = (startY + endY) / 2 + 30;
            const leaderT = Math.min(1, Math.max(0, (t - 0.15) / 0.55));

            // Interpolate along quadratic bezier
            const bezier = (u: number) => {
              const inv = 1 - u;
              return {
                x: inv * inv * startX + 2 * inv * u * ctrlX + u * u * endX,
                y: inv * inv * startY + 2 * inv * u * ctrlY + u * u * endY,
              };
            };
            // Build a partial-length path via sampled points
            const N = 24;
            const pts: string[] = [`M ${startX} ${startY}`];
            for (let i = 1; i <= N; i++) {
              const u = (i / N) * leaderT;
              const p = bezier(u);
              pts.push(`L ${p.x} ${p.y}`);
            }
            return (
              <g key={m.key} opacity={opacity}>
                {/* Pith dot */}
                <circle cx={startX} cy={startY} r={5} fill={PARCHMENT} />
                <circle
                  cx={startX}
                  cy={startY}
                  r={11}
                  fill="none"
                  stroke={PARCHMENT}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                {/* Curved leader */}
                <path
                  d={pts.join(" ")}
                  fill="none"
                  stroke={PARCHMENT}
                  strokeOpacity={0.55}
                  strokeWidth={0.9}
                />
                {/* Tag with dark plate for legibility over the disc */}
                <g opacity={tagOpacity}>
                  <rect
                    x={anchorX - 14}
                    y={anchorY - 40}
                    width={190}
                    height={80}
                    rx={2}
                    fill={INK}
                    fillOpacity={0.78}
                    stroke={"#2A2218"}
                    strokeWidth={1}
                  />
                  <line
                    x1={anchorX}
                    y1={anchorY - 22}
                    x2={anchorX + 28}
                    y2={anchorY - 22}
                    stroke={CAMBIUM}
                    strokeWidth={1.2}
                  />
                  <text
                    x={anchorX}
                    y={anchorY - 4}
                    fill={CAMBIUM}
                    fontFamily={inter}
                    fontSize={12}
                    letterSpacing={3.2}
                    fontWeight={600}
                    textAnchor="start"
                  >
                    {m.label}
                  </text>
                  <text
                    x={anchorX}
                    y={anchorY + 22}
                    fill={PARCHMENT}
                    fontFamily={playfair}
                    fontStyle="italic"
                    fontSize={20}
                    textAnchor="start"
                  >
                    {m.sub}
                  </text>
                </g>
              </g>
            );
          }

          // Non-pith markers: tick + leader routing
          // Radial rim exit
          const rimExit = polar(R_OUTER + 6, m.angleDeg);
          const rimInsideCanvas =
            rimExit.x >= 40 && rimExit.x <= 1040 && rimExit.y >= 60 && rimExit.y <= 1290;

          // Perpendicular tick — a short hash across the ring at marker point
          const tangentAng = m.angleDeg + 90;
          const tickHalf = 9;
          const cross1 = {
            x: m.ringPt.x + tickHalf * Math.cos((tangentAng * Math.PI) / 180),
            y: m.ringPt.y + tickHalf * Math.sin((tangentAng * Math.PI) / 180),
          };
          const cross2 = {
            x: m.ringPt.x - tickHalf * Math.cos((tangentAng * Math.PI) / 180),
            y: m.ringPt.y - tickHalf * Math.sin((tangentAng * Math.PI) / 180),
          };

          // Reveal timings
          const leaderT = Math.min(1, Math.max(0, (t - 0.25) / 0.55));

          // Build the leader as a sequence of segments
          let segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
          if (rimInsideCanvas) {
            // radial → vertical → horizontal to anchor
            const elbow = { x: rimExit.x, y: anchorY };
            segments = [
              { x1: m.ringPt.x, y1: m.ringPt.y, x2: rimExit.x, y2: rimExit.y },
              { x1: rimExit.x, y1: rimExit.y, x2: elbow.x, y2: elbow.y },
              { x1: elbow.x, y1: elbow.y, x2: anchorX, y2: anchorY },
            ];
          } else {
            // rim off-canvas — vertical from ring, then horizontal to anchor
            const elbow = { x: m.ringPt.x, y: anchorY };
            segments = [
              { x1: m.ringPt.x, y1: m.ringPt.y, x2: elbow.x, y2: elbow.y },
              { x1: elbow.x, y1: elbow.y, x2: anchorX, y2: anchorY },
            ];
          }

          // Progressive draw of segments
          const lens = segments.map((s) =>
            Math.hypot(s.x2 - s.x1, s.y2 - s.y1),
          );
          const total = lens.reduce((a, b) => a + b, 0);
          let drawn = leaderT * total;
          const drawnSegs = segments.map((s, i) => {
            if (drawn <= 0) return null;
            const l = lens[i];
            if (drawn >= l) {
              drawn -= l;
              return s;
            }
            const f = drawn / l;
            const partial = {
              x1: s.x1,
              y1: s.y1,
              x2: s.x1 + (s.x2 - s.x1) * f,
              y2: s.y1 + (s.y2 - s.y1) * f,
            };
            drawn = 0;
            return partial;
          });

          return (
            <g key={m.key} opacity={opacity}>
              {/* Tick across the ring — highlight the exact year */}
              <line
                x1={cross1.x}
                y1={cross1.y}
                x2={cross2.x}
                y2={cross2.y}
                stroke={PARCHMENT}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              {/* Small dot on the ring itself */}
              <circle
                cx={m.ringPt.x}
                cy={m.ringPt.y}
                r={2.8}
                fill={PARCHMENT}
              />

              {/* Leader segments */}
              {drawnSegs.map((s, i) =>
                s ? (
                  <line
                    key={i}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={PARCHMENT}
                    strokeOpacity={0.55}
                    strokeWidth={0.9}
                  />
                ) : null,
              )}

              {/* Tag — dark plate only when the label sits over the disc */}
              {(() => {
                // Detect disc-overlap: label anchor y is within disc's vertical extent at label x
                const dyAtX = Math.abs(anchorY - CY);
                const discHalfWidthHere =
                  dyAtX < R_OUTER
                    ? Math.sqrt(R_OUTER * R_OUTER - dyAtX * dyAtX)
                    : 0;
                const overDisc =
                  anchorX > CX - discHalfWidthHere - 40 &&
                  anchorX < CX + discHalfWidthHere + 40;
                const plateW = 210;
                const plateX =
                  m.side === "R" ? anchorX - 14 : anchorX - plateW + 14;
                return (
                  <g opacity={tagOpacity}>
                    {overDisc && (
                      <rect
                        x={plateX}
                        y={anchorY - 40}
                        width={plateW}
                        height={80}
                        rx={2}
                        fill={INK}
                        fillOpacity={0.78}
                        stroke={"#2A2218"}
                        strokeWidth={1}
                      />
                    )}
                    <line
                      x1={m.side === "R" ? anchorX : anchorX - 28}
                      y1={anchorY - 22}
                      x2={m.side === "R" ? anchorX + 28 : anchorX}
                      y2={anchorY - 22}
                      stroke={CAMBIUM}
                      strokeWidth={1.2}
                    />
                    <text
                      x={anchorX}
                      y={anchorY - 4}
                      fill={CAMBIUM}
                      fontFamily={inter}
                      fontSize={12}
                      letterSpacing={3.2}
                      fontWeight={600}
                      textAnchor={m.side === "R" ? "start" : "end"}
                    >
                      {m.label}
                    </text>
                    <text
                      x={anchorX}
                      y={anchorY + 22}
                      fill={PARCHMENT}
                      fontFamily={playfair}
                      fontStyle="italic"
                      fontSize={20}
                      textAnchor={m.side === "R" ? "start" : "end"}
                    >
                      {m.sub}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      {/* ── Type lockup (upper-left) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 140,
          width: 560,
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
            color: CAMBIUM,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 6px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: PARCHMENT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The tree
          <br />
          that keeps
          <br />
          the ledger.
        </div>
      </div>

      {/* ── Hook block (upper-right column, above the disc) ─────── */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 200,
          width: 340,
          opacity: hookOpacity,
        }}
      >
        <div
          style={{
            color: NEEDLE,
            fontFamily: inter,
            fontSize: 11,
            letterSpacing: 4,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Pinus longaeva ·{" "}
          <span style={{ color: DIM }}>White Mts., California</span>
        </div>
        <div
          style={{
            color: "#D6CFBD",
            fontFamily: inter,
            fontSize: 16,
            lineHeight: 1.45,
            fontWeight: 400,
          }}
        >
          Since c. 2833 BCE, a single living pine has laid down{" "}
          <span style={{ color: CAMBIUM, fontWeight: 600 }}>
            4,855+ annual rings
          </span>
          . Each one's width, latewood density, and{" "}
          <span style={{ color: CAMBIUM, fontWeight: 600 }}>
            ¹⁸O / ¹³C ratios
          </span>{" "}
          preserve that year's temperature, precipitation, and atmospheric
          chemistry — the longest continuously updated climate archive on
          Earth.
        </div>
      </div>

      {/* ── Footer ─ dark bar to stay legible above the disc ───── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 62,
          background:
            "linear-gradient(to bottom, rgba(18,16,12,0), rgba(18,16,12,0.85) 40%, rgba(18,16,12,0.95))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Fig. 3 · Radial section — Methuselah, P. longaeva</span>
        <span>
          <span style={{ color: CAMBIUM }}>●</span> One ring · one year
        </span>
      </div>
    </AbsoluteFill>
  );
};
