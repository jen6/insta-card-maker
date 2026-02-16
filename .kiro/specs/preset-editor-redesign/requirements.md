# 요구사항 문서

## 소개

Insta Card Maker의 기존 프리셋 에디터 UI를 디자인 이미지에 맞게 전면 개편한다. 현재 구현된 PresetEditor 컴포넌트의 접이식 섹션 구조를 유지하면서, 불필요한 필드 제거, 색상 입력 일관성 개선, 그라데이션/CSS 직접 입력 방식의 사용자 친화적 대체, 슬라이더 UX 개선 등을 수행한다. 기존 데이터 레이어(presetStorage, presetValidator)와 렌더러 통합은 유지하며, UI 레이어만 리디자인한다.

## As-Is / To-Be 비교

| 영역 | As-Is (현재) | To-Be (변경 후) |
|------|-------------|----------------|
| **스케일 섹션 필드** | 5개 필드: 제목 크기(세로), 제목 크기(가로), 제목 최소 비율, 본문 크기(세로), 작은 텍스트 | 4개 필드: 제목 크기(세로), 제목 최소 비율, 본문 크기(세로), 작은 텍스트. `titleScaleLandscape` 제거 |
| **색상 필드 - hex** | 컬러 피커 스와치 + 텍스트 입력 제공 | 동일 (유지) |
| **색상 필드 - rgba** | 컬러 피커 스와치 없음, 텍스트 입력만 제공. `isHex` 체크로 hex일 때만 피커 표시 | 모든 색상에 컬러 피커 스와치 표시. rgba일 때 RGB 부분을 근사 표시하고 알파 슬라이더 추가 |
| **배경 그라데이션** | CSS 그라데이션 코드를 텍스트 입력에 직접 입력 | 그라데이션 프리셋 드롭다운(없음/은은한 빛/코너 글로우 등) + "직접 입력" 옵션. 오버레이 투명도 슬라이더 추가 |
| **이미지 오버레이** | CSS 그라데이션 코드를 텍스트 입력에 직접 입력 | 투명도 0~100% 슬라이더로 변경. 내부적으로 `linear-gradient(rgba(0,0,0,α), rgba(0,0,0,α))` 자동 생성 |
| **섹션 순서** | 기본 정보 → 타이포그래피 → 스케일 → 레이아웃 상세 → 배경 및 그라데이션 → 색상 → 글꼴 → 강조 스타일 (8개 섹션) | 기본 정보(글꼴+강조 스타일 통합) → 타이포그래피 → 스케일 → 레이아웃 상세 → 배경 및 그라데이션 → 색상 (6개 섹션) |
| **섹션 기본 상태** | 기본 정보, 타이포그래피, 스케일이 기본 펼침 | 기본 정보, 타이포그래피만 기본 펼침. 나머지는 접힘 |
| **글꼴 섹션** | 독립 섹션으로 존재 | "기본 정보" 섹션 내부로 통합 |
| **강조 스타일 섹션** | 독립 섹션으로 존재 | "기본 정보" 섹션 내부로 통합 |
| **타이포그래피 레이아웃** | 2열 그리드(제목 굵기, 제목 자간, 본문 자간, 제목 줄 간격) + 본문 줄 간격 단독 행 | 동일 (유지) |
| **라이브 미리보기** | 오른쪽 패널, 1:1/4:5 토글, PRO TIP 표시 | 동일 (유지) |

## 용어 정의

- **Preset_Editor**: 프리셋의 속성값을 편집할 수 있는 UI 컴포넌트 (`web/src/components/PresetEditor.jsx`)
- **Section_Component**: 접이식(collapsible) 섹션 UI 컴포넌트. 제목 클릭으로 열고 닫을 수 있다
- **Color_Field**: 컬러 피커 스와치와 텍스트 입력을 함께 제공하는 색상 편집 필드
- **Scale_Slider**: 슬라이더와 현재 값 숫자 표시를 함께 제공하는 스케일 편집 필드
- **Layout_Slider**: 레이아웃 관련 비율값을 편집하는 슬라이더 필드
- **Gradient_Builder**: CSS 그라데이션 문자열을 직접 입력하는 대신, 시각적으로 그라데이션을 구성할 수 있는 UI 컴포넌트
- **Live_Preview**: 프리셋 변경 사항을 실시간으로 반영하는 카드 미리보기 패널
- **Preset_Object**: description, fontFamily, bgColor, titleColor 등의 속성을 포함하는 프리셋 데이터 구조
- **Color_Property**: bgColor, titleColor, textColor, mutedColor, lineColor, panelColor, panelStrongColor 등 색상 값을 가지는 프리셋 속성
- **Alpha_Slider**: rgba 색상의 알파(투명도) 값을 0~1 범위로 조절하는 슬라이더 컴포넌트

