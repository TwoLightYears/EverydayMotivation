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

// Palette — from the concept's visual brief. Deinoxanthin (D. radiodurans
// carotenoid salmon) against aged parchment and iron-gall ink.
const INK = "#12100C";
const INK_DEEP = "#0A0906";
const PARCHMENT = "#EBD9B0";
const PARCHMENT_HI = "#F3E4BE";
const PARCHMENT_LO = "#C7B285";
const VELLUM = "#C89B5B";
const SALMON = "#E86C6C";
const CARMINE = "#8A1F26";
const MUTE = "#9C8A6B";
const FRACTURE_GLOW = "#F5AA8A";

// ── Layout (1080 × 1350 portrait) ─────────────────────────────────────────
// Top metadata band  : y  56 ..  86
// Leaf (framed art)  : y 130 .. 830  (h 700, w 900)
// Caption strip      : y 852
// Type lockup        : y 908
// Footer             : y 1290

const LEAF = { x: 90, y: 130, w: 900, h: 700 };

// Fracture path (LEAF-local coordinates). Jagged tear across the page,
// hinged around y ≈ 380. Endpoints extend past the leaf so the tear
// cleanly separates the sheet edge-to-edge.
type Pt = [number, number];
const FRACTURE_PTS: Pt[] = [
  [-60, 358],
  [50, 375],
  [130, 340],
  [210, 380],
  [295, 348],
  [370, 400],
  [455, 372],
  [530, 415],
  [605, 388],
  [680, 428],
  [755, 396],
  [830, 434],
  [960, 410],
];

// Densely sampled fracture curve (Catmull-Rom-ish smoothing), used both
// for the visible tear and to build the clip paths for each half.
const denseFracture = (samples = 220): Pt[] => {
  const pts = FRACTURE_PTS;
  const out: Pt[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const seg = t * (pts.length - 1);
    const s = Math.floor(seg);
    const f = seg - s;
    const p0 = pts[Math.max(0, s - 1)];
    const p1 = pts[s];
    const p2 = pts[Math.min(pts.length - 1, s + 1)];
    const p3 = pts[Math.min(pts.length - 1, s + 2)];
    // Catmull-Rom → cubic Hermite
    const t2 = f * f;
    const t3 = t2 * f;
    const cx =
      0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * f +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
    const cy =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * f +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    out.push([cx, cy]);
  }
  return out;
};

const polylinePath = (pts: Pt[]): string => {
  if (pts.length === 0) return "";
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  return d;
};

const DENSE = denseFracture(220);

