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
  readonly wristEdges: readonly [Point, Point];
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

// 손이 회전해도 화면 아래의 같은 광원에서 붉은 빛을 받게 한다.
function lowerReflection(normal: Vertex, pose: ScareHandPose): number {
  const pitchedY =
    normal.y * Math.cos(pose.pitch) + normal.z * Math.sin(pose.pitch);
  const pitchedZ =
    -normal.y * Math.sin(pose.pitch) + normal.z * Math.cos(pose.pitch);
  const x = normal.x * Math.cos(pose.yaw) + pitchedZ * Math.sin(pose.yaw);
  const z = -normal.x * Math.sin(pose.yaw) + pitchedZ * Math.cos(pose.yaw);
  const y = x * Math.sin(pose.angle) + pitchedY * Math.cos(pose.angle);
  return (
    Math.max(
      0,
      (y * 0.92 + z * 0.38) / Math.hypot(normal.x, normal.y, normal.z),
    ) ** 2
  );
}

function skinColor(light: number, reflection: number): string {
  const shade = [39, 26, 27];
  const highlight = [168, 175, 150];
  const red = [153, 48, 42];
  const channels = shade.map((dark, index) => {
    const skin = dark + (highlight[index]! - dark) * light;
    return Math.round(skin + (red[index]! - skin) * reflection * 0.7);
  });
  return `rgb(${channels.join(' ')})`;
}

function fingerSurfaces(
  finger: Finger,
  width: number,
  pose: ScareHandPose,
): Surface[] {
  const curl = pose.curl;
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
      const angle = (a + b) / 2;
      const reflection = lowerReflection(
        {
          x: normal.x * Math.cos(angle) * 0.7,
          y: normal.y * Math.cos(angle) * 0.7,
          z: Math.sin(angle),
        },
        pose,
      );
      for (let section = 0; section < 2; section++) {
        const from = section / 2;
        const to = (section + 1) / 2;
        surfaces.push({
          vertices: [ring(from, a), ring(to, a), ring(to, b), ring(from, b)],
          color: skinColor(light, reflection),
        });
      }
      // 관절 전체를 두르지 않고 빛을 향한 좁은 면에만 젖은 듯한 반사를 남긴다.
      if (joint > 0 && reflection > 0.55 && Math.sin(angle) > 0.2) {
        const glint = (t: number, theta: number): Vertex => {
          const point = ring(t, theta);
          return { ...point, z: point.z + 0.6 };
        };
        surfaces.push({
          vertices: [
            glint(0.07, angle - 0.08),
            glint(0.15, angle - 0.08),
            glint(0.15, angle + 0.08),
            glint(0.07, angle + 0.08),
          ],
          color: `rgb(176 100 83 / ${reflection * 0.65})`,
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
        color: '#65504a',
      });
      const reflection = lowerReflection({ x: 0, y: 0, z: 1 }, pose);
      const glint = (t: number, offset: number): Vertex => {
        const point = nail(t, offset);
        return { ...point, z: point.z + 0.3 };
      };
      surfaces.push({
        vertices: [
          glint(0.44, tip * 0.47),
          glint(0.7, tip * 0.4),
          glint(0.79, tip * 0.5),
          glint(0.49, tip * 0.62),
        ],
        color: `rgb(193 115 96 / ${0.18 + reflection * 0.55})`,
      });
    }
  }
  return surfaces;
}

export function createScareHand(pose: ScareHandPose): ScareHand {
  const shape = intruderHandPose(pose.curl);
  const surfaces = shape.fingers.flatMap((finger, index) =>
    fingerSurfaces(finger, [5.2, 5.8, 5.1, 4.1][index]!, pose),
  );
  surfaces.push(...fingerSurfaces(shape.thumb, 6.1, pose));
  const contour: readonly Point[] = [
    { x: -14, y: 21 },
    { x: -16, y: 11 },
    { x: -21, y: 6 },
    { x: -24, y: 0 },
    { x: -22, y: -10 },
    { x: -15, y: -17 },
    { x: -5, y: -21 },
    { x: 7, y: -20 },
    { x: 20, y: -12 },
    { x: 23, y: -3 },
    { x: 19, y: 6 },
    { x: 16, y: 14 },
    { x: 14, y: 21 },
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
  // 손목 윤곽과 팔의 접점을 같은 꼭짓점으로 계산해 사선에서도 틈이 벌어지지 않게 한다.
  const left = project(transform({ x: -14, y: 21, z: 2 }), pose.center);
  const right = project(transform({ x: 14, y: 21, z: 2 }), pose.center);
  return {
    surfaces: projected,
    center: pose.center,
    wrist: { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 },
    wristEdges: [left, right],
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
    let underlight: CanvasGradient | undefined;
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
      shade.addColorStop(0, '#403338');
      shade.addColorStop(0.34, '#a4ab91');
      shade.addColorStop(0.7, '#7c7c62');
      shade.addColorStop(1, '#362529');
      ctx.fillStyle = shade;
      const top = Math.min(...full.map((point) => point.y));
      const bottom = Math.max(...full.map((point) => point.y));
      underlight = ctx.createLinearGradient(
        0,
        top,
        0,
        Math.max(top + 1, bottom),
      );
      underlight.addColorStop(0, '#781c1600');
      underlight.addColorStop(0.4, '#781c1600');
      underlight.addColorStop(0.78, '#9c2c2359');
      underlight.addColorStop(1, '#a9342a9c');
    }
    ctx.fill();
    // 이웃한 면의 안티앨리어싱 틈만 메운다.
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 0.45;
    ctx.stroke();
    if (underlight) {
      ctx.fillStyle = underlight;
      ctx.fill();
    }
  }
}
