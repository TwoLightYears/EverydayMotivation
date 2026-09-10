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

// Palette — bound to the concept's visual brief
const INK = "#0F0A07";
const HEART = "#7B4E29";
const SAP = "#C69763";
const PAPER = "#EFE0B8";
const SILVER = "#8A8478";

// Derived working tones
const SUBSTRATE_HI = "#171009";
const HAIR = "#26190F";
const LEDGER = "#3A2A1B";
const GRAY_META = "#726A5F";

// Geometry
const CX = 540;
const CY = 470;
const R_INNER = 5;
const R_OUTER = 328;
const RING_COUNT = 220;

// Life span math: germinated ~2832 BCE, present 2026 CE => 4858 years.
const BIRTH_BCE = 2832;
const NOW_CE = 2026;
const LIFESPAN = BIRTH_BCE + NOW_CE; // 4858

const yearToR = (year: number): number => {
  // year is a CE integer; BCE is negative (e.g., 2832 BCE = -2832)
  const yearsSinceBirth = year - -BIRTH_BCE; // year + 2832
  const t = yearsSinceBirth / LIFESPAN;
  return R_INNER + t * (R_OUTER - R_INNER);
};

type Ring = {
  i: number;
  r: number;
  color: string;
  isLate: boolean;
  wobble: number;
};

// Deterministic pseudo-random [0, 1) from an integer seed
const rand = (seed: number): number => {
  let x = seed * 2654435761;
  x = (x ^ (x >>> 13)) >>> 0;
  x = (x * 1274126177) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x >>> 0) / 4294967295;
};

// Build ring radii with organic irregular widths (drought years are thinner)
const buildRingRadii = (count: number): number[] => {
  const widths: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    // Long-period climate trend (wet / dry epochs) plus micro variation
    const climate =
      0.6 +
      0.4 * Math.sin(i * 0.041 + 1.1) +
      0.25 * Math.sin(i * 0.017 - 0.3);
    const micro = 0.55 + 0.9 * rand(i * 13 + 7);
    // Outer rings a little wider than inner ones (young tree grew faster)
    const growth = 0.8 + 0.5 * t;
    const w = Math.max(0.35, climate * micro * growth);
    widths.push(w);
  }
  const total = widths.reduce((a, b) => a + b, 0);
  const span = R_OUTER - R_INNER;
  const radii: number[] = [];
  let acc = R_INNER;
  for (const w of widths) {
    acc += (w / total) * span;
    radii.push(acc);
  }
  return radii;
};

const RING_RADII = buildRingRadii(RING_COUNT);

const RINGS: Ring[] = RING_RADII.map((r, i) => {
  const t = i / (RING_COUNT - 1);
  const localNoise =
    rand(i * 91 + 3) * 0.55 +
    Math.sin(i * 0.13 + 0.7) * 0.15;
  // Interpolate heartwood → sapwood along radius
  const heart = { r: 0x7b, g: 0x4e, b: 0x29 };
  const sap = { r: 0xc6, g: 0x97, b: 0x63 };
  const mixT = Math.min(1, Math.max(0, t + (localNoise - 0.35) * 0.12));
  const rr = Math.round(heart.r + (sap.r - heart.r) * mixT);
  const gg = Math.round(heart.g + (sap.g - heart.g) * mixT);
  const bb = Math.round(heart.b + (sap.b - heart.b) * mixT);
  // Occasional latewood band — sparse and irregular, not periodic
  const isLate = rand(i * 271 + 11) > 0.86;
  const dark = isLate ? 0.55 : 0.94 + localNoise * 0.12;
  const color = `rgb(${Math.round(rr * dark)}, ${Math.round(gg * dark)}, ${Math.round(bb * dark)})`;
  const wobble = (rand(i * 401 + 5) - 0.5) * 3.2;
  return { i, r, color, isLate, wobble };
});

type Annotation = {
  key: string;
  year: number;
  yearLabel: string;
  event: string;
  angleDeg: number;
  pod: { x: number; y: number };
  labelAnchor: "start" | "end";
};