## 요구사항

### 요구사항 1: 불필요한 필드 제거

**User Story:** 사용자로서, 실제로 사용하지 않는 편집 필드가 제거되길 원한다. 그래야 에디터가 간결해지고 혼란이 줄어든다.

**As-Is:** 스케일 섹션에 `titleScaleLandscape` (제목 크기 가로) 필드가 존재한다.
**To-Be:** 해당 필드를 UI에서 제거한다. 기존 데이터는 보존한다.

#### 수용 기준

1. THE Preset_Editor SHALL "제목 크기 (가로)" (`titleScaleLandscape`) 필드를 스케일 섹션에서 제거한다
2. THE Preset_Editor SHALL 제거된 필드의 값은 저장 시 기존 프리셋의 기본값을 자동으로 사용한다
3. WHEN 기존에 `titleScaleLandscape` 값이 설정된 프리셋을 편집할 때, THE Preset_Editor SHALL 해당 값을 유지하되 편집 UI에는 노출하지 않는다

### 요구사항 2: 색상 필드 일관성 개선

**User Story:** 사용자로서, 모든 색상 필드가 동일한 방식으로 동작하길 원한다. 그래야 hex 색상과 rgba 색상을 혼동 없이 편집할 수 있다.

**As-Is:** `ColorField` 컴포넌트가 `isHex` 체크(`/^#[0-9a-fA-F]{3,6}$/.test(value)`)를 수행하여 hex일 때만 컬러 피커 스와치를 표시한다. rgba 색상(mutedColor, lineColor, panelColor, panelStrongColor)은 텍스트 입력만 제공된다.
**To-Be:** 모든 색상 필드에 항상 컬러 피커 스와치를 표시한다. rgba 색상은 RGB 부분을 근사 표시하고, 알파 슬라이더를 추가한다.

#### 수용 기준

1. THE Color_Field SHALL 모든 색상 속성(bgColor, titleColor, textColor, mutedColor, lineColor, panelColor, panelStrongColor)에 대해 컬러 피커 스와치와 텍스트 입력 필드를 항상 함께 제공한다
2. WHEN 색상 값이 hex 형식일 때, THE Color_Field SHALL 컬러 피커 스와치에 해당 색상을 표시하고 피커를 통한 색상 변경을 지원한다
3. WHEN 색상 값이 rgba 형식일 때, THE Color_Field SHALL rgba 값에서 RGB 부분을 추출하여 컬러 피커 스와치의 배경색으로 근사 표시한다
4. THE Color_Field SHALL 텍스트 입력 필드에 현재 색상 값(hex 또는 rgba)을 항상 표시한다
5. WHEN 사용자가 컬러 피커에서 색상을 선택하면, THE Color_Field SHALL 텍스트 입력 필드의 값을 hex 형식으로 업데이트한다
6. WHEN 사용자가 텍스트 입력 필드에 유효한 색상 값을 입력하면, THE Color_Field SHALL 컬러 피커 스와치의 표시 색상을 업데이트한다

### 요구사항 3: rgba 색상의 알파 채널 편집 지원

**User Story:** 사용자로서, rgba 형식의 색상에서 투명도(알파)를 슬라이더로 조절하고 싶다. 그래야 보조색, 구분선 등의 반투명 색상을 직관적으로 조절할 수 있다.

**As-Is:** rgba 색상은 텍스트 입력으로만 편집 가능하다. 알파 값을 변경하려면 `rgba(255, 255, 255, 0.72)` 문자열을 직접 수정해야 한다.
**To-Be:** rgba 색상에 알파 슬라이더를 추가하여 투명도를 시각적으로 조절할 수 있다. 컬러 피커로 RGB 부분을 변경하면 기존 알파 값이 유지된다.

#### 수용 기준

1. WHEN 색상 값이 rgba 형식일 때, THE Color_Field SHALL 알파 값을 0~1 범위로 조절할 수 있는 Alpha_Slider를 표시한다
2. WHEN 사용자가 Alpha_Slider를 조절하면, THE Color_Field SHALL rgba 문자열의 알파 부분만 업데이트하고 RGB 부분은 유지한다
3. WHEN 사용자가 rgba 색상의 컬러 피커를 사용하면, THE Color_Field SHALL 기존 알파 값을 유지하면서 RGB 부분만 업데이트한 rgba 문자열을 생성한다
4. WHEN 색상 값이 hex 형식일 때, THE Color_Field SHALL Alpha_Slider를 표시하지 않는다

