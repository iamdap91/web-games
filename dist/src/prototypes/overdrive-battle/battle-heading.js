import { expeditionLayouts } from '../../games/tiger-rpg/trail-layout.js';
export function battleHeading(encounter) {
    const headings = {
        prototype: { region: '산들마을 외곽', title: '산길의 결투' },
        'first-expedition': {
            region: expeditionLayouts.first.title,
            title: '길목의 슬라임',
        },
        'trail-1': {
            region: expeditionLayouts.second.title,
            title: '산길의 슬라임',
        },
        'trail-boss': {
            region: expeditionLayouts.second.title,
            title: '예티와의 대결',
        },
        'drive-pack': {
            region: expeditionLayouts.third.title,
            title: '숲늑대와의 교전',
        },
        'drive-boss': {
            region: expeditionLayouts.third.title,
            title: '갑옷 멧돼지와의 대결',
        },
        'mushroom-pack': { region: '버섯숲 공터', title: '버섯숲의 교전' },
        'mushroom-grove': {
            region: expeditionLayouts.fourth.title,
            title: '버섯숲의 교전',
        },
    };
    return headings[encounter];
}
