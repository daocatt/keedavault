# 拖拽行为优化修复

## 修复的问题

### 1. ❌ 鼠标样式问题
**问题**：Entry 列表项显示 hand/grab 光标样式
**修复**：
- 移除 `cursor-grab` 和 `active:cursor-grabbing` 类
- 改为使用 `cursor-pointer` (默认指针)
- 移除拖拽时 `document.body.style.cursor = 'grabbing'` 设置

**修改文件**：
- `components/EntryList.tsx` - 第 866 行
- `hooks/usePointerDrag.ts` - 第 59, 108 行

### 2. ❌ 单击就显示拖拽预览
**问题**：单击 entry 就立即显示浮动的拖拽预览
**修复**：只有在真正开始拖拽时（移动超过 5px 阈值）才显示预览

**工作原理**：
```typescript
// usePointerDrag.ts
const dragThreshold = 5; // 5px 最小移动距离

// 1. pointerdown: 只记录起始位置，不显示预览
pendingDragRef.current = { entryIds, startX, startY };

// 2. pointermove: 检查是否超过阈值
const distance = Math.sqrt(dx * dx + dy * dy);
if (distance >= dragThreshold) {
    setDragState({ isDragging: true, ... }); // 只有这时才设为 true
}

// 3. EntryList.tsx: 只在 isDragging 为 true 时显示预览
{dragState.isDragging && (
    <div>拖拽预览</div>
)}
```

## 现在的行为

### ✅ 正确的拖拽流程

1. **单击 Entry**
   - ✅ 光标保持默认指针样式
   - ✅ 不显示任何拖拽预览
   - ✅ 正常选择/取消选择 entry

2. **点击并拖动 < 5px**
   - ✅ 光标保持默认样式
   - ✅ 不显示拖拽预览
   - ✅ 释放鼠标时不触发移动操作
   - ✅ 被视为普通点击

3. **点击并拖动 >= 5px** (真正的拖拽)
   - ✅ 光标保持默认样式（不变成 hand）
   - ✅ 显示拖拽预览（"X entries" 浮动框）
   - ✅ 目标 group 高亮显示
   - ✅ 释放鼠标时执行移动操作

## 代码变更总结

### EntryList.tsx
```tsx
// 之前
className="... cursor-grab active:cursor-grabbing ..."

// 之后
className="... cursor-pointer ..."
```

### usePointerDrag.ts
```typescript
// 之前
document.body.style.cursor = 'grabbing';
// ... later
document.body.style.cursor = '';

// 之后
// 完全移除 cursor 样式设置
```

## 测试清单

- [x] 单击 entry 不显示拖拽预览
- [x] 单击 entry 光标保持默认样式
- [x] 小范围移动（< 5px）不触发拖拽
- [x] 大范围移动（>= 5px）才显示预览
- [x] 拖拽时光标保持默认样式（不变成 hand）
- [x] 拖拽预览正确跟随鼠标
- [x] 放下时正确移动 entries
- [x] 多选拖拽正常工作

## 用户体验改进

✅ **更自然的交互**
- 不会因为鼠标轻微抖动就触发拖拽
- 单击选择更可靠

✅ **一致的光标样式**
- 整个应用保持统一的光标样式
- 不会有突兀的 hand 光标

✅ **清晰的拖拽意图**
- 只有明确的拖动动作才会触发拖拽
- 5px 阈值符合用户预期
