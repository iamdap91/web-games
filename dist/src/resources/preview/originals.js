import manifest from '../../../resources/manifest.json' with { type: 'json' };
export function showOriginals(assetId) {
    const asset = manifest.assets.find((entry) => entry.id === assetId);
    const originals = document.getElementById('originals');
    if (!asset || !('originals' in asset) || !asset.originals || !originals) {
        throw new Error(`원본 목록을 찾을 수 없습니다: ${assetId}`);
    }
    for (const original of asset.originals) {
        const item = document.createElement('article');
        const title = document.createElement('h3');
        title.textContent = `${original.key} / ${original.name}`;
        const localUrl = `/${original.localPath}`;
        const file = document.createElement('a');
        file.href = localUrl;
        file.textContent = '로컬 원본 열기';
        file.target = '_blank';
        file.rel = 'noopener';
        item.append(title);
        if (original.name.endsWith('.png')) {
            const image = new Image();
            image.src = localUrl;
            image.alt = original.name;
            image.loading = 'lazy';
            image.width = original.width ?? 0;
            image.height = original.height ?? 0;
            item.append(image);
        }
        else if (original.name.endsWith('.mp3')) {
            const audio = document.createElement('audio');
            audio.src = localUrl;
            audio.controls = true;
            audio.preload = 'metadata';
            audio.volume = 0.35;
            audio.setAttribute('aria-label', `${asset.name} ${original.name}`);
            item.append(audio);
        }
        const source = document.createElement('a');
        source.href = original.pageUrl;
        source.textContent = '출처 ↗';
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        const links = document.createElement('p');
        links.append(file, ' · ', source);
        item.append(links);
        originals.append(item);
    }
}
