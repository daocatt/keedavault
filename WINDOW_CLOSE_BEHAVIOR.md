# Window Close Behavior - All Windows Destroy

## 改变

### 之前的行为
- Vault 窗口：关闭时销毁
- Launcher 窗口：关闭时隐藏（`hide()`）

### 现在的行为
- **所有窗口**：关闭时销毁

## 代码修改

### CloseRequested 事件处理
```rust
tauri::RunEvent::WindowEvent { label, event, .. } => {
    if let tauri::WindowEvent::CloseRequested { api: _, .. } = event {
        // Let all windows close normally (destroy)
        // This allows the app to quit when all windows are closed
        // or stay in dock if there are other windows still open
    }
}
```

**效果**：
- 点击任何窗口的关闭按钮 → 窗口被销毁
- 不调用 `prevent_close()`
- 不调用 `hide()`

## 应用生命周期

### 场景 1：关闭所有窗口
```
用户关闭所有窗口
    ↓
所有窗口对象被销毁
    ↓
应用退出（因为没有窗口了）
```

### 场景 2：关闭部分窗口
```
用户关闭 Launcher
    ↓
Launcher 窗口被销毁
    ↓
Vault 窗口仍然存在
    ↓
应用继续运行
```

### 场景 3：点击 Dock 图标（所有窗口已关闭）
```
所有窗口已关闭
    ↓
应用已退出
    ↓
点击 Dock 图标
    ↓
应用重新启动
    ↓
创建新的 Launcher 窗口
```

## Reopen 事件逻辑

### 简化的逻辑
```rust
tauri::RunEvent::Reopen { .. } => {
    let mut vault_windows = Vec::new();
    
    // 收集所有 vault 窗口
    for (label, window) in app_handle.webview_windows() {
        if label.starts_with("vault-") {
            vault_windows.push(window);
        }
    }
    
    if !vault_windows.is_empty() {
        // 有 vault 窗口 - 显示它们
        if let Some(launcher) = app_handle.get_webview_window("main") {
            let _ = launcher.show();
        }
        for vault_window in vault_windows {
            let _ = vault_window.show();
            let _ = vault_window.set_focus();
        }
    } else {
        // 没有 vault 窗口 - 显示或创建 launcher
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        } else {
            // Launcher 不存在，创建新的
            let window = create_main_window(app_handle, "index.html");
            let _ = window.show();
        }
    }
}
```

## 用户场景

### 场景 A：关闭 Vault 窗口
```
初始状态：
- Vault 窗口打开
- Launcher 窗口打开

用户操作：
- 点击 Vault 窗口的关闭按钮

结果：
✅ Vault 窗口被销毁
✅ Launcher 窗口仍然存在
✅ 应用继续运行
```

### 场景 B：关闭 Launcher 窗口
```
初始状态：
- Launcher 窗口打开
- 没有 Vault 窗口

用户操作：
- 点击 Launcher 窗口的关闭按钮

结果：
✅ Launcher 窗口被销毁
✅ 没有其他窗口
✅ 应用退出
```

### 场景 C：关闭所有窗口后点击 Dock
```
初始状态：
- 所有窗口已关闭
- 应用已退出

用户操作：
- 点击 Dock 图标

结果：
✅ 应用重新启动
✅ 创建新的 Launcher 窗口
✅ Launcher 显示
```

### 场景 D：Vault 打开时点击 Dock
```
初始状态：
- Vault 窗口存在但被遮挡
- Launcher 窗口不存在（已关闭）

用户操作：
- 点击 Dock 图标

结果：
✅ Vault 窗口显示并获得焦点
✅ 应用继续运行
```

## 与 macOS 标准行为对比

### 标准 macOS 应用
- 关闭所有窗口 → 应用退出
- 点击 Dock 图标 → 应用重新启动

### KeedaVault（现在）
- 关闭所有窗口 → 应用退出 ✅
- 点击 Dock 图标 → 应用重新启动 ✅
- 关闭部分窗口 → 应用继续运行 ✅

## 优势

### ✅ 符合 macOS 标准
- 关闭窗口 = 销毁窗口
- 关闭所有窗口 = 应用退出

### ✅ 简单的逻辑
- 不需要区分窗口类型
- 不需要 `hide()` 逻辑

### ✅ 资源管理
- 关闭的窗口立即释放资源
- 没有隐藏的窗口占用内存

### ✅ 用户预期
- 点击关闭按钮 = 窗口真正关闭
- 符合用户对 macOS 应用的预期

## 注意事项

### 应用退出
如果用户关闭所有窗口，应用会退出。这是标准的 macOS 行为。

### 数据保存
确保在窗口关闭前保存所有数据，因为窗口会被销毁。

### Dock 图标
即使应用退出，Dock 图标仍然存在（如果应用在 Dock 中）。点击图标会重新启动应用。

## 替代方案

如果你希望应用在关闭所有窗口后仍然运行（像 menubar 应用），需要：

1. 改变激活策略：
```rust
app.set_activation_policy(tauri::ActivationPolicy::Accessory);
```

2. 或者保持一个隐藏的窗口：
```rust
// 在 CloseRequested 中
if label == "main" {
    window.hide();
    api.prevent_close();
} else {
    // 其他窗口正常关闭
}
```

但当前的实现（所有窗口都销毁）是最符合标准 macOS 应用行为的。
