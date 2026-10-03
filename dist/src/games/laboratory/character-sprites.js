import manifest from '../../../resources/manifest.json' with { type: 'json' };
function requireAnimation(animation) {
    if (!animation?.frames.length)
        throw new Error('캐릭터 모션이 없습니다.');
    return animation;
}
export class CharacterSprites {
    appearances;
    selected = 'toben';
    constructor() {
        const toben = manifest.assets.find((asset) => asset.id === 'avatar/adventurer-toben');
        const ataho = manifest.assets.find((asset) => asset.id === 'hwanse/ataho');
        const smashu = manifest.assets.find((asset) => asset.id === 'hwanse/smashu');
        if (!toben || !ataho || !smashu) {
            throw new Error('캐릭터 리소스 정보가 없습니다.');
        }
        this.appearances = new Map([
            [
                'toben',
                {
                    scale: 1.3,
                    sourceFacing: -1,
                    animations: new Map([
                        ['stand', requireAnimation(toben.animations.stand)],
                        ['move', requireAnimation(toben.animations.move)],
                        ['jump', requireAnimation(toben.animations.jump)],
                    ]),
                },
            ],
            [
                'ataho',
                {
                    scale: 1.6,
                    sourceFacing: 1,
                    animations: new Map([
                        ['stand', requireAnimation(ataho.animations['stand-right'])],
                        ['move', requireAnimation(ataho.animations['move-right'])],
                        // 사용자가 선택한 승리 모션의 여섯 프레임을 공중 동작으로 사용한다.
                        ['jump', requireAnimation(ataho.animations.victory)],
                    ]),
                },
            ],
            [
                'smashu',
                {
                    scale: 1,
                    sourceFacing: -1,
                    animations: new Map([
                        ['stand', requireAnimation(smashu.animations.stand)],
                        ['move', requireAnimation(smashu.animations.move)],
                        // 점프 전용 모션 대신 기존 회전을 공중 동작으로 사용한다.
                        ['jump', requireAnimation(smashu.animations.spin)],
                    ]),
                },
            ],
        ]);
    }
    select(character) {
        this.selected = character;
    }
    get appearance() {
        return this.appearances.get(this.selected);
    }
    get framePaths() {
        return [
            ...new Set([...this.appearances.values()].flatMap((appearance) => [...appearance.animations.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath)))),
        ];
    }
}
