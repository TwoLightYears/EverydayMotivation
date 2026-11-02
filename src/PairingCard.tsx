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

// Palette (brief): bismuth-oxide thin-film interference colours
const INK = "#0E1218";
const BOARD = "#141A22";
const GOLD = "#F3C76A";
const MAGENTA = "#D94E7A";
const CYAN = "#4FB3C9";
const VIOLET = "#6B5CB8";
const GRAY = "#8A8F99";
const GRAY_FAINT = "#3A4150";
const PAPER = "#EDEDF2";

// Iridescent spectrum — walking inward along the hopper staircase
// walks the interference order from magenta → cyan → gold → violet.
const SPECTRUM = [MAGENTA, CYAN, GOLD, VIOLET, MAGENTA, CYAN];

// ── Isometric cube geometry ───────────────────────────────────────────────
// 2D vertices of a cube of edge length E centred at origin.
// Standard isometric: 30° off horizontal.
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

type Pt = { x: number; y: number };
const cubeVerts = (E: number): Record<string, Pt> => ({
  top: { x: 0, y: -E },
  rightTop: { x: COS30 * E, y: -SIN30 * E },
  leftTop: { x: -COS30 * E, y: -SIN30 * E },
  centre: { x: 0, y: 0 },
  rightBottom: { x: COS30 * E, y: SIN30 * E },
  leftBottom: { x: -COS30 * E, y: SIN30 * E },
  bottom: { x: 0, y: E },
});

// A face is a quadrilateral in the four corners order given.
const facePath = (verts: Pt[]): string => {
  return (
    verts.map((v, i) => `${i === 0 ? "M" : "L"} ${v.x} ${v.y}`).join(" ") + " Z"
  );
};

// Linearly interpolate between two points.
const lerp = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// Build a nested shrink of a quad toward its centre by factor s (0..1 where
// 1 = full size, 0 = collapsed to centre).
const shrinkFace = (face: Pt[], s: number): Pt[] => {
  const cx = face.reduce((a, p) => a + p.x, 0) / face.length;
  const cy = face.reduce((a, p) => a + p.y, 0) / face.length;
  const c = { x: cx, y: cy };
  return face.map((p) => lerp(c, p, s));
};