// Deterministic hash for stable colony scatter.
const hash01 = (i: number, salt: number): number => {
  let h = (i * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// Text lines to render as the manuscript body (iron-gall Latin filler).
const MANUSCRIPT_LINES: string[] = [
  "In principio erat verbum, et verbum",
  "erat apud Deum, et Deus erat verbum.",
  "Hoc erat in principio apud Deum.",
  "Omnia per ipsum facta sunt: et sine",
  "ipso factum est nihil, quod factum",
  "est. In ipso vita erat, et vita erat",
  "lux hominum: et lux in tenebris",
  "lucet, et tenebrae eam non compre-",
  "henderunt. Fuit homo missus a Deo,",
  "cui nomen erat Ioannes. Hic venit",
  "in testimonium ut testimonium",
  "perhiberet de lumine, ut omnes",
  "crederent per illum. Non erat ille",
  "lux, sed ut testimonium perhiberet",
  "de lumine. Erat lux vera, quae",
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Master reassembly progress (0..1), spring-eased. Slow so the mid-
  // motion holds long enough to be the hero frame.
  const reassemble = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 42, mass: 2.4, stiffness: 45 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 0.9, fps * 1.6],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const metaOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Halves drift apart, then close as reassemble → 1.
  const gap = interpolate(reassemble, [0, 1], [22, 0]);
  const rot = interpolate(reassemble, [0, 1], [1.2, 0]);

  // Colony bloom fades in during middle of reassembly.
  const bloomProgress = spring({
    frame: frame - fps * 0.6,
    fps,
    config: { damping: 50, mass: 1.8, stiffness: 40 },
  });
  const bloomFade = interpolate(reassemble, [0.82, 1.0], [1, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ambient breathing on the healed seam after closure.
  const loopPhase = (frame % (fps * 4)) / (fps * 4);
  const sealBreath = 0.5 + 0.5 * Math.sin(loopPhase * Math.PI * 2);

  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Colony scatter along the fracture.
  const colonyDots = React.useMemo(() => {
    const N = 170;
    const seeds: {
      x: number;
      y: number;
      r: number;
      delay: number;
      fill: string;
    }[] = [];
    for (let i = 0; i < N; i++) {
      const along = i / (N - 1);
      const idx = Math.floor(along * (DENSE.length - 1));
      const base = DENSE[idx];
      const r1 = hash01(i, 7);
      const r2 = hash01(i, 13);
      const r3 = hash01(i, 29);
      const r4 = hash01(i, 41);
      const r5 = hash01(i, 53);
      const spread = 18;
      const dx = (r1 - 0.5) * spread * 1.6;
      const dy = (r2 - 0.5) * spread * 1.15;
      const radius = 1.6 + r3 * 3.6;
      const delay = 0.05 + along * 0.5 + r4 * 0.1;
      const isDeep = r5 < 0.28;
      seeds.push({
        x: base[0] + dx,
        y: base[1] + dy,
        r: radius,
        delay,
        fill: isDeep ? CARMINE : SALMON,
      });
    }
    return seeds;
  }, []);

  // Build clip paths for the two halves from the dense polyline.
  const topClipPath = React.useMemo(() => {
    const rev = [...DENSE].reverse();
    const first = DENSE[0];
    const last = DENSE[DENSE.length - 1];
    return (
      `M -60 -60 L ${LEAF.w + 60} -60 ` +
      `L ${LEAF.w + 60} ${last[1].toFixed(2)} ` +
      rev
        .map((p) => `L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
        .join(" ") +
      ` L -60 ${first[1].toFixed(2)} Z`
    );
  }, []);

  const bottomClipPath = React.useMemo(() => {
    const first = DENSE[0];
    const last = DENSE[DENSE.length - 1];
    return (
      `M -60 ${first[1].toFixed(2)} ` +
      DENSE
        .map((p) => `L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
        .join(" ") +
      ` L ${LEAF.w + 60} ${last[1].toFixed(2)} ` +
      `L ${LEAF.w + 60} ${LEAF.h + 60} L -60 ${LEAF.h + 60} Z`
    );
  }, []);

  const fracturePathD = polylinePath(DENSE);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: INK_DEEP,
        fontFamily: inter,
        opacity: fadeIn,
      }}
    >
      <style>{fontCss}</style>

      {/* ── The restoration table SVG (art region only) ──────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Parchment surface */}
          <linearGradient id="parchment" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={PARCHMENT_HI} />
            <stop offset="55%" stopColor={PARCHMENT} />
            <stop offset="100%" stopColor={PARCHMENT_LO} />
          </linearGradient>

          {/* Leaf vignette */}
          <radialGradient id="leaf-vignette" cx="50%" cy="45%" r="72%">
            <stop offset="0%" stopColor="#000" stopOpacity={0} />
            <stop offset="70%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.32} />
          </radialGradient>

          {/* Foxing spot */}
          <radialGradient id="fox-spot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8A5A2C" stopOpacity={0.38} />
            <stop offset="100%" stopColor="#8A5A2C" stopOpacity={0} />
          </radialGradient>

          {/* Salmon colony halo */}
          <radialGradient id="colony-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SALMON} stopOpacity={0.55} />
            <stop offset="100%" stopColor={SALMON} stopOpacity={0} />
          </radialGradient>

          {/* Fracture illumination — light peeking from under the tear */}
          <radialGradient id="fracture-glow-rg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FRACTURE_GLOW} stopOpacity={0.85} />
            <stop offset="100%" stopColor={FRACTURE_GLOW} stopOpacity={0} />
          </radialGradient>

          {/* Warm ambient behind leaf */}
          <radialGradient id="table-warm" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#1E170F" stopOpacity={1} />
            <stop offset="100%" stopColor={INK_DEEP} stopOpacity={1} />
          </radialGradient>

          {/* Clip paths — top and bottom halves of the torn leaf */}
          <clipPath id="clip-top" clipPathUnits="userSpaceOnUse">
            <path d={topClipPath} />
          </clipPath>
          <clipPath id="clip-bottom" clipPathUnits="userSpaceOnUse">
            <path d={bottomClipPath} />
          </clipPath>

          {/* Leaf drop shadow */}
          <filter
            id="leaf-shadow"
            x="-10%"
            y="-10%"
            width="120%"
            height="130%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
            <feOffset dx="0" dy="16" result="off" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Backdrop */}
        <rect
          x={LEAF.x - 60}
          y={LEAF.y - 60}
          width={LEAF.w + 120}
          height={LEAF.h + 120}
          fill="url(#table-warm)"
        />

        {/* Leaf group */}
        <g
          transform={`translate(${LEAF.x}, ${LEAF.y})`}
          filter="url(#leaf-shadow)"
        >
          {/* Warm glow under the tear (drawn first so both halves overlap it) */}
          <g opacity={interpolate(reassemble, [0, 0.9], [1, 0])}>
            {DENSE.filter((_, i) => i % 8 === 0).map((p, i) => (
              <circle
                key={`fg-${i}`}
                cx={p[0]}
                cy={p[1]}
                r={gap * 1.6 + 8}
                fill="url(#fracture-glow-rg)"
              />
            ))}
          </g>

          {/* ── TOP HALF ─────────────────────────────────────────── */}
          <g
            transform={`translate(0, ${-gap}) rotate(${-rot} ${LEAF.w / 2} ${
              DENSE[0][1]
            })`}
          >
            <g clipPath="url(#clip-top)">
              <LeafFace
                w={LEAF.w}
                h={LEAF.h}
                showHead
                lines={MANUSCRIPT_LINES.slice(0, 7)}
                lineOffset={0}
              />
              {/* Torn edge — dark line following the fracture */}
              <path
                d={fracturePathD}
                stroke={INK}
                strokeWidth={1.1}
                fill="none"
                opacity={0.4}
              />
            </g>
          </g>

          {/* ── BOTTOM HALF ──────────────────────────────────────── */}
          <g
            transform={`translate(0, ${gap}) rotate(${rot} ${LEAF.w / 2} ${
              DENSE[0][1]
            })`}
          >
            <g clipPath="url(#clip-bottom)">
              <LeafFace
                w={LEAF.w}
                h={LEAF.h}
                showFoot
                lines={MANUSCRIPT_LINES.slice(7)}
                lineOffset={7}
              />
              {/* Torn edge */}
              <path
                d={fracturePathD}
                stroke={INK}
                strokeWidth={1.1}
                fill="none"
                opacity={0.4}
              />
            </g>
          </g>

          {/* Colony bloom along fracture (unaffected by half transforms) */}
          <g>
            {colonyDots.map((d, i) => {
              const local = Math.max(
                0,
                Math.min(1, (bloomProgress - d.delay) * 2.4),
              );
              const grow = local * bloomFade;
              if (grow <= 0.01) return null;
              return (
                <g key={i} opacity={Math.min(1, grow)}>
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r={d.r * 3.4}
                    fill="url(#colony-glow)"
                  />
                  <circle cx={d.x} cy={d.y} r={d.r} fill={d.fill} />
                </g>
              );
            })}
          </g>

          {/* Healed seam glimmer — after reassemble ≈ 1 */}
          <g
            opacity={interpolate(
              reassemble,
              [0.85, 1.0],
              [0, 0.5 + sealBreath * 0.3],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )}
          >
            <path
              d={fracturePathD}
              stroke={SALMON}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              opacity={0.85}
            />
            <path
              d={fracturePathD}
              stroke={FRACTURE_GLOW}
              strokeWidth={0.8}
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Leaf edge vignette on top */}
          <rect
            x={0}
            y={0}
            width={LEAF.w}
            height={LEAF.h}
            fill="url(#leaf-vignette)"
            pointerEvents="none"
          />
        </g>

        {/* Caption strip below the leaf */}
        <g
          transform={`translate(${LEAF.x}, ${LEAF.y + LEAF.h + 22})`}
          fill={MUTE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={metaOpacity}
        >
          <text>FIG. 1 · SHATTERED GENOME REASSEMBLED VIA ESDSA · ≈3 H</text>
          <text
            x={LEAF.w}
            textAnchor="end"
            fill={SALMON}
            opacity={0.9}
          >
            COLONY BLOOM = DEINOXANTHIN
          </text>
        </g>
      </svg>

      {/* ── Top metadata band (HTML, above the SVG) ───────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 62,
          left: 90,
          right: 90,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTE,
          fontFamily: inter,
          fontSize: 12,
          letterSpacing: 5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: SALMON }}>2026 · 07 · 19</span>
      </div>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 908,
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
            color: SALMON,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: MUTE, margin: "0 4px" }}>/</span>
          <span style={{ color: PARCHMENT, letterSpacing: 5 }}>
            Manuscript Restorer
          </span>
        </div>

        <div
          style={{
            color: PARCHMENT,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 72,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The archivist
          <br />
          of its own genome.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#D5C89F",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A dose of{" "}
          <span style={{ color: SALMON, fontWeight: 600 }}>~5,000 Gy</span>{" "}
          shatters the genome of{" "}
          <span style={{ color: SALMON, fontWeight: 600 }}>
            Deinococcus radiodurans
          </span>{" "}
          into hundreds of double-strand fragments — which it stitches back
          into a whole chromosome in about three hours via extended
          synthesis-dependent strand annealing.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: MUTE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Zahradka et al. · Nature 443 (2006) 569–573</span>
        <span>
          <span style={{ color: SALMON }}>●</span> Colony = ESDSA overlap
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── Leaf face — parchment + iron-gall body text ───────────────────────────
const LeafFace: React.FC<{
  w: number;
  h: number;
  lines: string[];
  lineOffset: number;
  showHead?: boolean;
  showFoot?: boolean;
}> = ({ w, h, lines, lineOffset, showHead, showFoot }) => {
  const marginX = 74;
  const marginY = 88;
  const lineH = 40;
  const bodyFontSize = 22;

  return (
    <g>
      {/* Parchment */}
      <rect x={0} y={0} width={w} height={h} fill="url(#parchment)" rx={2} />

      {/* Foxing */}
      {[
        [120, 90, 34],
        [720, 170, 42],
        [640, 620, 30],
        [180, 560, 38],
        [500, 420, 24],
        [820, 320, 28],
        [420, 640, 30],
      ].map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x as number}
          cy={y as number}
          r={r as number}
          fill="url(#fox-spot)"
        />
      ))}

      {/* Gilt margin rules */}
      <rect
        x={marginX - 22}
        y={marginY - 40}
        width={w - (marginX - 22) * 2}
        height={h - (marginY - 40) * 2 + 60}
        fill="none"
        stroke={VELLUM}
        strokeWidth={0.7}
        opacity={0.55}
      />
      <rect
        x={marginX - 14}
        y={marginY - 32}
        width={w - (marginX - 14) * 2}
        height={h - (marginY - 32) * 2 + 44}
        fill="none"
        stroke={VELLUM}
        strokeWidth={0.35}
        opacity={0.35}
      />

      {/* Head marker */}
      {showHead && (
        <>
          <text
            x={marginX}
            y={marginY - 32}
            fontFamily={inter}
            fontSize={10.5}
            fontWeight={600}
            letterSpacing={4}
            fill={MUTE}
          >
            FOL. XVII · v
          </text>
          {/* Illuminated drop-cap "I" */}
          <g transform={`translate(${marginX}, ${marginY - 6})`}>
            <rect
              x={0}
              y={0}
              width={52}
              height={52}
              fill={CARMINE}
              opacity={0.92}
              rx={2}
            />
            <rect
              x={2}
              y={2}
              width={48}
              height={48}
              fill="none"
              stroke={VELLUM}
              strokeWidth={0.8}
              opacity={0.7}
              rx={1}
            />
            <text
              x={26}
              y={40}
              textAnchor="middle"
              fontFamily={playfair}
              fontStyle="italic"
              fontWeight={500}
              fontSize={42}
              fill={PARCHMENT_HI}
            >
              I
            </text>
          </g>
        </>
      )}

      {/* Iron-gall body text */}
      {lines.map((line, i) => {
        const y = marginY + (lineOffset + i) * lineH + 20;
        const indent = showHead && i === 0 ? 70 : 0;
        return (
          <text
            key={i}
            x={marginX + indent}
            y={y}
            fontFamily={playfair}
            fontSize={bodyFontSize}
            fill={INK}
            opacity={0.9}
          >
            {line}
          </text>
        );
      })}

      {/* Foot marker */}
      {showFoot && (
        <text
          x={w / 2}
          y={h - marginY + 34}
          textAnchor="middle"
          fontFamily={inter}
          fontSize={10.5}
          letterSpacing={4}
          fontWeight={600}
          fill={MUTE}
        >
          · XVII ·
        </text>
      )}
    </g>
  );
};
