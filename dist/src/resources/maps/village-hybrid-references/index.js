import { hybridReferences, reviewedMixedVillages, villageStyleLinks, } from './references.js';
import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { resourceUrl } from '../../catalog/resource-url.js';
import { functionTransfers } from './function-transfers.js';
const root = document.getElementById('hybrid-references');
if (!root)
    throw new Error('혼합 표현 자료 화면이 없습니다.');
const events = new AbortController();
const library = resourceUrl('src/resources/');
library.searchParams.set('category', 'maps');
library.searchParams.set('group', '마을 스타일 실험');
const mixedLibrary = new URL(library.href);
mixedLibrary.searchParams.set('q', '기법 조합');
const experienceLibrary = new URL(library.href);
experienceLibrary.searchParams.set('q', '생활·탐험 조합');
const expandedLibrary = new URL(library.href);
expandedLibrary.searchParams.set('q', '확장 조합');
const transferLibrary = new URL(library.href);
transferLibrary.searchParams.set('q', '기능 전이');
function styleUrl(id) {
    const url = new URL(library.href);
    url.searchParams.set('asset', `local/village-style-${id}`);
    return url.href;
}
function styleName(id) {
    return villageStyleLinks.find((style) => style.id === id)?.name ?? id;
}
root.innerHTML = `<header><p class="eyebrow">마을 스타일 연구 · 2026.10.13</p><h1>입체와 도트 그림</h1><p>전체 스타일과 개별 오브젝트의 제작 방식을 함께 살펴봅니다.</p><a href="${library.href}" target="_top">전체 마을 시안 비교 →</a><a href="${mixedLibrary.href}" target="_top">열두 조합 비교 →</a><a href="${experienceLibrary.href}" target="_top">생활·탐험 네 조합 →</a><a href="${expandedLibrary.href}" target="_top">확장·개선 여덟 조합 →</a><a href="${transferLibrary.href}" target="_top">기능을 옮긴 아홉 시안 →</a></header>
<section><h2>다른 유형의 기능을 맵에 옮기기</h2><p class="intro">A 맵의 형태·재질·시점을 유지하며 B 유형의 통행·가림·조명·표시 규칙을 적용한 독립 시안입니다. 각 시안에서 원래 맵과 달라진 공간과 반응을 직접 비교할 수 있습니다.</p><div class="style-grid">${functionTransfers.map((item) => `<article><p class="eyebrow">${styleName(item.base)} ← ${item.donor === 'expression-lab' ? '움직임과 풍경 · 표현 비교' : styleName(item.donor)}</p><h3>${item.name}</h3><dl><dt>옮긴 기능</dt><dd>${item.feature}</dd><dt>A 맵에서 달라지는 경험</dt><dd>${item.behavior}</dd></dl><details><summary>직접 비교할 점</summary><p>${item.check}</p></details><nav aria-label="${item.name} 기능 비교"><a href="${styleUrl(item.id)}" target="_top">기능 전이 시안 걸어보기 →</a><a href="${styleUrl(item.base)}" target="_top">원래 맵 →</a><a href="${item.donor === 'expression-lab' ? resourceUrl('src/resources/effects/expression-lab/').href : styleUrl(item.donor)}" target="_top">기능을 가져온 시안 →</a></nav></article>`).join('')}</div></section>
<section><h2>하나의 마을에서도 여러 방식을 섞을 수 있어요</h2><div class="combination"><article><b>건물</b><p>3D 본체 + 픽셀 표면 + 벽에 고정한 간판</p></article><article><b>식생</b><p>3D 줄기 + 입체 수관 + 낮은 풀의 이미지 판</p></article><article><b>화덕 마당</b><p>3D 화덕 + 2D 불꽃·연기 + 바닥과 장식의 빛</p></article></div></section>
<section><h2>결합 방법과 제작 자료</h2><p class="intro">‘자료에서 확인’은 출처의 설명, ‘시안 적용 제안’은 이 프로젝트에 대한 판단입니다. 조사된 모든 기법을 구현한 것은 아닙니다.</p><div class="method-grid">${hybridReferences.map((item) => `<article id="${item.id}" class="method"><p class="eyebrow">${item.target}</p><h3>${item.name}</h3><dl><dt>자료에서 확인</dt><dd>${item.finding}</dd><dt>시안 적용 제안</dt><dd>${item.proposal}</dd></dl><details><summary>보행하며 확인할 점</summary><p>${item.check}</p></details><nav aria-label="${item.name} 출처">${item.sources.map((source) => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label} ↗</a>`).join('')}</nav></article>`).join('')}</div></section>
<section><h2>마을을 바꾸면서 그림을 붙일 때</h2><p class="intro">아래는 여러 표현을 함께 쓰기 위한 프로젝트 적용 제안입니다. 원작 게임의 내부 구현을 설명하는 내용은 아닙니다.</p><div class="combination"><article><h3>큰 형태와 작은 그림</h3><p>가까이 걷는 벽·지붕·뿌리는 형태와 충돌을 유지합니다. 기와 무늬는 표면 UV, 문패는 건물 자식 그림 판, 풀은 빈 부분을 가림에서 제외하는 얇은 판으로 나눠 붙일 수 있습니다.</p></article><article><h3>빛을 받는 그림</h3><p>색 그림과 표면 방향·빛 영역을 같은 좌표로 준비하면 평면 그림에도 방향별 음영이 생깁니다. 승인된 인물 원본은 보존하고, 환경의 빛과 발밑 그림자를 별도로 맞추는 선택도 가능합니다.</p></article><article><h3>증축과 곡면</h3><p>건물이 연결되면 공유 벽·지붕과 장식을 함께 갱신합니다. 지형이 휘어지면 건물·장식·인물의 발에도 같은 변환을 적용합니다. 화면의 모양과 클릭 목적지, 걸을 수 있는 길이 서로 맞아야 합니다.</p></article><article><h3>고정 배경과 움직임</h3><p>배경 색과 깊이를 보관해도 불꽃·인물·시설 변화는 별도로 그릴 수 있습니다. 스톱모션 표현은 장식의 표시 포즈만 단계적으로 바꾸고 입력과 보행 규칙은 연속으로 유지하는 방식으로 비교합니다.</p></article></div></section>
<section><h2>시안을 걸으며 확인한 결합 사례</h2><div class="combination"><article><h3>자연마을 · 인물판의 방향</h3><p>인물판을 카메라 각도대로 기울였을 때 머리가 도장 마루와 교차했습니다. 수직 판과 세로 투영 보정으로 원본 그림을 유지하면서 앞마루·뒤편 가림을 확인했습니다.</p></article><article><h3>2D 마을 · 화덕의 빛</h3><p>화덕 반응을 불꽃에만 적용하지 않고 바닥과 가까운 공방 벽에 별도로 합성했습니다. 실제 입체 광원 대신 2D 영역별 색 표현을 비교합니다.</p></article><article><h3>계단마을 · 원본 그림의 비율</h3><p>정사각형 판에 서로 다른 크기의 아타호 프레임을 맞추면 가로로 눌렸습니다. 원본 폭·높이·발밑 기준을 읽고 카메라의 세로 투영을 보정하도록 개선했습니다.</p></article><article><h3>종이골목 · 경사로 입력</h3><p>접힌 책과 도장 경사로의 발 높이를 포인터 역투영에도 사용했습니다. 클릭 위치와 보행 접점의 오차를 고치고 좁은 골목·서쪽 우회·도장 뒤 가림을 실제로 걸어 확인했습니다.</p></article><article><h3>회화광장 · 그림 레이어</h3><p>그림 배경과 건물·전경·인물을 발밑 깊이로 정렬했습니다. 큰 명암과 끊긴 붓 경계로 길을 읽게 하고, 도장 뒤 보행과 화덕의 바닥 빛을 확인했습니다.</p></article><article><h3>장난감 마을 · 곡면과 접지</h3><p>둥근 건물과 우물의 입체 명암에 원본 도트 인물을 조합했습니다. 언덕 높이를 발·이동·포인터에 공유하고, 벤치의 그림과 충돌 배치를 맞춰 좌석 위에 서던 접점도 개선했습니다.</p></article><article><h3>디오라마 · 색과 깊이 캐시</h3><p>정적 배경의 색과 깊이를 함께 보관하고 움직이는 인물을 합성합니다. 깊이 복원 오류를 고쳐 벽 뒤 가림을 확인했고, 보행 중 배경 재사용과 복구·조망·크기 변경 때의 갱신을 검증했습니다.</p></article><article><h3>레트로 나루 · 표면 픽셀</h3><p>작은 목재·기와 그림을 두께 있는 벽과 사선 지붕에 붙였습니다. 가까운 확대와 전체 조망의 축소를 비교하고, 계단·다리의 발 높이와 건물 뒤 가림을 확인했습니다.</p></article><article><h3>선화 마을 · 색이 돌아오는 배경</h3><p>원본 도트 인물을 유지하면서 배경을 굵은 선과 큰 색면으로 바꿨습니다. 복구의 채색 변화와 두 다리 순환·전경 가림을 실제 입력으로 확인했습니다.</p></article><article><h3>옆길 거리 · 보행층과 패럴랙스</h3><p>상점 앞길·지붕·뒷골목을 계단으로 연결했습니다. 실제 카메라 이동에서 능선·뒤집·거리·전경의 이동 비율이 0.12·0.38·1·1.15로 달라지는지 확인하고, 좁은 화면의 입구 인물 위치를 보정했습니다.</p></article><article><h3>단면 마을 · 층과 생활 공간</h3><p>외벽을 자른 다섯 실내를 복도와 세 계단으로 연결했습니다. 실제 클릭으로 1층 화덕·2층 도장·3층 다락을 답사하고, 외벽을 닫았을 때의 차이와 멈춤 중 동일한 Canvas 픽셀을 확인했습니다.</p></article><article><h3>뿌리 둥지 · 소재판과 전경</h3><p>나무껍질·이끼·버섯 소재판을 직접 만든 윤곽 안에 겹쳤습니다. 이 시안은 2D 콜라주입니다. 반복 무늬의 직선 경계를 고치고, 실제 뿌리 폭을 따라 이끼 뒤로 걸을 때 인물이 가려지는지 확인했습니다.</p></article><article><h3>연결형 마을 · 인접 구조 갱신</h3><p>11·13·16개 모듈의 인접 규칙으로 기존 외벽·지붕을 재구성합니다. 공유 벽 8·12·20쌍과 닫힌 중앙 건물에서 열린 아치로의 변화, 아치 너머 보행과 새 건물에 겹쳤을 때의 위치 보정을 검증했습니다.</p></article><article><h3>불빛 골목 · 실제 표면 방향</h3><p>색·normal·mask 지도를 같은 640×400 UV로 읽습니다. normal 켜기/끄기와 좌우 광원 조작에서 실제 렌더 픽셀과 돌·기와의 면 음영이 달라지는지 확인했습니다. 원본 인물은 unlit으로 보존하고 아래 기준 pivot과 버튼 가림을 고쳤습니다.</p></article><article><h3>둥근 길 · 곡면과 역변환</h3><p>평면 보행 좌표를 원통의 실제 geometry로 옮겨 건물·고정 간판·그림자가 함께 굽습니다. 큰 지붕 면을 분할하고, 카메라 추적·평면 비교·시설 답사와 인물 발 위치의 클릭 역변환 일치를 실제로 확인했습니다.</p></article><article><h3>두빛 마을 · 두 색과 디더</h3><p>환경을 384×240의 두 색 래스터와 4×4 Bayer 디더로 만들고 인물 원본은 별도로 합성합니다. 이동과 조망 전환에서 같은 무늬가 유지되도록 물리 픽셀 확대를 정수 배수로 맞췄습니다. 시설 클릭은 0.5 단위 보행 격자로 보정합니다.</p></article><article><h3>손끝 골목 · 표시 박자와 크기 변경</h3><p>두꺼운 판지와 직접 손칠한 재질 위의 장식 포즈를 12FPS로 표시하며 보행 계산은 연속으로 유지합니다. 같은 표시 프레임의 포즈 유지와 연속 모드 차이를 확인하고, 멈춘 채 화면 크기를 바꿀 때 마지막 표시 상태로 한 번만 다시 그리도록 개선했습니다.</p></article>${reviewedMixedVillages.map((item) => `<article><h3>${styleName(item.id)}</h3><p>${item.finding}</p><nav aria-label="${styleName(item.id)} 원시안 비교"><a href="${styleUrl(item.id)}" target="_top">조합 시안 걸어보기 →</a>${item.previousStyles.map((id) => `<a href="${styleUrl(id)}" target="_top">기존 ${styleName(id)} →</a>`).join('')}</nav></article>`).join('')}</div></section>
<section><h2>마을에서 비교하기</h2><div class="style-grid">${villageStyleLinks
    .map((style) => {
    return `<article><h3>${style.name}</h3><p>${style.method}</p><a href="${styleUrl(style.id)}" target="_top">라이브러리에서 걸어보기 →</a><a href="${style.url}" target="_blank" rel="noopener noreferrer">참고 자료 · ${style.reference} ↗</a></article>`;
})
    .join('')}</div></section><footer>공식 엔진 문서와 제작자 자료를 조사한 연구 기록입니다. 캐릭터 원본과 기존 본게임의 진행 규칙은 각 독립 시안의 범위에 포함하지 않습니다.</footer>`;
function dispose() {
    events.abort();
}
registerEmbeddedScene(dispose);
window.addEventListener('pagehide', dispose, {
    once: true,
    signal: events.signal,
});
