export const sceneWidth = 1000;
export const sceneHeight = 430;

export type ColorSettings = {
  readonly saturation: number;
  readonly brightness: number;
  readonly chill: number;
  readonly vignette: number;
};

export type Crop = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function removeWhiteBackdrop(pixels: ImageData, preserveUntil = 240): void {
  const { data, width, height } = pixels;
  const visited = new Uint8Array(width * height);
  const region = new Int32Array(width * height);
  const isWhite = (pixel: number): boolean =>
    data[pixel * 4] === 255 &&
    data[pixel * 4 + 1] === 255 &&
    data[pixel * 4 + 2] === 255;

  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || !isWhite(start)) continue;
    let length = 1;
    region[0] = start;
    visited[start] = 1;
    for (let cursor = 0; cursor < length; cursor++) {
      const pixel = region[cursor];
      if (pixel === undefined) continue;
      const neighbors = [pixel - width, pixel + width];
      if (pixel % width !== 0) neighbors.push(pixel - 1);
      if (pixel % width !== width - 1) neighbors.push(pixel + 1);
      for (const neighbor of neighbors) {
        if (
          neighbor < 0 ||
          neighbor >= visited.length ||
          visited[neighbor] ||
          !isWhite(neighbor)
        )
          continue;
        visited[neighbor] = 1;
        region[length++] = neighbor;
      }
    }
    // 벽 위쪽의 작은 전구 하이라이트는 보존하고, 탁자 아래의 흰색 틈도 비운다.
    if (length < 2048 && Math.floor(start / width) < preserveUntil) continue;
    for (let index = 0; index < length; index++) {
      const pixel = region[index];
      if (pixel !== undefined) data[pixel * 4 + 3] = 0;
    }
  }
}

export function prepareMapObjects(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('배경 조합용 Canvas를 사용할 수 없습니다.');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  removeWhiteBackdrop(pixels, Infinity);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export function drawCorridor(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  crop: Crop,
): void {
  const { width, height } = crop;
  const wall = context.createLinearGradient(0, 0, 0, height);
  wall.addColorStop(0, '#655f49');
  wall.addColorStop(0.32, '#a59c7c');
  wall.addColorStop(0.68, '#8f896e');
  wall.addColorStop(1, '#403e31');
  context.fillStyle = wall;
  context.fillRect(0, 0, width, height);

  // 투명한 부분에 벽의 이음새와 습기 자국을 채워 비교 시에도 같은 바탕을 쓴다.
  for (let x = 0; x < width; x += 37) {
    const length = 30 + ((x * 13) % 130);
    context.fillStyle = '#333f3520';
    context.fillRect(x, 48, 2 + (x % 4), length);
  }
  for (let y = 75; y < 290; y += 48) {
    context.fillStyle = '#403e3114';
    context.fillRect(0, y, width, 1);
  }
  const objects = document.createElement('canvas');
  objects.width = width;
  objects.height = height;
  const objectContext = objects.getContext('2d');
  if (!objectContext)
    throw new Error('배경 합성용 Canvas를 사용할 수 없습니다.');
  objectContext.drawImage(
    image,
    crop.x,
    crop.y,
    width,
    height,
    0,
    0,
    width,
    height,
  );
  const pixels = objectContext.getImageData(0, 0, width, height);
  removeWhiteBackdrop(pixels);
  objectContext.putImageData(pixels, 0, 0);
  context.drawImage(objects, 0, 0);
}

export function gradePixels(pixels: ImageData, settings: ColorSettings): void {
  const { data } = pixels;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const lightness = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    // 밝은 전구의 온기는 남기고, 어두운 벽과 나무에 차가운 색을 더한다.
    const shadow = (1 - lightness / 255) * settings.chill;
    data[index] =
      (lightness + (red - lightness) * settings.saturation) *
      settings.brightness *
      (1 - shadow * 0.42);
    data[index + 1] =
      (lightness + (green - lightness) * settings.saturation) *
      settings.brightness *
      (1 - shadow * 0.05);
    data[index + 2] =
      (lightness + (blue - lightness) * settings.saturation) *
        settings.brightness +
      shadow * 22;
  }
}

export function drawViewport(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  position: number,
  vignette: number,
): void {
  context.fillStyle = '#101515';
  context.fillRect(0, 0, sceneWidth, sceneHeight);
  const scale = sceneHeight / source.height;
  const visibleWidth = sceneWidth / scale;
  const offset = Math.max(0, source.width - visibleWidth) * position;
  context.drawImage(
    source,
    offset,
    0,
    visibleWidth,
    source.height,
    0,
    0,
    sceneWidth,
    sceneHeight,
  );
  if (vignette === 0) return;
  const shade = context.createRadialGradient(500, 230, 110, 500, 215, 540);
  shade.addColorStop(0, '#07141600');
  shade.addColorStop(0.65, `rgb(5 15 16 / ${vignette * 0.28})`);
  shade.addColorStop(1, `rgb(3 10 12 / ${vignette})`);
  context.fillStyle = shade;
  context.fillRect(0, 0, sceneWidth, sceneHeight);
}
