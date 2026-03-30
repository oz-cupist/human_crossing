# Human Crossing - 인터랙션 구현 가이드

이 문서는 `animal_crossing_world.glb` 모델의 인터랙션 시스템을 코드에서 구현하는 방법을 설명합니다.

---

## 1. 파일 구조

```
human_crossing/
├── animal_crossing_world.blend  # Blender 원본 파일
├── animal_crossing_world.glb    # 게임용 GLB 파일 (커스텀 프로퍼티 포함)
├── CLAUDE.md                    # 프로젝트 문서
└── INTERACTION_GUIDE.md         # 이 문서
```

---

## 2. GLB 로드 및 커스텀 프로퍼티 접근

### Three.js 예시

```typescript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();

loader.load('animal_crossing_world.glb', (gltf) => {
  const scene = gltf.scene;

  // 모든 오브젝트 순회하며 인터랙션 가능한 것들 찾기
  scene.traverse((child) => {
    // 커스텀 프로퍼티는 userData에 저장됨
    if (child.userData.interactable) {
      console.log('인터랙션 가능:', child.name);
      console.log('프로퍼티:', child.userData);
    }

    if (child.userData.is_trigger) {
      console.log('트리거:', child.name);
    }
  });
});
```

---

## 3. 인터랙션 오브젝트 목록

### 3.1 미션 표지판 (Mission Signs)

| 오브젝트 이름 | 위치 | 미션 ID |
|--------------|------|---------|
| `MissionSign_West_Board` | (-5, 0, 0.15) | mission_001 |
| `MissionSign_East_Board` | (5, -2, 0.12) | mission_002 |
| `MissionSign_South_Board` | (-2, -5, 0.13) | mission_003 |
| `MissionSign_Center_Board` | (2, 3.5, 0.18) | mission_004 |

#### 표지판 Board 프로퍼티

```typescript
interface SignBoardUserData {
  interactable: boolean;      // true
  mission_id: string;         // "mission_001" ~ "mission_004"
  interaction_radius: number; // 1.5 (미터)
  object_type: string;        // "mission_sign"
}
```

#### 표지판 트리거 프로퍼티

```typescript
interface SignTriggerUserData {
  is_trigger: boolean;        // true
  linked_sign: string;        // "MissionSign_West" 등
  mission_id: string;         // "mission_001" ~ "mission_004"
  trigger_radius: number;     // 1.5 (미터)
  prompt_text: string;        // "Press E to interact"
}
```

### 3.2 결혼식장 (Wedding Hall)

| 오브젝트 이름 | 용도 |
|--------------|------|
| `WeddingHall_Door` | 문 (애니메이션 대상) |
| `WeddingHall_DoorTrigger` | 문 앞 인터랙션 영역 |
| `WeddingHall_EntryPoint` | 건물 내부 진입 위치 |
| `WeddingHall_ExitPoint` | 건물 외부 퇴장 위치 |
| `WeddingHall_MainBody` | 건물 메타데이터 |

#### 문(Door) 프로퍼티

```typescript
interface DoorUserData {
  interactable: boolean;       // true
  object_type: string;         // "door"
  door_state: string;          // "closed" | "opening" | "open" | "closing"
  door_rotation_axis: string;  // "Z"
  door_open_angle: number;     // 90 (도)
  door_pivot_offset: number;   // 0.4 (경첩 오프셋)
  linked_building: string;     // "WeddingHall"
  animation_duration: number;  // 0.5 (초)
}
```

#### 문 트리거 프로퍼티

```typescript
interface DoorTriggerUserData {
  is_trigger: boolean;         // true
  trigger_type: string;        // "door"
  linked_door: string;         // "WeddingHall_Door"
  trigger_radius: number;      // 2.0 (미터)
  prompt_text: string;         // "Press E to enter"
}
```

#### 진입/퇴장 포인트 프로퍼티

```typescript
interface SpawnPointUserData {
  is_spawn_point: boolean;     // true
  point_type: string;          // "building_interior" | "building_exterior"
  linked_building: string;     // "WeddingHall"
  player_facing: number;       // 180 (도, 플레이어가 바라볼 방향)
}
```

#### 건물 메타데이터

```typescript
interface BuildingUserData {
  building_id: string;         // "wedding_hall"
  building_name: string;       // "Wedding Hall"
  is_enterable: boolean;       // true
  has_interior: boolean;       // true (별도 내부 씬 여부)
  interior_scene: string;      // "wedding_hall_interior" (내부 씬 이름)
}
```

---

## 4. 구현 흐름

### 4.1 미션 표지판 인터랙션

