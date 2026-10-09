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

// Palette — taken from the concept's visual brief
const STORM = "#07091A";
const SKY_FOG = "#0F1328";
const ION = "#E8EEFF";
const PERI = "#7E8CFF";
const SAND = "#D9B072";
const SAND_SHADOW = "#A98659";
const GLASS = "#5C4B36";
const GLASS_HILITE = "#8B6D43";
const GRID = "#141732";
const GRAY = "#8A8F99";

// ── Deterministic PRNG ────────────────────────────────────────────────────
const mulberry32 = (a: number) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Branching bolt generator ─────────────────────────────────────────────
// Build a recursive branching polyline from a start point to roughly an
// end point, with jaggy jitter and periodic forks. Returns an array of
// polylines where polyline[0] is the trunk. Each polyline carries a
// `depth` (0 for trunk, 1 for primary forks, …) and a `cumLen` for the
// starting arc length along the trunk so the fulgurite can grow the
// right branches at the right times.
type Pt = { x: number; y: number };
type Branch = {
  depth: number;
  parentCum: number; // arc length along parent at the branch root
  points: Pt[];
  length: number;
  width: number;
};

const buildBolt = (
  start: Pt,
  end: Pt,
  seed: number,
  depth = 0,
  parentCum = 0,
  spread = 1,
): Branch[] => {
  const rand = mulberry32(seed);
  // Walk from start toward end in small segments, jittering sideways.
  const dx0 = end.x - start.x;
  const dy0 = end.y - start.y;
  const totalDist = Math.hypot(dx0, dy0);
  const ux = dx0 / totalDist;
  const uy = dy0 / totalDist;
  // Perpendicular
  const px = -uy;
  const py = ux;

  const step = Math.max(8, 14 - depth * 2);
  const points: Pt[] = [{ ...start }];
  let walked = 0;
  let cur: Pt = { ...start };
  const forkTargets: { at: number; dir: number }[] = [];
  while (walked < totalDist) {
    const remaining = totalDist - walked;
    const seg = Math.min(step, remaining);
    walked += seg;
    const progress = walked / totalDist;
    // Jitter: strongest in the middle, calmer at the ends. Scaled by spread.
    const jitterAmp = (1 - Math.pow(progress * 2 - 1, 2)) * 12 * spread;
    const j = (rand() - 0.5) * 2 * jitterAmp;
    cur = {
      x: start.x + ux * walked + px * j,
      y: start.y + uy * walked + py * j,
    };
    points.push(cur);
    // Decide whether to fork, but only on the first two levels and not
    // too close to the start/end.
    if (depth < 2 && progress > 0.15 && progress < 0.85) {
      const forkChance = depth === 0 ? 0.12 : 0.08;
      if (rand() < forkChance) {
        forkTargets.push({ at: walked, dir: rand() < 0.5 ? -1 : 1 });
      }
    }
  }
  // Cumulative arc length table
  const cumLens: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumLens.push(
      cumLens[i - 1] +
        Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y),
    );
  }
  const totalLen = cumLens[cumLens.length - 1];

  const trunk: Branch = {
    depth,
    parentCum,
    points,
    length: totalLen,
    width: Math.max(1.1, 5 - depth * 1.6),
  };

  const branches: Branch[] = [trunk];

  for (const f of forkTargets) {
    // Find the point along the walk closest to f.at
    let idx = 1;
    while (idx < cumLens.length - 1 && cumLens[idx] < f.at) idx++;
    const root = points[idx];
    // Branch direction: ~35°–55° away from trunk toward one side
    const angle = (35 + rand() * 25) * (Math.PI / 180) * f.dir;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const bux = ux * ca - uy * sa;
    const buy = ux * sa + uy * ca;
    const branchLen = totalDist * (0.25 + rand() * 0.35) * Math.pow(0.6, depth);
    const branchEnd: Pt = {
      x: root.x + bux * branchLen,
      y: root.y + buy * branchLen,
    };
    const sub = buildBolt(
      root,
      branchEnd,
      seed * 9301 + Math.floor(f.at * 13),
      depth + 1,
      parentCum + f.at,
      spread * 0.75,
    );
    for (const b of sub) branches.push(b);
  }
  return branches;
};

const polyPath = (pts: Pt[]): string =>
  pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