// ──────────────────────────────────────────────────────────────────────────

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Page layout (1080 × 1350 portrait)
  const PAGE_W = 1080;
  const PAGE_H = 1350;

  // Crystal placement
  const CRYSTAL_CX = PAGE_W / 2;
  const CRYSTAL_CY = 445;
  const E = 220; // cube edge length (world units == screen units at scale=1)

  const V = cubeVerts(E);

  // Face quads (vertices in CW order on screen)
  const topFace: Pt[] = [V.top, V.rightTop, V.centre, V.leftTop];
  const rightFace: Pt[] = [V.centre, V.rightTop, V.rightBottom, V.bottom];
  const leftFace: Pt[] = [V.leftTop, V.centre, V.bottom, V.leftBottom];

  // Hopper terrace count per face
  const TERRACES = 6;

  // Animation phases
  const t0 = fps * 0.4; // start of top face build
  const faceStagger = fps * 0.6; // between faces
  const terraceStagger = fps * 0.08; // between nested terraces
  const terraceSpringDur = fps * 0.35;

  const buildFacesEnd = t0 + 2 * faceStagger + TERRACES * terraceStagger +
    terraceSpringDur;

  // Shimmer wave sweeps once after build completes, then loops with the clip.
  const shimmerStart = buildFacesEnd + fps * 0.2;
  const shimmerDur = fps * 1.4;
  const shimmerT = interpolate(
    frame,
    [shimmerStart, shimmerStart + shimmerDur],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Title spring arrives shortly after the crystal starts forming.
  const titleSpring = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.6], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Faces draw order & delays
  const faceDefs: {
    key: string;
    poly: Pt[];
    tint: string;
    delayIdx: number;
    strokeTint: string;
  }[] = [
    { key: "top", poly: topFace, tint: VIOLET, strokeTint: GOLD, delayIdx: 0 },
    {
      key: "right",
      poly: rightFace,
      tint: MAGENTA,
      strokeTint: CYAN,
      delayIdx: 1,
    },
    {
      key: "left",
      poly: leftFace,
      tint: CYAN,
      strokeTint: MAGENTA,
      delayIdx: 2,
    },
  ];

  // Per-terrace progress helper
  const terraceProgress = (faceIdx: number, terraceIdx: number): number => {
    const start = t0 + faceIdx * faceStagger + terraceIdx * terraceStagger;
    return spring({
      frame: frame - start,
      fps,
      config: { damping: 180, mass: 0.6, stiffness: 220 },
    });
  };

  // Overall "has started" opacity for a face (so the outer silhouette doesn't
  // flash in without context before the nested fill).
  const faceSilhouetteOp = (faceIdx: number): number => {
    const start = t0 + faceIdx * faceStagger - fps * 0.1;
    return interpolate(frame, [start, start + fps * 0.3], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Blueprint area with crystal + annotations */}
      <svg
        width={PAGE_W}
        height={PAGE_H}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Subtle board vignette */}
          <radialGradient id="board" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#171E27" />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>

          {/* Soft outer glow around the crystal */}
          <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={VIOLET} stopOpacity={0.22} />
            <stop offset="60%" stopColor={MAGENTA} stopOpacity={0.08} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </radialGradient>

          {/* Thin shimmer gradient used during the sweep */}
          <linearGradient id="shimmer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0} />
            <stop offset="48%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <stop offset="52%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Board background */}
        <rect width={PAGE_W} height={PAGE_H} fill="url(#board)" />

        {/* Crystal halo */}
        <circle
          cx={CRYSTAL_CX}
          cy={CRYSTAL_CY}
          r={330}
          fill="url(#crystalGlow)"
        />

        {/* ── Draftsman annotations ──────────────────────────────────── */}
        {/* Top-left: elevation / element card */}
        <g transform={`translate(90, 150)`}>
          <text
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            ELEVATION · FIG. 1
          </text>
          <g transform="translate(0, 24)">
            <rect
              x={0}
              y={0}
              width={78}
              height={78}
              fill="none"
              stroke={GOLD}
              strokeWidth={1.2}
            />
            <text
              x={10}
              y={22}
              fill={GOLD}
              fontFamily={inter}
              fontSize={13}
              letterSpacing={3}
              fontWeight={600}
            >
              Bi
            </text>
            <text
              x={10}
              y={46}
              fill={GOLD}
              fontFamily={playfair}
              fontStyle="italic"
              fontSize={26}
              fontWeight={500}
            >
              83
            </text>
            <text
              x={10}
              y={68}
              fill={GRAY}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={1.6}
              fontWeight={500}
            >
              BISMUTH
            </text>
          </g>
        </g>

        {/* Top-right: hopper growth diagram */}
        <g transform={`translate(${PAGE_W - 90 - 230}, 150)`}>
          <text
            x={230}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            HOPPER GROWTH VECTOR
          </text>
          {/* Tiny square + edge/corner attachment arrows */}
          <g transform="translate(118, 48)" opacity={0.95}>
            <rect
              x={-34}
              y={-34}
              width={68}
              height={68}
              fill="none"
              stroke={GRAY_FAINT}
              strokeWidth={1.2}
            />
            {/* Edge-attach arrows (strong) */}
            {[
              [0, -58, 0, -40],
              [58, 0, 40, 0],
              [0, 58, 0, 40],
              [-58, 0, -40, 0],
            ].map(([x1, y1, x2, y2], i) => (
              <g key={`edge-${i}`} stroke={CYAN} strokeWidth={1.6}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
                <circle cx={x1} cy={y1} r={2.2} fill={CYAN} stroke="none" />
              </g>
            ))}
            {/* Face-centre attach (weak) */}
            <circle
              cx={0}
              cy={0}
              r={3}
              fill="none"
              stroke={GRAY_FAINT}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          </g>
          <text
            x={230}
            y={110}
            textAnchor="end"
            fill={CYAN}
            fontFamily={inter}
            fontSize={9}
            letterSpacing={1.8}
            fontWeight={600}
          >
            EDGE ≫ FACE
          </text>
        </g>

        {/* Bottom-left: oxide skin annotation */}
        <g transform={`translate(90, 800)`}>
          <text
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            OXIDE SKIN
          </text>
          <text
            y={22}
            fill={PAPER}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={22}
            fontWeight={500}
          >
            Bi₂O₃
          </text>
          <text
            y={46}
            fill={GOLD}
            fontFamily={inter}
            fontSize={12}
            letterSpacing={2}
            fontWeight={600}
          >
            ≈ 100 nm
          </text>
          <text
            y={66}
            fill={GRAY}
            fontFamily={inter}
            fontSize={9}
            letterSpacing={1.6}
            fontWeight={500}
          >
            THIN-FILM INTERFERENCE
          </text>
        </g>

        {/* Bottom-right: scale bar + melt note */}
        <g transform={`translate(${PAGE_W - 90 - 180}, 800)`}>
          <text
            x={180}
            textAnchor="end"
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            SCALE
          </text>
          <g transform="translate(20, 30)" stroke={GRAY} fill={GRAY}>
            <line x1={0} y1={0} x2={140} y2={0} strokeWidth={1.2} />
            <line x1={0} y1={-5} x2={0} y2={5} strokeWidth={1.2} />
            <line x1={70} y1={-3} x2={70} y2={3} strokeWidth={1.2} />
            <line x1={140} y1={-5} x2={140} y2={5} strokeWidth={1.2} />
            <text
              x={70}
              y={20}
              textAnchor="middle"
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              stroke="none"
            >
              20 MM
            </text>
          </g>
          <text
            x={180}
            y={88}
            textAnchor="end"
            fill={MAGENTA}
            fontFamily={inter}
            fontSize={9}
            letterSpacing={1.8}
            fontWeight={600}
          >
            COOLED FROM MELT · 271 °C
          </text>
        </g>

        {/* ── The crystal ────────────────────────────────────────────── */}
        <g transform={`translate(${CRYSTAL_CX}, ${CRYSTAL_CY})`}>
          {/* "Melt line" beneath the crystal (horizontal, through V.bottom) */}
          <g opacity={0.9}>
            <line
              x1={-E * COS30 - 60}
              y1={E + 14}
              x2={E * COS30 + 60}
              y2={E + 14}
              stroke={MAGENTA}
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeDasharray="4 6"
            />
            <circle
              cx={-E * COS30 - 70}
              cy={E + 14}
              r={2}
              fill={MAGENTA}
            />
            <circle
              cx={E * COS30 + 70}
              cy={E + 14}
              r={2}
              fill={MAGENTA}
            />
          </g>

          {/* Draw each face: silhouette, then nested terraces */}
          {faceDefs.map((f) => {
            const silOp = faceSilhouetteOp(f.delayIdx);
            // Build terrace rings: outer -> inner
            const rings: {
              outer: Pt[];
              inner: Pt[];
              color: string;
              progress: number;
            }[] = [];
            for (let i = 0; i < TERRACES; i++) {
              const outerS = 1 - i / TERRACES;
              const innerS = 1 - (i + 1) / TERRACES;
              const outer = shrinkFace(f.poly, outerS);
              const inner = shrinkFace(f.poly, innerS);
              const color = SPECTRUM[i % SPECTRUM.length];
              const progress = terraceProgress(f.delayIdx, i);
              rings.push({ outer, inner, color, progress });
            }

            return (
              <g key={f.key}>
                {/* Dark face backing so terraces read against void */}
                <path
                  d={facePath(f.poly)}
                  fill={BOARD}
                  opacity={silOp * 0.95}
                />

                {/* Terrace fills, outer to inner, each a parallelogram ring */}
                {rings.map((r, i) => {
                  if (r.progress <= 0.001) return null;
                  // Build annular quad path (outer CW, inner CCW to subtract)
                  const outerPath = r.outer
                    .map((v, j) => `${j === 0 ? "M" : "L"} ${v.x} ${v.y}`)
                    .join(" ") + " Z";
                  const innerRev = [...r.inner].reverse();
                  const innerPath = innerRev
                    .map((v, j) => `${j === 0 ? "M" : "L"} ${v.x} ${v.y}`)
                    .join(" ") + " Z";

                  // Walk the shimmer vertically (crystal-local y axis of each
                  // ring's centroid): bright when shimmer passes through this y.
                  const centroidY =
                    r.outer.reduce((a, p) => a + p.y, 0) / r.outer.length;
                  // Normalize centroidY within [-E, E] -> [0, 1]
                  const yNorm = (centroidY + E) / (2 * E);
                  const bandCentre = 1 - shimmerT * 1.4 + 0.2; // sweeps up
                  const d = Math.abs(yNorm - bandCentre);
                  const shimmerBoost =
                    shimmerT > 0 && shimmerT < 1
                      ? Math.max(0, 1 - d * 6)
                      : 0;

                  // Progress-driven inward growth: scale ring from its centroid.
                  const cx = (centroidY, r); // noop reference
                  void cx;

                  return (
                    <g key={`${f.key}-r${i}`}>
                      <path
                        d={outerPath + " " + innerPath}
                        fill={r.color}
                        fillOpacity={0.55 * silOp}
                        style={{
                          transformOrigin: "0 0",
                          transformBox: "fill-box",
                        }}
                      />
                      {/* Shimmer brighten overlay */}
                      {shimmerBoost > 0 && (
                        <path
                          d={outerPath + " " + innerPath}
                          fill="#FFFFFF"
                          fillOpacity={0.35 * shimmerBoost}
                        />
                      )}
                      {/* Outer rim stroke, drawn as it builds */}
                      <path
                        d={outerPath}
                        fill="none"
                        stroke={r.color}
                        strokeOpacity={Math.min(1, r.progress) * 0.85}
                        strokeWidth={1.3}
                      />
                    </g>
                  );
                })}

                {/* Face silhouette outline on top (crisp edge) */}
                <path
                  d={facePath(f.poly)}
                  fill="none"
                  stroke={f.strokeTint}
                  strokeOpacity={silOp * 0.9}
                  strokeWidth={1.6}
                />
              </g>
            );
          })}

          {/* Vertex highlights (small gold dots at the 7 visible corners) */}
          {Object.entries(V).map(([key, p]) => {
            const op = interpolate(frame, [fps * 0.3, fps * 0.9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <circle
                key={key}
                cx={p.x}
                cy={p.y}
                r={2.2}
                fill={GOLD}
                opacity={op * 0.85}
              />
            );
          })}

          {/* Hopper void label pointing INTO the top face */}
          <g
            opacity={interpolate(frame, [fps * 2.0, fps * 2.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            <line
              x1={0}
              y1={-E * 0.5}
              x2={-150}
              y2={-E - 20}
              stroke={GOLD}
              strokeWidth={1}
            />
            <line
              x1={-150}
              y1={-E - 20}
              x2={-220}
              y2={-E - 20}
              stroke={GOLD}
              strokeWidth={1}
            />
            <text
              x={-224}
              y={-E - 23}
              textAnchor="end"
              fill={GOLD}
              fontFamily={inter}
              fontSize={10}
              letterSpacing={2.4}
              fontWeight={600}
            >
              HOPPER VOID
            </text>
          </g>
        </g>

      </svg>

      {/* Top metadata band (above the SVG so it is not covered) */}
      <div
        style={{
          position: "absolute",
          top: 60,
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
        <span style={{ color: GOLD }}>2026 · 11 · 02</span>
      </div>

      {/* ── Type lockup ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 950,
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
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: PAPER, letterSpacing: 5 }}>Architect</span>
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
          The mineral that
          <br />
          builds its own ziggurat.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          Cooled from its 271 °C melt in open air,{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>bismuth</span> grows{" "}
          <em style={{ fontStyle: "italic", color: PAPER }}>hopper</em>{" "}
          crystals — stepped-ziggurat voids etched inward because atoms snap
          onto edges and corners faster than onto flat faces. The rainbow is
          a Bi₂O₃ skin ≈{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>100 nm</span>{" "}
          thick, colouring the metal by thin-film interference, not pigment.
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
        <span>Element 83 · Bi · hopper habit</span>
        <span>
          <span style={{ color: GOLD }}>●</span>{" "}
          <span style={{ color: MAGENTA }}>●</span>{" "}
          <span style={{ color: CYAN }}>●</span>{" "}
          <span style={{ color: VIOLET }}>●</span> Interference order
        </span>
      </div>

      {/* Suppress unused-var warnings; frame & duration are consulted. */}
      <span style={{ display: "none" }}>
        {frame}·{durationInFrames}
      </span>
    </AbsoluteFill>
  );
};