```
┌─────────────────────────────────────────────────────────┐
│  1. 플레이어가 트리거 범위 진입                           │
│     └─ 거리 계산: player.position ↔ trigger.position    │
│     └─ trigger_radius 비교                              │
│                                                         │
│  2. UI 표시                                             │
│     └─ prompt_text: "Press E to interact"               │
│                                                         │
│  3. E키 입력 감지                                        │
│                                                         │
│  4. 미션 모달 열기                                       │
│     └─ mission_id로 미션 데이터 조회                     │
│     └─ 모달 UI 표시                                     │
│                                                         │
│  5. 미션 완료/취소 처리                                  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 결혼식장 진입 인터랙션

```
┌─────────────────────────────────────────────────────────┐
│  1. 플레이어가 DoorTrigger 범위 진입                     │
│     └─ trigger_radius: 2.0m                             │
│                                                         │
│  2. UI 표시                                             │
│     └─ "Press E to enter"                               │
│                                                         │
│  3. E키 입력 감지                                        │
│                                                         │
│  4. 문 열림 애니메이션                                   │
│     └─ door_state: "closed" → "opening" → "open"        │
│     └─ Z축 기준 90도 회전                               │
│     └─ duration: 0.5초                                  │
│                                                         │
│  5-A. 같은 씬 내 이동 (has_interior: false)              │
│     └─ 플레이어를 EntryPoint로 텔레포트                  │
│     └─ player_facing 방향으로 회전                      │
│                                                         │
│  5-B. 별도 내부 씬 로드 (has_interior: true)             │
│     └─ interior_scene 씬 로드                           │
│     └─ 페이드 아웃/인 트랜지션                          │
│                                                         │
│  6. 문 닫힘 애니메이션 (선택)                            │
│     └─ door_state: "open" → "closing" → "closed"        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 코드 예시

### 5.1 인터랙션 시스템 초기화

```typescript
// InteractionSystem.ts

interface Interactable {
  mesh: THREE.Object3D;
  trigger: THREE.Object3D;
  type: 'mission_sign' | 'door';
  data: any;
}

class InteractionSystem {
  private interactables: Interactable[] = [];
  private currentTarget: Interactable | null = null;

  constructor(private scene: THREE.Scene, private player: THREE.Object3D) {
    this.findInteractables();
    this.setupInputListeners();
  }

  private findInteractables() {
    this.scene.traverse((child) => {
      // 미션 표지판 찾기
      if (child.userData.object_type === 'mission_sign') {
        const triggerName = child.name.replace('_Board', '_Trigger');
        const trigger = this.scene.getObjectByName(triggerName);
        if (trigger) {
          this.interactables.push({
            mesh: child,
            trigger: trigger,
            type: 'mission_sign',
            data: child.userData
          });
        }
      }

      // 문 찾기
      if (child.userData.object_type === 'door') {
        const trigger = this.scene.getObjectByName(child.userData.linked_building + '_DoorTrigger');
        if (trigger) {
          this.interactables.push({
            mesh: child,
            trigger: trigger,
            type: 'door',
            data: child.userData
          });
        }
      }
    });
  }

  update() {
    let closestTarget: Interactable | null = null;
    let closestDistance = Infinity;

    for (const interactable of this.interactables) {
      const distance = this.player.position.distanceTo(interactable.trigger.position);
      const radius = interactable.trigger.userData.trigger_radius || 1.5;

      if (distance < radius && distance < closestDistance) {
        closestTarget = interactable;
        closestDistance = distance;
      }
    }

    if (closestTarget !== this.currentTarget) {
      this.currentTarget = closestTarget;
      this.onTargetChanged(closestTarget);
    }
  }

  private onTargetChanged(target: Interactable | null) {
    if (target) {
      // UI 표시
      const promptText = target.trigger.userData.prompt_text || 'Press E to interact';
      this.showPrompt(promptText);
    } else {
      this.hidePrompt();
    }
  }

  private setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'e' || e.key === 'E') {
        this.interact();
      }
    });
  }

  interact() {
    if (!this.currentTarget) return;

    switch (this.currentTarget.type) {
      case 'mission_sign':
        this.openMissionModal(this.currentTarget.data.mission_id);
        break;
      case 'door':
        this.handleDoorInteraction(this.currentTarget);
        break;
    }
  }

  private openMissionModal(missionId: string) {
    // 미션 모달 열기
    console.log('Opening mission:', missionId);
    // MissionModal.open(missionId);
  }

  private async handleDoorInteraction(target: Interactable) {
    const door = target.mesh;
    const buildingName = door.userData.linked_building;

    // 1. 문 열기 애니메이션
    await this.animateDoor(door, 'open');

    // 2. 플레이어 이동
    const entryPoint = this.scene.getObjectByName(buildingName + '_EntryPoint');
    if (entryPoint) {
      this.player.position.copy(entryPoint.position);
      this.player.rotation.y = THREE.MathUtils.degToRad(entryPoint.userData.player_facing);
    }

    // 3. 문 닫기 (선택)
    await this.animateDoor(door, 'close');
  }

  private animateDoor(door: THREE.Object3D, action: 'open' | 'close'): Promise<void> {
    return new Promise((resolve) => {
      const openAngle = THREE.MathUtils.degToRad(door.userData.door_open_angle || 90);
      const duration = (door.userData.animation_duration || 0.5) * 1000;
      const startRotation = door.rotation.z;
      const endRotation = action === 'open' ? openAngle : 0;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeOutQuad(progress);

        door.rotation.z = startRotation + (endRotation - startRotation) * eased;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          door.userData.door_state = action === 'open' ? 'open' : 'closed';
          resolve();
        }
      };

      door.userData.door_state = action === 'open' ? 'opening' : 'closing';
      animate();
    });
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private showPrompt(text: string) {
    // UI 프롬프트 표시
  }

  private hidePrompt() {
    // UI 프롬프트 숨기기
  }
}
```