// Mirror a branch across the sand line to make the underground fulgurite
// twin. The fulgurite is a mirror on the horizon y, but we also widen the
// jitter a touch to feel geological rather than electric.
const mirrorBranch = (b: Branch, horizonY: number): Branch => ({
  depth: b.depth,
  parentCum: b.parentCum,
  points: b.points.map((p) => ({ x: p.x, y: 2 * horizonY - p.y })),
  length: b.length,
  width: b.width,
});

// Draw the growing portion of a polyline up to a given progress 0..1.
const partialPath = (pts: Pt[], progress: number): string => {
  if (progress <= 0 || pts.length < 2) return "";
  if (progress >= 1) return polyPath(pts);
  // Compute arc lengths
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(
      lens[i - 1] +
        Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y),
    );
  }
  const total = lens[lens.length - 1];
  const target = total * progress;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (lens[i] <= target) {
      out.push(pts[i]);
    } else {
      const prev = lens[i - 1];
      const t = (target - prev) / (lens[i] - prev);
      out.push({
        x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t,
        y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t,
      });
      break;
    }
  }
  return polyPath(out);
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Composition rectangles ───────────────────────────────────────────
  // 1080 × 1350 portrait. The stage art sits inside a tall "specimen
  // card" from y=140 to y=870, with the sand horizon at y=520 (so a
  // ~380 px sky and a ~350 px cross-section underground). Below that
  // sits the type lockup.
  const STAGE = { x: 60, y: 140, w: 960, h: 730 };
  const HORIZON_Y = STAGE.y + 380;

  // ── Build bolt and fulgurite (deterministic) ────────────────────────
  // The trunk starts just inside the top of the stage and lands at the
  // mid-horizon strike point.
  const STRIKE = { x: STAGE.x + STAGE.w * 0.52, y: HORIZON_Y };
  const BOLT_TOP = { x: STAGE.x + STAGE.w * 0.42, y: STAGE.y + 20 };
  const bolt = React.useMemo(
    () => buildBolt(BOLT_TOP, STRIKE, 42, 0, 0, 1),
    [],
  );
  // Fulgurite: build an independent root that follows the trunk's
  // *underground* continuation (so it is not a literal mirror; it is
  // a plausible fossil of the strike's current path through sand).
  const FULG_BOTTOM = {
    x: STRIKE.x - 30,
    y: STAGE.y + STAGE.h - 30,
  };
  const fulg = React.useMemo(
    () => buildBolt(STRIKE, FULG_BOTTOM, 77, 0, 0, 0.6),
    [],
  );

  // ── Timeline ────────────────────────────────────────────────────────
  // 0.0–0.5 s : dark sky, title lockup settling in.
  // 0.5 s     : strike flash (fast spring), bolt reveal complete.
  // 0.5–0.9 s : flash decays.
  // 0.9–3.8 s : fulgurite etches downward (cubic ease-out).
  // 3.8–5.0 s : hold, labels and ticks fade in.
  const STRIKE_FRAME = Math.round(fps * 0.5);

  const boltReveal = interpolate(
    frame,
    [STRIKE_FRAME - fps * 0.1, STRIKE_FRAME],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Keep bolt visible but slightly dim after the strike
  const boltAfter = interpolate(
    frame,
    [STRIKE_FRAME + fps * 0.1, STRIKE_FRAME + fps * 0.8],
    [1, 0.55],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const boltAlpha = frame < STRIKE_FRAME ? boltReveal : boltAfter;

  // A short, sharp flash that whites out the sky then fades.
  const flash = interpolate(
    frame,
    [STRIKE_FRAME - 2, STRIKE_FRAME + 1, STRIKE_FRAME + fps * 0.35],
    [0, 1, 0],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fulgurite grows along its own arc length. Progress 0..1 drives
  // partialPath on the trunk and gates branches by parentCum.
  const fulgProgress = interpolate(
    frame,
    [STRIKE_FRAME + fps * 0.4, STRIKE_FRAME + fps * 3.0],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Hot-glow trailing the fulgurite tip, decays after it finishes.
  const fulgHot = interpolate(fulgProgress, [0, 0.6, 1], [1, 0.9, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Labels and specimen marks fade in with the fulgurite tail
  const labelsOpacity = interpolate(
    frame,
    [STRIKE_FRAME + fps * 1.4, STRIKE_FRAME + fps * 2.4],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Type lockup lands early
  const titleSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 0.4, fps * 1.1],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Soft loop: at the very end of the comp fade everything, so a
  // simple loop works even without a cut.
  const outro = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Compute, for each fulgurite branch, its local progress based on the
  // trunk's arc-length progress and the branch's parentCum.
  const fulgTrunk = fulg[0];
  const fulgTrunkPts = fulgTrunk.points;
  const fulgTrunkLen = fulgTrunk.length;
  const fulgTrunkProgress = fulgProgress;
  const fulgBranchProgress = (b: Branch) => {
    if (b === fulgTrunk) return fulgTrunkProgress;
    const startAt = b.parentCum / fulgTrunkLen; // 0..1 trunk arc of fork root
    if (fulgTrunkProgress <= startAt) return 0;
    const span = 0.18; // each branch finishes 18% trunk arc after it begins
    return Math.min(1, (fulgTrunkProgress - startAt) / span);
  };

  // Compute trailing-tip point of fulgurite trunk for the hot ember.
  const trunkCum: number[] = [0];
  for (let i = 1; i < fulgTrunkPts.length; i++) {
    trunkCum.push(
      trunkCum[i - 1] +
        Math.hypot(
          fulgTrunkPts[i].x - fulgTrunkPts[i - 1].x,
          fulgTrunkPts[i].y - fulgTrunkPts[i - 1].y,
        ),
    );
  }
  const trunkTarget = fulgTrunkLen * fulgTrunkProgress;
  let tipPt = fulgTrunkPts[0];
  for (let i = 1; i < fulgTrunkPts.length; i++) {
    if (trunkCum[i] >= trunkTarget) {
      const t =
        (trunkTarget - trunkCum[i - 1]) / (trunkCum[i] - trunkCum[i - 1] || 1);
      tipPt = {
        x: fulgTrunkPts[i - 1].x + (fulgTrunkPts[i].x - fulgTrunkPts[i - 1].x) * t,
        y: fulgTrunkPts[i - 1].y + (fulgTrunkPts[i].y - fulgTrunkPts[i - 1].y) * t,
      };
      break;
    }
    tipPt = fulgTrunkPts[i];
  }

  return (
    <AbsoluteFill style={{ backgroundColor: STORM, fontFamily: inter, opacity: outro }}>
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
        <span style={{ color: PERI }}>2026 · 10 · 09</span>
      </div>

      {/* Stage SVG */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STORM} />
            <stop offset="55%" stopColor={SKY_FOG} />
            <stop offset="100%" stopColor="#1A1A2E" />
          </linearGradient>
          <linearGradient id="sand-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SAND} />
            <stop offset="40%" stopColor={SAND_SHADOW} />
            <stop offset="100%" stopColor="#5B4529" />
          </linearGradient>
          <radialGradient id="flash-grad" cx="52%" cy={`${((HORIZON_Y - STAGE.y) / STAGE.h) * 100}%`} r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
            <stop offset="40%" stopColor={PERI} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PERI} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="hot-tip" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD58A" stopOpacity={0.9} />
            <stop offset="60%" stopColor="#C8661F" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C8661F" stopOpacity={0} />
          </radialGradient>
          <filter id="bolt-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b1" />
            <feMerge>
              <feMergeNode in="b1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bolt-glow-wide" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <pattern
            id="sky-grid"
            x={STAGE.x}
            y={STAGE.y}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="sand-tex"
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="0.6" fill="#8E6A3D" opacity="0.35" />
            <circle cx="4.5" cy="4.5" r="0.5" fill="#C89A62" opacity="0.3" />
          </pattern>
          <clipPath id="stage-clip">
            <rect x={STAGE.x} y={STAGE.y} width={STAGE.w} height={STAGE.h} />
          </clipPath>
          <clipPath id="sky-clip">
            <rect x={STAGE.x} y={STAGE.y} width={STAGE.w} height={HORIZON_Y - STAGE.y} />
          </clipPath>
          <clipPath id="sand-clip">
            <rect
              x={STAGE.x}
              y={HORIZON_Y}
              width={STAGE.w}
              height={STAGE.y + STAGE.h - HORIZON_Y}
            />
          </clipPath>
        </defs>

        {/* Specimen card background */}
        <rect
          x={STAGE.x}
          y={STAGE.y}
          width={STAGE.w}
          height={STAGE.h}
          fill="url(#sky-grad)"
        />
        {/* Sky grid (very faint) */}
        <g clipPath="url(#sky-clip)" opacity={0.6}>
          <rect x={STAGE.x} y={STAGE.y} width={STAGE.w} height={HORIZON_Y - STAGE.y} fill="url(#sky-grid)" />
        </g>

        {/* Sand half */}
        <g clipPath="url(#sand-clip)">
          <rect
            x={STAGE.x}
            y={HORIZON_Y}
            width={STAGE.w}
            height={STAGE.y + STAGE.h - HORIZON_Y}
            fill="url(#sand-grad)"
          />
          <rect
            x={STAGE.x}
            y={HORIZON_Y}
            width={STAGE.w}
            height={STAGE.y + STAGE.h - HORIZON_Y}
            fill="url(#sand-tex)"
            opacity={0.5}
          />
          {/* Depth strata lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={`strata-${i}`}
              x1={STAGE.x}
              x2={STAGE.x + STAGE.w}
              y1={HORIZON_Y + 20 + i * 50}
              y2={HORIZON_Y + 20 + i * 50}
              stroke="#3F2F1C"
              strokeWidth={0.8}
              opacity={0.5}
            />
          ))}
        </g>

        {/* Horizon line */}
        <line
          x1={STAGE.x}
          x2={STAGE.x + STAGE.w}
          y1={HORIZON_Y}
          y2={HORIZON_Y}
          stroke={SAND}
          strokeWidth={1.5}
          opacity={0.9}
        />
        {/* Strike crater at the horizon */}
        <g opacity={boltReveal}>
          <ellipse
            cx={STRIKE.x}
            cy={HORIZON_Y + 1}
            rx={34}
            ry={7}
            fill="#2A1C0E"
          />
          <ellipse
            cx={STRIKE.x}
            cy={HORIZON_Y + 1}
            rx={22}
            ry={4}
            fill="#140B04"
          />
          {/* subtle splashes of sand on either side */}
          {[-30, -20, 22, 32].map((dx, i) => (
            <circle
              key={`splash-${i}`}
              cx={STRIKE.x + dx}
              cy={HORIZON_Y - 2 - (i % 2 === 0 ? 1 : 3)}
              r={0.9}
              fill={SAND}
              opacity={0.6}
            />
          ))}
        </g>

        {/* Flash */}
        <rect
          x={STAGE.x}
          y={STAGE.y}
          width={STAGE.w}
          height={STAGE.h}
          fill="url(#flash-grad)"
          opacity={flash}
          clipPath="url(#stage-clip)"
        />

        {/* ── Bolt (sky) ────────────────────────────────────────────── */}
        <g clipPath="url(#sky-clip)" opacity={boltAlpha}>
          {/* outer purple halo */}
          {bolt.map((b, i) => (
            <path
              key={`bolt-halo-${i}`}
              d={partialPath(b.points, 1)}
              stroke={PERI}
              strokeWidth={b.width + 10}
              strokeOpacity={0.18}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#bolt-glow-wide)"
            />
          ))}
          {/* mid periwinkle */}
          {bolt.map((b, i) => (
            <path
              key={`bolt-mid-${i}`}
              d={partialPath(b.points, 1)}
              stroke={PERI}
              strokeWidth={b.width + 2.4}
              strokeOpacity={0.75}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#bolt-glow)"
            />
          ))}
          {/* ion core */}
          {bolt.map((b, i) => (
            <path
              key={`bolt-core-${i}`}
              d={partialPath(b.points, 1)}
              stroke={ION}
              strokeWidth={Math.max(0.9, b.width - 0.6)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* ── Fulgurite (underground) ──────────────────────────────── */}
        <g clipPath="url(#sand-clip)">
          {/* glass outer shadow */}
          {fulg.map((b, i) => {
            const p = fulgBranchProgress(b);
            if (p <= 0) return null;
            return (
              <path
                key={`fulg-shadow-${i}`}
                d={partialPath(b.points, p)}
                stroke="#1E160C"
                strokeWidth={b.width + 7}
                strokeOpacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {/* glass body (wider for weight) */}
          {fulg.map((b, i) => {
            const p = fulgBranchProgress(b);
            if (p <= 0) return null;
            return (
              <path
                key={`fulg-body-${i}`}
                d={partialPath(b.points, p)}
                stroke={GLASS}
                strokeWidth={b.width + 4.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {/* glass highlight — brighter, more glassy */}
          {fulg.map((b, i) => {
            const p = fulgBranchProgress(b);
            if (p <= 0) return null;
            return (
              <path
                key={`fulg-hi-${i}`}
                d={partialPath(b.points, p)}
                stroke={GLASS_HILITE}
                strokeWidth={Math.max(1.2, b.width + 1.2)}
                strokeOpacity={0.75}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {/* glass specular — thin bright line, offset */}
          {fulg.map((b, i) => {
            const p = fulgBranchProgress(b);
            if (p <= 0) return null;
            return (
              <path
                key={`fulg-spec-${i}`}
                d={partialPath(b.points, p)}
                stroke="#D7B37A"
                strokeWidth={Math.max(0.7, b.width - 1.0)}
                strokeOpacity={0.55}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {/* hot cooling tip */}
          {fulgTrunkProgress > 0 && fulgTrunkProgress < 1 && (
            <circle
              cx={tipPt.x}
              cy={tipPt.y}
              r={18}
              fill="url(#hot-tip)"
              opacity={fulgHot}
            />
          )}
          {fulgTrunkProgress > 0 && fulgTrunkProgress < 1 && (
            <circle
              cx={tipPt.x}
              cy={tipPt.y}
              r={3.2}
              fill="#FFE2B0"
              opacity={fulgHot}
            />
          )}
        </g>

        {/* ── Specimen frame & crop marks ──────────────────────────── */}
        <rect
          x={STAGE.x + 0.5}
          y={STAGE.y + 0.5}
          width={STAGE.w - 1}
          height={STAGE.h - 1}
          fill="none"
          stroke="#2A2E44"
          strokeWidth={1}
        />
        {(
          [
            [STAGE.x, STAGE.y, 1, 1],
            [STAGE.x + STAGE.w, STAGE.y, -1, 1],
            [STAGE.x, STAGE.y + STAGE.h, 1, -1],
            [STAGE.x + STAGE.w, STAGE.y + STAGE.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`cm-${i}`} stroke={PERI} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Depth ticks on the right of the sand half (dark ink on sand) */}
        <g
          opacity={labelsOpacity}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={2.8}
          fontWeight={600}
        >
          {[
            { d: 30, label: "30 CM" },
            { d: 100, label: "1.0 M" },
            { d: 170, label: "1.7 M" },
            { d: 240, label: "2.4 M" },
          ].map((t) => {
            const y = HORIZON_Y + (t.d / 300) * 310;
            return (
              <g key={`tick-${t.d}`}>
                <line
                  x1={STAGE.x + STAGE.w - 108}
                  x2={STAGE.x + STAGE.w - 92}
                  y1={y}
                  y2={y}
                  stroke="#3F2F1C"
                  strokeWidth={1.2}
                />
                <text
                  x={STAGE.x + STAGE.w - 24}
                  y={y + 3.5}
                  fill="#3F2F1C"
                  textAnchor="end"
                >
                  {t.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* Specimen label — bolt */}
        <g
          opacity={labelsOpacity}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text x={STAGE.x + 24} y={STAGE.y + 36}>
            FIG. A · RETURN STROKE ~30,000 K
          </text>
          <text
            x={STAGE.x + STAGE.w - 24}
            y={STAGE.y + 36}
            textAnchor="end"
            fill={PERI}
          >
            30 µs · 30 kA
          </text>
        </g>

        {/* Specimen label — fulgurite (sits in the first sand strata band) */}
        <g
          opacity={labelsOpacity}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text x={STAGE.x + 24} y={HORIZON_Y + 70} fill="#3F2F1C">
            FIG. B · FULGURITE · FUSED SiO₂
          </text>
          <text
            x={STAGE.x + STAGE.w - 24}
            y={HORIZON_Y + 70}
            textAnchor="end"
            fill="#3F2F1C"
          >
            PRESERVED &gt; 10,000 YR
          </text>
        </g>

        {/* N compass + sand-level tag */}
        <g
          transform={`translate(${STAGE.x + STAGE.w - 36}, ${STAGE.y + 36})`}
          opacity={labelsOpacity}
        ></g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 925,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: PERI,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Archivist</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The lightning
          <br />
          that keeps a record.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A return stroke drives its channel to roughly{" "}
          <span style={{ color: ION, fontWeight: 600 }}>30,000 K</span> — five
          times the surface of the Sun — and where it grounds through quartz
          sand it instantly fuses the silica into a hollow glass tube called a{" "}
          <span style={{ color: SAND, fontWeight: 600 }}>fulgurite</span>,
          preserving the bolt's underground path for millennia.
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
        <span>Pasek, Block &amp; Pasek · Contrib. Mineral. Petrol. 164 (2012)</span>
        <span>
          <span style={{ color: PERI }}>●</span> Bolt
          <span style={{ color: SAND, marginLeft: 14 }}>●</span> Fulgurite
        </span>
      </div>
    </AbsoluteFill>
  );
};