// Angles in SVG convention: 0° = +x, 90° = +y (down).
const ANNOTS: Annotation[] = [
  {
    key: "pith",
    year: -BIRTH_BCE, // -2832 CE
    yearLabel: "2832 BCE",
    event: "PITH · GERMINATION",
    angleDeg: 235,
    pod: { x: 92, y: 720 },
    labelAnchor: "start",
  },
  {
    key: "olympiad",
    year: -776,
    yearLabel: "776 BCE",
    event: "FIRST OLYMPIAD",
    angleDeg: 208,
    pod: { x: 92, y: 240 },
    labelAnchor: "start",
  },
  {
    key: "magna",
    year: 1215,
    yearLabel: "1215 CE",
    event: "MAGNA CARTA",
    angleDeg: 335,
    pod: { x: 988, y: 240 },
    labelAnchor: "end",
  },
  {
    key: "methuselah",
    year: 1957,
    yearLabel: "1957 CE",
    event: "CORED · NAMED METHUSELAH",
    angleDeg: 42,
    pod: { x: 988, y: 720 },
    labelAnchor: "end",
  },
];

const deg2rad = (d: number) => (d * Math.PI) / 180;

const anchorPoint = (a: Annotation) => {
  const r = Math.max(4, yearToR(a.year));
  return {
    x: CX + r * Math.cos(deg2rad(a.angleDeg)),
    y: CY + r * Math.sin(deg2rad(a.angleDeg)),
  };
};

// A short SOLID notch stays on the wood; the DASHED leader lives outside.
const leaderInner = (a: Annotation): string => {
  const p = anchorPoint(a);
  const outR = R_OUTER + 2;
  const exit = {
    x: CX + outR * Math.cos(deg2rad(a.angleDeg)),
    y: CY + outR * Math.sin(deg2rad(a.angleDeg)),
  };
  return `M ${p.x} ${p.y} L ${exit.x} ${exit.y}`;
};

