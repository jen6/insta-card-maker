# Insta Card Maker

마크다운 글을 넣으면 인스타용 카드뉴스 PNG를 자동 생성합니다.

- 기본 스타일: `reference` 프리셋(검은 배경 + 파란 제목 + 흰 본문)
- 기본 비율: 세로형 4:5 (`1080x1350`)
- 출력: 카드별 PNG (`01.png`, `02.png`, ...)
- 카드 내 점(dot) / 슬라이드 번호 없음

## 1) 설치

```bash
npm install
```

## 2) 실행

```bash
node src/cli.js -i examples/sample.md -o output
```

또는:

```bash
npm run example
```

웹 CMS(저장/조회) 모드:

```bash
npm run web
```

- 브라우저에서 `http://localhost:5173` (Vite + React/shadcn UI)
- API 서버는 `http://localhost:3000`에서 동작
- 좌측 상단에서 제목/본문 입력 후 `저장`
- 저장된 글은 목록에서 다시 불러와 수정/삭제 가능
- 데이터는 `data/content.db`(SQLite)에 저장됩니다.
- 본문의 `data:image/...;base64,...` 이미지는 DB의 BLOB으로 저장/복원됩니다.

프런트엔드만 빌드해서 Express에서 정적으로 서빙하려면:

```bash
npm run build:web
npm run web:api
```

## 카드 분할 규칙

1. 마크다운에 `---` 구분선이 있으면, 구분선 기준으로 카드가 나뉩니다.
2. `---`가 없으면 문단 길이 기준으로 자동 분할합니다.

## 옵션

```bash
node src/cli.js \
  -i <input.md> \
  -o <output_dir> \
  --preset reference \
  --ratio 4:5 \
  --max-chars 260 \
  --font-family "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" \
  --bg-color "#000000" \
  --bg-image "./assets/bg.jpg" \
  --title-color "#2ca8ff" \
  --text-color "#f7f7f7" \
  --title-scale 0.95 \
  --body-scale 0.92 \
  --small-text-scale 0.9 \
  --title-line-height 1.18 \
  --body-line-height 1.6 \
  --emphasis-style highlight
```

- `--preset`: 스타일 프리셋 선택 (`reference`, `glow`, `glowless`, `paper`, `sports-hero`)
- `--list-presets`: 사용 가능한 프리셋 목록 출력
- `--output` 미지정 시 자동 출력 폴더: `output/yyyy-mm-dd-{title}`
- `--ratio`: 기본 비율 지정 (`4:5`, `1:1`, `3:3`, `3:4`, `4:3` 등)
- `--width`, `--height`: 둘 다 주면 고정 크기, 하나만 주면 `--ratio`로 나머지 자동 계산
- `--max-chars`: 자동 분할 시 카드당 최대 문자 수
- `--font-family`: 폰트 지정
- `--bg-color`, `--bg-image`: 배경색 또는 배경 이미지 지정 (로컬 경로/URL 모두 가능, 전체 카드에 적용)
- `--title-scale`, `--body-scale`: 제목/본문 크기 배율 조정
- `--small-text-scale`: 코드/작은 글씨 크기 배율 조정
- `--title-line-height`, `--body-line-height`: 행간 조정
- `--emphasis-style`: 강조 규칙 통일 (`accent-underline`, `highlight`, `bold`, `glow`)
- 카드 내부 텍스트가 넘치면 글자 크기를 자동으로 축소해 균형을 맞춥니다.

## 페이지별 배경 이미지

`--bg-image`는 모든 카드에 동일한 배경을 적용합니다. 특정 카드에만 개별 배경 이미지를 지정하려면 마크다운 안에 HTML 코멘트 디렉티브를 사용하세요.

```markdown
<!-- bg-image: https://example.com/photo1.jpg -->
# 첫 번째 카드
이 카드에만 배경 이미지가 적용됩니다.

---

# 두 번째 카드
배경 이미지 없이 기본 배경색을 사용합니다.

---

<!-- bg-image: https://example.com/photo2.jpg -->
# 세 번째 카드
다른 배경 이미지가 적용됩니다.
```

- 디렉티브가 있는 카드는 `--bg-image` 글로벌 설정을 오버라이드합니다.
- 디렉티브가 없는 카드는 `--bg-image` 값이 있으면 그것을 사용하고, 없으면 프리셋 기본 배경을 사용합니다.
- 웹 UI에서는 헤더의 "배경 이미지" 입력 필드로 글로벌 배경을 지정할 수 있습니다.

## 프리셋 설계

- `reference`: 현재 레퍼런스 톤을 그대로 분리한 기본 프리셋
- `glow`: 네온 강조/하이라이트가 더 강한 버전
- `glowless`: `glow` 톤을 유지하면서 발광 강조를 제거한 버전
- `paper`: 검정 배경 기반의 따뜻한 에디토리얼 톤
- `sports-hero`: 배경 이미지 중심 + 텍스트 포지션 지정형 템플릿

프리셋은 아래 항목을 포함합니다.

- 색상 토큰: 배경/제목/본문/보더/패널
- 배경 레이어: 그라디언트 조합 + 이미지 오버레이
- 타이포 스케일: 제목/본문/최소 크기 비율
- 간격 규칙: 상하좌우 패딩, 제목-본문 간격
- 강조 규칙: 볼드/하이라이트/언더라인/글로우 스타일

프리셋 정의 파일:

- `/Users/geon/dev/30days_of_ai_code/day13_showui_pi/day14_insta_card/src/presets.js`

### `sports-hero` 텍스트 배치 규칙

마크다운 본문에서 아래 태그를 쓰면 위치를 직접 제어할 수 있습니다.

- `[logo]`: 상단 로고 텍스트
- `[kicker]`: 상단 카피
- `[center]`: 중앙 메인 타이틀
- `[left]`: 좌측 콜아웃
- `[right]`: 우측 콜아웃
- `[bottom]`: 하단 캡션
- `[point]`: 추가 포인트 (left/right가 비어있으면 자동 배치)

예시: `/Users/geon/dev/30days_of_ai_code/day13_showui_pi/day14_insta_card/examples/sports_hero.md`

## 지원 마크다운 요소

- heading: 카드 첫 heading은 타이틀, 나머지 heading은 본문 서브타이틀로 렌더링
- 문단/강조: `p`, `strong`, `em`
- 리스트: `ul`, `ol`, 체크리스트(task list)
- 인용문: `blockquote`
- 코드: 인라인 코드, 코드블록
- 테이블: `table`, `thead`, `tbody`, `th`, `td`
- 링크/이미지: `a`, `img`
- 구분선: `hr`

## 인스타 업로드 팁

- 피드 권장 세로형: `4:5` (`1080x1350`)
- 정사각형: `1:1` (`1080x1080`)
- `3:3`도 `1:1`과 동일한 정사각형입니다.

## 빠른 예시

```bash
node src/cli.js -i examples/sample.md -o output --ratio 4:5
node src/cli.js -i examples/sample.md -o output --ratio 1:1
node src/cli.js --list-presets
node src/cli.js -i examples/sample.md -o output --preset glow --body-scale 0.92 --body-line-height 1.6
node src/cli.js -i examples/sports_hero.md -o output_sports_hero --preset sports-hero --bg-image ./assets/hero.jpg --ratio 4:5
```
