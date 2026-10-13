import { LitSurface } from '../village-style-lit-street/surface.js';
import { buildings } from './village.js';
export const mapSize = { width: 720, height: 560 };
export const worldPixel = (point) => ({ x: 360 + point.x * 20, y: 280 + point.z * 14 });
export function createTerrain() {
    const s = new LitSurface(720, 560);
    s.rect(0, 0, 720, 560, '#586e58');
    s.rect(58, 82, 604, 401, '#6e8261');
    for (let i = 0; i < 130; i++) {
        const x = 68 + ((i * 73) % 580), y = 92 + ((i * 43) % 372);
        s.rect(x, y, 5 + (i % 4), 2, i % 3 ? '#788b68' : '#5e755b', 1);
    }
    // 용도별 길 폭을 달리해 큰 마당과 작은 문 앞을 구분한다.
    s.rect(285, 186, 74, 263, '#b4ae88', 1);
    s.rect(184, 296, 143, 42, '#b4ae88', 1);
    s.rect(309, 332, 295, 52, '#b4ae88', 1);
    s.rect(500, 267, 55, 116, '#b4ae88', 1);
    s.rect(264, 221, 83, 39, '#b4ae88', 1);
    for (let i = 0; i < 65; i++) {
        const x = 289 + (i % 7) * 9, y = 265 + Math.floor(i / 7) * 16;
        s.rect(x, y, 6, 3, '#c6bc98', 2);
    }
    s.rect(434, 69, 31, 428, '#4d7479');
    s.rect(437, 69, 3, 428, '#82a096', 2);
    s.rect(462, 69, 4, 428, '#465e5c', 3);
    s.rect(431, 335, 39, 48, '#8e7957', 3);
    for (let y = 337; y < 381; y += 7)
        s.rect(430, y, 42, 5, '#c1a47a', 6);
    s.rect(426, 334, 4, 51, '#d0b181', 8);
    s.rect(471, 334, 4, 51, '#d0b181', 8);
    s.seal();
    return s;
}
export function createHouse(id, repaired) {
    const building = buildings.find((b) => b.id === id);
    const p = worldPixel(building);
    const base = new LitSurface(160, 154), roof = new LitSurface(160, 154);
    const x = p.x - 80, y = p.y - 150;
    // 실내 바닥·가구·주민은 같은 좌표에 놓이고 지붕과 창문만 가림을 담당한다.
    base.rect(20, 80, 120, 70, '#635440');
    for (let yy = 82; yy < 149; yy += 8) {
        base.rect(22, yy, 116, 6, '#9a8460', 4);
        base.rect(30 + (yy % 3) * 10, yy + 2, 10, 1, '#806b4d', 2);
    }
    base.rect(18, 74, 124, 9, '#574d3b', 7);
    base.rect(18, 80, 4, 67, '#c0b08b', 5);
    base.rect(138, 80, 4, 67, '#c0b08b', 5);
    if (id === 'workshop') {
        base.rect(31, 92, 33, 34, '#6c5040', 7);
        base.rect(35, 97, 25, 5, '#bd9b72', 7);
        base.rect(38, 111, 20, 16, '#342d27');
        base.rect(92, 111, 37, 9, '#b39871', 5);
        base.rect(96, 120, 5, 14, '#654d35', 6);
        base.rect(120, 120, 5, 14, '#654d35', 6);
        base.rect(97, 104, 13, 6, '#738180', 6);
        roof.rect(22, 103, 116, 44, '#a18768', 4);
        for (let yy = 105; yy < 145; yy += 9)
            for (let xx = 24 + (yy % 2) * 10; xx < 125; xx += 23)
                roof.rect(xx, yy, 20, 7, '#be9d75', 6);
        roof.poly([
            [11, 103],
            [29, 34],
            [131, 34],
            [149, 103],
        ], '#47656a');
        for (let yy = 42; yy < 99; yy += 11)
            for (let xx = 31; xx < 130; xx += 20)
                roof.rect(xx, yy, 17, 8, '#607b78', 7);
        roof.rect(33, 18, 19, 38, '#9f775e', 5);
        roof.rect(30, 15, 25, 5, '#c0aa86', 6);
    }
    else if (id === 'dojo') {
        base.rect(49, 102, 62, 26, repaired ? '#bec29a' : '#766f54', 2);
        for (let xx = 49; xx < 110; xx += 16)
            base.rect(xx, 102, 1, 26, '#858968', 3);
        base.rect(100, 88, 5, 27, '#ab8855', 7);
        base.rect(91, 99, 23, 4, '#ab8855', 5);
        roof.rect(21, 100, 118, 47, repaired ? '#c3bc94' : '#919276', 3);
        for (let xx = 24; xx < 140; xx += 18)
            roof.rect(xx, 102, 3, 44, '#756f4f', 5);
        roof.poly([
            [2, 105],
            [16, 94],
            [37, 45],
            [122, 45],
            [145, 94],
            [158, 105],
            [150, 113],
            [10, 113],
        ], '#405b59');
        for (let yy = 52; yy < 101; yy += 10)
            for (let xx = 35; xx < 127; xx += 18) {
                if (!repaired && xx > 100 && yy < 72)
                    continue;
                roof.rect(xx, yy, 15, 7, repaired ? '#789080' : '#61756a', 7);
            }
        if (!repaired) {
            roof.rect(107, 118, 24, 4, '#5b5948', 3);
            roof.rect(35, 130, 29, 4, '#5b5948', 3);
        }
    }
    else {
        base.rect(29, 85, 101, 8, '#ad9872', 5);
        base.rect(47, 111, 38, 10, '#bd9b70', 6);
        base.rect(52, 121, 4, 15, '#66533f', 5);
        base.rect(76, 121, 4, 15, '#66533f', 5);
        base.rect(98, 105, 26, 29, '#859678', 4);
        base.rect(34, 102, 6, 24, '#beb392', 6);
        roof.rect(21, 100, 118, 47, '#b6ab88', 3);
        for (let xx = 24; xx < 135; xx += 15)
            roof.rect(xx, 102, 2, 42, '#8c7959', 4);
        roof.poly([
            [7, 103],
            [80, 21],
            [152, 103],
        ], '#705e4c');
        for (let yy = 58; yy < 101; yy += 9) {
            const half = (yy - 21) * 0.83;
            for (let xx = 80 - half + 7; xx < 80 + half - 5; xx += 17)
                roof.rect(xx, yy, 14, 6, '#a18b62', 6);
        }
        roof.rect(15, 101, 130, 6, '#c3a574', 7);
    }
    const windows = [
        { x: 27, y: 112, width: 35, height: 29 },
        { x: 98, y: 112, width: 35, height: 29 },
    ];
    for (const w of windows) {
        roof.rect(w.x - 3, w.y - 3, w.width + 6, w.height + 6, '#5f5038', 6);
        roof.context.clearRect(w.x, w.y, w.width, w.height);
    }
    roof.rect(70, 111, 21, 36, '#816b4f', 5);
    roof.rect(73, 113, 15, 31, '#a18b67', 3);
    roof.rect(85, 131, 2, 2, '#e4ce8e', 6);
    base.seal();
    roof.seal();
    return { base, roof, x, y, windows };
}
