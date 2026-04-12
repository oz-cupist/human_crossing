# Human Crossing - 동물의 숲 스타일 월드 프로젝트

## 프로젝트 개요
동물의 숲(Animal Crossing) 스타일의 3D 월드를 Blender MCP를 통해 제작하는 프로젝트

## 파일 경로
- **Blender 원본**: `/Users/cupist/project/human_crossing/animal_crossing_world.blend`
- **GLB 내보내기**: `/Users/cupist/project/human_crossing/animal_crossing_world.glb`

## 현재 월드 구성

### 1. 지형 (Island)
- 20x20 크기의 둥근 섬
- 부드러운 언덕이 있는 지형 (noise 기반)
- 초록색 잔디 머티리얼 (노이즈 텍스처로 자연스러운 패턴)
- 위치: (0, 0, 0)

### 2. 바다 (Ocean)
- 40x40 크기의 평면
- 맑은 청록색 (0.2, 0.6, 0.7)
- 반투명 처리 (Alpha: 0.85)
- 위치: (0, 0, -0.3)

### 3. 해변 (Beach)
- 토러스 형태로 섬 주변을 감싸는 모래사장
- 따뜻한 베이지색 모래 텍스처
- 위치: (0, 0, -0.4)

### 4. 연못 (Pond)
- 섬 내부의 작은 연못
- 반경 1.5의 원형
- 밝은 물색 (0.3, 0.65, 0.75)
- 위치: (3, 2, 0.05)

### 5. 체리 나무 3개
동물의 숲 스타일 체리 나무:
- 굵고 짧은 갈색 줄기
- 둥글고 뭉실뭉실한 분홍색 꽃잎 (9개의 구체로 구성)
- 빨간 체리 열매 (나무당 4개)

| 이름 | 위치 | 스케일 |
|------|------|--------|
| CherryTree_1 | (-3, -2, 0.3) | ~0.9-1.1 |
| CherryTree_2 | (4, 3, 0.2) | ~0.9-1.1 |
| CherryTree_3 | (-1, 5, 0.25) | ~0.9-1.1 |

### 6. 꽃 10개
동물의 숲 스타일 꽃:
- 5장 꽃잎 + 노란 중심
- 짧은 녹색 줄기

| 위치 | 색상 팔레트 |
|------|-------------|
| (-5, -1, 0.15) | 빨강, 노랑, 흰색, 분홍, 보라, 주황 중 랜덤 |
| (-4, 2, 0.18) | |
| (-2, -4, 0.12) | |
| (0, -3, 0.14) | |
| (1, 4, 0.2) | |
| (5, 1, 0.16) | |
| (3, -2, 0.13) | |
| (-1, 1, 0.17) | |
| (2, 2, 0.19) | |
| (-3, 4, 0.15) | |

### 7. 바위 3개
동물의 숲 스타일 바위:
- Icosphere 기반 둥글둥글한 형태
- 따뜻한 회색 톤 + 노이즈 텍스처
- 각 바위마다 작은 보조 바위 1~2개 클러스터

| 이름 | 위치 | 스케일 |
|------|------|--------|
| Rock_1 | (5, -3, 0.1) | 1.0 |
| Rock_2 | (-4, -4, 0.12) | 0.8 |
| Rock_3 | (1, 6, 0.15) | 1.2 |

### 8. 조명
- **Sun**: 따뜻한 햇빛 (1.0, 0.95, 0.85), energy=3
- **FillLight**: 부드러운 하늘빛 보조광 (0.8, 0.9, 1.0)

### 9. 하늘
- 그라데이션 배경 (밝은 하늘색 → 더 밝은 하늘색)

---

## 색상 팔레트 (동물의 숲 스타일)

```python
# 잔디
grass_dark = (0.15, 0.45, 0.12)
grass_light = (0.25, 0.6, 0.18)

# 바다/물
ocean = (0.2, 0.6, 0.7)
pond = (0.3, 0.65, 0.75)

# 모래
sand_dark = (0.76, 0.65, 0.45)
sand_light = (0.9, 0.8, 0.6)

# 체리 나무
trunk_brown = (0.35, 0.2, 0.1)
cherry_blossom = (0.95, 0.7, 0.75)
cherry_fruit = (0.8, 0.1, 0.15)

# 꽃 색상
flower_red = (1.0, 0.3, 0.35)
flower_yellow = (1.0, 0.95, 0.4)
flower_white = (1.0, 1.0, 1.0)
flower_pink = (1.0, 0.6, 0.7)
flower_purple = (0.6, 0.5, 0.9)
flower_orange = (1.0, 0.7, 0.3)
flower_center = (1.0, 0.85, 0.2)

# 바위
rock_dark = (0.35, 0.33, 0.3)
rock_light = (0.55, 0.52, 0.48)
```

---

## 추가 가능한 요소 (TODO)
- [ ] 일반 나무 (초록색 잎)
- [ ] 과일 나무 (사과, 배, 복숭아 등)
- [ ] 집/건물
- [ ] 울타리
- [ ] 다리
- [ ] 길/보도
- [ ] NPC 캐릭터
- [ ] 가구/소품

## 프로젝트 TODO
- [ ] 다른 동물 캐릭터 추가 및 멀티플레이 기능
- [ ] 사진, 정보 등 다른 액션 표지판에 추가
- [ ] 결혼식장 및 하늘 등 월드 수정

---

## 작업 시 참고사항

### Blender MCP 사용법
1. Blender 실행 후 MCP 애드온 활성화 확인
2. 사이드바(N 패널)에서 "Blender MCP" 탭 → "Running on port 9876" 확인
3. Claude Code에서 `mcp__blender__` 도구 사용

### 새로운 오브젝트 추가 시
- 기존 스타일(둥글둥글, 파스텔톤)과 일관성 유지
- 위치는 섬 범위 내 (대략 -8 ~ 8)
- z 위치는 지형 높이 고려 (0.1 ~ 0.3 정도)

### 파일 저장
```python
# Blend 파일 저장
bpy.ops.wm.save_as_mainfile(filepath="/Users/cupist/project/human_crossing/animal_crossing_world.blend")

# GLB 내보내기
bpy.ops.export_scene.gltf(
    filepath="/Users/cupist/project/human_crossing/animal_crossing_world.glb",
    export_format='GLB',
    use_selection=False,
    export_apply=True
)
```
