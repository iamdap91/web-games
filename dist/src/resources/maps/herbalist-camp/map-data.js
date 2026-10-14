import { resourceUrl } from '../../catalog/resource-url.js';
function record(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error('맵 데이터에 객체가 필요합니다.');
    return value;
}
function number(value, name, minimum = 0) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum)
        throw new Error(`맵의 ${name} 값이 올바르지 않습니다.`);
    return value;
}
function text(value, name) {
    if (typeof value !== 'string' || value.trim().length === 0)
        throw new Error(`맵의 ${name} 문자열이 없습니다.`);
    return value;
}
function list(value, name) {
    if (!Array.isArray(value))
        throw new Error(`맵의 ${name} 목록이 없습니다.`);
    return value;
}
function point(value) {
    const item = record(value);
    return { x: number(item.x, 'x'), y: number(item.y, 'y') };
}
function rect(value) {
    const item = record(value);
    return {
        ...point(item),
        width: number(item.width, 'width', 1),
        height: number(item.height, 'height', 1),
    };
}
function imagePath(value) {
    const path = text(value, 'imagePath').replace(/^\//, '');
    const local = path.startsWith('assets/maplestory/') ? `public/${path}` : path;
    if (!local.startsWith('public/assets/maplestory/') || local.includes('..'))
        throw new Error('맵 이미지는 보관된 로컬 리소스만 사용할 수 있습니다.');
    return local;
}
/** 서비스 출력은 unknown으로 읽고 보행과 렌더링이 공유할 데이터만 검증한다. */
export function decodeCampMap(value) {
    const source = record(value);
    const tileSize = number(source.tileSize, 'tileSize', 1);
    const width = number(source.width, 'width', 1);
    const height = number(source.height, 'height', 1);
    if (![tileSize, width, height].every(Number.isInteger) ||
        width > 256 ||
        height > 256)
        throw new Error('맵의 타일 크기와 행·열은 작은 정수여야 합니다.');
    const rows = list(source.terrain, 'terrain');
    if (rows.length !== height + 1)
        throw new Error('지형 꼭짓점 행 수가 맞지 않습니다.');
    const terrain = rows.map((row) => {
        const cells = list(row, 'terrain row');
        if (cells.length !== width + 1)
            throw new Error('지형 꼭짓점 열 수가 맞지 않습니다.');
        return cells.map((cell) => {
            if (cell !== 'grass' && cell !== 'dirt' && cell !== 'water')
                throw new Error('알 수 없는 맵 지형입니다.');
            return cell;
        });
    });
    const objects = list(source.objects, 'objects').map((value) => {
        const item = record(value);
        if (item.layer !== 'ground' && item.layer !== 'depth')
            throw new Error('오브젝트 표시 레이어가 올바르지 않습니다.');
        return {
            ...rect(item),
            id: text(item.id, 'object id'),
            imagePath: imagePath(item.imagePath),
            pivot: point(item.pivot),
            footprint: item.footprint === undefined ? undefined : rect(item.footprint),
            layer: item.layer,
        };
    });
    const spawn = point(source.spawn);
    if (spawn.x >= width * tileSize || spawn.y >= height * tileSize)
        throw new Error('입구가 맵 밖에 있습니다.');
    return {
        tileSize,
        width,
        height,
        terrain,
        tileLayers: list(source.tileLayers, 'tileLayers').map((value) => {
            const item = record(value);
            return { ...rect(item), imagePath: imagePath(item.imagePath) };
        }),
        objects,
        bridges: list(source.bridges, 'bridges').map(rect),
        spawn,
        landmarks: list(source.landmarks, 'landmarks').map((value) => {
            const item = record(value);
            return {
                ...point(item),
                id: text(item.id, 'landmark id'),
                label: text(item.label, 'landmark label'),
                radius: number(item.radius, 'landmark radius', 1),
                text: text(item.text, 'landmark text'),
            };
        }),
    };
}
export async function loadCampMap() {
    const response = await fetch(resourceUrl('resources/herbalist-camp-map.json'));
    if (!response.ok)
        throw new Error('약초꾼 야영지의 맵 데이터를 불러오지 못했어요.');
    const data = await response.json();
    return decodeCampMap(data);
}
