# Fix: Second Click Triggers Drag Without Long Press

## 问题描述

**Bug 重现步骤**：
1. 长按第一个 entry → 拖拽预览出现 ✅
2. 释放鼠标，拖拽结束 ✅
3. 立即点击第二个 entry（没有长按）→ ❌ 预览立即出现并跟随鼠标

**期望行为**：
- 第二次点击应该需要重新长按 300ms 才能触发拖拽

## 根本原因

当第一次拖拽结束后，以下状态可能没有完全清理：
1. `longPressTimerRef.current` - 可能还有残留的计时器
2. `pendingDragRef.current` - 可能还有待处理的拖拽信息
3. `dragState.isDragging` - 异步状态更新可能有延迟

当用户快速点击第二个 entry 时，这些残留状态会导致拖拽立即触发。

## 解决方案

### 在 `handlePointerDown` 开始时清理所有状态

```typescript
const handlePointerDown = useCallback((
    e: React.PointerEvent,
    entryIds: string[]
) => {
    // ... 基本检查 ...

    // ✅ IMPORTANT: Clear any existing drag state first
    // This prevents issues when clicking second item after first drag
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
    
    if (pendingDragRef.current) {
        pendingDragRef.current = null;
    }

    // If somehow still dragging from previous operation, reset
    if (dragState.isDragging) {
        console.warn('⚠️ Previous drag state not cleared, resetting');
        setDragState({
            isDragging: false,
            entryIds: [],
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
        });
        wasDraggingRef.current = false;
        return; // Don't start new drag, let state reset first
    }

    // ... 继续正常的长按逻辑 ...
}, [dragState, options, longPressDuration]);
```

## 修复的关键点

### 1. 清理计时器
```typescript
if (longPressTimerRef.current) {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
}
```
- 确保没有残留的长按计时器
- 防止旧计时器在新点击时触发

### 2. 清理待处理状态
```typescript
if (pendingDragRef.current) {
    pendingDragRef.current = null;
}
```
- 清除任何待处理的拖拽信息
- 确保新点击从干净状态开始

### 3. 检查并重置拖拽状态
```typescript
if (dragState.isDragging) {
    console.warn('⚠️ Previous drag state not cleared, resetting');
    setDragState({ isDragging: false, ... });
    wasDraggingRef.current = false;
    return; // 不启动新拖拽，让状态先重置
}
```
- 检测异常情况（拖拽状态未清理）
- 强制重置并返回，不启动新拖拽
- 用户需要再次点击才能开始新拖拽

## 测试场景

### 场景 1：正常连续拖拽
```
1. 长按 Entry A (300ms) → 拖拽开始
2. 拖到 Group 1 → 释放
3. 立即点击 Entry B
   → ✅ 清理所有状态
   → ✅ 需要重新长按 300ms
4. 长按 Entry B (300ms) → 拖拽开始
```

### 场景 2：快速连续点击
```
1. 长按 Entry A (300ms) → 拖拽开始
2. 释放（取消拖拽）
3. 立即快速点击 Entry B (< 300ms)
   → ✅ 清理所有状态
   → ✅ 视为普通点击
   → ✅ 选择 Entry B
```

### 场景 3：拖拽中途点击其他 Entry
```
1. 长按 Entry A (300ms) → 拖拽开始
2. 拖拽中途点击 Entry B
   → ✅ 清理当前拖拽
   → ✅ 需要重新长按 Entry B
```

### 场景 4：异常状态恢复
```
1. 某种原因导致 dragState.isDragging = true 但没有实际拖拽
2. 点击 Entry A
   → ✅ 检测到异常状态
   → ✅ 强制重置
   → ⚠️ 返回，不启动拖拽
   → ℹ️ 用户需要再次点击
```

## 状态清理顺序

```
用户点击新 Entry
    ↓
1. 清理计时器 (longPressTimerRef)
    ↓
2. 清理待处理状态 (pendingDragRef)
    ↓
3. 检查拖拽状态 (dragState.isDragging)
    ↓
    如果还在拖拽 → 强制重置并返回
    ↓
4. 开始新的长按计时器
    ↓
5. 等待 300ms...
```

## 防御性编程

这个修复采用了防御性编程策略：

✅ **假设最坏情况**
- 假设状态可能没有正确清理
- 在每次新操作前主动清理

✅ **多层检查**
- 检查计时器
- 检查待处理状态
- 检查拖拽状态

✅ **安全失败**
- 如果检测到异常，重置并返回
- 不会进入不一致的状态

## 调试日志

添加了警告日志来帮助调试：

```typescript
console.warn('⚠️ Previous drag state not cleared, resetting');
```

如果看到这个警告，说明：
- 之前的拖拽没有正确清理
- 系统已自动恢复
- 用户需要再次点击

## 相关代码位置

- **文件**: `hooks/usePointerDrag.ts`
- **函数**: `handlePointerDown`
- **行数**: ~180-210

## 测试清单

- [x] 第一次拖拽正常工作
- [x] 第二次点击需要重新长按
- [x] 快速连续点击不触发拖拽
- [x] 拖拽中途点击其他 entry 正常
- [x] 异常状态能自动恢复
- [x] 多选拖拽不受影响
- [x] 点击事件不受影响

## 性能影响

✅ **最小性能影响**
- 只在 `pointerdown` 时执行清理
- 清理操作非常轻量（几个 null 赋值）
- 不影响正常拖拽流程

## 向后兼容性

✅ **完全兼容**
- 不改变现有 API
- 不影响正常使用流程
- 只修复边缘情况的 bug
