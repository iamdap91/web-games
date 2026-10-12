/** 수관의 옆모습. 그리기·쓰러짐·높이 계산이 같은 단면을 사용한다. */
const crownProfile = [
    { radius: 0, y: -1.35 },
    { radius: 0.68, y: -1.0 },
    { radius: 0.96, y: -0.45 },
    { radius: 1, y: 0.12 },
    { radius: 0.86, y: 0.66 },
    { radius: 0.48, y: 1.08 },
    { radius: 0, y: 1.35 },
];
/** 나무 모양·줄기 충돌·쓰러지는 수관의 판정이 같은 치수를 사용한다. */
export const treeShape = {
    trunkWidth: 0.38,
    trunkHeight: 1.7,
    crownHeight: crownProfile.at(-1).y - crownProfile[0].y,
    crownProfile,
    crowns: [{ y: 2.25, radius: 1.2 }],
};
