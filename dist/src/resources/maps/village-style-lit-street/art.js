import { LitSurface } from './surface.js';
function plank(s, x, y, width, height) {
    s.rect(x, y, width, height, '#715c47');
    for (let yy = y; yy < y + height; yy += 10) {
        s.rect(x + 2, yy + 1, width - 4, 8, yy % 20 ? '#95816a' : '#88715a', 5);
        for (let xx = x + 15; xx < x + width; xx += 54)
            s.rect(xx, yy + 3, 2, 3, '#564936', 3);
    }
}
function brick(s, x, y, width, height) {
    s.rect(x, y, width, height, '#4d4544');
    for (let yy = y; yy < y + height - 7; yy += 12)
        for (let xx = x + (yy % 24 ? 0 : 14); xx < x + width - 23; xx += 28)
            s.rect(xx + 1, yy + 2, 25, 9, (xx + yy) % 3 ? '#a88060' : '#b99371', 7);
}
/** 각 시설의 단면과 외벽은 별도 표면이다. 벽만 옅게 해서 실내 기능과 골조를 함께 읽는다. */
export function createBuilding(id, repaired) {
    const width = id === 'workshop' ? 360 : 420;
    const height = id === 'inn' ? 410 : id === 'dojo' ? 280 : 330;
    const base = new LitSurface(width, height), facade = new LitSurface(width, height);
    const floorY = height - (id === 'inn' ? 180 : 10);
    base.rect(18, 92, width - 36, height - 105, '#39352e');
    if (id === 'inn') {
        base.rect(24, 72, width - 48, 157, '#745c4b');
        base.rect(24, 244, width - 48, 153, '#4e5147');
        plank(base, 18, 227, width - 36, 14);
        base.rect(35, 115, 86, 88, '#283946');
        base.rect(43, 121, 70, 64, '#506575');
        base.rect(75, 121, 4, 64, '#b09465', 5);
        base.rect(43, 151, 70, 4, '#b09465', 5);
        // 위층 찻방과 아래층 객실의 기능이 서로 다른 단면.
        base.rect(178, 192, 88, 13, '#b19166', 8);
        base.rect(186, 205, 7, 22, '#a78558', 7);
        base.rect(250, 205, 7, 22, '#a78558', 7);
        base.rect(316, 173, 45, 54, '#826551', 8);
        base.rect(321, 177, 35, 13, '#b0a085', 4);
        base.rect(53, 337, 104, 42, '#887261', 5);
        base.rect(56, 337, 45, 16, '#c2b9a5', 2);
        base.rect(160, 322, 5, 66, '#645542', 5);
        base.rect(218, 265, 145, 104, '#536051', 3);
        base.rect(232, 277, 120, 75, '#818267', 2);
        facade.rect(22, 72, width - 44, height - 88, '#a79577');
        for (let x = 35; x < width - 35; x += 84)
            facade.rect(x, 78, 4, height - 104, '#84674e', 6);
        facade.rect(49, 104, 83, 85, '#263c45');
        facade.rect(59, 112, 63, 65, '#ac976c', 2);
        facade.rect(88, 112, 4, 65, '#533c2c', 5);
        facade.rect(59, 141, 63, 4, '#533c2c', 5);
        facade.rect(185, 163, 71, 64, '#4c4238', 2);
        facade.rect(203, 173, 35, 50, '#8a7960', 3);
        facade.rect(47, 283, 92, 70, '#455c61', 2);
        facade.rect(65, 295, 55, 44, '#829294', 2);
        base.poly([
            [4, 79],
            [210, 3],
            [416, 79],
            [405, 97],
            [210, 33],
            [15, 97],
        ], '#48595d');
        for (let x = 25; x < 397; x += 17) {
            const y = 70 - (1 - Math.abs(x - 210) / 190) * 54;
            base.rect(x, y, 14, 10, '#6c7a76', 7);
            base.rect(x, y + 13, 14, 8, '#56696a', 5);
        }
        base.poly([
            [157, 54],
            [210, 8],
            [263, 54],
        ], '#4b615d');
        base.rect(172, 46, 77, 32, '#8a8b70', 3);
        base.rect(195, 45, 30, 30, '#baa879', 3);
        base.rect(208, 45, 4, 30, '#5c5943', 6);
        base.rect(195, 58, 30, 4, '#5c5943', 6);
        base.rect(17, 226, width - 34, 10, '#ae9165', 6);
        base.rect(20, 90, 9, height - 93, '#604a37', 8);
        base.rect(width - 29, 90, 9, height - 93, '#604a37', 8);
    }
    else if (id === 'workshop') {
        brick(base, 23, 120, 132, 186);
        base.rect(64, 202, 66, 93, '#3b3029');
        base.poly([
            [64, 202],
            [79, 181],
            [114, 181],
            [130, 202],
        ], '#50352d');
        base.rect(72, 223, 50, 63, '#241e1d');
        base.rect(203, 255, 107, 13, '#a38663', 7);
        base.rect(214, 268, 8, 43, '#6a4f38', 6);
        base.rect(292, 268, 8, 43, '#6a4f38', 6);
        base.rect(213, 238, 35, 16, '#535c5a', 9);
        base.rect(217, 230, 28, 9, '#8e9690', 6);
        base.rect(177, 135, 128, 10, '#a18764', 5);
        for (let x = 186; x < 300; x += 25)
            base.rect(x, 148, 6, 37, '#857a69', 6);
        // 큰 벽은 차분하게 두고 화덕 가까운 낮은 벽돌에 요철을 모은다.
        facade.rect(22, 119, width - 44, 190, '#a99a7b', 2);
        brick(facade, 22, 230, 113, 79);
        facade.rect(317, 122, 8, 187, '#6d5c45', 6);
        facade.rect(24, 122, 8, 187, '#6d5c45', 6);
        facade.rect(140, 209, 64, 106, '#554635', 6);
        plank(facade, 144, 214, 56, 100);
        facade.rect(230, 168, 75, 59, '#343932');
        facade.rect(236, 175, 62, 44, '#a89367', 2);
        facade.rect(263, 175, 4, 44, '#665338', 5);
        base.poly([
            [7, 123],
            [67, 64],
            [282, 64],
            [353, 123],
            [337, 140],
            [23, 140],
        ], '#515b61');
        for (let yy = 70; yy < 125; yy += 12)
            for (let xx = 77; xx < 278; xx += 24)
                base.rect(xx, yy, 20, 8, '#667778', 7);
        brick(base, 48, 20, 40, 64);
        base.rect(42, 15, 52, 10, '#958b77', 8);
        base.rect(17, 135, 10, 177, '#6b5540', 8);
        base.rect(333, 135, 10, 177, '#6b5540', 8);
    }
    else {
        base.rect(28, 113, width - 56, 152, '#82785d', 2);
        plank(base, 28, 221, width - 56, 44);
        base.rect(70, 238, 279, 20, repaired ? '#bd9b65' : '#766a52', 3);
        for (let x = 80; x < 340; x += 55)
            base.rect(x, 238, 2, 20, '#846f46', 2);
        base.rect(279, 170, 10, 68, '#ac8151', 8);
        base.rect(256, 196, 53, 7, '#b68a56', 6);
        base.rect(73, 139, 57, 60, '#cdc0a1');
        base.rect(82, 147, 39, 44, '#827d63', 2);
        facade.rect(26, 113, width - 52, 151, repaired ? '#a6a68a' : '#7a806c', 3);
        for (let x = 40; x < width - 40; x += 62)
            facade.rect(x, 118, 4, 147, '#66684e', 4);
        facade.rect(169, 166, 84, 102, '#594f38', 5);
        plank(facade, 174, 171, 74, 97);
        if (!repaired) {
            facade.rect(75, 173, 43, 13, '#5a5342', 4);
            facade.rect(130, 208, 57, 9, '#5a5342', 4);
        }
        base.poly([
            [0, 103],
            [35, 93],
            [88, 40],
            [325, 40],
            [384, 92],
            [419, 103],
            [415, 119],
            [210, 98],
            [5, 119],
        ], repaired ? '#4f6964' : '#495856');
        for (let yy = 50; yy < 104; yy += 26)
            for (let xx = 89; xx < 326; xx += 22) {
                if (!repaired && xx > 245 && yy < 76)
                    continue;
                base.rect(xx, yy, 19, 9, repaired ? '#748f79' : '#607268', 7);
            }
        base.rect(7, 110, 35, 6, repaired ? '#a8b38c' : '#7e8e76', 5);
        base.rect(378, 110, 35, 6, repaired ? '#a8b38c' : '#7e8e76', 5);
        base.rect(26, 112, 11, 155, '#796044', 8);
        base.rect(width - 37, 112, 11, 155, '#796044', 8);
    }
    plank(base, 15, height - 12, width - 30, 11);
    base.seal();
    facade.seal();
    return { base, facade, width, height, floorY };
}
