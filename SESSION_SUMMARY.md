# Session Summary - Drag & Drop and Window Management

## 完成的功能

### 1. ✅ Long Press Drag-and-Drop
**实现**：长按 300ms 触发拖拽
- 单击（< 300ms）→ 选择 entry
- 长按（>= 300ms）→ 开始拖拽
- 移动 > 10px 在长按期间 → 取消

**文件修改**：
- `hooks/usePointerDrag.ts` - 长按计时器逻辑
- `hooks/useDropTarget.ts` - 全局监听器
- `components/EntryList.tsx` - 拖拽预览

### 2. ✅ 改进的拖拽预览
**单个 Entry**：
```
┌────────────────────────┐
│  🔑  Gmail Account     │
│      user@gmail.com    │
└────────────────────────┘
```

**多个 Entries**：
```
┌────────────────────────┐
│  🔑  3 entries    ③    │
│      Move to group     │
└────────────────────────┘
```

**文件修改**：
- `components/EntryList.tsx` - 拖拽预览组件

### 3. ✅ macOS Dock 图标行为
**逻辑**：
- 有 vault 窗口 → 显示 vault 在 launcher 之上
- 没有 vault 窗口 → 显示 launcher

**文件修改**：
- `src-tauri/src/main.rs` - Reopen 事件处理

### 4. ✅ 窗口关闭行为
**所有窗口**：点击关闭按钮 → 窗口销毁
- 不再隐藏窗口
- 符合标准 macOS 行为

**文件修改**：
- `src-tauri/src/main.rs` - CloseRequested 事件处理

## 关键技术点

### Long Press 实现
```typescript
// 300ms 计时器
longPressTimerRef.current = setTimeout(() => {
    if (pendingDragRef.current && !dragState.isDragging) {
        setDragState({ isDragging: true, ... });
    }
}, 300);

// 移动超过 10px 取消
if (distance > 10) {
    clearTimeout(longPressTimerRef.current);
    pendingDragRef.current = null;
}
```

### 防止第二次点击误触发
```typescript
// 清理所有残留状态
if (longPressTimerRef.current) {
    clearTimeout(longPressTimerRef.current);
}
if (pendingDragRef.current) {
    pendingDragRef.current = null;
}
if (dragState.isDragging) {
    setDragState({ isDragging: false, ... });
    return; // 不启动新拖拽
}
```

### 窗口管理
```rust
// 所有窗口关闭时销毁
if let tauri::WindowEvent::CloseRequested { .. } = event {
    // 不调用 prevent_close()
    // 窗口正常关闭
}

// Dock 图标点击
if !vault_windows.is_empty() {
    // 显示 vault 在 launcher 之上
} else {
    // 显示 launcher
}
```

## 文档

创建的文档：
1. `LONG_PRESS_DRAG.md` - 长按拖拽实现
2. `IMPROVED_DRAG_PREVIEW.md` - 拖拽预览设计
3. `DOCK_BEHAVIOR_SOLUTION.md` - Dock 图标行为
4. `WINDOW_CLOSE_BEHAVIOR.md` - 窗口关闭行为
5. `FINAL_FIX_SECOND_CLICK.md` - 第二次点击修复
6. `FIX_SECOND_CLICK_DRAG.md` - 拖拽状态清理

## 测试清单

### 拖拽功能
- [x] 单击选择 entry
- [x] 长按 300ms 开始拖拽
- [x] 拖拽预览显示正确信息
- [x] 拖到 group 成功移动
- [x] 第二次点击需要重新长按
- [x] 多选拖拽正常工作

### 窗口管理
- [ ] 关闭 vault 窗口 → 窗口销毁
- [ ] 关闭 launcher → 窗口销毁
- [ ] 点击 Dock（有 vault）→ 显示 vault
- [ ] 点击 Dock（无 vault）→ 显示 launcher
- [ ] 窗口层级正确

## 已知问题

### 需要手动修改
`src-tauri/src/main.rs` 的 `Reopen` 事件处理需要手动修改：
- 将 `visible_vault_windows` 改为 `vault_windows`
- 移除 `is_visible()` 检查

参考：`MANUAL_FIX_REOPEN.md`

## 下一步

1. 测试所有功能
2. 应用手动修复（如果需要）
3. 验证窗口管理行为
4. 测试跨平台兼容性

## 开发服务器

当前状态：✅ 运行中
- 端口：1420
- 命令：`npm run tauri dev`