### 5.2 표지판 이미지 텍스처 적용

```typescript
// 각 표지판에 다른 이미지 적용하기

async function applySignTextures(scene: THREE.Scene) {
  const textureLoader = new THREE.TextureLoader();

  const signTextures = {
    'MissionSign_West_Board': '/textures/mission_001.png',
    'MissionSign_East_Board': '/textures/mission_002.png',
    'MissionSign_South_Board': '/textures/mission_003.png',
    'MissionSign_Center_Board': '/textures/mission_004.png',
  };

  for (const [signName, texturePath] of Object.entries(signTextures)) {
    const sign = scene.getObjectByName(signName) as THREE.Mesh;
    if (sign && sign.material) {
      const texture = await textureLoader.loadAsync(texturePath);

      // 기존 머티리얼 복제 (다른 표지판과 공유 방지)
      const newMaterial = (sign.material as THREE.MeshStandardMaterial).clone();
      newMaterial.map = texture;
      newMaterial.needsUpdate = true;

      sign.material = newMaterial;
    }
  }
}
```

### 5.3 Colyseus 멀티플레이어 연동

```typescript
// 다른 플레이어에게 인터랙션 브로드캐스트

// 클라이언트
class MultiplayerInteraction {
  constructor(private room: Colyseus.Room) {}

  // 미션 표지판 인터랙션
  interactWithSign(missionId: string) {
    this.room.send('interact', {
      type: 'mission_sign',
      mission_id: missionId
    });
  }

  // 건물 진입
  enterBuilding(buildingId: string) {
    this.room.send('interact', {
      type: 'enter_building',
      building_id: buildingId
    });
  }
}

// 서버 (Colyseus Room)
onMessage(client, 'interact', (message) => {
  switch (message.type) {
    case 'mission_sign':
      // 미션 상태 업데이트
      this.state.playerMissions.get(client.sessionId).currentMission = message.mission_id;
      break;

    case 'enter_building':
      // 플레이어 위치 업데이트 (다른 클라이언트에게 브로드캐스트)
      const player = this.state.players.get(client.sessionId);
      player.currentBuilding = message.building_id;
      break;
  }
});
```

---

## 6. 표지판 이미지 적용 방법 (Blender)

나중에 표지판에 이미지를 넣으려면:

```python
import bpy

# 각 표지판에 개별 머티리얼 생성 및 이미지 적용
sign_images = {
    "MissionSign_West_Board": "/path/to/mission_001.png",
    "MissionSign_East_Board": "/path/to/mission_002.png",
    "MissionSign_South_Board": "/path/to/mission_003.png",
    "MissionSign_Center_Board": "/path/to/mission_004.png",
}

for sign_name, image_path in sign_images.items():
    sign = bpy.data.objects.get(sign_name)
    if sign:
        # 새 머티리얼 생성
        mat = bpy.data.materials.new(name=f"{sign_name}_Mat")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links

        # 이미지 텍스처 노드 추가
        img_node = nodes.new('ShaderNodeTexImage')
        img_node.image = bpy.data.images.load(image_path)

        # Principled BSDF에 연결
        bsdf = nodes.get('Principled BSDF')
        links.new(img_node.outputs['Color'], bsdf.inputs['Base Color'])

        # 머티리얼 적용
        sign.data.materials.clear()
        sign.data.materials.append(mat)
```

---

## 7. 추가 개발 시 참고사항

### 새로운 인터랙션 오브젝트 추가 시

1. Blender에서 오브젝트 생성
2. 커스텀 프로퍼티 추가 (`interactable`, `object_type` 등)
3. 트리거 포인트 (Empty) 생성
4. `export_extras=True`로 GLB 내보내기
5. 코드에서 해당 `object_type` 처리 로직 추가

### 권장 네이밍 규칙

```
{Category}_{Name}_{Part}

예시:
- MissionSign_West_Board
- MissionSign_West_Trigger
- WeddingHall_Door
- WeddingHall_DoorTrigger
- WeddingHall_EntryPoint
```

---

## 8. 오브젝트 위치 요약

| 카테고리 | 오브젝트 | 위치 (x, y, z) |
|----------|----------|----------------|
| 표지판 | MissionSign_West | (-5, 0, 0.15) |
| 표지판 | MissionSign_East | (5, -2, 0.12) |
| 표지판 | MissionSign_South | (-2, -5, 0.13) |
| 표지판 | MissionSign_Center | (2, 3.5, 0.18) |
| 건물 | WeddingHall | (0, 6, 0.3) |
| 건물 입구 | WeddingHall_DoorTrigger | (0, 1.5, 0.8) |
| 내부 진입점 | WeddingHall_EntryPoint | (0, 6.5, 0.6) |
| 외부 퇴장점 | WeddingHall_ExitPoint | (0, 1, 0.4) |
