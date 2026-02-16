# 요구사항 문서

## 소개

Insta Card Maker 웹 애플리케이션에 프리셋 관리 UI를 추가하여, 일반 사용자가 코드를 직접 수정하지 않고도 UI를 통해 프리셋을 추가, 편집, 삭제, 복제할 수 있도록 한다. 현재 프리셋은 `web/src/lib/presets.js` 파일에 하드코딩되어 있으며, 이를 기본(built-in) 프리셋으로 유지하면서 사용자 정의 프리셋을 localStorage에 저장하여 관리한다.

## 용어 정의

- **Preset_Manager**: 프리셋의 CRUD(생성, 조회, 수정, 삭제) 작업을 처리하는 모듈
- **Preset_Editor**: 프리셋의 속성값을 편집할 수 있는 UI 컴포넌트
- **Preset_Storage**: localStorage를 사용하여 사용자 정의 프리셋을 영속적으로 저장하는 모듈
- **Built_In_Preset**: `web/src/lib/presets.js`에 정의된 기본 제공 프리셋 (reference, glow, glowless, paper, sports-hero)
- **Custom_Preset**: 사용자가 UI를 통해 생성하거나 기본 프리셋을 복제하여 만든 프리셋
- **Preset_Object**: description, fontFamily, bgColor, titleColor, textColor 등의 속성을 포함하는 프리셋 데이터 구조
- **Color_Property**: bgColor, titleColor, textColor, mutedColor, lineColor, panelColor, panelStrongColor 등 색상 값을 가지는 프리셋 속성
- **Scale_Property**: titleScalePortrait, bodyScalePortrait 등 숫자 비율 값을 가지는 프리셋 속성
- **Emphasis_Style**: accent-underline, highlight, bold, glow 중 하나의 값을 가지는 강조 스타일 속성
- **Title_Position**: 카드 내 제목의 수직 배치 위치를 나타내는 속성 ("top", "center", "bottom")
- **Body_Align**: 카드 내 본문의 수직 정렬 방식을 나타내는 속성 ("start", "center", "end")
- **Element_Positions**: 자유 배치 모드에서 각 요소(제목, 본문)의 x, y 좌표를 카드 크기 대비 비율(0~1)로 저장하는 데이터 구조
- **Free_Position_Mode**: 드래그 앤 드롭으로 요소를 자유롭게 배치하는 모드. 활성화 시 flex 레이아웃 대신 absolute 위치 지정을 사용한다
- **Position_Selector**: 제목 위치를 선택할 수 있는 UI 컴포넌트 (top/center/bottom 선택)
- **Renderer**: `web/src/lib/renderer.js`의 `renderCardHtml()` 함수로, 프리셋 데이터를 기반으로 카드 HTML을 생성하는 모듈

## 요구사항

### 요구사항 1: 프리셋 목록 표시

**User Story:** 사용자로서, 사용 가능한 모든 프리셋을 한눈에 확인하고 싶다. 그래야 원하는 스타일을 빠르게 선택할 수 있다.

#### 수용 기준

1. WHEN 사용자가 프리셋 관리 UI를 열면, THE Preset_Manager SHALL Built_In_Preset과 Custom_Preset을 구분하여 목록으로 표시한다
2. THE Preset_Manager SHALL 각 프리셋 항목에 이름, 설명, 대표 색상(titleColor, bgColor) 미리보기를 표시한다
3. WHEN Custom_Preset이 없으면, THE Preset_Manager SHALL Built_In_Preset 목록만 표시하고 "사용자 정의 프리셋이 없습니다" 안내 메시지를 표시한다

### 요구사항 2: 사용자 정의 프리셋 생성

**User Story:** 사용자로서, 새로운 프리셋을 직접 만들고 싶다. 그래야 나만의 스타일로 카드를 제작할 수 있다.

#### 수용 기준

1. WHEN 사용자가 "새 프리셋 만들기" 버튼을 클릭하면, THE Preset_Editor SHALL 기본값이 채워진 프리셋 편집 폼을 표시한다
2. THE Preset_Editor SHALL 프리셋 이름(영문 kebab-case), 설명, Color_Property 값들, Scale_Property 값들, Emphasis_Style을 편집할 수 있는 입력 필드를 제공한다
3. WHEN 사용자가 Color_Property를 편집할 때, THE Preset_Editor SHALL 컬러 피커(color picker)를 제공한다
4. WHEN 사용자가 프리셋 저장 버튼을 클릭하면, THE Preset_Storage SHALL Custom_Preset을 localStorage에 저장한다
5. WHEN 사용자가 이미 존재하는 이름으로 프리셋을 저장하려 하면, THE Preset_Manager SHALL 중복 이름 오류 메시지를 표시하고 저장을 거부한다
6. WHEN 사용자가 빈 이름으로 프리셋을 저장하려 하면, THE Preset_Manager SHALL 유효성 오류 메시지를 표시하고 저장을 거부한다

