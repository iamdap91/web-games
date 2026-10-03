import { intruderHandPose, type Finger } from './intruder-hands.js';
import { smooth } from './event-rules.js';
import type { Point } from './door-intruder.js';

type Vertex = Point & { readonly z: number };
type Surface = {
  readonly vertices: readonly Vertex[];
  readonly color: string;
  readonly palm?: boolean;
};
export type ScareHandPose = {
  readonly center: Point;
  readonly angle: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly depth: number;
  readonly wristLag: number;
  readonly curl: number;
  readonly facing: number;
  readonly size: number;
};
export type ScareHand = {
  readonly center: Point;
  readonly surfaces: readonly Surface[];
  readonly wrist: Point;
  readonly wristWidth: number;
};

// 선의 가상 깊이를 통과한 표면만 앞에 그려 가림과 원근이 같은 기준을 쓰게 한다.
const barDepth = 120;
const focalLength = 520;
function perspective(z: number): number {
  return focalLength / Math.max(55, focalLength - z);
}
function project(vertex: Vertex, center: Point): Point {
  const scale = perspective(vertex.z);
  return { x: center.x + vertex.x * scale, y: center.y + vertex.y * scale };
}

function skinColor(light: number): string {
  const shade = [32, 53, 42];
  const highlight = [165, 176, 147];
  const channels = shade.map((dark, index) =>
    Math.round(dark + (highlight[index]! - dark) * light),
  );
  return `rgb(${channels.join(' ')})`;
}

function fingerSurfaces(
  finger: Finger,
  width: number,
  curl: number,
): Surface[] {
  const surfaces: Surface[] = [];
  for (let joint = 0; joint < 3; joint++) {
    const start = finger[joint]!;
    const end = finger[joint + 1]!;
    const length = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const normal = {
      x: -(end.y - start.y) / length,
      y: (end.x - start.x) / length,
    };
    const root = width * (1 - joint * 0.18);
    const tip = root * (joint === 2 ? 0.58 : 0.83);
    const ring = (t: number, angle: number): Vertex => {
      const radius = root + (tip - root) * t + Math.sin(t * Math.PI) * 0.35;
      return {
        x:
          start.x + (end.x - start.x) * t + normal.x * Math.cos(angle) * radius,
        y:
          start.y + (end.y - start.y) * t + normal.y * Math.cos(angle) * radius,
        z: (joint + t) * (9 + curl * 8) + Math.sin(angle) * radius * 0.7,
      };
    };
    for (let side = 0; side < 12; side++) {
      const a = (side * Math.PI) / 6;
      const b = ((side + 1) * Math.PI) / 6;
      const light =
        0.2 +
        Math.max(
          0,
          Math.sin((a + b) / 2) * 0.8 - Math.cos((a + b) / 2) * 0.25,
        ) *
          0.75;
      for (let section = 0; section < 2; section++) {
        const from = section / 2;
        const to = (section + 1) / 2;
        surfaces.push({
          vertices: [ring(from, a), ring(to, a), ring(to, b), ring(from, b)],
          color: skinColor(light),
        });
      }
    }
    if (joint === 2) {
      const nail = (t: number, offset: number): Vertex => ({
        x: start.x + (end.x - start.x) * t + normal.x * offset,
        y: start.y + (end.y - start.y) * t + normal.y * offset,
        z: (joint + t) * (9 + curl * 8) + root * 0.8,
      });
      surfaces.push({
        vertices: [
          nail(0.38, -tip * 0.8),
          nail(1.03, -tip * 0.55),
          nail(1.03, tip * 0.55),
          nail(0.38, tip * 0.8),
        ],
        color: '#6c7964',
      });
    }
  }
  return surfaces;
}

