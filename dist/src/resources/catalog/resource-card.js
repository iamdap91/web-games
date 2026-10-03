const motionNames = {
    stand: '기본·대기',
    move: '이동',
    chase: '추격',
};
export function createText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}
function createImage(path, name, width) {
    const image = document.createElement('img');
    image.src = new URL(`/${path}`, document.baseURI).href;
    image.alt = name;
    image.loading = 'lazy';
    image.style.width = `${width * 2}px`;
    return image;
}
function createFrames(asset) {
    const details = document.createElement('details');
    details.append(createText('summary', '파일·프레임 정보 펼치기'));
    for (const [motion, animation] of Object.entries(asset.animations)) {
        if (!animation)
            continue;
        details.append(createText('h4', `${animation.group ? `${animation.group} · ` : ''}${animation.label ?? motionNames[motion] ?? motion} · ${animation.frames.length}프레임`));
        const strip = document.createElement('div');
        strip.className = 'frames';
        for (const [index, frame] of animation.frames.entries()) {
            const figure = document.createElement('figure');
            const link = document.createElement('a');
            link.href = new URL(`/${frame.localPath}`, document.baseURI).href;
            link.append(createImage(frame.localPath, `${asset.name} ${motion} ${index}`, frame.width));
            figure.append(link, createText('figcaption', `#${index} · ${frame.width} × ${frame.height} · 기준점 (${frame.pivot.x}, ${frame.pivot.y})`));
            strip.append(figure);
        }
        details.append(strip);
        const first = animation.frames[0];
        if (first)
            details.append(createText('code', first.localPath));
    }
    return details;
}
function createExternalLink(name, url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${name} ↗`;
    return link;
}
function createSourceLink(asset) {
    const link = createExternalLink(`출처: ${asset.sourceName}`, asset.sourceUrl);
    link.className = 'source-link';
    return link;
}
function createProvenance(asset) {
    const details = document.createElement('details');
    details.className = 'provenance';
    details.append(createText('summary', '원본 정보·구성 출처'));
    details.append(createText('p', `프로젝트 표시명: ${asset.name}`));
    details.append(createText('p', `원본 이름: ${asset.originalName ?? '미확인 · 출처의 식별자로 확인'}`));
    details.append(createText('code', asset.id));
    if (asset.composition)
        details.append(createText('p', `가공 내용: ${asset.composition}`));
    if (asset.components?.length) {
        const list = document.createElement('ul');
        for (const component of asset.components) {
            const item = document.createElement('li');
            item.append(createExternalLink(component.name, component.sourceUrl));
            list.append(item);
        }
        details.append(createText('h4', '구성 리소스 출처 · 메이플스토리 월드'), list);
    }
    return details;
}
function appendPreviewLink(card, asset) {
    if (!asset.previewPath)
        return;
    const link = document.createElement('a');
    link.href = `/${asset.previewPath}`;
    link.className = 'preview-link';
    link.textContent = '상세 미리보기 →';
    card.append(link);
}
function createAudioCard(asset, audio) {
    const card = document.createElement('article');
    card.className = 'resource-card';
    card.id = `resource-${asset.id}`;
    const player = document.createElement('audio');
    player.controls = true;
    player.preload = 'metadata';
    player.volume = 0.35;
    player.src = new URL(`/${audio.localPath}`, document.baseURI).href;
    player.setAttribute('aria-label', `${asset.name} 미리듣기`);
    const original = document.createElement('a');
    original.href = player.src;
    original.textContent = '원본 오디오 열기';
    const metadata = createText('p', `OGG · ${audio.durationSeconds.toFixed(2)}초`);
    metadata.className = 'metadata';
    card.append(createText('h3', asset.name), metadata, player, createText('p', `출처 설명: ${audio.sourceDescription}`), createText('p', asset.notes), original, createSourceLink(asset), createText('code', audio.localPath), createProvenance(asset));
    appendPreviewLink(card, asset);
    return card;
}
export function createCard(asset) {
    if (asset.audio)
        return createAudioCard(asset, asset.audio);
    const frame = asset.animations.stand?.frames[0] ??
        (asset.localPath && asset.width && asset.height
            ? { localPath: asset.localPath, width: asset.width, height: asset.height }
            : undefined);
    if (!frame)
        throw new Error(`기본 프레임이 없습니다: ${asset.name}`);
    const card = document.createElement('article');
    card.className = 'resource-card';
    card.id = `resource-${asset.id}`;
    const stage = document.createElement('div');
    stage.className = 'resource-image';
    if (asset.states) {
        for (const state of asset.states) {
            const stateFrame = asset.animations[state.animation]?.frames[state.frameIndex];
            if (!stateFrame)
                throw new Error(`상태 프레임이 없습니다: ${asset.name} ${state.label}`);
            const figure = document.createElement('figure');
            figure.className = 'state-preview';
            figure.append(createImage(stateFrame.localPath, `${asset.name} ${state.label}`, stateFrame.width), createText('figcaption', state.label));
            stage.append(figure);
        }
    }
    else {
        stage.append(createImage(frame.localPath, asset.name, frame.width));
    }
    const frameCount = Object.values(asset.animations).reduce((sum, animation) => sum + (animation?.frames.length ?? 0), 0);
    const metadata = createText('p', `${frame.width} × ${frame.height}px · ${frameCount ? `총 ${frameCount}프레임` : '가공 전 맵 원본'}`);
    metadata.className = 'metadata';
    card.append(stage, createText('h3', asset.name), metadata, createText('p', asset.notes), createSourceLink(asset), createProvenance(asset));
    if (frameCount > 0)
        card.append(createFrames(asset));
    appendPreviewLink(card, asset);
    return card;
}
