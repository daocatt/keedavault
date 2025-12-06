# Dock Icon Behavior - Final Solution

## 问题定义

### "可见" 的定义
在 Tauri 中，`is_visible()` API 的含义：
- `true` = 窗口当前在屏幕上显示
- `false` = 窗口存在但不在屏幕上（隐藏、最小化、或被遮挡）

### 之前的问题
使用 `is_visible()` 无法区分：
1. **用户主动关闭窗口**（窗口被 hide()）
2. **窗口被其他应用遮挡**（窗口仍然"可见"但被遮挡）

## 最终解决方案

### 关键改变：Vault 窗口真正关闭

**修改 `CloseRequested` 事件处理**：
```rust
if label.starts_with("vault-") {
    // Vault 窗口：真正关闭（销毁窗口对象）
    // 不调用 prevent_close()
} else {
    // Launcher 和其他窗口：隐藏而不是关闭
    window.hide();
    api.prevent_close();
}
```

**效果**：
- ✅ 用户关闭 vault 窗口 → 窗口对象被销毁
- ✅ 用户关闭 launcher → 窗口被隐藏（应用继续运行）

### 简化 `Reopen` 逻辑

**现在只需检查窗口是否存在**：
```rust
let mut vault_windows = Vec::new();

for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        vault_windows.push(window); // 存在 = 用户打开了 vault
    }
}

if !vault_windows.is_empty() {
    // 有 vault 窗口 → 显示它们
} else {
    // 没有 vault 窗口 → 显示 launcher
}
```

**逻辑**：
- Vault 窗口存在 = 用户打开了 vault
- Vault 窗口不存在 = 用户关闭了 vault

## 完整的窗口生命周期

### Vault 窗口
```
创建窗口
    ↓
用户使用
    ↓
用户点击关闭按钮
    ↓
CloseRequested 事件
    ↓
不调用 prevent_close()
    ↓
窗口被销毁（对象不再存在）
```

### Launcher 窗口
```
创建窗口
    ↓
用户使用
    ↓
用户点击关闭按钮
    ↓
CloseRequested 事件
    ↓
调用 window.hide()
    ↓
调用 prevent_close()
    ↓
窗口被隐藏（对象仍然存在）
```

## 用户场景

### 场景 1：关闭 Vault 后点击 Dock
```
用户操作：
1. 打开 vault → vault 窗口创建
2. 点击 vault 窗口的关闭按钮
3. CloseRequested 触发 → 窗口被销毁
4. 点击 Dock 图标

检查流程：
- 遍历所有窗口
- 没有找到 vault-* 窗口
- vault_windows.is_empty() = true

结果：
✅ 只显示 Launcher
```

### 场景 2：Vault 被其他应用遮挡
```
用户操作：
1. 打开 vault → vault 窗口存在
2. 切换到其他应用 → vault 被遮挡
3. 点击 Dock 图标

检查流程：
- 遍历所有窗口
- 找到 vault-* 窗口（对象存在）
- vault_windows.is_empty() = false

结果：
✅ 显示 Launcher（背景）
✅ 显示 Vault（前景）
✅ Vault 获得焦点
```

### 场景 3：Vault 最小化
```
用户操作：
1. 打开 vault → vault 窗口存在
2. 最小化 vault 窗口
3. 点击 Dock 图标

检查流程：
- 遍历所有窗口
- 找到 vault-* 窗口（对象存在）
- vault_windows.is_empty() = false

结果：
✅ 显示 Launcher（背景）
✅ 显示 Vault（前景，从最小化恢复）
✅ Vault 获得焦点
```

## 代码修改

### 1. CloseRequested 事件（main.rs ~444-463）
```rust
if let tauri::WindowEvent::CloseRequested { api, .. } = event {
    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app_handle.get_webview_window(&label) {
            if label.starts_with("vault-") {
                // Vault 窗口：真正关闭
                // 不调用 prevent_close()
            } else {
                // 其他窗口：隐藏
                let _ = window.hide();
                api.prevent_close();
            }
        }
    }
}
```

### 2. Reopen 事件（main.rs ~464-505）
```rust
tauri::RunEvent::Reopen { .. } => {
    let mut vault_windows = Vec::new();
    
    // 收集所有 vault 窗口（存在 = 打开）
    for (label, window) in app_handle.webview_windows() {
        if label.starts_with("vault-") {
            vault_windows.push(window);
        }
    }
    
    if !vault_windows.is_empty() {
        // 有 vault → 显示它们在 launcher 之上
        launcher.show();
        for vault_window in vault_windows {
            vault_window.show();
            vault_window.set_focus();
        }
    } else {
        // 没有 vault → 只显示 launcher
        launcher.show();
        launcher.set_focus();
    }
}
```

## 窗口状态对比表

| 用户操作 | Vault 窗口对象 | Launcher 窗口对象 | Dock 点击结果 |
|---------|---------------|------------------|--------------|
| 关闭 vault | ❌ 销毁 | ✅ 隐藏 | 显示 Launcher |
| 关闭 launcher | N/A | ✅ 隐藏 | 显示 Launcher |
| Vault 被遮挡 | ✅ 存在 | ✅ 隐藏 | 显示 Vault + Launcher |
| Vault 最小化 | ✅ 存在 | ✅ 隐藏 | 显示 Vault + Launcher |
| 全部关闭 | ❌ 销毁 | ✅ 隐藏 | 显示 Launcher |

## 优势

### ✅ 清晰的语义
- 窗口存在 = 用户打开了
- 窗口不存在 = 用户关闭了

### ✅ 简单的逻辑
- 不需要检查 `is_visible()`
- 只需检查窗口是否存在

### ✅ 符合预期
- 关闭 vault → 不会重新打开
- 切换应用 → vault 仍然存在，可以恢复

### ✅ 资源管理
- 关闭的 vault 窗口被销毁，释放资源
- Launcher 保持隐藏，应用继续运行

## 测试清单

- [ ] 关闭 vault 后点击 Dock → 只显示 Launcher
- [ ] Vault 被遮挡时点击 Dock → 显示 Vault 在前
- [ ] Vault 最小化后点击 Dock → 恢复 Vault
- [ ] 关闭 Launcher 后点击 Dock → 显示 Launcher
- [ ] 多个 vault 窗口都被显示
- [ ] 窗口层级正确（Vault 在 Launcher 之上）
- [ ] 应用不会因为关闭窗口而退出

## 注意事项

### macOS 特定行为
这个逻辑只在 macOS 上生效（`#[cfg(target_os = "macos")]`）

### 窗口销毁
Vault 窗口被销毁后，相关的状态和数据也会丢失。确保在关闭前保存所有必要的数据。

### 应用退出
即使所有窗口都关闭，应用仍然在 Dock 中运行。用户需要通过菜单或 Cmd+Q 退出应用。
