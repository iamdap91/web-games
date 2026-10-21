import { getShockKomaVariant, shockKomaVariants, } from './shock-koma-variant-data.js';
export const shockKomaOptions = shockKomaVariants.map((variant) => ({
    value: variant.id,
    label: variant.name,
}));
/** 목록의 한 항목과 선택한 버전의 설명·시간표를 연결한다. */
export function shockKomaSample(value = 'ink') {
    const variant = getShockKomaVariant(value);
    return {
        id: 'shock-koma',
        name: '쇼크코마',
        category: 'impact',
        shockVariant: variant.id,
        previewMs: variant.previewMs,
        beats: variant.beats,
        description: variant.description,
        distinction: variant.distinction,
    };
}
