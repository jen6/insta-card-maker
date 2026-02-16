# 구현 계획: 프리셋 관리 UI

## 개요

프리셋 유효성 검증 모듈 → 프리셋 저장소 모듈 → UI 컴포넌트 → App.jsx 통합 순서로 구현한다. 각 단계에서 테스트를 작성하여 점진적으로 검증한다.

## Tasks

- [x] 1. 프리셋 유효성 검증 모듈 구현
  - [x] 1.1 `web/src/lib/presetValidator.js` 생성
    - `validatePresetName(name)`: 영문 소문자, 숫자, 하이픈만 허용, 빈 문자열 거부
    - `validateColor(value)`: hex(`#000000`, `#fff`) 및 rgba(`rgba(...)`) 형식 검증
    - `validateScale(value)`: 0 < value <= 1 범위 검증
    - `validateEmphasisStyle(value)`: "accent-underline", "highlight", "bold", "glow" 중 하나인지 검증
    - `validatePreset(name, preset)`: 전체 프리셋 객체 유효성 검증, 실패 시 `{ valid: false, errors: [{ field, error }] }` 반환
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 1.2 프리셋 이름 유효성 검증 속성 테스트 작성
    - **Property 3: 프리셋 이름 유효성 검증**
    - fast-check로 랜덤 문자열 생성, 영문 소문자+숫자+하이픈만 포함된 비어있지 않은 문자열은 valid, 그 외는 invalid 확인
    - **Validates: Requirements 2.5, 2.6, 7.1**
  - [ ]* 1.3 전체 프리셋 유효성 검증 속성 테스트 작성
    - **Property 4: 전체 프리셋 유효성 검증**
    - fast-check로 랜덤 PresetObject 생성, 유효한 색상/스케일/emphasisStyle 조합은 valid, 하나라도 유효하지 않으면 해당 필드 오류 포함 확인
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 2. 프리셋 저장소 모듈 구현
  - [x] 2.1 `web/src/lib/presetStorage.js` 생성
    - `loadCustomPresets()`: localStorage에서 사용자 정의 프리셋 읽기, 파싱 실패 시 빈 객체 반환
    - `saveCustomPresets(customPresets)`: localStorage에 JSON 직렬화하여 저장
    - `getAllPresets()`: Built-In + Custom 프리셋 병합 반환
    - `addCustomPreset(name, preset)`: 새 프리셋 추가, 중복 이름 및 Built-In 이름 거부
    - `updateCustomPreset(name, preset)`: 기존 Custom 프리셋 업데이트
    - `deleteCustomPreset(name)`: Custom 프리셋 삭제, Built-In 삭제 거부
    - `duplicatePreset(sourceName)`: 프리셋 복제, "{이름}-copy" 형식 이름 생성, 충돌 시 순차 번호 부여
    - `isBuiltIn(name)`: Built-In 프리셋 여부 확인
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3, 4.2, 5.2, 5.4, 8.1, 8.2, 8.3_
  - [ ]* 2.2 프리셋 저장/로드 Round-Trip 속성 테스트 작성
    - **Property 1: 프리셋 저장/로드 Round-Trip**
    - fast-check로 랜덤 유효 프리셋 생성, addCustomPreset 후 loadCustomPresets로 동일 데이터 확인
    - **Validates: Requirements 2.4, 4.2, 8.1**
  - [ ]* 2.3 프리셋 병합 완전성 속성 테스트 작성
    - **Property 2: 프리셋 병합 완전성**
    - fast-check로 랜덤 custom preset 집합 생성, getAllPresets()가 built-in 키 + custom 키 모두 포함 확인
    - **Validates: Requirements 1.1, 6.3, 8.2**
  - [ ]* 2.4 프리셋 복제 동등성 속성 테스트 작성
    - **Property 5: 프리셋 복제 동등성**
    - fast-check로 랜덤 프리셋 생성 후 복제, 속성값 동일 및 이름 고유성 확인
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 2.5 프리셋 삭제 후 부재 속성 테스트 작성
    - **Property 6: 프리셋 삭제 후 부재**
    - fast-check로 랜덤 custom preset 생성 후 삭제, getAllPresets()에 미포함 확인. Built-In 삭제 시도 시 실패 확인
    - **Validates: Requirements 5.2, 5.4**
  - [ ]* 2.6 중복 이름 거부 속성 테스트 작성
    - **Property 7: 중복 이름 거부**
    - fast-check로 랜덤 프리셋 추가 후 동일 이름으로 재추가 시 실패 확인
    - **Validates: Requirements 2.5**

