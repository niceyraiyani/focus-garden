/**
 * A delicate line-art wildflower meadow that sits fixed along the bottom of the
 * app — decorative only (aria-hidden, non-interactive), kept subtle so the rest
 * of the UI stays minimal. Single-weight strokes in the current accent color;
 * opacity is controlled in CSS so it adapts to light/dark themes.
 */

function Daisy({ x, baseY, top, petals = 11, r = 5, petal = 13 }: {
  x: number
  baseY: number
  top: number
  petals?: number
  r?: number
  petal?: number
}) {
  return (
    <g>
      <path d={`M${x} ${baseY} C ${x - 9} ${baseY - 60} ${x + 7} ${baseY - 110} ${x} ${top + r}`} />
      <Leaf x={x} y={baseY - 70} dir={-1} />
      <Leaf x={x} y={baseY - 100} dir={1} />
      {Array.from({ length: petals }).map((_, i) => {
        const a = ((Math.PI * 2) / petals) * i - Math.PI / 2
        const x1 = x + Math.cos(a) * (r + 2)
        const y1 = top + Math.sin(a) * (r + 2)
        const x2 = x + Math.cos(a) * (r + petal)
        const y2 = top + Math.sin(a) * (r + petal)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
      })}
      <circle cx={x} cy={top} r={r} />
    </g>
  )
}

function Leaf({ x, y, dir }: { x: number; y: number; dir: number }) {
  return <path d={`M${x} ${y} q ${16 * dir} -6 ${22 * dir} -20 q ${-16 * dir} 6 ${-22 * dir} 20 z`} />
}

function Sprig({ x, baseY, top, berries = 4 }: { x: number; baseY: number; top: number; berries?: number }) {
  const dots = Array.from({ length: berries }).map((_, i) => {
    const t = i / (berries - 1)
    const bx = x + Math.sin(i) * 6
    const by = top + (baseY - top) * 0.5 * t - 6
    return <circle key={i} cx={bx} cy={by} r={3.4} />
  })
  return (
    <g>
      <path d={`M${x} ${baseY} C ${x + 8} ${baseY - 50} ${x - 8} ${baseY - 90} ${x} ${top}`} />
      <Leaf x={x} y={baseY - 55} dir={1} />
      <Leaf x={x} y={baseY - 30} dir={-1} />
      {dots}
    </g>
  )
}

function Bud({ x, baseY, top }: { x: number; baseY: number; top: number }) {
  return (
    <g>
      <path d={`M${x} ${baseY} C ${x - 7} ${baseY - 45} ${x + 7} ${baseY - 80} ${x} ${top + 10}`} />
      <Leaf x={x} y={baseY - 48} dir={1} />
      <path d={`M${x} ${top + 12} c -7 -4 -7 -16 0 -20 c 7 4 7 16 0 20 z`} />
      <line x1={x} y1={top + 12} x2={x} y2={top - 8} />
    </g>
  )
}

function Frond({ x, baseY, top, leaflets = 6 }: { x: number; baseY: number; top: number; leaflets?: number }) {
  const items = Array.from({ length: leaflets }).map((_, i) => {
    const t = (i + 1) / (leaflets + 1)
    const ly = baseY - (baseY - top) * t
    return (
      <g key={i}>
        <path d={`M${x} ${ly} q 10 -3 15 -12`} />
        <path d={`M${x} ${ly} q -10 -3 -15 -12`} />
      </g>
    )
  })
  return (
    <g>
      <path d={`M${x} ${baseY} L ${x} ${top}`} />
      {items}
    </g>
  )
}

function FivePetal({ x, baseY, top, r = 5, petal = 9 }: { x: number; baseY: number; top: number; r?: number; petal?: number }) {
  return (
    <g>
      <path d={`M${x} ${baseY} C ${x + 8} ${baseY - 40} ${x - 8} ${baseY - 75} ${x} ${top + r}`} />
      <Leaf x={x} y={baseY - 45} dir={-1} />
      {Array.from({ length: 5 }).map((_, i) => {
        const a = ((Math.PI * 2) / 5) * i - Math.PI / 2
        const cx = x + Math.cos(a) * (r + petal)
        const cy = top + Math.sin(a) * (r + petal)
        return <circle key={i} cx={cx} cy={cy} r={petal * 0.5} />
      })}
      <circle cx={x} cy={top} r={r * 0.7} />
    </g>
  )
}

export function MeadowBackground() {
  const baseY = 240
  return (
    <div className="meadow" aria-hidden="true">
      <svg
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Sprig x={70} baseY={baseY} top={150} berries={4} />
        <Frond x={150} baseY={baseY} top={120} leaflets={7} />
        <Daisy x={250} baseY={baseY} top={70} />
        <FivePetal x={350} baseY={baseY} top={110} />
        <Bud x={430} baseY={baseY} top={95} />
        <Sprig x={520} baseY={baseY} top={140} berries={5} />
        <Daisy x={620} baseY={baseY} top={85} petals={12} />
        <Frond x={710} baseY={baseY} top={130} leaflets={6} />
        <Bud x={780} baseY={baseY} top={105} />
        <FivePetal x={870} baseY={baseY} top={95} />
        <Sprig x={960} baseY={baseY} top={150} berries={4} />
        <Daisy x={1050} baseY={baseY} top={78} />
        <Bud x={1140} baseY={baseY} top={110} />
      </svg>
    </div>
  )
}
