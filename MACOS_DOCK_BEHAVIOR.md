# macOS Dock Icon Click Behavior

## 改进说明

### 问题
之前点击 macOS Dock 图标时，总是显示 Launcher 窗口，即使有 Vault 窗口打开。

### 解决方案
修改了 `RunEvent::Reopen` 事件处理逻辑，实现智能窗口优先级。

## 新的行为

### 点击 Dock 图标时的优先级

1. **优先显示 Vault 窗口**
   - 如果有任何 `vault-*` 窗口（`vault-auth` 或 `vault-workspace`）
   - 显示并聚焦第一个找到的 vault 窗口

2. **备选显示 Launcher**
   - 如果没有 vault 窗口
   - 显示或创建 Launcher 窗口（`main`）

## 代码实现

```rust
tauri::RunEvent::Reopen { .. } => {
    // Priority order when clicking dock icon:
    // 1. Show any vault-related windows (vault-auth, vault-workspace)
    // 2. Fall back to launcher (main) if no vault windows exist
    
    let mut found_vault_window = false;
    
    // Check for vault windows first
    for (label, window) in app_handle.webview_windows() {
        if label.starts_with("vault-") {
            let _ = window.show();
            let _ = window.set_focus();
            found_vault_window = true;
            break; // Show the first vault window found
        }
    }
    
    // If no vault windows, show or create launcher
    if !found_vault_window {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        } else {
            let window = create_main_window(app_handle, "index.html");
            let _ = window.show();
        }
    }
}
```

## 用户场景

### 场景 1：有 Vault 窗口打开
```
用户状态：
- Vault Workspace 窗口已打开但被隐藏/最小化
- Launcher 窗口可能也存在

用户操作：
- 点击 Dock 图标

结果：
✅ Vault Workspace 窗口显示并获得焦点
✅ Launcher 保持隐藏
```

### 场景 2：只有 Launcher
```
用户状态：
- 只有 Launcher 窗口
- 没有打开任何 vault

用户操作：
- 点击 Dock 图标

结果：
✅ Launcher 窗口显示并获得焦点
```

### 场景 3：所有窗口都关闭
```
用户状态：
- 所有窗口都已关闭
- 应用仍在 Dock 中运行

用户操作：
- 点击 Dock 图标

结果：
✅ 创建并显示新的 Launcher 窗口
```

### 场景 4：多个 Vault 窗口
```
用户状态：
- 有多个 vault 窗口（例如 vault-auth-1, vault-workspace-2）

用户操作：
- 点击 Dock 图标

结果：
✅ 显示第一个找到的 vault 窗口
✅ 其他 vault 窗口保持当前状态
```

## 窗口标签命名约定

为了让这个逻辑正常工作，vault 相关窗口必须使用以下命名：

- `vault-auth-{vaultId}` - Vault 解锁窗口
- `vault-workspace-{vaultId}` - Vault 工作区窗口
- `main` - Launcher 窗口

任何以 `vault-` 开头的窗口都会被识别为 vault 窗口。

## 技术细节

### 窗口遍历
```rust
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        // 找到 vault 窗口
    }
}
```

### 优先级逻辑
- 使用 `found_vault_window` 标志追踪是否找到 vault 窗口
- 找到第一个 vault 窗口后立即 `break`
- 只有在没有找到 vault 窗口时才处理 launcher

### macOS 特定行为
这个改进只影响 macOS 的 Dock 图标点击行为（`RunEvent::Reopen`）。
其他平台的行为保持不变。

## 相关代码位置

- **文件**: `src-tauri/src/main.rs`
- **行数**: 457-485
- **事件**: `tauri::RunEvent::Reopen`

## 测试场景

- [x] 点击 Dock 图标时，有 vault 窗口 → 显示 vault
- [x] 点击 Dock 图标时，只有 launcher → 显示 launcher
- [x] 点击 Dock 图标时，所有窗口关闭 → 创建 launcher
- [x] 点击 Dock 图标时，多个 vault 窗口 → 显示第一个
- [x] Vault 窗口最小化后点击 Dock → 恢复 vault 窗口
- [x] Vault 窗口隐藏后点击 Dock → 显示 vault 窗口

## 用户体验改进

✅ **更符合直觉**
- 用户打开 vault 后，点击 Dock 图标会回到 vault，而不是 launcher

✅ **工作流更流畅**
- 不需要手动切换窗口
- Vault 窗口始终优先

✅ **保持 macOS 标准行为**
- 符合 macOS 应用的常见行为模式
- Dock 图标点击恢复应用的主要工作窗口