- [x] 3. 체크포인트 - 데이터 레이어 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. PresetEditor 컴포넌트 구현
  - [x] 4.1 `web/src/components/PresetEditor.jsx` 생성
    - 프리셋 편집 폼 구현: 기본 정보(이름, 설명), 색상(컬러 피커 + 텍스트 입력), 스케일(슬라이더), emphasisStyle(셀렉트)
    - 카테고리별 접이식(collapsible) 섹션으로 그룹화
    - 저장 시 `validatePreset` 호출하여 유효성 검증, 오류 시 필드별 오류 메시지 표시
    - 새 프리셋 생성 모드(`isNew=true`)와 편집 모드 지원
    - 기존 shadcn/ui 컴포넌트(Input, Button, Select) 활용
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 7.5_

- [x] 5. PresetManagerPanel 컴포넌트 구현
  - [x] 5.1 `web/src/components/PresetManagerPanel.jsx` 생성
    - 사이드 시트 형태의 패널 구현 (오른쪽에서 슬라이드인)
    - 목록 모드: Built-In과 Custom 프리셋을 구분하여 표시, 각 항목에 이름/설명/대표 색상 미리보기
    - Custom 프리셋에 편집/삭제/복제 버튼, Built-In 프리셋에 복제 버튼만 표시
    - "새 프리셋 만들기" 버튼으로 PresetEditor를 새 프리셋 모드로 열기
    - 삭제 시 `window.confirm`으로 확인 대화상자 표시
    - Custom 프리셋이 없을 때 안내 메시지 표시
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.3, 5.1, 5.3, 5.4_

- [x] 6. App.jsx 통합
  - [x] 6.1 App.jsx에 PresetManagerPanel 연결
    - Sparkles(✨) 버튼 클릭 시 PresetManagerPanel 열기/닫기
    - `loadPresets` 함수를 `presetStorage.getAllPresets()` 사용하도록 변경
    - 프리셋 변경(추가/수정/삭제) 시 스타일 탭 목록과 렌더러 프리셋 데이터 갱신
    - 현재 선택된 프리셋이 삭제되면 "reference"로 자동 변경
    - `renderer.js`의 `PRESETS` 참조를 동적 프리셋 데이터로 교체
    - _Requirements: 5.3, 6.1, 6.2, 6.3_

- [x] 7. 렌더러 프리셋 통합
  - [x] 7.1 `web/src/lib/renderer.js` 수정
    - `renderMarkdownToCards` 함수가 외부에서 전달받은 프리셋 맵을 사용할 수 있도록 `opts.presets` 파라미터 추가
    - `opts.presets`가 제공되면 해당 맵에서 프리셋 조회, 없으면 기존 PRESETS 사용 (하위 호환성 유지)
    - _Requirements: 6.2, 6.3_

- [x] 8. 최종 체크포인트 - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 프리셋 위치 제어 유효성 검증 추가
  - [ ] 9.1 `web/src/lib/presetValidator.js`에 위치 관련 검증 함수 추가
    - `validateTitlePosition(value)`: "top", "center", "bottom" 중 하나인지 검증
    - `validateBodyAlign(value)`: "start", "center", "end" 중 하나인지 검증
    - `validateElementPositions(positions)`: 각 x, y 좌표가 0~1 범위인지 검증
    - `validatePreset`에 titlePosition, bodyAlign, freePositionMode, elementPositions 검증 로직 통합
    - _Requirements: 9.6, 9.7, 10.7_
  - [ ]* 9.2 위치/정렬 열거형 유효성 검증 속성 테스트 작성
    - **Property 9: 위치/정렬 열거형 유효성 검증**
    - fast-check로 랜덤 문자열 생성, titlePosition은 "top"/"center"/"bottom"만 valid, bodyAlign은 "start"/"center"/"end"만 valid 확인
    - **Validates: Requirements 9.6, 9.7**
  - [ ]* 9.3 요소 좌표값 범위 유효성 검증 속성 테스트 작성
    - **Property 12: 요소 좌표값 범위 유효성 검증**
    - fast-check로 랜덤 좌표 생성, 0~1 범위 내 좌표는 valid, 범위 밖 좌표는 invalid 확인
    - **Validates: Requirements 10.7**

