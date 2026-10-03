import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { gradePixels, prepareMapObjects, } from '../../resources/corridor/corridor-renderer.js';
import { drawIndustrial } from '../../resources/corridor/industrial-renderer.js';
import { world } from './game.js';
import { drawObservationWindow } from './observation-window.js';
export function getContext(canvas) {
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('Canvas 2D를 사용할 수 없습니다.');
    return context;
}
async function loadImage(path) {
    const image = new Image();
    // 컴파일된 모듈을 기준으로 찾아 저장소 하위 경로에서도 같은 리소스를 사용한다.
    image.src = new URL(`../../../../${path}`, import.meta.url).href;
    try {
        await image.decode();
    }
    catch {
        throw new Error(`로컬 리소스를 불러오지 못했습니다: ${path}`);
    }
    return image;
}
function grade(canvas, warm = false) {
    const context = getContext(canvas);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    gradePixels(pixels, {
        saturation: warm ? 0.62 : 0.46,
        brightness: warm ? 1 : 0.8,
        chill: warm ? 0 : 0.52,
        vignette: 0.38,
    });
    context.putImageData(pixels, 0, 0);
    if (warm) {
        context.fillStyle = '#e9b76630';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
}
export async function loadAssets() {
    const map = manifest.assets.find((asset) => asset.id === 'map/261020400');
    const avatar = manifest.assets.find((asset) => asset.id === 'avatar/adventurer-toben');
    if (!map?.localPath || !map.regions || !avatar)
        throw new Error('게임 리소스 정보가 없습니다.');
    const components = new Map();
    const frames = new Map();
    const animations = new Map();
    for (const motion of ['stand', 'move', 'jump']) {
        const animation = avatar.animations[motion];
        if (!animation)
            throw new Error(`모험가 모션이 없습니다: ${motion}`);
        animations.set(motion, animation);
    }
    const [original] = await Promise.all([
        loadImage(map.localPath),
        Promise.all((map.components ?? []).map(async (part) => {
            components.set(part.name, await loadImage(part.localPath));
        })),
        Promise.all([...animations.values()].flatMap((animation) => animation.frames.map(async (frame) => {
            frames.set(frame.localPath, await loadImage(frame.localPath));
        }))),
    ]);
    const objects = prepareMapObjects(original);
    const makeBackground = ({ warm = false, omitWindow = false, omitExitDoors = false, } = {}) => {
        const canvas = document.createElement('canvas');
        canvas.width = world.width;
        canvas.height = world.height;
        drawIndustrial(getContext(canvas), objects, components, map.regions, 'laboratory', { entryClearance: true, omitCentralDoor: true, omitExitDoors });
        if (!omitWindow) {
            const machine = components.get('machine');
            const pipe = components.get('wall');
            if (!machine || !pipe)
                throw new Error('관측창 설비 리소스가 없습니다.');
            drawObservationWindow(getContext(canvas), machine, pipe);
        }
        return grade(canvas, warm);
    };
    const doorRegion = map.regions.find((region) => region.name === 'door');
    if (!doorRegion)
        throw new Error('입구 문 리소스가 없습니다.');
    const exitDoor = document.createElement('canvas');
    exitDoor.width = 166;
    exitDoor.height = 200;
    getContext(exitDoor).drawImage(objects, doorRegion.x, doorRegion.y, doorRegion.width, doorRegion.height, 0, 0, 166, 200);
    const pipeImage = components.get('wall');
    if (!pipeImage)
        throw new Error('배관 리소스가 없습니다.');
    const pipe = document.createElement('canvas');
    pipe.width = pipeImage.width;
    pipe.height = pipeImage.height;
    getContext(pipe).drawImage(pipeImage, 0, 0);
    const machineImage = components.get('machine');
    if (!machineImage)
        throw new Error('기계 리소스가 없습니다.');
    const props = new Map();
    await Promise.all(['개폐 철문', '남겨진 인형', '목재 괘종시계', '낡은 나무 의자'].map(async (name) => {
        const asset = manifest.assets.find((entry) => entry.name === name);
        const animation = asset?.animations.stand;
        if (!animation)
            throw new Error(`공간 리소스가 없습니다: ${name}`);
        props.set(name, await Promise.all(animation.frames.map((frame) => loadImage(frame.localPath))));
    }));
    const machine = document.createElement('canvas');
    machine.width = machineImage.width;
    machine.height = machineImage.height;
    getContext(machine).drawImage(machineImage, 0, 0);
    return {
        emptyCenter: makeBackground({ omitWindow: true }),
        machine: grade(machine),
        normal: makeBackground(),
        withoutExitDoors: makeBackground({ omitExitDoors: true }),
        exitDoor: grade(exitDoor),
        exit: makeBackground({ warm: true }),
        pipe: grade(pipe),
        props,
        animations,
        frames,
    };
}
