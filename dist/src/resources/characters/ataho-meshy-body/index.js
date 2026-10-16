import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resourceUrl } from '../../catalog/resource-url.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
const bodyDirectory = 'public/assets/maplestory/ataho-meshy-body';
const outfitDirectory = 'public/assets/maplestory/ataho-meshy-outfit/20261016';
const taillessBodyDirectory = `${outfitDirectory}/fitted/parts/body-tailless`;
const bodyReference = `${bodyDirectory}/20261015/references/ataho-base-t-pose-approved.png`;
const viewDirections = {
    front: new THREE.Vector3(0, 0, 1),
    right: new THREE.Vector3(1, 0, 0),
    back: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0),
};
const bodyReview = {
    referencePath: bodyReference,
    referenceAlt: '받침옷·드로즈 차림의 아타호 T 포즈 생성 기준',
    referenceNote: '얼굴과 체형, 손발의 모양을 비교해 보세요.',
    reviewTitle: '몸체와 관절 확인',
    reviewNote: '짧게 생성된 꼬리를 제거하고 뿌리를 메웠습니다. 후면과 측면을 확인하고, 걷기·달리기에서 어깨·골반·손발의 변형도 살펴보세요.',
};
const outfitReview = {
    referencePath: `${bodyDirectory}/20261015/references/ataho-original-outfit-reference.png`,
    referenceAlt: '갈색 겉옷·차콜색 바지·허리끈과 술병을 갖춘 아타호 원본',
    referenceNote: '원본의 의상 비율과 겉옷·바지·허리끈·술병의 배치를 비교해 보세요.',
    reviewTitle: '착의와 움직임 확인',
    reviewNote: '겉옷·바지를 본체에 맞추고 기존 뼈대에 연결했습니다. 허리끈과 술병은 골반을 따라 움직입니다. 측면·후면과 걷기·달리기에서 옷의 관통과 관절 변형을 살펴보세요. 꼬리는 제거했습니다.',
};
const modelDefinitions = [
    {
        key: 'outfit-neutral',
        name: '착의 · 정지 자세',
        badge: '컨셉 비교 · 팔을 내린 자세',
        directory: `${outfitDirectory}/fitted/concept`,
        fileStem: 'ataho-outfit-neutral',
        ...outfitReview,
    },
    {
        key: 'outfit-rigged',
        name: '착의 · T 포즈',
        badge: '부품 통합 · 공통 뼈대',
        directory: `${outfitDirectory}/fitted/concept`,
        fileStem: 'ataho-outfit-rigged',
        ...outfitReview,
    },
    {
        key: 'outfit-walk',
        name: '착의 · 걷기',
        badge: '의상·소품 · 기본 걷기',
        directory: `${outfitDirectory}/fitted/concept`,
        fileStem: 'ataho-outfit-walk',
        ...outfitReview,
    },
    {
        key: 'outfit-run',
        name: '착의 · 달리기',
        badge: '의상·소품 · 기본 달리기',
        directory: `${outfitDirectory}/fitted/concept`,
        fileStem: 'ataho-outfit-run',
        ...outfitReview,
    },
    {
        key: 'body-original',
        name: '몸체 · 꼬리 제거',
        badge: '리깅 전 · T 포즈',
        directory: taillessBodyDirectory,
        fileStem: 'ataho-body-original-tailless',
        ...bodyReview,
    },
    {
        key: 'body-rigged',
        name: '리깅 몸체',
        badge: '자동 리깅 결과',
        directory: taillessBodyDirectory,
        fileStem: 'ataho-body-rigged-tailless',
        ...bodyReview,
    },
    {
        key: 'body-walk',
        name: '걷기',
        badge: '본체 · 기본 걷기',
        directory: taillessBodyDirectory,
        fileStem: 'ataho-body-walk-tailless',
        ...bodyReview,
    },
    {
        key: 'body-run',
        name: '달리기',
        badge: '본체 · 기본 달리기',
        directory: taillessBodyDirectory,
        fileStem: 'ataho-body-run-tailless',
        ...bodyReview,
    },
    {
        key: 'jacket',
        name: '겉옷',
        badge: '독립 부품 · 피팅 전',
        directory: `${outfitDirectory}/models`,
        fileStem: 'ataho-jacket',
        referencePath: `${outfitDirectory}/references/ataho-jacket-reference.png`,
        referenceAlt: '몸체 없이 열린 앞판과 수평 소매를 보여 주는 갈색 겉옷 기준',
        referenceNote: '앞판·소매·옷자락의 모양과 안쪽 공간을 비교해 보세요.',
        reviewTitle: '겉옷 개구부 확인',
        reviewNote: '앞판·목·양 소매가 열려 있는지와 안쪽에 불필요한 면이 생겼는지 확인하세요. 본체에 맞추거나 뼈대에 연결하기 전의 독립 부품입니다.',
    },
    {
        key: 'pants',
        name: '바지',
        badge: '독립 부품 · 피팅 전',
        directory: `${outfitDirectory}/models`,
        fileStem: 'ataho-pants',
        referencePath: `${outfitDirectory}/references/ataho-pants-reference.png`,
        referenceAlt: '넓은 바지통과 허리·양 발목의 열린 부분을 보여 주는 차콜색 바지 기준',
        referenceNote: '허리·바지통·양 발목의 모양과 안쪽 공간을 비교해 보세요.',
        reviewTitle: '바지 개구부 확인',
        reviewNote: '상단에서 확인한 허리 입구는 면으로 막혀 있어 착의 전에 제거해야 합니다. 발목 안쪽 구조 정리와 본체 피팅 전의 원본 부품입니다.',
    },
    {
        key: 'flask',
        name: '술병',
        badge: '독립 소품 · 부착 전',
        directory: `${outfitDirectory}/models`,
        fileStem: 'ataho-flask',
        referencePath: `${outfitDirectory}/references/ataho-flask-reference.png`,
        referenceAlt: '갈색 도기 몸체와 마개·밧줄이 있는 술병 기준',
        referenceNote: '병의 부피·마개·목의 밧줄을 비교해 보세요.',
        reviewTitle: '밧줄과 매듭 확인',
        reviewNote: '병 목의 밧줄과 매듭이 끊기거나 몸체에 뭉치지 않았는지 확인하세요. 캐릭터 허리 부착과 최종 크기 조정은 아직 하지 않았습니다.',
    },
];
function element(id, type) {
    const node = document.getElementById(id);
    if (!(node instanceof type))
        throw new Error(`화면 요소 없음: ${id}`);
    return node;
}
function disposeObjects(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const skeletons = new Set();
    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments))
            return;
        if (object instanceof THREE.SkinnedMesh)
            skeletons.add(object.skeleton);
        geometries.add(object.geometry);
        const entries = Array.isArray(object.material)
            ? object.material
            : [object.material];
        for (const material of entries) {
            materials.add(material);
            for (const value of Object.values(material)) {
                if (value instanceof THREE.Texture)
                    textures.add(value);
            }
        }
    });
    for (const skeleton of skeletons)
        skeleton.dispose();
    for (const texture of textures)
        texture.dispose();
    for (const material of materials)
        material.dispose();
    for (const geometry of geometries)
        geometry.dispose();
}
function skinCount(json) {
    if (typeof json !== 'object' || json === null || !('skins' in json))
        return 0;
    return Array.isArray(json.skins) ? json.skins.length : 0;
}
class ModelViewer {
    canvas = element('model', HTMLCanvasElement);
    stage = element('stage', HTMLDivElement);
    status = element('status', HTMLParagraphElement);
    loading = element('loading', HTMLDivElement);
    retry = element('retry', HTMLButtonElement);
    modelSelect = element('model-select', HTMLSelectElement);
    clipSelect = element('clip-select', HTMLSelectElement);
    animationControls = element('animation-controls', HTMLFieldSetElement);
    play = element('play', HTMLButtonElement);
    loop = element('loop', HTMLButtonElement);
    playbackInfo = element('playback-info', HTMLSpanElement);
    viewControls = element('view-controls', HTMLFieldSetElement);
    reviewBack = element('review-back', HTMLButtonElement);
    wireframe = element('wireframe', HTMLButtonElement);
    events = new AbortController();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    renderer;
    controls;
    resizeObserver = new ResizeObserver(() => this.resize());
    bounds = new THREE.Box3();
    definition = modelDefinitions.find((definition) => definition.key ===
        new URLSearchParams(window.location.search).get('model')) ??
        modelDefinitions.find((definition) => definition.key === 'outfit-neutral');
    model = null;
    mixer = null;
    action = null;
    clips = [];
    renderRequest = 0;
    loadRevision = 0;
    lastFrameTime = null;
    isPlaying = false;
    disposed = false;
    constructor() {
        for (const definition of modelDefinitions) {
            this.modelSelect.add(new Option(definition.name, definition.key));
        }
        this.modelSelect.value = this.definition.key;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        });
        this.renderer.setClearColor(0x222a34);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.camera.position.set(0, 0, 4);
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.minPolarAngle = 0.04;
        this.controls.maxPolarAngle = Math.PI - 0.04;
        this.controls.addEventListener('change', this.renderNextFrame);
        this.scene.add(new THREE.HemisphereLight(0xf5f7ff, 0x67717a, 2.3));
        const key = new THREE.DirectionalLight(0xfff3df, 2.6);
        key.position.set(3, 5, 5);
        this.scene.add(key);
        const fill = new THREE.DirectionalLight(0xd7e7ff, 1.6);
        fill.position.set(-4, 2, -4);
        this.scene.add(fill);
        const grid = new THREE.GridHelper(8, 32, 0x728294, 0x495565);
        grid.position.y = -0.002;
        const gridMaterials = Array.isArray(grid.material)
            ? grid.material
            : [grid.material];
        for (const material of gridMaterials) {
            material.transparent = true;
            material.opacity = 0.35;
            material.depthWrite = false;
        }
        this.scene.add(grid);
        this.bindEvents();
        this.resizeObserver.observe(this.stage);
        this.resize();
        registerEmbeddedScene(() => this.dispose());
        void this.loadModel();
    }
    bindEvents() {
        const options = { signal: this.events.signal };
        for (const button of document.querySelectorAll('[data-view]')) {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                if (view === 'front' ||
                    view === 'right' ||
                    view === 'back' ||
                    view === 'left')
                    this.fit(viewDirections[view]);
            }, options);
        }
        this.modelSelect.addEventListener('change', () => {
            const definition = modelDefinitions.find((entry) => entry.key === this.modelSelect.value);
            if (!definition)
                return;
            this.definition = definition;
            const url = new URL(window.location.href);
            url.searchParams.set('model', definition.key);
            window.history.replaceState(window.history.state, '', url);
            void this.loadModel();
        }, options);
        this.clipSelect.addEventListener('change', () => this.selectClip(Number(this.clipSelect.value)), options);
        this.play.addEventListener('click', () => this.togglePlayback(), options);
        element('replay', HTMLButtonElement).addEventListener('click', () => this.replay(), options);
        this.loop.addEventListener('click', () => {
            this.loop.setAttribute('aria-pressed', String(!this.isLooping()));
            this.configureLoop();
        }, options);
        element('fit', HTMLButtonElement).addEventListener('click', () => this.fit(), options);
        this.wireframe.addEventListener('click', () => this.toggleWireframe(), options);
        this.retry.addEventListener('click', () => void this.loadModel(), options);
        window.addEventListener('resize', () => this.resize(), options);
        document.addEventListener('visibilitychange', () => {
            this.lastFrameTime = null;
            if (!document.hidden)
                this.renderNextFrame();
        }, options);
        window.addEventListener('pagehide', (event) => {
            if (!event.persisted)
                this.dispose();
        }, options);
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                this.lastFrameTime = null;
                this.resize();
            }
        }, options);
    }
    updateModelDetails() {
        const definition = this.definition;
        element('model-title', HTMLHeadingElement).textContent = definition.name;
        element('model-badge', HTMLSpanElement).textContent = definition.badge;
        const reference = element('reference', HTMLImageElement);
        reference.src = resourceUrl(definition.referencePath).href;
        reference.alt = definition.referenceAlt;
        element('reference-note', HTMLParagraphElement).textContent =
            definition.referenceNote;
        element('review-title', HTMLHeadingElement).textContent =
            definition.reviewTitle;
        element('review-note', HTMLParagraphElement).textContent =
            definition.reviewNote;
        const downloads = element('downloads', HTMLDivElement);
        downloads.replaceChildren();
        for (const format of ['glb', 'fbx']) {
            const link = document.createElement('a');
            link.href = resourceUrl(`${definition.directory}/${definition.fileStem}.${format}`).href;
            link.download = `${definition.fileStem}.${format}`;
            link.textContent = `${format.toUpperCase()} 다운로드`;
            downloads.append(link);
        }
    }
    async loadModel() {
        if (this.disposed)
            return;
        const revision = ++this.loadRevision;
        const definition = this.definition;
        this.clearModel();
        this.updateModelDetails();
        this.loading.hidden = false;
        this.retry.hidden = true;
        this.viewControls.disabled = true;
        this.reviewBack.disabled = true;
        this.stage.dataset.state = 'loading';
        this.stage.dataset.model = definition.key;
        this.status.textContent = `${definition.name} 모델을 불러오는 중…`;
        element('model-info', HTMLSpanElement).textContent = 'GLB 불러오는 중';
        this.renderNextFrame();
        try {
            const gltf = await new GLTFLoader().loadAsync(resourceUrl(`${definition.directory}/${definition.fileStem}.glb`).href, (event) => {
                if (!this.disposed &&
                    revision === this.loadRevision &&
                    event.total > 0)
                    this.status.textContent = `${definition.name} 모델을 불러오는 중… ${Math.round((event.loaded / event.total) * 100)}%`;
            });
            if (this.disposed || revision !== this.loadRevision) {
                disposeObjects(gltf.scene);
                return;
            }
            // 위치 트랙이 있는 애니메이션과 중앙 정렬이 서로 덮어쓰지 않게 한다.
            this.model = new THREE.Group();
            this.model.add(gltf.scene);
            this.scene.add(this.model);
            this.clips = gltf.animations.filter((clip) => Number.isFinite(clip.duration) &&
                clip.duration > 0 &&
                clip.tracks.some((track) => {
                    const firstTime = track.times[0];
                    const lastTime = track.times[track.times.length - 1];
                    return (firstTime !== undefined &&
                        lastTime !== undefined &&
                        lastTime - firstTime > 0.000001);
                }));
            this.clipSelect.replaceChildren();
            for (const [index, clip] of this.clips.entries()) {
                this.clipSelect.add(new Option(clip.name || `클립 ${index + 1}`, String(index)));
            }
            const hasAnimation = this.clips.length > 0;
            this.animationControls.disabled = !hasAnimation;
            this.clipSelect.disabled = this.clips.length < 2;
            if (hasAnimation) {
                this.mixer = new THREE.AnimationMixer(gltf.scene);
                this.mixer.addEventListener('finished', this.finishPlayback);
                this.selectClip(0);
            }
            else {
                // 단일 키로 저장된 비교 자세도 표시하되 재생 루프는 돌리지 않는다.
                const pose = gltf.animations[0];
                if (pose) {
                    this.mixer = new THREE.AnimationMixer(gltf.scene);
                    const poseAction = this.mixer.clipAction(pose);
                    poseAction.setLoop(THREE.LoopOnce, 1);
                    poseAction.clampWhenFinished = true;
                    poseAction.play();
                    this.mixer.setTime(Math.max(0, pose.duration));
                    poseAction.paused = true;
                }
                this.updateBounds();
                this.playbackInfo.textContent =
                    gltf.animations.length > 0 ? '정지 자세' : '애니메이션 클립 없음';
            }
            const center = this.bounds.getCenter(new THREE.Vector3());
            this.model.position.set(-center.x, -this.bounds.min.y, -center.z);
            this.bounds.translate(this.model.position);
            const size = this.bounds.getSize(new THREE.Vector3()).length();
            this.camera.near = size / 1000;
            this.camera.far = size * 100;
            this.controls.minDistance = size * 0.12;
            this.controls.maxDistance = size * 8;
            this.applyWireframe();
            this.fit(viewDirections.front);
            this.viewControls.disabled = false;
            this.reviewBack.disabled = false;
            this.loading.hidden = true;
            this.stage.dataset.state = 'ready';
            element('model-info', HTMLSpanElement).textContent =
                `${this.triangleCount().toLocaleString('ko-KR')} 삼각형 · 스킨 ${skinCount(gltf.parser.json)}개 · 클립 ${gltf.animations.length}개 (재생 가능 ${this.clips.length}개)`;
        }
        catch (error) {
            if (this.disposed || revision !== this.loadRevision)
                return;
            this.clearModel();
            this.stage.dataset.state = 'error';
            this.status.textContent = `${definition.name} 모델을 불러오지 못했습니다. 로컬 파일과 서버 연결을 확인한 뒤 다시 시도해 주세요.`;
            this.retry.hidden = false;
            console.error('아타호 모델 불러오기 실패', error);
        }
    }
    triangleCount() {
        let count = 0;
        this.model?.traverse((object) => {
            if (object instanceof THREE.Mesh)
                count +=
                    (object.geometry.index?.count ??
                        object.geometry.getAttribute('position').count) / 3;
        });
        return count;
    }
    updateBounds() {
        if (!this.model)
            return;
        this.model.updateMatrixWorld(true);
        this.model.traverse((object) => {
            if (object instanceof THREE.SkinnedMesh)
                object.computeBoundingBox();
        });
        this.bounds.setFromObject(this.model);
    }
    selectClip(index) {
        const clip = this.clips[index];
        if (!this.mixer || !clip || !this.model)
            return;
        this.mixer.stopAllAction();
        this.action = this.mixer.clipAction(clip);
        this.action.reset().play();
        this.configureLoop();
        // 한 주기의 자세 범위를 미리 담아 재생 중 발끝·팔이 잘리지 않게 한다.
        const motionBounds = new THREE.Box3();
        for (let sample = 0; sample <= 24; sample++) {
            this.mixer.setTime((clip.duration * sample) / 24);
            this.updateBounds();
            motionBounds.union(this.bounds);
        }
        this.mixer.setTime(0);
        this.action.reset().play();
        this.mixer.update(0);
        this.updateBounds();
        this.bounds.union(motionBounds);
        this.clipSelect.value = String(index);
        this.isPlaying = true;
        this.lastFrameTime = null;
        this.updatePlaybackDisplay();
        this.fit();
        this.renderNextFrame();
    }
    isLooping() {
        return this.loop.getAttribute('aria-pressed') === 'true';
    }
    configureLoop() {
        if (!this.action)
            return;
        const looping = this.isLooping();
        this.action.setLoop(looping ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        this.action.clampWhenFinished = !looping;
    }
    togglePlayback() {
        if (!this.action)
            return;
        if (!this.isPlaying && this.action.time >= this.action.getClip().duration)
            this.action.reset().play();
        this.isPlaying = !this.isPlaying;
        this.action.paused = !this.isPlaying;
        this.lastFrameTime = null;
        this.updatePlaybackDisplay();
        this.renderNextFrame();
    }
    replay() {
        if (!this.action)
            return;
        this.action.reset().play();
        this.isPlaying = true;
        this.lastFrameTime = null;
        this.mixer?.update(0);
        this.updatePlaybackDisplay();
        this.renderNextFrame();
    }
    finishPlayback = () => {
        this.isPlaying = false;
        this.lastFrameTime = null;
        this.updatePlaybackDisplay();
    };
    updatePlaybackDisplay() {
        this.play.textContent = this.isPlaying ? '일시정지' : '재생';
        this.play.setAttribute('aria-pressed', String(this.isPlaying));
        this.stage.dataset.playback = this.isPlaying ? 'playing' : 'paused';
        if (!this.action)
            return;
        const duration = this.action.getClip().duration;
        this.playbackInfo.textContent = `${this.action.time.toFixed(2)} / ${duration.toFixed(2)}초`;
    }
    clearModel() {
        this.isPlaying = false;
        this.lastFrameTime = null;
        if (this.mixer) {
            this.mixer.removeEventListener('finished', this.finishPlayback);
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
        }
        this.mixer = null;
        this.action = null;
        this.clips = [];
        this.clipSelect.replaceChildren();
        this.animationControls.disabled = true;
        this.updatePlaybackDisplay();
        this.playbackInfo.textContent = '애니메이션 클립 없음';
        if (!this.model)
            return;
        this.scene.remove(this.model);
        disposeObjects(this.model);
        this.model = null;
        this.bounds.makeEmpty();
    }
    fit(direction = this.camera.position.clone().sub(this.controls.target)) {
        if (!this.model || this.disposed || this.bounds.isEmpty())
            return;
        const target = this.bounds.getCenter(new THREE.Vector3());
        const outward = direction.clone().normalize();
        if (outward.lengthSq() === 0)
            outward.set(0, 0, 1);
        this.camera.position.copy(target).add(outward);
        this.camera.lookAt(target);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
        const tanVertical = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        const tanHorizontal = tanVertical * this.camera.aspect;
        let distance = 0;
        for (const x of [this.bounds.min.x, this.bounds.max.x]) {
            for (const y of [this.bounds.min.y, this.bounds.max.y]) {
                for (const z of [this.bounds.min.z, this.bounds.max.z]) {
                    const offset = new THREE.Vector3(x, y, z).sub(target);
                    distance = Math.max(distance, offset.dot(outward) +
                        Math.max(Math.abs(offset.dot(right)) / tanHorizontal, Math.abs(offset.dot(up)) / tanVertical));
                }
            }
        }
        this.camera.position.copy(target).addScaledVector(outward, distance * 1.15);
        this.controls.target.copy(target);
        this.camera.updateProjectionMatrix();
        this.controls.update();
        this.renderNextFrame();
    }
    toggleWireframe() {
        this.wireframe.setAttribute('aria-pressed', String(this.wireframe.getAttribute('aria-pressed') !== 'true'));
        this.applyWireframe();
        this.renderNextFrame();
    }
    applyWireframe() {
        const enabled = this.wireframe.getAttribute('aria-pressed') === 'true';
        this.model?.traverse((object) => {
            if (!(object instanceof THREE.Mesh))
                return;
            const materials = Array.isArray(object.material)
                ? object.material
                : [object.material];
            for (const material of materials) {
                if (material instanceof THREE.MeshStandardMaterial)
                    material.wireframe = enabled;
            }
        });
    }
    resize() {
        if (this.disposed)
            return;
        const { width, height } = this.stage.getBoundingClientRect();
        if (width <= 0 || height <= 0)
            return;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        if (this.model)
            this.fit();
        this.renderNextFrame();
    }
    renderNextFrame = () => {
        if (this.disposed || this.renderRequest)
            return;
        this.renderRequest = requestAnimationFrame(this.renderFrame);
    };
    renderFrame = (timestamp) => {
        this.renderRequest = 0;
        if (this.disposed)
            return;
        if (this.isPlaying && this.mixer && !document.hidden) {
            const delta = this.lastFrameTime === null
                ? 0
                : Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
            this.lastFrameTime = timestamp;
            this.mixer.update(delta);
            this.updatePlaybackDisplay();
        }
        this.renderer.render(this.scene, this.camera);
        if (this.isPlaying && !document.hidden)
            this.renderNextFrame();
    };
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        ++this.loadRevision;
        cancelAnimationFrame(this.renderRequest);
        this.events.abort();
        this.resizeObserver.disconnect();
        this.controls.removeEventListener('change', this.renderNextFrame);
        this.controls.dispose();
        this.clearModel();
        disposeObjects(this.scene);
        this.scene.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.stage.dataset.state = 'disposed';
    }
}
try {
    new ModelViewer();
}
catch (error) {
    element('stage', HTMLDivElement).dataset.state = 'error';
    element('status', HTMLParagraphElement).textContent =
        '3D 화면을 시작할 수 없습니다. WebGL을 사용할 수 있는 브라우저에서 열어 주세요.';
    console.error('3D 뷰어 시작 실패', error);
}
