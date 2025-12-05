# Tauri 文件拖放事件方案分析

## 方案概述
使用 Tauri 的 `tauri://file-drop` 事件监听来实现 entry 到 group 的拖拽。

## Tauri 文件拖放 API

### 可用事件
```typescript
import { listen } from '@tauri-apps/api/event';

// 文件拖放事件
listen('tauri://file-drop', (event) => {
  console.log('Files dropped:', event.payload);
});

// 拖拽悬停事件
listen('tauri://file-drop-hover', (event) => {
  console.log('Files hovering:', event.payload);
});

// 拖拽取消事件
listen('tauri://file-drop-cancelled', () => {
  console.log('Drop cancelled');
});
```

### 事件数据结构
```typescript
interface FileDropEvent {
  payload: string[];  // 文件路径数组
  windowLabel: string;
  id: number;
}
```

## 方案可行性分析

### ❌ 不适用于我们的场景

**原因 1：只支持文件拖放**
- Tauri 的 file-drop 事件**只能检测从操作系统拖入的文件**
- 无法检测应用内部的元素拖拽（entry row 拖到 group）
- `event.payload` 只包含文件路径，不包含自定义数据

**原因 2：无法传递自定义数据**
```typescript
// ❌ 无法实现：
// 从 EntryList 拖拽 entry.uuid 到 Sidebar group
// Tauri file-drop 无法携带 entry.uuid 等自定义数据
```

**原因 3：事件触发时机不对**
- `tauri://file-drop` 只在**从外部拖入文件**时触发
- 应用内部的 HTML 元素拖拽不会触发这个事件
- 即使触发，也无法知道拖拽的是哪个 entry

**原因 4：无法控制 drop target**
- 无法精确知道拖拽到了哪个 group
- 事件只告诉你"有文件被拖入窗口"
- 无法获取鼠标位置或目标元素信息

## 实际测试场景

### 场景 1：从 EntryList 拖到 Sidebar
```typescript
// 用户操作：拖拽 entry row 到 group item

// ❌ Tauri file-drop 不会触发
// 因为这是应用内部的 DOM 元素拖拽，不是文件拖放

// ✅ 需要的数据：
const dragData = {
  entryIds: ['uuid-1', 'uuid-2'],  // 被拖拽的 entries
  targetGroupId: 'group-uuid'       // 目标 group
};

// ❌ Tauri file-drop 无法提供这些数据
```

### 场景 2：从外部拖入文件
```typescript
// 用户操作：从 Finder 拖入 .kdbx 文件

// ✅ Tauri file-drop 会触发
listen('tauri://file-drop', (event) => {
  const files = event.payload;  // ['/path/to/file.kdbx']
  // 可以用于打开数据库文件
});

// 这个场景与我们的需求不同
```

## 对比：我们的需求 vs Tauri file-drop

| 需求 | 我们的场景 | Tauri file-drop |
|------|-----------|----------------|
| 拖拽源 | 应用内 entry row | 操作系统文件 |
| 拖拽目标 | 应用内 group item | 应用窗口 |
| 传递数据 | entry UUIDs | 文件路径 |
| 目标检测 | 精确到具体 group | 只知道拖入窗口 |
| 高亮反馈 | 需要高亮 group | 无法实现 |
| 适用性 | ❌ 不适用 | ✅ 适用于文件导入 |

## Tauri file-drop 的正确用途

### ✅ 适用场景：
1. **打开数据库文件**
   ```typescript
   listen('tauri://file-drop', async (event) => {
     const files = event.payload;
     if (files[0]?.endsWith('.kdbx')) {
       await openDatabase(files[0]);
     }
   });
   ```

2. **导入附件**
   ```typescript
   listen('tauri://file-drop', async (event) => {
     const files = event.payload;
     for (const file of files) {
       await addAttachment(currentEntry, file);
     }
   });
   ```

3. **批量导入**
   ```typescript
   listen('tauri://file-drop', async (event) => {
     const files = event.payload;
     await importMultipleFiles(files);
   });
   ```

### ❌ 不适用场景：
1. 应用内部元素拖拽（我们的需求）
2. 自定义数据传递
3. 精确的 drop target 检测
4. 拖拽过程中的视觉反馈

## 结论

### Tauri file-drop 方案：❌ 不可行

**原因总结：**
1. 只支持从操作系统拖入文件，不支持应用内拖拽
2. 无法传递自定义数据（entry UUIDs）
3. 无法检测精确的 drop target（哪个 group）
4. 无法实现拖拽过程中的高亮反馈
5. 事件数据结构不匹配我们的需求

### 推荐方案：✅ Pointer Events

**为什么 Pointer Events 可行：**
1. ✅ 完全控制应用内拖拽
2. ✅ 可以传递任意自定义数据
3. ✅ 精确检测鼠标位置和 drop target
4. ✅ 可以实时更新高亮状态
5. ✅ 在 Tauri 中可靠工作
6. ✅ 支持多种输入设备（鼠标、触摸、笔）

### 实现对比

#### ❌ Tauri file-drop（不可行）
```typescript
// 无法实现我们的需求
listen('tauri://file-drop', (event) => {
  // event.payload 只有文件路径
  // 无法知道拖拽的是哪个 entry
  // 无法知道目标是哪个 group
});
```

#### ✅ Pointer Events（推荐）
```typescript
// Entry Row
const handlePointerDown = (e: React.PointerEvent) => {
  e.currentTarget.setPointerCapture(e.pointerId);
  setDraggingEntries([entry.uuid]);
};

const handlePointerMove = (e: React.PointerEvent) => {
  // 更新拖拽位置
  // 检测是否在 group 上
  const element = document.elementFromPoint(e.clientX, e.clientY);
  const groupId = element?.closest('[data-group-uuid]')?.getAttribute('data-group-uuid');
  if (groupId) {
    setHoveredGroup(groupId);  // 高亮 group
  }
};

const handlePointerUp = (e: React.PointerEvent) => {
  e.currentTarget.releasePointerCapture(e.pointerId);
  if (hoveredGroup) {
    // 移动 entries 到 group
    await onMoveEntries(draggingEntries, hoveredGroup);
  }
};
```

## 建议

1. **不要使用 Tauri file-drop** 来实现 entry 到 group 的拖拽
2. **使用 Pointer Events** 实现应用内拖拽功能
3. **保留 Tauri file-drop** 用于从外部导入文件的场景（如果需要）
4. **参考文档** `DRAG_DROP_ISSUES.md` 了解完整的实现方案

## 参考
- [Tauri Events API](https://tauri.app/v1/api/js/event/)
- [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