### 요구사항 4: 그라데이션 설정 사용자 친화적 개선

**User Story:** 사용자로서, CSS 그라데이션 코드를 직접 작성하지 않고도 배경 그라데이션을 설정하고 싶다. 그래야 CSS 지식 없이도 원하는 배경을 만들 수 있다.

**As-Is:** "배경 및 그라데이션" 섹션에 `backgroundLayers`와 `imageOverlay`가 각각 CSS 텍스트 입력 필드로 제공된다. 사용자가 `radial-gradient(circle at 8% 5%, rgba(44, 168, 255, 0.12) 0%, ...)` 같은 복잡한 CSS를 직접 입력해야 한다.
**To-Be:** 그라데이션 프리셋 드롭다운(없음/은은한 빛/코너 글로우/대각선 등) + "직접 입력" 옵션을 제공한다. 이미지 오버레이는 투명도 슬라이더로 변경한다.

#### 수용 기준

1. THE Gradient_Builder SHALL "배경 및 그라데이션" 섹션에서 기존 `backgroundLayers` CSS 텍스트 입력을 대체한다
2. THE Gradient_Builder SHALL "없음 (단색 배경)" 옵션을 제공하여 `backgroundLayers`를 "none"으로 설정할 수 있다
3. THE Gradient_Builder SHALL 미리 정의된 그라데이션 프리셋 목록(예: "은은한 빛", "코너 글로우", "대각선 그라데이션")을 선택할 수 있는 드롭다운을 제공한다
4. THE Gradient_Builder SHALL "직접 입력" 옵션을 제공하여 고급 사용자가 CSS 그라데이션 코드를 직접 입력할 수 있다
5. WHEN 사용자가 그라데이션 프리셋을 선택하면, THE Gradient_Builder SHALL 해당 프리셋의 CSS 값을 `backgroundLayers`에 적용하고 Live_Preview에 즉시 반영한다
6. THE Gradient_Builder SHALL 이미지 오버레이(`imageOverlay`) 투명도를 0~100% 슬라이더로 조절할 수 있는 필드를 제공한다
7. WHEN 사용자가 오버레이 투명도 슬라이더를 조절하면, THE Gradient_Builder SHALL `imageOverlay` CSS 값의 알파 채널을 해당 비율로 업데이트한다

### 요구사항 5: 섹션 구조 재구성

**User Story:** 사용자로서, 디자인 이미지에 맞는 논리적인 섹션 구조로 프리셋을 편집하고 싶다. 그래야 원하는 설정을 빠르게 찾을 수 있다.

**As-Is:** 8개 섹션이 존재한다: 기본 정보, 타이포그래피, 스케일, 레이아웃 상세, 배경 및 그라데이션, 색상, 글꼴, 강조 스타일. 기본 정보/타이포그래피/스케일이 기본 펼침 상태이다.
**To-Be:** 6개 섹션으로 통합한다: 기본 정보(글꼴+강조 스타일 포함), 타이포그래피, 스케일, 레이아웃 상세, 배경 및 그라데이션, 색상. 기본 정보/타이포그래피만 기본 펼침 상태이다.

#### 수용 기준

1. THE Preset_Editor SHALL 다음 순서의 접이식 섹션을 제공한다: 기본 정보, 타이포그래피, 스케일 (SCALE), 레이아웃 상세, 배경 및 그라데이션, 색상
2. THE Section_Component SHALL "기본 정보"와 "타이포그래피" 섹션을 기본적으로 펼친 상태로 표시한다
3. THE Section_Component SHALL 나머지 섹션("스케일", "레이아웃 상세", "배경 및 그라데이션", "색상")을 기본적으로 접힌 상태로 표시한다
4. THE Preset_Editor SHALL 기존의 "글꼴" 섹션과 "강조 스타일" 섹션을 "기본 정보" 섹션 내부로 통합한다
5. WHEN 사용자가 섹션 헤더를 클릭하면, THE Section_Component SHALL 해당 섹션의 열림/닫힘 상태를 토글한다

### 요구사항 6: 스케일 섹션 필드 구성

**User Story:** 사용자로서, 스케일 값을 슬라이더로 직관적으로 조절하면서 정확한 숫자도 확인하고 싶다. 그래야 시각적으로 값을 조절하면서도 정밀한 제어가 가능하다.