### 요구사항 3: 기존 프리셋 복제

**User Story:** 사용자로서, 기존 프리셋을 복제하여 약간만 수정하고 싶다. 그래야 처음부터 모든 값을 입력하지 않아도 된다.

#### 수용 기준

1. WHEN 사용자가 Built_In_Preset 또는 Custom_Preset에서 "복제" 버튼을 클릭하면, THE Preset_Manager SHALL 원본 프리셋의 모든 속성값을 복사하여 Preset_Editor에 채운다
2. WHEN 프리셋이 복제되면, THE Preset_Manager SHALL 복제된 프리셋의 이름을 "{원본이름}-copy" 형식으로 자동 생성한다
3. IF "{원본이름}-copy" 이름이 이미 존재하면, THEN THE Preset_Manager SHALL "{원본이름}-copy-2", "{원본이름}-copy-3" 등 순차적으로 번호를 붙여 고유한 이름을 생성한다

### 요구사항 4: 사용자 정의 프리셋 편집

**User Story:** 사용자로서, 이전에 만든 프리셋을 수정하고 싶다. 그래야 스타일을 점진적으로 개선할 수 있다.

#### 수용 기준

1. WHEN 사용자가 Custom_Preset의 "편집" 버튼을 클릭하면, THE Preset_Editor SHALL 해당 프리셋의 현재 속성값이 채워진 편집 폼을 표시한다
2. WHEN 사용자가 편집된 프리셋을 저장하면, THE Preset_Storage SHALL localStorage에서 해당 프리셋을 업데이트한다
3. THE Preset_Editor SHALL Built_In_Preset에 대해서는 편집 버튼을 비활성화하거나 숨긴다

### 요구사항 5: 사용자 정의 프리셋 삭제

**User Story:** 사용자로서, 더 이상 필요 없는 프리셋을 삭제하고 싶다. 그래야 프리셋 목록을 깔끔하게 유지할 수 있다.

#### 수용 기준

1. WHEN 사용자가 Custom_Preset의 "삭제" 버튼을 클릭하면, THE Preset_Manager SHALL 삭제 확인 대화상자를 표시한다
2. WHEN 사용자가 삭제를 확인하면, THE Preset_Storage SHALL localStorage에서 해당 프리셋을 제거한다
3. WHEN 현재 선택된 프리셋이 삭제되면, THE Preset_Manager SHALL 선택을 "reference" Built_In_Preset으로 자동 변경한다
4. THE Preset_Manager SHALL Built_In_Preset에 대해서는 삭제 기능을 제공하지 않는다

### 요구사항 6: 프리셋과 렌더러 통합

**User Story:** 사용자로서, 내가 만든 프리셋을 즉시 카드 렌더링에 적용하고 싶다. 그래야 실시간으로 결과를 확인할 수 있다.

#### 수용 기준

1. WHEN Custom_Preset이 생성되거나 수정되면, THE Preset_Manager SHALL 스타일 탭 목록을 즉시 업데이트한다
2. WHEN 사용자가 스타일 탭에서 Custom_Preset을 선택하면, THE Preset_Manager SHALL 해당 프리셋 데이터를 렌더러에 전달하여 미리보기를 갱신한다
3. THE Preset_Manager SHALL Custom_Preset과 Built_In_Preset을 동일한 방식으로 렌더러에 전달한다

### 요구사항 7: 프리셋 데이터 유효성 검증

**User Story:** 사용자로서, 잘못된 값을 입력했을 때 명확한 안내를 받고 싶다. 그래야 올바른 프리셋을 만들 수 있다.

#### 수용 기준

1. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL 프리셋 이름이 비어있지 않고 영문 소문자, 숫자, 하이픈만 포함하는지 검증한다
2. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL Color_Property 값이 유효한 CSS 색상 형식(hex 또는 rgba)인지 검증한다
3. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL Scale_Property 값이 0보다 크고 1 이하의 숫자인지 검증한다
4. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL Emphasis_Style 값이 "accent-underline", "highlight", "bold", "glow" 중 하나인지 검증한다
5. IF 유효성 검증에 실패하면, THEN THE Preset_Manager SHALL 실패한 필드와 오류 내용을 명확하게 표시한다

### 요구사항 8: 프리셋 데이터 영속성

**User Story:** 사용자로서, 브라우저를 닫았다가 다시 열어도 내가 만든 프리셋이 유지되길 원한다. 그래야 매번 다시 만들 필요가 없다.

#### 수용 기준

1. THE Preset_Storage SHALL Custom_Preset 데이터를 JSON 형식으로 직렬화하여 localStorage에 저장한다
2. WHEN 애플리케이션이 로드되면, THE Preset_Storage SHALL localStorage에서 Custom_Preset 데이터를 읽어 Built_In_Preset과 병합한다
3. IF localStorage 데이터가 손상되었거나 파싱에 실패하면, THEN THE Preset_Storage SHALL 오류를 로그에 기록하고 Built_In_Preset만으로 동작한다


### 요구사항 9: 제목/요소 위치 제어

**User Story:** 사용자로서, 프리셋 내에서 제목의 배치 위치(상단, 중앙, 하단)와 본문 정렬 방식을 제어하고 싶다. 그래야 다양한 레이아웃 스타일의 카드를 만들 수 있다.

#### 수용 기준

1. THE Preset_Editor SHALL 제목 수직 위치를 "top", "center", "bottom" 중 선택할 수 있는 Position_Selector를 제공한다
2. WHEN 사용자가 titlePosition을 "center"로 설정하면, THE Renderer SHALL 제목을 카드의 수직 중앙에 배치한다
3. WHEN 사용자가 titlePosition을 "bottom"으로 설정하면, THE Renderer SHALL 제목을 본문 아래에 배치한다
4. WHEN titlePosition이 지정되지 않거나 "top"이면, THE Renderer SHALL 기존과 동일하게 제목을 카드 상단에 배치한다 (하위 호환성 유지)
5. THE Preset_Editor SHALL 본문 수직 정렬을 "start", "center", "end" 중 선택할 수 있는 입력 필드를 제공한다
6. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL titlePosition 값이 "top", "center", "bottom" 중 하나인지 검증한다
7. WHEN 사용자가 프리셋을 저장할 때, THE Preset_Manager SHALL bodyAlign 값이 "start", "center", "end" 중 하나인지 검증한다

### 요구사항 10: 드래그 앤 드롭 요소 배치

**User Story:** 사용자로서, 카드 미리보기 위에서 제목 등의 요소를 드래그 앤 드롭으로 자유롭게 배치하고 싶다. 그래야 직관적으로 원하는 레이아웃을 만들 수 있다.

#### 수용 기준

1. WHEN 사용자가 Preset_Editor에서 "자유 배치 모드"를 활성화하면, THE Preset_Editor SHALL 카드 미리보기 위에 드래그 가능한 요소 핸들을 표시한다
2. WHEN 사용자가 제목 요소를 드래그하면, THE Preset_Editor SHALL 요소의 위치를 실시간으로 업데이트하여 미리보기에 반영한다
3. WHEN 사용자가 드래그를 완료하면, THE Preset_Editor SHALL 요소의 최종 위치를 카드 크기 대비 비율(0~1) 값으로 프리셋에 저장한다
4. THE Preset_Editor SHALL 드래그 중 요소가 카드 영역 밖으로 나가지 않도록 경계를 제한한다
5. WHEN "자유 배치 모드"가 활성화되면, THE Renderer SHALL titlePosition과 bodyAlign 대신 elementPositions의 좌표값을 사용하여 요소를 absolute 위치로 배치한다
6. WHEN "자유 배치 모드"가 비활성화되면, THE Renderer SHALL 기존 flex 레이아웃 방식(titlePosition, bodyAlign)으로 요소를 배치한다
7. IF elementPositions에 유효하지 않은 좌표값(0~1 범위 밖)이 포함되면, THEN THE Preset_Manager SHALL 유효성 오류 메시지를 표시하고 저장을 거부한다
8. THE Preset_Storage SHALL elementPositions 데이터를 JSON 형식으로 직렬화하여 기존 프리셋 데이터와 함께 localStorage에 저장한다
