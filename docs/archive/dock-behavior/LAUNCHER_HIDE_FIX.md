# Launcher Window Behavior Fix

## 问题

**场景**：
1. Launcher 打开
2. 点击 "Create New Vault" → Create 窗口打开，Launcher 关闭
3. 关闭 Create 窗口（不创建数据库）→ ❌ 应用退出

**原因**：
- Launcher 被关闭（销毁）
- Create 窗口也被关闭（销毁）
- 没有窗口存在 → 应用退出

## 解决方案

### 改变 Launcher 行为

**之前**：打开 vault 窗口时关闭 Launcher
```typescript
// ❌ 关闭 launcher
getCurrentWebviewWindow().close();
```

**现在**：打开 vault 窗口时隐藏 Launcher
```typescript
// ✅ 隐藏 launcher
getCurrentWebviewWindow().hide();
```

## 代码修改

### 文件：`components/Launcher.tsx`

#### 修改 1：创建窗口成功后隐藏 Launcher
```typescript
webview.once('tauri://created', async function () {
    clearTimeout(createdTimeout);
    console.log("✅ Window created event received, label:", label);

    // Hide the launcher window instead of closing it
    // This keeps the app running if the vault window is closed
    setTimeout(() => {
        console.log('🙈 Hiding launcher window');
        getCurrentWebviewWindow().hide(); // ✅ 改为 hide()
    }, 100);
});
```

#### 修改 2：超时回退也隐藏 Launcher
```typescript
const createdTimeout = setTimeout(() => {
    console.warn('⚠️ Window creation timeout - hiding launcher');
    getCurrentWebviewWindow().hide().catch(e => console.error('Failed to hide launcher:', e));
}, 2000);
```

## 新的窗口生命周期

### 场景 1：创建新 Vault 但取消
```
1. Launcher 打开
    ↓
2. 点击 "Create New Vault"
    ↓
3. Create 窗口打开
    ↓
4. Launcher 隐藏（不销毁）
    ↓
5. 用户关闭 Create 窗口（不创建）
    ↓
6. Create 窗口销毁
    ↓
7. Launcher 仍然存在（隐藏状态）
    ↓
8. ✅ 应用继续运行
```

### 场景 2：成功创建 Vault
```
1. Launcher 打开
    ↓
2. 点击 "Create New Vault"
    ↓
3. Create 窗口打开
    ↓
4. Launcher 隐藏
    ↓
5. 用户创建数据库
    ↓
6. Vault Workspace 窗口打开
    ↓
7. Create 窗口关闭
    ↓
8. Launcher 仍然隐藏
    ↓
9. ✅ 应用继续运行（Vault Workspace 存在）
```

### 场景 3：打开现有 Vault 但取消
```
1. Launcher 打开
    ↓
2. 点击最近的数据库
    ↓
3. VaultAuth 窗口打开
    ↓
4. Launcher 隐藏
    ↓
5. 用户关闭 VaultAuth（不解锁）
    ↓
6. VaultAuth 窗口销毁
    ↓
7. Launcher 仍然存在（隐藏状态）
    ↓
8. ✅ 应用继续运行
```

### 场景 4：点击 Dock 图标（Launcher 隐藏）
```
1. Launcher 隐藏
2. 所有 vault 窗口已关闭
    ↓
3. 用户点击 Dock 图标
    ↓
4. Reopen 事件触发
    ↓
5. 检查 vault 窗口 → 没有
    ↓
6. 检查 Launcher → 存在但隐藏
    ↓
7. ✅ Launcher.show() 被调用
    ↓
8. ✅ Launcher 显示
```

## 窗口状态表

| 操作 | Launcher | Vault 窗口 | 应用状态 |
|------|----------|-----------|---------|
| 打开应用 | 显示 | 无 | 运行 |
| 点击 Create | 隐藏 | Create 显示 | 运行 |
| 关闭 Create（取消） | 隐藏 | 无 | ✅ 运行 |
| 成功创建 | 隐藏 | Workspace 显示 | 运行 |
| 关闭 Workspace | 隐藏 | 无 | ✅ 运行 |
| 点击 Dock | 显示 | 无 | 运行 |

## 优势

### ✅ 防止意外退出
- 用户取消操作不会导致应用退出
- Launcher 始终作为"后备"窗口存在

### ✅ 更好的用户体验
- 用户可以安全地探索和取消操作
- 不需要重新启动应用

### ✅ 符合预期
- 类似其他 macOS 应用的行为
- 关闭窗口 ≠ 退出应用

## 与 Dock 图标行为的配合

这个修复与 Dock 图标行为完美配合：

```rust
// main.rs - Reopen 事件
if !vault_windows.is_empty() {
    // 有 vault 窗口 → 显示它们
} else {
    // 没有 vault 窗口 → 显示 launcher
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show(); // ✅ 显示隐藏的 launcher
        let _ = window.set_focus();
    } else {
        // 创建新的 launcher
    }
}
```

## 测试场景

### 测试 1：取消创建
- [ ] 打开 Launcher
- [ ] 点击 "Create New Vault"
- [ ] Create 窗口打开，Launcher 消失
- [ ] 关闭 Create 窗口（不创建）
- [ ] ✅ 应用不退出
- [ ] 点击 Dock 图标
- [ ] ✅ Launcher 重新显示

### 测试 2：取消解锁
- [ ] 打开 Launcher
- [ ] 点击最近的数据库
- [ ] VaultAuth 窗口打开，Launcher 消失
- [ ] 关闭 VaultAuth（不解锁）
- [ ] ✅ 应用不退出
- [ ] 点击 Dock 图标
- [ ] ✅ Launcher 重新显示

### 测试 3：成功创建后关闭
- [ ] 创建新 vault
- [ ] Workspace 窗口打开
- [ ] 关闭 Workspace
- [ ] ✅ 应用不退出
- [ ] 点击 Dock 图标
- [ ] ✅ Launcher 显示

### 测试 4：多次操作
- [ ] 打开 Create → 取消
- [ ] 点击 Dock → Launcher 显示
- [ ] 打开 VaultAuth → 取消
- [ ] 点击 Dock → Launcher 显示
- [ ] ✅ 所有操作流畅，无退出

## 注意事项

### Launcher 永远不会被销毁
使用这个方案，Launcher 窗口在应用运行期间永远不会被销毁（除非用户手动关闭它）。这是设计的一部分，确保应用始终有一个"主"窗口。

### 内存使用
隐藏的 Launcher 窗口仍然占用内存，但这是可接受的，因为：
1. Launcher 是一个简单的窗口
2. 它是应用的核心入口点
3. 避免了频繁创建/销毁窗口的开销

### 用户手动关闭 Launcher
如果用户手动关闭 Launcher（点击关闭按钮），窗口会被销毁。这种情况下：
- 如果有 vault 窗口 → 应用继续运行
- 如果没有 vault 窗口 → 应用退出
- 点击 Dock 图标 → 创建新的 Launcher

## 相关文件

- `components/Launcher.tsx` - Launcher 组件
- `src-tauri/src/main.rs` - Reopen 事件处理
- `WINDOW_CLOSE_BEHAVIOR.md` - 窗口关闭行为
- `DOCK_BEHAVIOR_SOLUTION.md` - Dock 图标行为
