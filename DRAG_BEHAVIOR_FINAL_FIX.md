# 拖拽行为最终修复

## 修复的核心问题

### 问题描述
1. ❌ 单击就显示拖拽预览
2. ❌ 轻微移动鼠标就触发拖拽
3. ❌ 拖拽后会触发点击事件，导致选择状态改变

### 期望行为
✅ **必须按住鼠标左键不放，持续移动 >= 15px，才能触发拖拽**
✅ **释放鼠标时，如果在 group 上，则移动 entries；否则取消拖拽**
✅ **拖拽后不应触发点击事件**

## 实现方案

### 1. 增加拖拽阈值
```typescript
// hooks/usePointerDrag.ts
const { dragThreshold = 15 } = options; // 从 5px 增加到 15px
```

**效果**：
- 单击或轻微移动（< 15px）不会触发拖拽
- 必须明确的拖动动作才会开始拖拽

### 2. 移除 preventDefault
```typescript
// hooks/usePointerDrag.ts - handlePointerDown
// 之前：
e.preventDefault(); // ❌ 阻止了点击事件

// 之后：
// Don't prevent default here - let clicks work normally ✅
```

**效果**：
- 允许正常的点击事件触发
- 不影响选择功能

### 3. 添加拖拽状态追踪
```typescript
// hooks/usePointerDrag.ts
const wasDraggingRef = useRef<boolean>(false);

// 开始拖拽时
wasDraggingRef.current = true;

// 拖拽结束后延迟重置
setTimeout(() => {
    wasDraggingRef.current = false;
}, 50);

// 导出检查函数
return {
    ...
    wasDragging: () => wasDraggingRef.current,
};
```

### 4. 在点击处理中检查拖拽状态
```typescript
// components/EntryList.tsx - handleEntryClick
const handleEntryClick = (e: React.MouseEvent, entry: VaultEntry) => {
    // 如果刚刚发生了拖拽，忽略点击事件
    if (wasDragging()) {
        console.log('🚫 Ignoring click - was dragging');
        return;
    }
    
    // 正常处理点击...
};
```

## 完整的用户交互流程

### 场景 1：单击选择 Entry
```
用户操作：单击 Entry
    ↓
pointerdown 触发
    ↓
pendingDragRef 记录起始位置
    ↓
pointerup 触发（没有移动或移动 < 15px）
    ↓
pendingDragRef 被清除
    ↓
wasDragging() 返回 false
    ↓
onClick 触发 → handleEntryClick 执行
    ↓
✅ Entry 被选中
```

### 场景 2：拖拽 Entry 到 Group
```
用户操作：按住鼠标并拖动 >= 15px
    ↓
pointerdown 触发
    ↓
pendingDragRef 记录起始位置
    ↓
pointermove 触发（移动距离 >= 15px）
    ↓
isDragging 设为 true
    ↓
wasDraggingRef.current = true
    ↓
显示拖拽预览 "X entries"
    ↓
Group 高亮显示（hover）
    ↓
pointerup 在 Group 上
    ↓
检测到 targetGroupId
    ↓
onMoveEntries(entryIds, targetGroupId)
    ↓
wasDraggingRef 延迟重置为 false
    ↓
onClick 触发 → handleEntryClick 检查 wasDragging()
    ↓
🚫 返回 true，忽略点击
    ↓
✅ Entries 移动到目标 Group，选择状态不变
```

### 场景 3：拖拽但未放到 Group 上
```
用户操作：按住鼠标拖动，但释放在空白处
    ↓
... 拖拽开始流程相同 ...
    ↓
pointerup 在空白处
    ↓
targetGroupId = null
    ↓
onDragEnd(entryIds, null)
    ↓
不调用 onMoveEntries
    ↓
✅ 取消拖拽，Entries 保持在原位
```

## 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `dragThreshold` | 15px | 触发拖拽的最小移动距离 |
| `wasDragging` 重置延迟 | 50ms | 防止拖拽后立即触发点击 |
| 鼠标样式 | `cursor-pointer` | 不使用 hand/grab 样式 |

## 测试清单

- [x] 单击 Entry 正常选择
- [x] Cmd+Click 多选正常工作
- [x] Shift+Click 范围选择正常工作
- [x] 轻微移动（< 15px）不触发拖拽
- [x] 明确拖动（>= 15px）显示预览
- [x] 拖拽到 Group 成功移动
- [x] 拖拽到空白处取消操作
- [x] 拖拽后不触发选择变化
- [x] 鼠标样式保持一致（不变成 hand）

## 代码变更总结

### hooks/usePointerDrag.ts
1. 阈值从 5px → 15px
2. 移除 `e.preventDefault()`
3. 添加 `wasDraggingRef` 追踪
4. 导出 `wasDragging()` 函数
5. 移除 cursor 样式设置

### components/EntryList.tsx
1. 接收 `wasDragging` 函数
2. 在 `handleEntryClick` 中检查拖拽状态
3. Entry 行使用 `cursor-pointer` 而非 `cursor-grab`

## 用户体验改进

✅ **更自然的交互**
- 15px 阈值符合用户预期
- 不会因为手抖就触发拖拽

✅ **清晰的操作反馈**
- 只有明确的拖动才显示预览
- 拖拽和点击互不干扰

✅ **一致的视觉体验**
- 统一的光标样式
- 平滑的动画效果
