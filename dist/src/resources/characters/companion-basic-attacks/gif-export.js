const paletteSize = 256;
const minimumCodeSize = 8;
const clearCode = 1 << minimumCodeSize;
const endCode = clearCode + 1;
const maximumCodeCount = 4096;
function colorKey(data, offset) {
    return (((data[offset] ?? 0) << 16) |
        ((data[offset + 1] ?? 0) << 8) |
        (data[offset + 2] ?? 0));
}
function countColors(frames) {
    const histogram = new Map();
    for (const { data } of frames) {
        for (let offset = 0; offset < data.length; offset += 4) {
            const key = colorKey(data, offset);
            const existing = histogram.get(key);
            if (existing) {
                existing.count += 1;
                continue;
            }
            histogram.set(key, {
                key,
                color: [(key >> 16) & 255, (key >> 8) & 255, key & 255],
                count: 1,
            });
        }
    }
    return [...histogram.values()];
}
function createColorBox(colors) {
    const minimum = [255, 255, 255];
    const maximum = [0, 0, 0];
    let count = 0;
    for (const entry of colors) {
        count += entry.count;
        for (const axis of [0, 1, 2]) {
            minimum[axis] = Math.min(minimum[axis], entry.color[axis]);
            maximum[axis] = Math.max(maximum[axis], entry.color[axis]);
        }
    }
    let axis = 0;
    for (const candidate of [1, 2]) {
        if (maximum[candidate] - minimum[candidate] >
            maximum[axis] - minimum[axis]) {
            axis = candidate;
        }
    }
    return { colors, count, axis, range: maximum[axis] - minimum[axis] };
}
function averageColor(box) {
    let red = 0;
    let green = 0;
    let blue = 0;
    for (const { color, count } of box.colors) {
        red += color[0] * count;
        green += color[1] * count;
        blue += color[2] * count;
    }
    return [
        Math.round(red / box.count),
        Math.round(green / box.count),
        Math.round(blue / box.count),
    ];
}
function createPalette(colors) {
    if (colors.length <= paletteSize)
        return colors.map(({ color }) => color);
    const boxes = [createColorBox(colors)];
    while (boxes.length < paletteSize) {
        let selectedIndex = -1;
        let highestScore = -1;
        for (const [index, box] of boxes.entries()) {
            if (box.colors.length < 2)
                continue;
            const score = box.range * Math.sqrt(box.count);
            if (score > highestScore) {
                highestScore = score;
                selectedIndex = index;
            }
        }
        const box = boxes[selectedIndex];
        if (!box)
            break;
        const sorted = [...box.colors].sort((left, right) => left.color[box.axis] - right.color[box.axis]);
        let count = 0;
        let splitIndex = 1;
        for (let index = 0; index < sorted.length - 1; index += 1) {
            count += sorted[index]?.count ?? 0;
            splitIndex = index + 1;
            if (count >= box.count / 2)
                break;
        }
        boxes.splice(selectedIndex, 1, createColorBox(sorted.slice(0, splitIndex)), createColorBox(sorted.slice(splitIndex)));
    }
    return boxes.map(averageColor);
}
function indexColors(colors, palette) {
    const indices = new Map();
    for (const { key, color } of colors) {
        let closestIndex = 0;
        let closestDistance = Infinity;
        for (const [index, candidate] of palette.entries()) {
            const distance = (color[0] - candidate[0]) ** 2 +
                (color[1] - candidate[1]) ** 2 +
                (color[2] - candidate[2]) ** 2;
            if (distance < closestDistance) {
                closestIndex = index;
                closestDistance = distance;
                if (distance === 0)
                    break;
            }
        }
        indices.set(key, closestIndex);
    }
    return indices;
}
class GifLzwEncoder {
    dictionary = new Map();
    bytes = [];
    nextCode = endCode + 1;
    codeSize = minimumCodeSize + 1;
    bitBuffer = 0;
    bitCount = 0;
    encode(pixels) {
        this.writeCode(clearCode);
        let prefix = pixels[0] ?? 0;
        for (let index = 1; index < pixels.length; index += 1) {
            const suffix = pixels[index] ?? 0;
            const key = (prefix << 8) | suffix;
            const existing = this.dictionary.get(key);
            if (existing !== undefined) {
                prefix = existing;
                continue;
            }
            this.writeCode(prefix);
            if (this.nextCode < maximumCodeCount) {
                this.dictionary.set(key, this.nextCode);
                this.nextCode += 1;
            }
            else {
                this.writeCode(clearCode);
                this.dictionary.clear();
                this.nextCode = endCode + 1;
                this.codeSize = minimumCodeSize + 1;
            }
            prefix = suffix;
        }
        this.writeCode(prefix);
        this.writeCode(endCode);
        if (this.bitCount > 0)
            this.bytes.push(this.bitBuffer & 255);
        return this.bytes;
    }
    writeCode(code) {
        this.bitBuffer |= code << this.bitCount;
        this.bitCount += this.codeSize;
        while (this.bitCount >= 8) {
            this.bytes.push(this.bitBuffer & 255);
            this.bitBuffer >>>= 8;
            this.bitCount -= 8;
        }
        // 복호기의 사전 등록이 한 단어 늦으므로 경계 코드를 쓴 뒤 비트 폭을 늘린다.
        if (this.nextCode === 1 << this.codeSize && this.codeSize < 12) {
            this.codeSize += 1;
        }
    }
}
class GifWriter {
    bytes = [];
    writeBytes(...bytes) {
        this.bytes.push(...bytes);
    }
    writeWord(value) {
        this.writeBytes(value & 255, (value >> 8) & 255);
    }
    writeText(value) {
        for (const character of value)
            this.bytes.push(character.charCodeAt(0));
    }
    writeSubBlocks(bytes) {
        for (let offset = 0; offset < bytes.length; offset += 255) {
            const block = bytes.slice(offset, offset + 255);
            this.writeBytes(block.length, ...block);
        }
        this.writeBytes(0);
    }
    toBlob() {
        return new Blob([new Uint8Array(this.bytes)], { type: 'image/gif' });
    }
}
export function encodeGif(frames, delayCentiseconds) {
    const first = frames[0];
    if (!first)
        throw new Error('GIF를 만들 프레임이 없습니다.');
    if (!Number.isInteger(delayCentiseconds) ||
        delayCentiseconds < 0 ||
        delayCentiseconds > 65535) {
        throw new Error('GIF 프레임 간격은 0~65535의 정수여야 합니다.');
    }
    const { width, height } = first;
    if (width < 1 || height < 1 || width > 65535 || height > 65535) {
        throw new Error('GIF 크기는 가로·세로 각각 1~65535여야 합니다.');
    }
    for (const frame of frames) {
        if (frame.width !== width || frame.height !== height) {
            throw new Error('GIF의 모든 프레임 크기가 같아야 합니다.');
        }
    }
    const colors = countColors(frames);
    const palette = createPalette(colors);
    const indices = indexColors(colors, palette);
    const writer = new GifWriter();
    writer.writeText('GIF89a');
    writer.writeWord(width);
    writer.writeWord(height);
    writer.writeBytes(0xf7, 0, 0);
    for (let index = 0; index < paletteSize; index += 1) {
        writer.writeBytes(...(palette[index] ?? [0, 0, 0]));
    }
    writer.writeBytes(0x21, 0xff, 11);
    writer.writeText('NETSCAPE2.0');
    writer.writeBytes(3, 1, 0, 0, 0);
    for (const frame of frames) {
        writer.writeBytes(0x21, 0xf9, 4, 4);
        writer.writeWord(delayCentiseconds);
        writer.writeBytes(0, 0, 0x2c);
        writer.writeWord(0);
        writer.writeWord(0);
        writer.writeWord(width);
        writer.writeWord(height);
        writer.writeBytes(0, minimumCodeSize);
        const pixels = new Uint8Array(width * height);
        for (let index = 0; index < pixels.length; index += 1) {
            pixels[index] = indices.get(colorKey(frame.data, index * 4)) ?? 0;
        }
        writer.writeSubBlocks(new GifLzwEncoder().encode(pixels));
    }
    writer.writeBytes(0x3b);
    return writer.toBlob();
}
