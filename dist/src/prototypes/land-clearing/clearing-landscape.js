import { groundPathGeometry } from '../../rendering/ground-path.js';
import { groundGeometry } from '../../rendering/ground-geometry.js';
import { forestClearingLayout, insideForestClearing, } from './forest-clearing-layout.js';
import * as THREE from 'three';
import { setResourceOutline, } from '../../resources/environment/environment-resources.js';
import { groveLayout, insideGrove } from './grove-layout.js';
import { clearing } from './clearing-rules.js';
import { discoveryLayout } from './clearing-discovery.js';
/** 저장된 자원 좌표와 물길은 유지하고 그 바깥의 숲·길·지면을 연결한다. GPU 자원은 장면이 정리한다. */
export function createClearingLandscape(resources, obstacles) {
    const group = new THREE.Group();
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const stone = new THREE.DodecahedronGeometry(1, 0);
    const { channel } = discoveryLayout;
    function mesh(geometry, color, surface, outline = 'ground') {
        const item = new THREE.Mesh(geometry, resources.material(surface, color));
        setResourceOutline(item, outline);
        item.receiveShadow = true;
        group.add(item);
        return item;
    }
    function box(x, y, z, width, height, depth, color, surface = 'earth') {
        const item = mesh(cube, color, surface, surface === 'wood' ? 'fence' : 'ground');
        item.position.set(x, y, z);
        item.scale.set(width, height, depth);
        item.castShadow = height > 0.15;
        return item;
    }
    function patch(x, z, width, depth, color, height = 0.008, surface = 'grass') {
        const contour = Array.from({ length: 11 }, (_, i) => {
            const angle = (i / 11) * Math.PI * 2;
            const spread = 0.88 + Math.sin(i * 2.1 + x * 0.7 + z) * 0.12;
            return { x: Math.cos(angle) * spread, z: Math.sin(angle) * spread };
        });
        const item = mesh(groundGeometry(contour), color, surface);
        item.position.set(x, height, z);
        item.scale.set(width, 1, depth);
    }
    function rock(x, z, size, color = 0x7d866a) {
        if (insideGrove({ x, z }, -0.8) || insideForestClearing({ x, z }, -0.8))
            return;
        const item = mesh(stone, color, 'stone', 'rock');
        item.position.set(x, size * 0.36, z);
        item.scale.set(size, size * 0.48, size * 0.76);
        item.rotation.y = x * 2.3 + z;
        item.castShadow = size > 0.3;
    }
    function tree(x, z, size) {
        if (insideGrove({ x, z }, -2.1) || insideForestClearing({ x, z }, -2.1))
            return;
        const item = resources.createTree(size);
        item.position.set(x, 0, z);
        item.rotation.y = x * 0.23 + z;
        group.add(item);
    }
    function path(points, halfWidth, color, height = 0.014) {
        const item = mesh(groundPathGeometry(points, halfWidth), color, 'path');
        item.position.y = height;
    }
    // 가장자리가 잘린 전시용 바닥 대신 숲 밖까지 이어지는 지면을 그린다.
    box(0, -0.38, 0, 100, 0.3, 100, 0x756b50);
    for (const [near, far] of [
        [-50, channel.z - channel.halfWidth],
        [channel.z + channel.halfWidth, 50],
    ]) {
        box(0, -0.13, (near + far) / 2, 100, 0.25, far - near, 0x768858, 'grass');
    }
    patch(0, 1.9, 9.7, 6.1, 0x92a16a);
    patch(-5.3, 1.2, 4.1, 4.3, 0x899662, 0.009);
    patch(5, 2.1, 3.7, 4, 0x9ca773, 0.009);
    patch(0.8, -1.3, 3.6, 2.4, 0x979870, 0.01);
    patch(5.7, -7.05, 2.3, 0.8, 0xb2b184, 0.011, 'earth');
    path([
        { x: 1, z: 50 },
        { x: -0.6, z: 12 },
        clearing.exit,
        { x: 0, z: 4.6 },
        { x: 1.1, z: 1.1 },
        { x: 0.3, z: -2.2 },
    ], clearing.exit.halfWidth, 0xb5aa81);
    path([
        { x: 0.2, z: 3.4 },
        { x: -2.2, z: 1.2 },
        { x: -5.8, z: -0.8 },
        { x: -6.5, z: -3.7 },
    ], 0.5, 0xa5a17a);
    path([
        { x: 0.7, z: 1.5 },
        { x: 3.9, z: 0.7 },
        { x: 6.8, z: -1.7 },
        { x: 6.3, z: -3.6 },
    ], 0.48, 0xa5a17a);
    {
        const area = forestClearingLayout.room;
        patch(area.x, area.z, area.width / 2 + 0.7, area.depth / 2 + 0.6, 0x91a278);
        patch(area.x - 2.3, area.z + 1.8, 3.3, 3.5, 0x91a278, 0.009);
        patch(area.x + 2, area.z - 2, 3.5, 3.7, 0x91a278, 0.009);
        path(forestClearingLayout.transportPath, 0.55, 0xb0a27c);
        // 두 바퀴 자국은 예전 운반길의 방향을 짧게 남긴다.
        for (const offset of [-0.22, 0.22])
            path([
                { x: 17.4, z: 3.5 + offset },
                { x: 20.2, z: 3.5 + offset },
            ], 0.065, 0x928967, 0.019);
        path(forestClearingLayout.shortcutPath, 0.55, 0xb0a27c, 0.032);
        const { start, ends } = forestClearingLayout.route;
        for (const end of Object.values(ends)) {
            path([start, end], 0.88, 0xb0a27c);
            patch(end.x, end.z, 1.3, 1.15, 0xa5a17a, 0.015, 'earth');
        }
        // 북쪽 작업길과 벌목터 사이의 잡목은 닫힌 지름길의 우회 불가 지형이다.
        for (let i = 0; i < 5; i++)
            for (const x of [18.3, 19.25]) {
                const brush = resources.createBrush();
                brush.position.set(x, 0, -3.3 + i * 1.05);
                brush.scale.set(1.55, 1.8, 1.55);
                group.add(brush);
            }
        // 채집 대상과 혼동하지 않게 낮은 그루터기·운반 통나무만 작업장 가장자리에 둔다.
        const stumpGeometry = new THREE.CylinderGeometry(0.34, 0.43, 0.3, 9);
        const logGeometry = new THREE.CylinderGeometry(0.16, 0.19, 2.4, 8);
        for (const point of [
            { x: 24.4, z: 4.3 },
            { x: 28, z: 2.7 },
        ]) {
            const stump = mesh(stumpGeometry, 0x8a785c, 'wood', 'tree');
            stump.position.set(point.x, 0.15, point.z);
            stump.castShadow = true;
        }
        for (let i = 0; i < 2; i++) {
            const log = mesh(logGeometry, 0x817354, 'wood', 'tree');
            log.position.set(26.1, 0.18, 3.7 + i * 0.4);
            log.rotation.z = Math.PI / 2;
            log.rotation.y = 0.08;
            log.castShadow = true;
        }
        box(20.4, 0.38, 4.4, 0.12, 0.76, 0.12, 0x827050, 'wood');
        const sign = box(20.4, 0.78, 4.4, 0.9, 0.3, 0.1, 0x99835e, 'wood');
        sign.rotation.z = -0.1;
        for (let i = 0; i < 3; i++)
            box(20.12 + i * 0.17, 0.8 - i * 0.03, 4.46, 0.1, 0.04, 0.018, 0xbab293, 'wood');
        for (let i = 0; i < 7; i++) {
            tree(31.4, 5 - i * 2, 0.85 + (i % 2) * 0.1);
            tree(20 + i * 1.6, 7.4, 0.85);
        }
        const { room, corridor, trail } = groveLayout;
        box(room.x, 0, room.z, room.width, 0.008, room.depth, 0x91a278, 'grass');
        path([
            { x: 8.2, z: corridor.z },
            { x: 12, z: corridor.z },
            { x: 17.4, z: room.z },
        ], 0.65, 0xb5aa81);
        box(trail.x, 0, trail.z, trail.width, 0.008, trail.depth, 0x91a278, 'grass');
        path([
            { x: 15.3, z: 2.2 },
            { x: 15.3, z: -2.8 },
        ], 0.55, 0xb5aa81);
        patch(14.8, 3, 3.1, 1.9, 0xa8ad7a, 0.01);
        for (let i = 0; i < 5; i++) {
            if (!insideGrove({ x: 11.4 + i * 1.8, z: -1.6 }, -0.7))
                tree(11.4 + i * 1.8, -1.6, 0.85);
            tree(11.4 + i * 1.8, 7.8, 0.78);
        }
        for (let i = 0; i < 4; i++)
            tree(20.2, 0.5 + i * 2, 1);
        // 풀·꽃·바닥색으로 원래 공터와 다른 넓은 채집 구역을 구분한다.
        for (let i = 0; i < 18; i++) {
            const x = 11.6 + (i % 6) * 1.12, z = 0.4 + Math.floor(i / 6) * 2.4;
            box(x, 0.1, z, 0.07, 0.2, 0.07, 0x738553, 'grass');
            patch(x, z, 0.11, 0.1, i % 2 ? 0xdbba72 : 0xc5bea4, 0.2, 'grass');
        }
    }
    box(groveLayout.sign.x, 0.35, groveLayout.sign.z, 0.1, 0.7, 0.1, 0x827050, 'wood');
    box(groveLayout.sign.x, 0.7, groveLayout.sign.z, 0.65, 0.28, 0.09, 0xa18a5e, 'wood');
    // 채집물 밑의 낙엽·자갈은 위치를 바꾸지 않고도 각 무리를 지형에 연결한다.
    for (const item of obstacles) {
        if (item.id === discoveryLayout.source.id)
            continue;
        const size = item.kind === 'tree' ? 1.3 : item.kind === 'rock' ? 0.95 : 0.66;
        patch(item.x, item.z, size, size * 0.7, item.kind === 'rock' ? 0xa4a189 : 0x8c9565, 0.023, 'earth');
        for (let i = 0; i < 3; i++) {
            const angle = i * 2.4 + item.id;
            const x = item.x + Math.cos(angle) * size;
            const z = item.z + Math.sin(angle) * size * 0.6;
            if (Math.abs(z - channel.z) < channel.halfWidth + 0.1)
                continue;
            if (item.kind === 'rock')
                rock(x, z, 0.1 + i * 0.035, 0xb5ad91);
            else
                box(x, 0.026, z, 0.16, 0.025, 0.07, 0xb0a371, 'earth').rotation.y =
                    angle;
        }
    }
    // 물가를 따라 낮은 흙턱과 자갈을 놓되 저장된 다리의 착지·통행 구간은 비워 둔다.
    for (let i = 0; i < 27; i++) {
        const x = -10.5 + i * 0.81 + Math.sin(i * 2.7) * 0.16;
        for (const side of [-1, 1]) {
            const z = channel.z +
                side * (channel.halfWidth + 0.14 + Math.sin(i * 1.8) * 0.035);
            patch(x, z, 0.48, 0.19, i % 3 ? 0x929777 : 0x858b69, 0.021, 'earth');
            if (i % 3 === 0)
                rock(x + 0.18, z, 0.11, 0xb4b39a);
        }
    }
    for (let i = 0; i < 5; i++) {
        const x = discoveryLayout.source.x - 1.1 + i * 0.52;
        rock(x, -6.65 - (i % 2) * 0.15, 0.4 + (i % 3) * 0.12);
        patch(x, -6.55, 0.57, 0.3, 0x677c53, 0.03);
    }
    // 상류의 돌무더기와 하류의 모래톱으로 샘터와 물품이 모이는 물가를 구분한다.
    patch(8.7, -3.9, 1, 0.55, 0xc0b690, 0.023, 'earth');
    for (const x of [8, 8.6, 9.2])
        rock(x, -3.9 + Math.sin(x) * 0.12, 0.11, 0xd0c5a3);
    // 북쪽은 깊은 숲, 측면은 수목과 바위, 입구 양옆은 낮은 식생으로 둘러싼다.
    for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 14; i++) {
            if ((i + row * 2) % 5 === 1)
                continue;
            const x = -17 + i * 2.6 + row * 0.65 + Math.sin(i * 2.1) * 0.6;
            tree(x, -9.8 - row * 3.3 - (i % 3) * 0.42 - Math.cos(i * 1.7) * 0.7, 0.85 + ((i + row) % 4) * 0.17);
        }
    }
    for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 10; i++) {
            tree(-18 + i * 4 + row, -18 - row * 5 - (i % 3), 1.3 + (i % 3) * 0.18);
        }
    }
    for (const side of [-1, 1]) {
        for (let i = 0; i < 10; i++) {
            const z = -6.8 + i * 1.85 + Math.sin(i * 1.9) * 0.45;
            if ((i + side + 1) % 4 !== 0)
                tree(side * (11.9 + (i % 3) * 0.65), z, 0.72 + (i % 3) * 0.17);
            if (i % 2 === 0)
                tree(side * (15.2 + (i % 2)), z + 0.7, 1.15);
            if (i % 3 !== 1) {
                rock(side * (clearing.width / 2 + 0.5 + (i % 2) * 0.3), z + 0.35, 0.5 + (i % 3) * 0.15);
                rock(side * (clearing.width / 2 + 1), z + 0.9, 0.26);
            }
        }
        for (let i = 0; i < 6; i++) {
            const x = side * (2.5 + i * 1.55);
            if (i % 3 !== 1)
                rock(x, clearing.depth / 2 + 0.4 + (i % 2) * 0.3, 0.4 + (i % 3) * 0.15);
            patch(x, 8.1, 1, 0.65, 0x6b8154, 0.027);
            if (i > 2)
                tree(x + side * 0.4, 11.7 + (i % 2), 0.6);
        }
        for (let i = 0; i < 3; i++) {
            box(side * 1.7, 0.32, 7.3 + i * 0.9, 0.12, 0.64, 0.12, 0x827050, 'wood');
        }
        box(side * 1.7, 0.42, 8.2, 0.07, 0.07, 1.85, 0xa18a5e, 'wood');
    }
    // 밟을 수 있는 작은 풀과 낙엽만 공터 안에 두어 채집 잡목과 구분한다.
    for (let i = 0; i < 75; i++) {
        const x = -9.4 + ((i * 5.71) % 18.8);
        const z = -7.6 + ((i * 3.39) % 15.2);
        if (Math.abs(z - channel.z) < channel.halfWidth + 0.35 ||
            (Math.abs(x) < 1.5 && z > 3.5))
            continue;
        const grass = box(x, 0.07, z, 0.05, 0.14, 0.17, i % 3 ? 0x788e52 : 0xbbab70, 'grass');
        grass.rotation.z = Math.sin(i) * 0.4;
    }
    box(-1.8, 0.42, 6.6, 0.12, 0.84, 0.12, 0x826342, 'wood');
    box(-1.8, 0.73, 6.6, 0.85, 0.31, 0.12, 0xb99a68, 'wood');
    // 표지판의 아래쪽 화살표는 돌아가는 길을 가리킨다.
    box(-1.8, 0.74, 6.67, 0.07, 0.15, 0.012, 0xefe1b1, 'wood');
    for (const side of [-1, 1]) {
        const arrow = box(-1.8 + side * 0.047, 0.68, 6.67, 0.13, 0.045, 0.014, 0xefe1b1, 'wood');
        arrow.rotation.z = (side * Math.PI) / 4;
    }
    return group;
}