**As-Is:** 5개 필드(제목 크기 세로, 제목 크기 가로, 제목 최소 비율, 본문 크기 세로, 작은 텍스트)가 슬라이더+숫자로 표시된다.
**To-Be:** 4개 필드(제목 크기 세로, 제목 최소 비율, 본문 크기 세로, 작은 텍스트)만 표시된다. "제목 크기 가로" 제거.

#### 수용 기준

1. THE Scale_Slider SHALL 슬라이더 트랙과 현재 값을 숫자로 표시하는 라벨을 함께 제공한다
2. THE Scale_Slider SHALL 슬라이더의 범위를 0.01~1.0, step을 0.001로 설정한다
3. WHEN 사용자가 슬라이더를 드래그하면, THE Scale_Slider SHALL 숫자 라벨을 실시간으로 업데이트한다
4. THE Preset_Editor SHALL 스케일 섹션에 다음 4개 필드만 표시한다: 제목 크기(세로), 제목 최소 비율, 본문 크기(세로), 작은 텍스트
5. WHEN 사용자가 스케일 값을 변경하면, THE Preset_Editor SHALL Live_Preview에 변경 사항을 즉시 반영한다

### 요구사항 7: 레이아웃 상세 섹션

**User Story:** 사용자로서, 레이아웃 패딩과 간격을 슬라이더로 조절하고 싶다. 그래야 카드의 여백과 간격을 시각적으로 조정할 수 있다.

**As-Is:** 레이아웃 상세 섹션에 4개 슬라이더(좌우 패딩, 상단 패딩, 하단 패딩, 제목-본문 간격)가 존재한다.
**To-Be:** 동일한 4개 슬라이더를 유지하되, 섹션 기본 상태를 접힘으로 변경한다.

#### 수용 기준

1. THE Layout_Slider SHALL 슬라이더 트랙과 현재 값을 숫자로 표시하는 라벨을 함께 제공한다
2. THE Preset_Editor SHALL 레이아웃 상세 섹션에 다음 필드를 표시한다: 좌우 패딩, 상단 패딩, 하단 패딩, 제목-본문 간격
3. WHEN 사용자가 레이아웃 슬라이더를 드래그하면, THE Layout_Slider SHALL 숫자 라벨을 실시간으로 업데이트하고 Live_Preview에 반영한다

### 요구사항 8: 색상 섹션 구성

**User Story:** 사용자로서, 모든 색상 설정을 하나의 섹션에서 일관되게 관리하고 싶다. 그래야 카드의 전체 색상 테마를 한눈에 파악하고 조정할 수 있다.

**As-Is:** 색상 섹션에 7개 색상 필드가 존재하지만, rgba 색상은 컬러 피커 없이 텍스트만 제공된다.
**To-Be:** 7개 색상 필드 모두 컬러 피커 + 텍스트 입력 + (rgba인 경우) 알파 슬라이더를 제공한다.

#### 수용 기준

1. THE Preset_Editor SHALL 색상 섹션에 다음 필드를 순서대로 표시한다: 배경색, 제목색, 본문색, 보조색, 구분선, 패널색, 패널 강조
2. THE Preset_Editor SHALL 각 색상 필드에 Color_Field 컴포넌트(컬러 피커 스와치 + 텍스트 입력 + 조건부 Alpha_Slider)를 사용한다
3. WHEN 색상 값이 변경되면, THE Preset_Editor SHALL Live_Preview에 변경 사항을 즉시 반영한다

### 요구사항 9: 라이브 미리보기 패널

**User Story:** 사용자로서, 프리셋 변경 사항을 실시간으로 미리보기하고 싶다. 그래야 저장하기 전에 결과를 확인할 수 있다.

**As-Is:** 오른쪽 패널에 라이브 미리보기가 존재하며, 1:1/4:5 토글과 PRO TIP이 표시된다.
**To-Be:** 기존 기능을 유지한다 (변경 없음).

#### 수용 기준

1. THE Live_Preview SHALL 에디터 폼 오른쪽에 고정된 미리보기 패널을 표시한다
2. THE Live_Preview SHALL 1:1과 4:5 비율 전환 토글 버튼을 제공한다
3. WHEN 프리셋의 속성값이 변경되면, THE Live_Preview SHALL 카드 미리보기를 즉시 다시 렌더링한다
4. THE Live_Preview SHALL 미리보기 하단에 PRO TIP 섹션을 표시한다
5. IF 렌더링 중 오류가 발생하면, THEN THE Live_Preview SHALL 오류를 무시하고 마지막 성공한 미리보기를 유지한다
