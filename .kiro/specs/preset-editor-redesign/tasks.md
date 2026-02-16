# 구현 계획: 프리셋 에디터 리디자인

## 개요

색상 유틸리티 함수 추출 → ColorField 개선 → GradientBuilder 신규 생성 → PresetEditor 섹션 구조 리팩토링 → CSS 업데이트 순서로 구현한다. 기존 데이터 레이어와 렌더러는 변경하지 않는다.

## Tasks

- [x] 1. 색상 유틸리티 모듈 생성
  - [x] 1.1 `web/src/lib/colorUtils.js` 생성
    - `parseColorValue(value)`: hex/rgba 문자열 → `{ hexApprox, alpha, isRgba }` 반환
    - `hexToRgba(hex, alpha)`: hex + alpha → rgba 문자열 생성
    - `replaceAlpha(rgba, newAlpha)`: rgba 문자열의 알파만 교체, RGB 유지
    - `extractOverlayAlpha(overlay)`: imageOverlay CSS에서 알파 값 추출
    - `buildOverlayCss(alpha)`: 알파 값으로 imageOverlay CSS 생성
    - _Requirements: 2.3, 2.5, 2.6, 3.2, 3.3, 4.6, 4.7_
  - [ ]* 1.2 색상 파싱 Round-Trip 속성 테스트 작성
    - **Property 1: 색상 파싱 Round-Trip**
    - fast-check로 랜덤 6자리 hex + 0~1 알파 생성, hexToRgba 후 parseColorValue로 원본 복원 확인
    - **Validates: Requirements 2.3, 2.6, 3.3**
  - [ ]* 1.3 replaceAlpha RGB 보존 속성 테스트 작성
    - **Property 2: replaceAlpha는 RGB를 보존한다**
    - fast-check로 랜덤 rgba 문자열 + 새 알파 생성, replaceAlpha 후 hexApprox 동일 확인
    - **Validates: Requirements 3.2**
  - [ ]* 1.4 오버레이 투명도 Round-Trip 속성 테스트 작성
    - **Property 3: 오버레이 투명도 Round-Trip**
    - fast-check로 랜덤 0~1 알파 생성, buildOverlayCss 후 extractOverlayAlpha로 원본 복원 확인
    - **Validates: Requirements 4.6, 4.7**
  - [ ]* 1.5 parseColorValue 유효 hex 반환 속성 테스트 작성
    - **Property 4: parseColorValue는 항상 유효한 hex를 반환한다**
    - fast-check로 랜덤 hex/rgba 문자열 생성, parseColorValue 결과의 hexApprox가 항상 #rrggbb 형식 확인
    - **Validates: Requirements 2.1, 2.3, 2.6**

- [x] 2. 체크포인트 - 유틸리티 함수 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. ColorField 컴포넌트 개선
  - [x] 3.1 `PresetEditor.jsx`의 `ColorField` 함수 리팩토링
    - `isHex` 조건부 렌더링 제거, 모든 색상에 컬러 피커 스와치 항상 표시
    - `parseColorValue`를 사용하여 rgba 색상의 hex 근사값을 피커에 전달
    - rgba 색상일 때 컬러 피커 변경 시 `hexToRgba(newHex, existingAlpha)` 호출
    - rgba 색상일 때 Alpha_Slider 표시 (0~1 범위, step 0.01)
    - Alpha_Slider 변경 시 `replaceAlpha(currentValue, newAlpha)` 호출
    - `colorUtils.js`에서 유틸리티 함수 import
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.2 ColorField 단위 테스트 작성
    - hex 색상일 때 피커 + 텍스트 렌더링 확인
    - rgba 색상일 때 피커 + 텍스트 + 알파 슬라이더 렌더링 확인
    - hex 색상일 때 알파 슬라이더 미표시 확인
    - _Requirements: 2.1, 3.1, 3.4_

- [x] 4. GradientBuilder 컴포넌트 생성
  - [x] 4.1 `PresetEditor.jsx`에 `GradientBuilder` 함수 추가
    - `GRADIENT_PRESETS` 상수 정의 (없음, 은은한 빛, 코너 글로우, 대각선, 직접 입력)
    - 그라데이션 프리셋 드롭다운 구현
    - 현재 `backgroundLayers` 값이 프리셋에 없으면 "직접 입력" 모드 자동 전환
    - "직접 입력" 선택 시 CSS 텍스트 입력 필드 표시
    - 이미지 오버레이 투명도 슬라이더 구현 (`extractOverlayAlpha`, `buildOverlayCss` 사용)
    - `colorUtils.js`에서 오버레이 유틸리티 함수 import
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [ ]* 4.2 GradientBuilder 단위 테스트 작성
    - 프리셋 드롭다운 렌더링 확인
    - "없음" 선택 시 backgroundLayers가 "none"으로 설정 확인
    - "직접 입력" 선택 시 텍스트 입력 필드 표시 확인
    - 오버레이 투명도 슬라이더 동작 확인
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [x] 5. PresetEditor 섹션 구조 리팩토링
  - [x] 5.1 SCALE_FIELDS에서 `titleScaleLandscape` 제거
    - `SCALE_FIELDS` 배열에서 `{ key: "titleScaleLandscape", label: "제목 크기 (가로)" }` 항목 제거
    - 기존 프리셋의 `titleScaleLandscape` 값은 preset 객체에 그대로 유지 (UI에서만 숨김)
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 5.2 섹션 순서 및 통합 리팩토링
    - "글꼴" 섹션 내용을 "기본 정보" 섹션 내부로 이동 (글꼴 선택 드롭다운 + 직접 입력)
    - "강조 스타일" 섹션 내용을 "기본 정보" 섹션 내부로 이동 (스타일 셀렉트)
    - 독립 "글꼴" 섹션과 "강조 스타일" 섹션 제거
    - 섹션 순서: 기본 정보 → 타이포그래피 → 스케일 → 레이아웃 상세 → 배경 및 그라데이션 → 색상
    - _Requirements: 5.1, 5.4_
  - [x] 5.3 섹션 기본 열림/닫힘 상태 변경
    - "기본 정보": `defaultOpen={true}` (유지)
    - "타이포그래피": `defaultOpen={true}` (유지)
    - "스케일 (SCALE)": `defaultOpen={false}` (변경: 기존 true → false)
    - "레이아웃 상세": `defaultOpen={false}` (유지)
    - "배경 및 그라데이션": `defaultOpen={false}` (유지)
    - "색상": `defaultOpen={false}` (유지)
    - _Requirements: 5.2, 5.3_
  - [x] 5.4 "배경 및 그라데이션" 섹션에 GradientBuilder 연결
    - 기존 `backgroundLayers` 텍스트 입력과 `imageOverlay` 텍스트 입력을 `GradientBuilder` 컴포넌트로 교체
    - _Requirements: 4.1_

- [x] 6. CSS 스타일 업데이트
  - [x] 6.1 `web/src/index.css`에 알파 슬라이더 스타일 추가
    - `.pe-alpha-row` 스타일: flex 레이아웃, 라벨 + 슬라이더 + 값 표시
    - 기존 `.pe-scale-row`와 유사한 스타일 적용
    - _Requirements: 3.1_

- [x] 7. 체크포인트 - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## 참고

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조한다
- 체크포인트에서 점진적 검증을 수행한다
- 속성 테스트는 보편적 정확성 속성을 검증한다
- 단위 테스트는 특정 예시와 edge case를 검증한다
- 기존 데이터 레이어(presetStorage, presetValidator)와 렌더러는 변경하지 않는다
