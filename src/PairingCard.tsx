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
const INK = "#05070F";
const NEBULA = "#0E1430";
const VIOLET = "#4A1A86";
const MAGENTA = "#E24AC5";
const PINK = "#FFCFEA";
const GOLD = "#FFD766";
const GRAY = "#8A8FA3";

// Dial geometry (in the 1080×1350 page coordinate space)
const CX = 540;
const CY = 495;
const R_INNER = 44; // pulsar visual radius
const R_BEAM = 330; // beam length
const R_DIAL = 390; // dial outer radius (tick ring)
const R_BEZEL_OUT = 418;

// Compose radial points
const polar = (angleDeg: number, r: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r };
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Rotation of the magnetic axis ────────────────────────────────────
  // One full revolution every 4 seconds, eased in on first entry.
  const rotIn = spring({
    frame,
    fps,
    config: { damping: 220, mass: 1.1 },
  });
  const rotPeriod = fps * 4;
  const rotation = ((frame / rotPeriod) * 360) * rotIn;

  // Title / hook entrances
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.0, fps * 1.9],
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

  // Pulse flash on every half-rotation (both poles sweep past "noon")
  const halfPeriod = rotPeriod / 2;
  const flashT = (frame % halfPeriod) / halfPeriod;
  const flash = Math.pow(1 - flashT, 5); // sharp decay

  // Horizontal pulse-arrival strip
  const STRIP_Y = 1065;
  const STRIP_X0 = 120;
  const STRIP_X1 = 960;
  const PULSE_SPACING = 120; // px between arrivals
  const pulseCount = Math.floor((STRIP_X1 - STRIP_X0) / PULSE_SPACING) + 1;
  // One tick lands per half-rotation; we drift the strip right→left to
  // keep the metronome pulsing even when the viewer sees just one still.
  const stripDrift = ((frame / halfPeriod) % 1) * PULSE_SPACING;

  // Beam angles (two opposing poles)
  const beamA = rotation - 30; // offset so still frame is composed, not axis-aligned
  const beamB = beamA + 180;

  // Helper for beam cone — a wider isoceles triangle around the axis
  const beamPath = (angleDeg: number, halfWidth = 11) => {
    const tip = polar(angleDeg, R_BEAM);
    const base1 = polar(angleDeg - halfWidth, R_INNER * 0.9);
    const base2 = polar(angleDeg + halfWidth, R_INNER * 0.9);
    return `M ${base1.x} ${base1.y} L ${tip.x} ${tip.y} L ${base2.x} ${base2.y} Z`;
  };

  // Dial ticks
  const majorTicks: number[] = [];
  const minorTicks: number[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * 360;
    if (i % 5 === 0) majorTicks.push(a);
    else minorTicks.push(a);
  }

  // Star-field (deterministic, no library)
  const rand = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  const stars = Array.from({ length: 80 }).map((_, i) => ({
    x: rand(i + 1) * 1080,
    y: rand(i + 101) * 960 + 130,
    r: rand(i + 203) * 1.3 + 0.3,
    o: rand(i + 307) * 0.6 + 0.2,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep-space background with a faint vignette */}
          <radialGradient id="space-bg" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor={NEBULA} stopOpacity={1} />
            <stop offset="55%" stopColor="#070A1C" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Beam fill — bright at tip-inner, soft at the edge */}
          <radialGradient id="beam-fill" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.95} />
            <stop offset="40%" stopColor={MAGENTA} stopOpacity={0.55} />
            <stop offset="100%" stopColor={MAGENTA} stopOpacity={0} />
          </radialGradient>

          {/* Pulsar core — hot pinhole */}
          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
            <stop offset="25%" stopColor={PINK} stopOpacity={0.9} />
            <stop offset="60%" stopColor={MAGENTA} stopOpacity={0.6} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>

          {/* Soft violet halo of the surrounding synchrotron nebula */}
          <radialGradient id="neb-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MAGENTA} stopOpacity={0.22} />
            <stop offset="30%" stopColor={VIOLET} stopOpacity={0.28} />
            <stop offset="70%" stopColor={VIOLET} stopOpacity={0.08} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>

          {/* Inner synchrotron ring — stronger, closer to the pulsar */}
          <radialGradient id="neb-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MAGENTA} stopOpacity={0.5} />
            <stop offset="55%" stopColor={VIOLET} stopOpacity={0.25} />
            <stop offset="100%" stopColor={VIOLET} stopOpacity={0} />
          </radialGradient>

          <filter
            id="beam-blur"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="5" />
          </filter>

          <filter
            id="core-blur"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Background space */}
        <rect x={0} y={0} width={1080} height={1350} fill={INK} />
        <rect
          x={0}
          y={130}
          width={1080}
          height={820}
          fill="url(#space-bg)"
        />

        {/* Scattered field stars */}
        {stars.map((s, i) => (
          <circle
            key={`st-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="#FFFFFF"
            opacity={s.o}
          />
        ))}

        {/* Nebula halos — layered large + inner */}
        <circle cx={CX} cy={CY} r={380} fill="url(#neb-halo)" />
        <circle cx={CX} cy={CY} r={180} fill="url(#neb-inner)" />

        {/* Thin cosmic latitude/longitude cross-hairs on the sky */}
        <g stroke="#1E2449" strokeWidth={1} opacity={0.5}>
          <line x1={60} y1={CY} x2={1020} y2={CY} />
          <line x1={CX} y1={160} x2={CX} y2={830} />
        </g>

        {/* ── Watch dial (outer ring + tick marks) ──────────────────── */}
        {/* Bezel */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BEZEL_OUT}
          fill="none"
          stroke="#1A2048"
          strokeWidth={1}
        />
        <circle
          cx={CX}
          cy={CY}
          r={R_DIAL}
          fill="none"
          stroke="#2A3366"
          strokeWidth={1}
        />

        {/* Minor ticks (gold at 60 divisions) */}
        {minorTicks.map((a, i) => {
          const p1 = polar(a, R_DIAL);
          const p2 = polar(a, R_DIAL - 10);
          return (
            <line
              key={`mn-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={GOLD}
              strokeOpacity={0.45}
              strokeWidth={1}
            />
          );
        })}

        {/* Major ticks — the hour marks */}
        {majorTicks.map((a, i) => {
          const p1 = polar(a, R_DIAL);
          const p2 = polar(a, R_DIAL - 24);
          return (
            <line
              key={`mj-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={GOLD}
              strokeWidth={2.2}
            />
          );
        })}

        {/* Tiny hour-angle readout labels at the four cardinals */}
        {[
          { a: 0, dy: -R_DIAL - 18, label: "0" },
          { a: 90, dx: R_DIAL + 22, label: "π/2" },
          { a: 180, dy: R_DIAL + 28, label: "π" },
          { a: 270, dx: -R_DIAL - 22, label: "3π/2" },
        ].map((t, i) => {
          const p = polar(t.a, R_DIAL);
          return (
            <text
              key={`lab-${i}`}
              x={CX + (t.a === 90 ? R_DIAL + 22 : t.a === 270 ? -R_DIAL - 22 : 0)}
              y={
                t.a === 0
                  ? CY - R_DIAL - 18
                  : t.a === 180
                    ? CY + R_DIAL + 28
                    : CY + 4
              }
              textAnchor="middle"
              fill={GRAY}
              fontFamily={inter}
              fontSize={11}
              fontWeight={600}
              letterSpacing={2.5}
            >
              {t.label}
            </text>
          );
        })}

        {/* ── Beams (two opposing poles) ────────────────────────────── */}
        {/* Outer glow — wider, softer */}
        <path
          d={beamPath(beamA, 16)}
          fill={MAGENTA}
          opacity={0.22}
          filter="url(#beam-blur)"
        />
        <path
          d={beamPath(beamB, 14)}
          fill={MAGENTA}
          opacity={0.14}
          filter="url(#beam-blur)"
        />
        {/* Beam cones — front/back differentiation */}
        <path d={beamPath(beamA, 10)} fill="url(#beam-fill)" />
        <path d={beamPath(beamB, 8)} fill="url(#beam-fill)" opacity={0.55} />

        {/* Beam axis hairline — both poles */}
        <line
          x1={polar(beamA, R_INNER * 0.4).x}
          y1={polar(beamA, R_INNER * 0.4).y}
          x2={polar(beamA, R_BEAM - 10).x}
          y2={polar(beamA, R_BEAM - 10).y}
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeOpacity={0.95}
        />
        <line
          x1={polar(beamB, R_INNER * 0.4).x}
          y1={polar(beamB, R_INNER * 0.4).y}
          x2={polar(beamB, R_BEAM - 30).x}
          y2={polar(beamB, R_BEAM - 30).y}
          stroke="#FFFFFF"
          strokeWidth={1.2}
          strokeOpacity={0.55}
        />

        {/* ── Pulsar core (the pivot of the watch) ──────────────────── */}
        {/* Wide outer bloom */}
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER + 46 + flash * 14}
          fill="url(#core-glow)"
          opacity={0.9}
        />
        {/* Diffraction spikes — tight, white only, like a bright star point */}
        <g stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={0.9}>
          <line
            x1={CX - (R_INNER + 52)}
            y1={CY}
            x2={CX + (R_INNER + 52)}
            y2={CY}
          />
          <line
            x1={CX}
            y1={CY - (R_INNER + 52)}
            x2={CX}
            y2={CY + (R_INNER + 52)}
          />
        </g>
        {/* Soft magenta puck */}
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER}
          fill={MAGENTA}
          filter="url(#core-blur)"
          opacity={0.9}
        />
        {/* Hot inner ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER - 10}
          fill={PINK}
          opacity={0.9}
        />
        {/* Hot white pinhole */}
        <circle
          cx={CX}
          cy={CY}
          r={10 + flash * 3}
          fill="#FFFFFF"
        />
        {/* Gold hairline — the watchmaker's regulating ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R_INNER + 8}
          fill="none"
          stroke={GOLD}
          strokeWidth={1}
          strokeOpacity={0.75}
        />

        {/* ── Rotation-axis callout — always lands in a safe margin ─── */}
        {(() => {
          // Normalize beamA to [0, 360)
          let a = beamA % 360;
          if (a < 0) a += 360;
          // The pole we annotate is whichever one lands in the upper half,
          // so the callout always has room above the dial.
          const annotatedAngle = a < 180 ? a : (a + 180) % 360;
          const leftSide = annotatedAngle > 180; // beam heads left?
          const tip = polar(annotatedAngle, R_BEAM + 10);
          // Fixed safe elbow and label positions in page coords
          const elbowY = Math.min(tip.y, 220);
          const elbowX = leftSide ? 180 : 900;
          const labelX = leftSide ? 90 : 990;
          const textAnchor = leftSide ? "start" : "end";
          const show = Math.min(1, Math.max(0, (frame - fps * 1.0) / fps));
          return (
            <g opacity={show}>
              <line
                x1={tip.x}
                y1={tip.y}
                x2={elbowX}
                y2={elbowY}
                stroke={GOLD}
                strokeWidth={1.1}
                strokeOpacity={0.8}
              />
              <line
                x1={elbowX}
                y1={elbowY}
                x2={labelX}
                y2={elbowY}
                stroke={GOLD}
                strokeWidth={1.1}
                strokeOpacity={0.8}
              />
              <circle cx={tip.x} cy={tip.y} r={3} fill={GOLD} />
              <text
                x={labelX}
                y={elbowY - 10}
                textAnchor={textAnchor}
                fill={GOLD}
                fontFamily={inter}
                fontSize={12}
                fontWeight={600}
                letterSpacing={3.5}
              >
                MAGNETIC AXIS
              </text>
              <text
                x={labelX}
                y={elbowY + 10}
                textAnchor={textAnchor}
                fill={GRAY}
                fontFamily={inter}
                fontSize={10.5}
                letterSpacing={2.5}
              >
                641.9 Hz · PSR B1937+21
              </text>
            </g>
          );
        })()}

        {/* Caption strip just below the dial */}
        <g
          transform={`translate(120, 950)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · ROTATION-POWERED EMISSION FROM A NEUTRON STAR</text>
          <text x={840} textAnchor="end" fill={GOLD} opacity={0.9}>
            Δt = 1.558 MS
          </text>
        </g>

        {/* ── Pulse-arrival strip (the metronome made visible) ─────── */}
        <g transform={`translate(0, ${STRIP_Y})`}>
          {/* Strip baseline */}
          <line
            x1={STRIP_X0}
            y1={0}
            x2={STRIP_X1}
            y2={0}
            stroke="#2A3366"
            strokeWidth={1}
          />
          {/* Fine tick ladder */}
          {Array.from({ length: (STRIP_X1 - STRIP_X0) / 15 + 1 }).map(
            (_, i) => {
              const x = STRIP_X0 + i * 15;
              const major = i % 8 === 0;
              return (
                <line
                  key={`tk-${i}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={major ? -8 : -4}
                  stroke={GRAY}
                  strokeOpacity={major ? 0.7 : 0.35}
                  strokeWidth={1}
                />
              );
            },
          )}
          {/* Gold pulse arrivals (moving right-to-left like a tape) */}
          {Array.from({ length: pulseCount }).map((_, i) => {
            const x = STRIP_X0 + i * PULSE_SPACING - stripDrift + PULSE_SPACING;
            if (x < STRIP_X0 - 10 || x > STRIP_X1 + 10) return null;
            const edge = (x - STRIP_X0) / (STRIP_X1 - STRIP_X0);
            const fade = Math.min(1, edge * 1.4 + 0.25);
            const now = x > STRIP_X1 - 90 ? flash : 0;
            return (
              <g key={`p-${i}`} opacity={fade}>
                {/* Vertical glow behind the tick */}
                <line
                  x1={x}
                  y1={-42 - now * 8}
                  x2={x}
                  y2={14}
                  stroke={GOLD}
                  strokeOpacity={0.25}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <line
                  x1={x}
                  y1={-42 - now * 8}
                  x2={x}
                  y2={14}
                  stroke={GOLD}
                  strokeWidth={2.5}
                />
                <circle cx={x} cy={-42 - now * 8} r={5} fill={GOLD} />
                <circle
                  cx={x}
                  cy={-42 - now * 8}
                  r={9}
                  fill="none"
                  stroke={GOLD}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              </g>
            );
          })}
          <text
            x={STRIP_X0}
            y={28}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.5}
            fontWeight={500}
          >
            PULSE ARRIVAL · t →
          </text>
          <text
            x={STRIP_X1}
            y={28}
            textAnchor="end"
            fill={GOLD}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={2.5}
            fontWeight={600}
            opacity={0.9}
          >
            σ &lt; 100 ns / yr
          </text>
        </g>
      </svg>

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
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: MAGENTA }}>2026 · 11 · 24</span>
      </div>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1130,
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
            color: MAGENTA,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Watchmaker
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <div
            style={{
              color: "#F4F4F6",
              fontFamily: playfair,
              fontWeight: 500,
              fontSize: 72,
              lineHeight: 0.98,
              letterSpacing: -1.2,
              fontStyle: "italic",
              flex: "0 1 auto",
            }}
          >
            The 20-km <br /> metronome.
          </div>
          <div
            style={{
              color: "#C8CAD0",
              fontFamily: inter,
              fontSize: 17,
              lineHeight: 1.45,
              fontWeight: 400,
              maxWidth: 440,
              paddingTop: 10,
              opacity: hookOpacity,
              borderLeft: `2px solid ${GOLD}`,
              paddingLeft: 18,
            }}
          >
            Spinning{" "}
            <span style={{ color: GOLD, fontWeight: 600 }}>641.9 times</span>{" "}
            a second, a neutron star 20 km across keeps a beat so stable
            that pulsar-timing arrays track its arrivals to under{" "}
            <span style={{ color: GOLD, fontWeight: 600 }}>100 ns/yr</span> —
            a galaxy-wide clockwork now used to listen for gravitational
            waves.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 42,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Backer &amp; Kulkarni · Nature 300 (1982) 615</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Gold tick = one arrival
        </span>
      </div>

      {/* Hairline frame nudge — a very thin page border like a plate edge */}
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid #141A33",
          pointerEvents: "none",
        }}
      />
      {/* Silence TS unused warnings on durationInFrames */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