export function createScareHand(pose: ScareHandPose): ScareHand {
  const shape = intruderHandPose(pose.curl);
  const surfaces = shape.fingers.flatMap((finger, index) =>
    fingerSurfaces(finger, [5.2, 5.8, 5.1, 4.1][index]!, pose.curl),
  );
  surfaces.push(...fingerSurfaces(shape.thumb, 6.1, pose.curl));
  const contour: readonly Point[] = [
    { x: -10, y: 21 },
    { x: -13, y: 11 },
    { x: -21, y: 6 },
    { x: -24, y: 0 },
    { x: -22, y: -10 },
    { x: -15, y: -17 },
    { x: -5, y: -21 },
    { x: 7, y: -20 },
    { x: 20, y: -12 },
    { x: 23, y: -3 },
    { x: 19, y: 6 },
    { x: 13, y: 14 },
    { x: 10, y: 21 },
  ];
  surfaces.push({
    vertices: contour.map((point) => ({ ...point, z: 2 })),
    color: '#77876c',
    palm: true,
  });
  // 손등의 힘줄도 함께 투영해 피부의 음영이 표면을 따라 움직이게 한다.
  for (const finger of shape.fingers) {
    const root = finger[0];
    surfaces.push({
      vertices: [
        { x: root.x - 0.6, y: root.y + 3, z: 3 },
        { x: root.x * 0.2 - 0.5, y: 16, z: 3 },
        { x: root.x * 0.2 + 0.5, y: 16, z: 3 },
        { x: root.x + 0.6, y: root.y + 3, z: 3 },
      ],
      color: '#abb397',
    });
  }
  const transform = (point: Vertex): Vertex => {
    const pitchedY =
      point.y * Math.cos(pose.pitch) + point.z * Math.sin(pose.pitch);
    const pitchedZ =
      -point.y * Math.sin(pose.pitch) + point.z * Math.cos(pose.pitch);
    const x = point.x * Math.cos(pose.yaw) + pitchedZ * Math.sin(pose.yaw);
    const z = -point.x * Math.sin(pose.yaw) + pitchedZ * Math.cos(pose.yaw);
    return {
      x:
        (x * Math.cos(pose.angle) - pitchedY * Math.sin(pose.angle)) *
        pose.size *
        pose.facing,
      y:
        (x * Math.sin(pose.angle) + pitchedY * Math.cos(pose.angle)) *
        pose.size,
      z:
        pose.depth + z * pose.size - smooth((point.y + 5) / 26) * pose.wristLag,
    };
  };
  const projected = surfaces.map((surface) => ({
    ...surface,
    vertices: surface.vertices.map(transform),
  }));
  const averageDepth = (surface: Surface): number =>
    surface.vertices.reduce((sum, vertex) => sum + vertex.z, 0) /
    surface.vertices.length;
  projected.sort((a, b) => averageDepth(a) - averageDepth(b));
  const wrist = project(transform({ x: 0, y: 21, z: 0 }), pose.center);
  const edge = project(transform({ x: 10, y: 21, z: 0 }), pose.center);
  return {
    surfaces: projected,
    center: pose.center,
    wrist,
    wristWidth: Math.hypot(edge.x - wrist.x, edge.y - wrist.y),
  };
}

function clipDepth(vertices: readonly Vertex[], front: boolean): Vertex[] {
  const clipped: Vertex[] = [];
  const inside = (point: Vertex): boolean =>
    front ? point.z >= barDepth : point.z <= barDepth;
  let previous = vertices[vertices.length - 1]!;
  for (const current of vertices) {
    if (inside(previous) !== inside(current)) {
      const t = (barDepth - previous.z) / (current.z - previous.z);
      clipped.push({
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
        z: barDepth,
      });
    }
    if (inside(current)) clipped.push(current);
    previous = current;
  }
  return clipped;
}

export function drawScareHand(
  ctx: CanvasRenderingContext2D,
  hand: ScareHand,
  front: boolean,
): void {
  for (const surface of hand.surfaces) {
    const vertices = clipDepth(surface.vertices, front);
    if (vertices.length < 3) continue;
    const points = vertices.map((vertex) => project(vertex, hand.center));
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    ctx.fillStyle = surface.color;
    if (surface.palm) {
      // 선 뒤와 앞의 조각에 같은 그라데이션을 써서 경계에서 피부색이 바뀌지 않게 한다.
      const full = surface.vertices.map((vertex) =>
        project(vertex, hand.center),
      );
      const left = Math.min(...full.map((point) => point.x));
      const right = Math.max(...full.map((point) => point.x));
      const shade = ctx.createLinearGradient(
        left,
        0,
        Math.max(left + 1, right),
        0,
      );
      shade.addColorStop(0, '#354d3d');
      shade.addColorStop(0.34, '#9faa8d');
      shade.addColorStop(0.7, '#70856a');
      shade.addColorStop(1, '#2a4232');
      ctx.fillStyle = shade;
    }
    ctx.fill();
    // 이웃한 면의 안티앨리어싱 틈만 메운다.
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.45;
    ctx.stroke();
  }
}