- [ ] 10. 렌더러 위치 제어 구현
  - [ ] 10.1 `web/src/lib/renderer.js`의 `renderCardHtml` 함수에 titlePosition/bodyAlign 지원 추가
    - titlePosition: "top" → 기존 동작 유지, "center" → justify-content:center, "bottom" → order 속성으로 순서 반전
    - bodyAlign: "start" → 기본, "center" → margin:auto 0, "end" → margin-top:auto
    - titlePosition/bodyAlign이 undefined일 때 기존 동작과 동일하게 처리 (하위 호환성)
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  - [ ] 10.2 `renderCardHtml`에 자유 배치 모드(freePositionMode) 지원 추가
    - freePositionMode=true일 때 elementPositions 좌표를 CSS custom properties로 변환
    - h1과 .body에 position:absolute 적용, left/top을 비율값으로 계산
    - freePositionMode=false이거나 undefined일 때 기존 flex 레이아웃 유지
    - _Requirements: 10.5, 10.6_
  - [ ]* 10.3 titlePosition 렌더링 레이아웃 속성 테스트 작성
    - **Property 8: titlePosition에 따른 렌더링 레이아웃**
    - fast-check로 랜덤 프리셋과 titlePosition 값 생성, 생성된 HTML에 올바른 CSS 포함 확인
    - **Validates: Requirements 9.2, 9.3, 9.4**
  - [ ]* 10.4 자유 배치 모드 렌더링 전환 속성 테스트 작성
    - **Property 11: 자유 배치 모드 렌더링 전환**
    - fast-check로 freePositionMode true/false 프리셋 생성, true일 때 absolute 위치 CSS, false일 때 flex CSS 확인
    - **Validates: Requirements 10.5, 10.6**

- [ ] 11. 체크포인트 - 위치 제어 렌더링 검증
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. PositionSelector 컴포넌트 구현
  - [ ] 12.1 `web/src/components/PositionSelector.jsx` 생성
    - 버튼 그룹 형태로 옵션 표시 (선택된 옵션에 하이라이트)
    - 제목 위치용: "top", "center", "bottom" 옵션
    - 본문 정렬용: "start", "center", "end" 옵션
    - 각 옵션에 미니 레이아웃 다이어그램 표시 (선택적)
    - _Requirements: 9.1, 9.5_

- [ ] 13. DragDropCanvas 컴포넌트 구현
  - [ ] 13.1 `web/src/components/DragDropCanvas.jsx` 생성
    - 카드 미리보기를 배경으로 표시
    - 각 요소(제목, 본문)를 드래그 가능한 핸들로 오버레이
    - pointer events (mousedown/mousemove/mouseup)로 드래그 구현
    - 드래그 중 좌표를 0~1 비율로 변환, 캔버스 경계 밖 이동 시 clamp
    - 위치 변경 시 onPositionChange 콜백으로 비율값 전달
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 13.2 드래그 좌표 경계 제한 속성 테스트 작성
    - **Property 10: 드래그 좌표 경계 제한**
    - fast-check로 랜덤 픽셀 좌표(음수, 초과값 포함) 생성, 변환 결과가 항상 0~1 범위 확인
    - **Validates: Requirements 10.3, 10.4**

- [ ] 14. PresetEditor에 위치 제어 및 자유 배치 통합
  - [ ] 14.1 PresetEditor에 레이아웃 섹션 추가
    - PositionSelector로 titlePosition, bodyAlign 편집 필드 추가
    - "자유 배치 모드" 토글 스위치 추가
    - 자유 배치 모드 활성화 시 DragDropCanvas 표시
    - DragDropCanvas에서 변경된 좌표를 elementPositions로 프리셋 데이터에 반영
    - _Requirements: 9.1, 9.5, 10.1, 10.3_

- [ ] 15. 프리셋 저장소 및 데이터 모델 업데이트
  - [ ] 15.1 `presetStorage.js`에 새 속성 지원 추가
    - addCustomPreset, updateCustomPreset에서 titlePosition, bodyAlign, freePositionMode, elementPositions 저장 지원
    - loadCustomPresets에서 새 속성 로드 지원
    - 기존 프리셋(새 속성 없음)과의 하위 호환성 유지 (undefined 허용)
    - _Requirements: 10.8, 9.4_

- [ ] 16. 최종 체크포인트 - 위치 제어 및 드래그 앤 드롭 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## 참고

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조한다
- 체크포인트에서 점진적 검증을 수행한다
- 속성 테스트는 보편적 정확성 속성을 검증한다
- 단위 테스트는 특정 예시와 edge case를 검증한다
