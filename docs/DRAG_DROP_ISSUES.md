# Drag and Drop 实现问题总结

## 问题背景
需要实现从 EntryList 拖拽 entry 到 Sidebar 的 group 中，以实现条目的分组移动功能。

## 尝试过的方案

### 1. 原生 HTML5 Drag and Drop API
**实现方式：**
- 使用 `draggable={true}` 和 `onDragStart`/`onDragEnd` 在 EntryList
- 使用 `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` 在 Sidebar GroupItem

**问题：**
- ✅ `dragstart` 和 `dragend` 事件可以触发
- ❌ `dragenter`, `dragover`, `dragleave`, `drop` 事件在 Tauri WebView 中不触发
- ❌ 无法检测到 drop target，导致无法高亮目标 group
- ❌ 无法完成 drop 操作

**原因：**
- Tauri 的 WebView 在 macOS 上拦截了这些事件用于文件拖放处理
- 即使使用 `.disable_drag_drop_handler()` 也无法完全解决
- 这是 Tauri 的已知问题：https://github.com/tauri-apps/tauri/issues/11605

### 2. Atlassian Pragmatic Drag and Drop
**实现方式：**
- 安装 `@atlaskit/pragmatic-drag-and-drop`
- 使用 `draggable()` 包装 entry rows
- 使用 `dropTargetForElements()` 包装 group items
- 创建了 `DraggableEntryRow` 和 `DropTargetGroupItem` 组件

**问题：**
- ✅ 全局 monitor 可以检测到 drag start 和 drop
- ✅ 自定义 drag preview 可以正常显示
- ❌ Drop target 的事件不触发（`canDrop`, `onDragEnter`, `onDragLeave`）
- ❌ 无法高亮 drop target
- ❌ 无法完成精确的 drop 到指定 group

**原因：**
- Pragmatic Drag and Drop 底层依赖原生 HTML5 Drag and Drop API
- 在 Tauri WebView 中遇到同样的事件拦截问题
- 官方文档确认："Since pragmatic-drag-and-drop relies on the web platform's native drag-and-drop primitives, its functionality within Tauri or Electron would primarily depend on how consistently and completely the embedded webview implements these browser-native behaviors."

**尝试的修复：**
- ✅ 添加 `accept_first_mouse(true)` - 解决窗口焦点问题，但不解决 DnD
- ❌ 移除 `.disable_drag_drop_handler()` - 导致应用崩溃
- ❌ 在 `tauri.conf.json` 添加 `dragDropEnabled: false` - 配置位置错误导致崩溃
- ✅ 添加 `getData()` 到 drop target - 正确但不解决根本问题
- ❌ 移除 `canDrop` 检查 - 仍然无法触发 drop target 事件

### 3. 鼠标事件模拟（Mouse Events）
**实现方式：**
- 使用 `onMouseDown` 开始拖拽
- 使用 `onMouseMove` 更新位置
- 使用 `onMouseUp` 完成 drop
- 使用全局状态跟踪拖拽的 entry IDs

**优点：**
- ✅ 在 Tauri 中可靠工作
- ✅ 不依赖 HTML5 DnD API
- ✅ 完全控制拖拽行为
- ✅ 可以实现自定义 drag preview
- ✅ 跨平台兼容

**缺点：**
- ⚠️ 需要手动处理更多场景（文本选择、快速移动等）
- ⚠️ 不支持触摸/笔输入（除非升级到 Pointer Events）

**状态：**
- 之前实现过，可以工作
- 后来为了尝试 Pragmatic DnD 而移除

## 技术分析

### Tauri WebView 的 DnD 限制
1. **macOS WebView 特性：**
   - WebView 拦截 drag 事件用于系统级文件拖放
   - 即使禁用 Tauri 的 file drop handler，WebView 仍不传播某些事件
   - `dragstart`/`dragend` 可以触发（在拖拽源上）
   - `dragenter`/`dragover`/`dragleave`/`drop` 不触发（在 drop target 上）

2. **Tauri 配置选项：**
   - `.disable_drag_drop_handler()` - 禁用 Tauri 的文件拖放，但不启用 HTML5 DnD
   - `dragDropEnabled: false` - 需要在正确的配置位置，且可能不完全解决问题
   - `accept_first_mouse(true)` - 只解决窗口焦点问题

3. **为什么 Pragmatic DnD 不工作：**
   - 依赖原生 `dragenter`/`dragover` 事件进行 hit-testing
   - Tauri WebView 不触发这些事件
   - 无法检测鼠标是否在 drop target 上
   - 因此无法触发 `canDrop`, `onDragEnter`, `onDragLeave` 回调

## 推荐方案

### 方案 A：Pointer Events（推荐）
使用现代 Pointer Events API 实现自定义拖拽：

**优点：**
- ✅ 统一处理鼠标、触摸、笔输入
- ✅ `setPointerCapture()` 防止快速移动时丢失元素
- ✅ 在 Tauri 中可靠工作
- ✅ 现代化、性能好
- ✅ 完全控制拖拽行为

**实现要点：**
```typescript
// 拖拽源
onPointerDown={(e) => {
  e.currentTarget.setPointerCapture(e.pointerId);
  // 开始拖拽
}}

onPointerMove={(e) => {
  // 更新拖拽位置
  // 检测是否在 drop target 上
}}

onPointerUp={(e) => {
  e.currentTarget.releasePointerCapture(e.pointerId);
  // 完成 drop
}}
```

### 方案 B：Mouse Events（备选）
使用传统鼠标事件：

**优点：**
- ✅ 简单直接
- ✅ 之前已经实现过，知道可以工作
- ✅ 浏览器兼容性好

**缺点：**
- ⚠️ 不支持触摸输入
- ⚠️ 需要手动处理 capture

### 方案 C：等待 Tauri 修复（不推荐）
等待 Tauri 官方修复 WebView 的 DnD 事件传播问题。

**问题：**
- ❌ 这是 WebView 层面的限制，不是 Tauri 的 bug
- ❌ 可能永远不会修复
- ❌ 阻塞功能开发

## 实现建议

### 立即行动：使用 Pointer Events
1. 创建 `usePointerDrag` hook 处理拖拽逻辑
2. 在 EntryList 的 entry rows 上添加 pointer 事件
3. 在 Sidebar 的 group items 上检测 pointer 位置
4. 使用 `setPointerCapture` 确保可靠性
5. 实现自定义 drag preview（可以复用现有代码）

### 代码结构
```
hooks/
  usePointerDrag.ts       # 拖拽逻辑 hook
  useDropTarget.ts        # Drop target 检测 hook

components/
  EntryList.tsx           # 使用 usePointerDrag
  Sidebar.tsx             # 使用 useDropTarget
```

## 参考资料
- [Tauri Issue #11605](https://github.com/tauri-apps/tauri/issues/11605) - macOS drag region 问题
- [Pragmatic DnD 文档](https://atlassian.design/components/pragmatic-drag-and-drop/about)
- [Pointer Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Mouse Events vs Pointer Events](https://javascript.info/pointer-events)

## 结论
在 Tauri 应用中，**必须使用 Pointer Events 或 Mouse Events** 实现拖拽功能，因为：
1. HTML5 Drag and Drop API 在 Tauri WebView 中不完整工作
2. 所有基于 HTML5 DnD 的库（包括 Pragmatic DnD）都会遇到同样问题
3. Pointer Events 是最现代、最可靠的解决方案
4. 这不是配置问题，而是 WebView 的架构限制
