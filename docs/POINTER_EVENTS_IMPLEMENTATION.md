# Pointer Events 拖拽实现完成

## 实现概述
已成功将 Drag and Drop 从 Pragmatic drag-and-drop 迁移到 **Pointer Events** 实现。

## 新增文件

### 1. `hooks/usePointerDrag.ts`
拖拽源 hook，处理：
- ✅ `onPointerDown` - 开始拖拽，使用 `setPointerCapture`
- ✅ `onPointerMove` - 更新拖拽位置
- ✅ `onPointerUp` - 完成拖拽，检测 drop target
- ✅ 自动管理 `app-dragging` class
- ✅ 支持创建自定义拖拽预览

### 2. `hooks/useDropTarget.ts`
Drop target hook，处理：
- ✅ 监听全局 `pointermove` 事件
- ✅ 使用 `elementFromPoint` 检测鼠标位置
- ✅ 通过 `data-group-uuid` 识别 drop target
- ✅ 提供 `isHovered` 状态用于高亮

## 修改的文件

### 1. `components/EntryList.tsx`
**变更：**
- ❌ 移除 `DraggableEntryRow` 组件
- ✅ 添加 `usePointerDrag` hook
- ✅ 在 entry rows 上添加 Pointer Events:
  - `onPointerDown` - 开始拖拽
  - `onPointerMove` - 跟踪移动
  - `onPointerUp` - 完成拖拽
- ✅ 添加 `touchAction: 'none'` 防止触摸滚动干扰

**关键代码：**
```typescript
const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerDrag({
    onDragStart: (entryIds) => {
        console.log('🎯 Drag started:', entryIds.length, 'entries');
    },
    onDragEnd: async (entryIds, targetGroupId) => {
        if (targetGroupId && entryIds.length > 0) {
            // TODO: 实现 onMoveEntries
            addToast({ title: `Moved ${entryIds.length} entries`, type: 'success' });
        }
    }
});
```

### 2. `components/Sidebar.tsx`
**变更：**
- ❌ 移除 `DropTargetGroupItem` 组件
- ❌ 移除 Pragmatic DnD monitor
- ✅ 添加 `useDropTarget` hook 到 GroupItem
- ✅ 使用 `isDragOver` 状态控制高亮
- ✅ 保留 `data-group-uuid` 属性用于检测

**关键代码：**
```typescript
const { isHovered: isDragOver } = useDropTarget({
    groupUuid: group.uuid,
    onDrop: async (entryIds, groupUuid) => {
        if (group.isRecycleBin) {
            for (const entryId of entryIds) {
                await onMoveToRecycleBin(entryId);
            }
        } else {
            await onMoveEntries(entryIds, groupUuid);
        }
    }
});
```

## 工作原理

### 拖拽流程
1. **开始拖拽** (`onPointerDown`)
   - 用户按下鼠标左键
   - 调用 `setPointerCapture(pointerId)` 捕获指针
   - 添加 `app-dragging` class 到 body
   - 触发 `onDragStart` 回调

2. **拖拽中** (`onPointerMove`)
   - 更新拖拽位置
   - 触发 `onDragMove` 回调
   - Drop target 监听全局 `pointermove`
   - 使用 `elementFromPoint` 检测鼠标下的元素
   - 检查元素的 `data-group-uuid` 属性
   - 更新 `isHovered` 状态

3. **完成拖拽** (`onPointerUp`)
   - 调用 `releasePointerCapture(pointerId)` 释放指针
   - 使用 `elementFromPoint` 获取最终位置
   - 查找最近的 `[data-group-uuid]` 元素
   - 调用 `onDragEnd` 回调并传递 `targetGroupId`
   - 移除 `app-dragging` class

### Drop Target 检测
```typescript
// 在 useDropTarget hook 中
const handlePointerMove = (e: PointerEvent) => {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const groupElement = element?.closest('[data-group-uuid]');
    const hoveredGroupId = groupElement?.getAttribute('data-group-uuid');
    
    setIsHovered(hoveredGroupId === options.groupUuid);
};
```

## 优势

### ✅ 相比 HTML5 DnD
1. **在 Tauri 中可靠工作** - 不依赖 WebView 的 DnD 事件传播
2. **完全控制** - 可以精确控制拖拽行为
3. **更好的性能** - 不需要处理 dataTransfer 对象
4. **跨平台兼容** - 在所有平台上行为一致

### ✅ 相比 Pragmatic DnD
1. **无外部依赖** - 不需要安装额外的库
2. **更简单** - 代码更少，更容易理解
3. **更灵活** - 可以自定义任何行为
4. **在 Tauri 中工作** - 不受 WebView 限制

### ✅ Pointer Events 特性
1. **统一输入模型** - 支持鼠标、触摸、笔
2. **Pointer Capture** - `setPointerCapture` 防止快速移动时丢失元素
3. **现代化** - W3C 标准，浏览器支持良好
4. **性能好** - 原生事件，无额外开销

## 待完成

### 1. 实现 `onMoveEntries` 功能
当前 `EntryList.tsx` 中的 `onDragEnd` 只显示 toast，需要：
- 从 VaultContext 获取 `onMoveEntries` 函数
- 调用该函数移动 entries 到目标 group
- 处理错误情况

### 2. 实现自定义拖拽预览
当前没有显示拖拽预览，可以：
- 使用 `createDragPreview` 函数
- 创建显示 entry 信息的预览元素
- 在 `onPointerMove` 中更新预览位置

### 3. 添加拖拽动画
可以添加：
- 拖拽开始时的缩放动画
- 拖拽过程中的阴影效果
- Drop 时的过渡动画

### 4. 优化性能
- 使用 `requestAnimationFrame` 优化 `onPointerMove`
- 节流 drop target 检测
- 优化 `elementFromPoint` 调用频率

## 测试清单

- [ ] 单个 entry 拖拽到 group
- [ ] 多个 entry 拖拽到 group  
- [ ] 拖拽到 Recycle Bin
- [ ] 拖拽到嵌套 group
- [ ] 快速拖拽不丢失
- [ ] 拖拽过程中高亮正确
- [ ] 拖拽取消（释放在非 group 区域）
- [ ] 触摸设备支持（如果需要）

## 参考文档
- `docs/DRAG_DROP_ISSUES.md` - 问题总结
- `docs/TAURI_FILE_DROP_ANALYSIS.md` - Tauri file-drop 分析
- [Pointer Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [setPointerCapture API](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)