const leaderOuter = (a: Annotation): string => {
  const startR = R_OUTER + 4;
  const bendR = R_OUTER + 26;
  const start = {
    x: CX + startR * Math.cos(deg2rad(a.angleDeg)),
    y: CY + startR * Math.sin(deg2rad(a.angleDeg)),
  };
  const bend = {
    x: CX + bendR * Math.cos(deg2rad(a.angleDeg)),
    y: CY + bendR * Math.sin(deg2rad(a.angleDeg)),
  };
  const endX = a.labelAnchor === "start" ? a.pod.x - 4 : a.pod.x + 4;
  const endY = a.pod.y - 14;
  return `M ${start.x} ${start.y} L ${bend.x} ${bend.y} L ${endX} ${endY}`;
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Reveal timeline ─────────────────────────────────────────────────
  const growStart = 8;
  const growEnd = fps * 2.6;
  const revealR = interpolate(frame, [growStart, growEnd], [0, R_OUTER + 6], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleSpring = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(
    frame,
    [fps * 2.0, fps * 2.8],
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

  // Slow pulse of the outermost ring after reveal completes
  const donePhase = Math.max(0, frame - growEnd) / fps;
  const pulse = 0.5 + 0.5 * Math.sin(donePhase * 1.6);
  const barkPulse = 0.35 + 0.35 * pulse;

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
          color: GRAY_META,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: SAP }}>2026 · 09 · 10</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Reveal mask: growing circle from pith outward */}
          <mask id="reveal-mask">
            <rect x={0} y={0} width={1080} height={1350} fill="black" />
            <circle cx={CX} cy={CY} r={revealR} fill="white" />
          </mask>

          {/* Subtle vignette over the ring disc */}
          <radialGradient id="disc-vignette" cx="50%" cy="45%" r="65%">
            <stop offset="60%" stopColor={INK} stopOpacity={0} />
            <stop offset="100%" stopColor={INK} stopOpacity={0.55} />
          </radialGradient>

          {/* Soft outer shadow so the disc sits on the page */}
          <radialGradient id="disc-halo" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor={INK} stopOpacity={0} />
            <stop offset="80%" stopColor="#050302" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#050302" stopOpacity={0} />
          </radialGradient>

          {/* Fade the silver crescent at its ends so it doesn't read as a scuff */}
          <linearGradient
            id="silver-fade"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="black" />
            <stop offset="18%" stopColor="white" />
            <stop offset="82%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
          <mask
            id="silver-mask"
            maskUnits="userSpaceOnUse"
            x={CX - R_OUTER - 4}
            y={CY - R_OUTER - 4}
            width={(R_OUTER + 4) * 2}
            height={(R_OUTER + 4) * 2}
          >
            <rect
              x={CX - R_OUTER - 4}
              y={CY - R_OUTER - 4}
              width={(R_OUTER + 4) * 2}
              height={(R_OUTER + 4) * 2}
              fill="url(#silver-fade)"
            />
          </mask>

          <filter id="ring-flicker">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="7"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.05 0"
            />
            <feComposite in2="SourceGraphic" operator="in" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>
        </defs>

        {/* Frame corner marks (subtle) */}
        {(
          [
            [60, 132, 1, 1],
            [1020, 132, -1, 1],
            [60, 830, 1, -1],
            [1020, 830, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={LEDGER} strokeWidth={1} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* No permanent label plates — the leader ARRIVES with the annotation */}

        {/* Diffuse halo behind the disc */}
        <circle
          cx={CX}
          cy={CY}
          r={R_OUTER + 60}
          fill="url(#disc-halo)"
        />

        {/* ── Ring disc: painted large→small, then masked to grow ── */}
        <g mask="url(#reveal-mask)">
          {/* Bark base — the darkest outer edge */}
          <circle cx={CX} cy={CY} r={R_OUTER + 1} fill={HAIR} />
          {[...RINGS]
            .slice()
            .reverse()
            .map((ring) => (
              <circle
                key={`r-${ring.i}`}
                cx={CX + ring.wobble * 0.6}
                cy={CY + ring.wobble * 0.4}
                r={ring.r}
                fill={ring.color}
              />
            ))}
          {/* Vignette shading */}
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER}
            fill="url(#disc-vignette)"
          />
          {/* Weathered silver flank — exposed dead sapwood, faded at ends by mask. */}
          <g mask="url(#silver-mask)">
            {[
              { d: 70, o: 0.30 },
              { d: 40, o: 0.22 },
              { d: 16, o: 0.16 },
            ].map((band, idx) => {
              const a1 = 108;
              const a2 = 252;
              const rOut = R_OUTER;
              const rIn = R_OUTER - band.d;
              return (
                <path
                  key={`silver-${idx}`}
                  d={`
                    M ${CX + rOut * Math.cos(deg2rad(a1))} ${CY + rOut * Math.sin(deg2rad(a1))}
                    A ${rOut} ${rOut} 0 0 0 ${CX + rOut * Math.cos(deg2rad(a2))} ${CY + rOut * Math.sin(deg2rad(a2))}
                    L ${CX + rIn * Math.cos(deg2rad(a2))} ${CY + rIn * Math.sin(deg2rad(a2))}
                    A ${rIn} ${rIn} 0 0 1 ${CX + rIn * Math.cos(deg2rad(a1))} ${CY + rIn * Math.sin(deg2rad(a1))}
                    Z
                  `}
                  fill={SILVER}
                  opacity={band.o}
                />
              );
            })}
            {/* Radial drought scars — thin dark checking on the exposed flank */}
            {Array.from({ length: 6 }).map((_, k) => {
              const ang = 130 + k * 18 + (rand(k * 7 + 3) - 0.5) * 8;
              const rOuter2 = R_OUTER - 6;
              const rInner2 = R_OUTER - 34 - rand(k * 11) * 55;
              return (
                <line
                  key={`scar-${k}`}
                  x1={CX + rInner2 * Math.cos(deg2rad(ang))}
                  y1={CY + rInner2 * Math.sin(deg2rad(ang))}
                  x2={CX + rOuter2 * Math.cos(deg2rad(ang))}
                  y2={CY + rOuter2 * Math.sin(deg2rad(ang))}
                  stroke={INK}
                  strokeOpacity={0.28}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>
          {/* Pith mark */}
          <circle cx={CX} cy={CY} r={4} fill={INK} />
          <circle
            cx={CX}
            cy={CY}
            r={2}
            fill={PAPER}
            opacity={0.9}
          />
        </g>

        {/* Bark hairline (present-day ring) — appears once reveal completes */}
        {revealR >= R_OUTER + 4 && (
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER + 0.5}
            fill="none"
            stroke={PAPER}
            strokeOpacity={0.35 + barkPulse * 0.25}
            strokeWidth={1}
          />
        )}

        {/* ── Radial annotations ── */}
        {ANNOTS.map((a) => {
          const anchorR = Math.max(4, yearToR(a.year));
          const appearFrame =
            growStart +
            (anchorR / (R_OUTER + 6)) *
              (growEnd - growStart) +
            2;
          const t = interpolate(
            frame,
            [appearFrame, appearFrame + fps * 0.55],
            [0, 1],
            {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          if (t <= 0) return null;
          const p = anchorPoint(a);
          return (
            <g key={a.key} opacity={t}>
              {/* Dot on the anchor ring — a filed page marker */}
              <circle
                cx={p.x}
                cy={p.y}
                r={3.4}
                fill={PAPER}
                stroke={INK}
                strokeWidth={1}
              />
              {/* Tiny radial tick — points OUTWARD (~7 px) so the eye follows */}
              {(() => {
                const rTickOut = 8;
                const cos = Math.cos(deg2rad(a.angleDeg));
                const sin = Math.sin(deg2rad(a.angleDeg));
                return (
                  <line
                    x1={p.x + 4 * cos}
                    y1={p.y + 4 * sin}
                    x2={p.x + (4 + rTickOut) * cos}
                    y2={p.y + (4 + rTickOut) * sin}
                    stroke={PAPER}
                    strokeOpacity={0.75}
                    strokeWidth={1.1}
                  />
                );
              })()}
              {/* Dashed leader — lives OUTSIDE the disc only */}
              <path
                d={leaderOuter(a)}
                fill="none"
                stroke={PAPER}
                strokeOpacity={0.72}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              {/* Label plate */}
              <g
                transform={`translate(${a.pod.x}, ${a.pod.y})`}
                textAnchor={a.labelAnchor}
              >
                <text
                  y={0}
                  fill={PAPER}
                  fontFamily={playfair}
                  fontStyle="italic"
                  fontWeight={500}
                  fontSize={28}
                  letterSpacing={-0.2}
                >
                  {a.yearLabel}
                </text>
                <text
                  y={22}
                  fill={SILVER}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={500}
                  letterSpacing={3.2}
                >
                  {a.event}
                </text>
              </g>
            </g>
          );
        })}

        {/* Ring count marker inside the disc */}
        <g opacity={Math.min(1, Math.max(0, (frame - fps * 2.6) / (fps * 0.7)))}>
          <text
            x={CX}
            y={CY + R_OUTER + 48}
            textAnchor="middle"
            fill={GRAY_META}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3.5}
          >
            FIG. 1 · CROSS-SECTION · 4,858 ANNUAL RINGS
          </text>
        </g>
      </svg>

      {/* ── Type lockup (lower third, left-aligned to margin grid) ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 902,
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
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 26,
              height: 1,
              background: SAP,
            }}
          />
          <div
            style={{
              color: SAP,
              fontFamily: inter,
              fontSize: 13,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Role <span style={{ color: GRAY_META, margin: "0 6px" }}>/</span>
            <span style={{ color: PAPER, letterSpacing: 5 }}>Archivist</span>
          </div>
        </div>

        <div
          style={{
            color: "#F4EDD8",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The tree that
          <br />
          files millennia.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#D4CBB4",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.45,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          A single{" "}
          <span style={{ color: SAP, fontWeight: 600 }}>
            Pinus longaeva
          </span>{" "}
          in the White Mountains — "Methuselah" — was 4,789 years old when
          Schulman &amp; Currey cored it in 1957. Overlapping rings from living
          trees and preserved deadwood have been stitched into an unbroken{" "}
          <span style={{ color: PAPER, fontWeight: 600 }}>
            8,700-year annual chronology
          </span>{" "}
          — the master ledger that calibrates radiocarbon dating.
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
          color: GRAY_META,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>LTRR · Ferguson &amp; Graybill · IntCal Consortium</span>
        <span>
          <span style={{ color: PAPER }}>●</span> 1 ring = 1 filed year
        </span>
      </div>
    </AbsoluteFill>
  );
};
