import type { Crop } from './corridor-renderer.js';
import type { BackgroundKind } from './background-presets.js';

type Region = Crop & { readonly name: string };

export function drawIndustrial(
  ctx: CanvasRenderingContext2D,
  objects: HTMLCanvasElement,
  components: ReadonlyMap<string, HTMLImageElement>,
  regions: readonly Region[],
  kind: Exclude<BackgroundKind, 'corridor'>,
  centralDoorScale = 1,
  entryClearance = false,
  omitCentralDoor = false,
  omitExitDoors = false,
): void {
  const subway = kind === 'subway';
  const width = 2400;
  const ground = 340;
  const part = (
    name: string,
    x: number,
    y: number,
    w?: number,
    h?: number,
  ): void => {
    const region = regions.find((entry) => entry.name === name);
    if (!region) throw new Error(`배경 조각이 없습니다: ${name}`);
    ctx.drawImage(
      objects,
      region.x,
      region.y,
      region.width,
      region.height,
      x,
      y,
      w ?? region.width,
      h ?? region.height,
    );
  };
  const sprite = (
    name: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void => {
    const image = components.get(name);
    if (!image) throw new Error(`배경 장식이 없습니다: ${name}`);
    ctx.drawImage(image, x, y, w, h);
  };
  const wall = ctx.createLinearGradient(0, 0, 0, ground);
  wall.addColorStop(0, subway ? '#343a33' : '#263f39');
  wall.addColorStop(0.55, subway ? '#76786a' : '#536f59');
  wall.addColorStop(1, '#293934');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, 430);

  if (subway) {
    for (let x = 0; x < width; x += 101) sprite('wall', x, 0, 102, ground);
    const damp = ctx.createLinearGradient(0, 150, 0, ground);
    damp.addColorStop(0, '#28423500');
    damp.addColorStop(1, '#243e35a0');
    ctx.fillStyle = damp;
    ctx.fillRect(0, 140, width, 200);
    for (let x = 0; x < width; x += 350) part('ceiling', x, 0, 350, 58);
    // 선로는 보행면 아래의 배경이며, 위로 오를 발판은 조합하지 않는다.
    for (let x = 0; x < width; x += 300) part('floor', x, ground, 300, 105);
    for (const x of [510, 1690]) part('cart', x, ground + 22, 156, 74);
    for (const x of [60, 740, 1560, 2210]) part('door', x, 153, 125, 187);
    for (const x of [455, 1240, 2020]) {
      part('notice', x, 225, 63, 88);
      part('signal', x + 90, 228, 44, 112);
    }
    for (const x of [270, 600, 1020, 1430, 1860, 2170]) {
      const glow = ctx.createRadialGradient(x + 15, 124, 1, x + 15, 124, 95);
      glow.addColorStop(0, '#d1a95536');
      glow.addColorStop(1, '#d1a95500');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 80, 29, 190, 190);
      part('lamp', x, 105, 30, 35);
    }
  } else {
    for (let x = 0; x < width; x += 150) {
      ctx.fillStyle = '#122b2538';
      ctx.fillRect(x, 55, 3, ground - 55);
      for (const y of [65, 290]) {
        ctx.fillStyle = '#91a89250';
        ctx.fillRect(x + 9, y, 3, 3);
      }
    }
    for (const x of [20, 670, 1310, 1950, 2340])
      sprite('wall', x, 0, 50, ground);
    for (const x of [420, 1600]) {
      if (entryClearance && x === 420) continue;
      sprite('pipe-machine', x, 80, 93, 260);
    }
    for (const x of [760, 1820]) sprite('machine', x, 167, 92, 167);
    for (const x of [120, 1080, 2160]) {
      if (
        (omitCentralDoor && x === 1080) ||
        (omitExitDoors && (x === 120 || x === 2160))
      )
        continue;
      const scale = x === 1080 ? centralDoorScale : 1;
      part(
        'door',
        x - (166 * (scale - 1)) / 2,
        ground - 200 * scale,
        166 * scale,
        200 * scale,
      );
    }
    for (const x of [360, 920, 1480, 2040]) {
      // 광원은 정적인 미리보기로, 조명 아래에서도 이동 공간을 읽을 수 있게 한다.
      const beam = ctx.createLinearGradient(0, 138, 0, ground);
      beam.addColorStop(0, '#daefb54d');
      beam.addColorStop(1, '#daefb500');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x + 14, 136);
      ctx.lineTo(x - 110, ground);
      ctx.lineTo(x + 154, ground);
      ctx.closePath();
      ctx.fill();
      part('lamp', x, 25, 42, 119);
    }
    part('ceiling', 0, 0, width, 48);
    part('floor', 0, ground, width, 110);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, ground);
  shade.addColorStop(0, '#020b0d70');
  shade.addColorStop(0.3, '#020b0d00');
  shade.addColorStop(0.75, '#020b0d00');
  shade.addColorStop(1, '#020b0d38');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, ground);
}
