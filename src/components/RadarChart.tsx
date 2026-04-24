interface RadarChartProps {
  data: {
    label: string;
    current: number;
    desired: number;
  }[];
}

export default function RadarChart({ data }: RadarChartProps) {
  const size = 400;
  const center = size / 2;
  const radius = size / 2 - 60;
  const levels = 5;

  const angleSlice = (Math.PI * 2) / data.length;

  const getPoint = (value: number, index: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const createPath = (values: number[]) => {
    return values
      .map((value, i) => {
        const point = getPoint(value, i);
        return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
      })
      .join(' ') + ' Z';
  };

  return (
    <svg width={size} height={size} className="mx-auto">
      <g>
        {[...Array(levels)].map((_, i) => {
          const r = (radius / levels) * (i + 1);
          const points = data.map((_, index) => {
            const angle = angleSlice * index - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');

          return (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {data.map((_, index) => {
          const point = getPoint(100, index);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        <path
          d={createPath(data.map(d => d.desired))}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        <path
          d={createPath(data.map(d => d.current))}
          fill="rgba(15, 23, 42, 0.2)"
          stroke="rgb(15, 23, 42)"
          strokeWidth="3"
        />

        {data.map((item, index) => {
          const labelPoint = getPoint(115, index);
          return (
            <text
              key={index}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-slate-700"
            >
              {item.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
