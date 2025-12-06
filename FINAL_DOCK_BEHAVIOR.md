# Final Dock Icon Behavior Fix

## 问题分析

### 之前的问题
代码检查窗口是否**存在**，而不是是否**可见**：
```rust
// ❌ 错误：只检查窗口是否存在
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        vault_windows.push(window); // 即使窗口隐藏也会收集
    }
}
```

**导致的问题**：
- 用户关闭 vault 窗口（窗口隐藏但对象仍存在）
- 点击 Dock 图标
- 系统认为有 vault 窗口，尝试显示
- 但窗口实际上已经被用户关闭

### 正确的逻辑
应该检查窗口是否**可见**：
```rust
// ✅ 正确：检查窗口是否可见
if let Ok(is_visible) = window.is_visible() {
    if is_visible {
        visible_vault_windows.push(window);
    }
}
```

## 最终解决方案

### 完整代码
```rust
tauri::RunEvent::Reopen { .. } => {
    let mut visible_vault_windows = Vec::new();
    
    // 收集所有可见的 vault 窗口
    for (label, window) in app_handle.webview_windows() {
        if label.starts_with("vault-") {
            if let Ok(is_visible) = window.is_visible() {
                if is_visible {
                    visible_vault_windows.push(window);
                }
            }
        }
    }
    
    if !visible_vault_windows.is_empty() {
        // 有可见的 vault 窗口 - 显示它们在 launcher 之上
        
        // 1. 先显示 launcher（背景）
        if let Some(launcher) = app_handle.get_webview_window("main") {
            let _ = launcher.show();
        }
        
        // 2. 然后显示所有 vault 窗口（前景）
        for vault_window in visible_vault_windows {
            let _ = vault_window.show();
            let _ = vault_window.set_focus();
        }
    } else {
        // 没有可见的 vault 窗口 - 只显示 launcher
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

### 场景 1：关闭 Vault 窗口后点击 Dock
```
初始状态：
- vault-workspace-123 存在但不可见（用户已关闭）
- main (launcher) 存在但不可见

用户操作：
- 点击 Dock 图标

检查流程：
1. 遍历所有窗口
2. 找到 vault-workspace-123
3. 检查 is_visible() → false
4. 不添加到 visible_vault_windows
5. visible_vault_windows.is_empty() → true

结果：
✅ 只显示 Launcher
✅ 不尝试显示已关闭的 vault 窗口
```

### 场景 2：Vault 窗口被其他应用遮挡
```
初始状态：
- vault-workspace-123 可见但被其他应用遮挡
- main (launcher) 存在但不可见

用户操作：
- 点击 Dock 图标

检查流程：
1. 遍历所有窗口
2. 找到 vault-workspace-123
3. 检查 is_visible() → true
4. 添加到 visible_vault_windows
5. visible_vault_windows.is_empty() → false

结果：
✅ 显示 Launcher（背景）
✅ 显示 Vault Workspace（前景）
✅ Vault 窗口在 Launcher 之上
✅ Vault 窗口获得焦点
```

### 场景 3：多个 Vault 窗口，部分可见
```
初始状态：
- vault-workspace-123 可见
- vault-auth-456 不可见（已关闭）
- main (launcher) 不可见

用户操作：
- 点击 Dock 图标

检查流程：
1. 遍历所有窗口
2. vault-workspace-123: is_visible() → true ✅
3. vault-auth-456: is_visible() → false ❌
4. visible_vault_windows = [vault-workspace-123]

结果：
✅ 显示 Launcher（背景）
✅ 显示 vault-workspace-123（前景）
✅ 不显示 vault-auth-456（因为不可见）
```

### 场景 4：所有窗口都关闭
```
初始状态：
- 所有窗口都不可见或不存在
- 应用在 Dock 中运行

用户操作：
- 点击 Dock 图标

检查流程：
1. 遍历所有窗口
2. 没有可见的 vault 窗口
3. visible_vault_windows.is_empty() → true

结果：
✅ 创建并显示新的 Launcher
✅ Launcher 获得焦点
```

## 关键 API

### `window.is_visible()`
```rust
if let Ok(is_visible) = window.is_visible() {
    if is_visible {
        // 窗口可见
    }
}
```

**返回值**：
- `Ok(true)` - 窗口可见
- `Ok(false)` - 窗口存在但不可见（隐藏/最小化）
- `Err(_)` - 检查失败

**重要性**：
- 区分窗口**存在**和窗口**可见**
- 用户关闭窗口时，窗口对象可能仍存在但不可见
- 必须检查可见性才能正确判断用户意图

## 窗口状态对比

| 状态 | 窗口对象存在 | is_visible() | 应该显示 |
|------|-------------|--------------|----------|
| 打开并可见 | ✅ | true | ✅ |
| 打开但被遮挡 | ✅ | true | ✅ |
| 最小化 | ✅ | false | ❌ |
| 用户关闭 | ✅ | false | ❌ |
| 完全销毁 | ❌ | N/A | ❌ |

## 决策流程图

```
点击 Dock 图标
    ↓
遍历所有窗口
    ↓
    ├─ vault-* 窗口？
    │   ↓
    │   检查 is_visible()
    │   ↓
    │   ├─ true → 添加到 visible_vault_windows
    │   └─ false → 跳过
    │
    └─ 其他窗口 → 跳过
    ↓
visible_vault_windows 是否为空？
    ↓
    ├─ 不为空
    │   ↓
    │   1. 显示 Launcher（背景）
    │   2. 显示所有可见的 vault 窗口（前景）
    │   3. 聚焦最后一个 vault 窗口
    │
    └─ 为空
        ↓
        1. 显示或创建 Launcher
        2. 聚焦 Launcher
```

## 与之前版本的对比

### 版本 1（最初）
```rust
// ❌ 只显示第一个找到的窗口
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        window.show();
        break;
    }
}
```
**问题**：只显示一个窗口

### 版本 2（第一次改进）
```rust
// ❌ 显示所有存在的窗口（不检查可见性）
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        vault_windows.push(window);
    }
}
```
**问题**：包含已关闭的窗口

### 版本 3（最终）
```rust
// ✅ 只显示可见的窗口
if let Ok(is_visible) = window.is_visible() {
    if is_visible {
        visible_vault_windows.push(window);
    }
}
```
**正确**：只处理用户可见的窗口

## 代码位置

- **文件**: `src-tauri/src/main.rs`
- **行数**: 457-495
- **事件**: `tauri::RunEvent::Reopen`

## 测试清单

- [x] 关闭 vault 窗口后点击 Dock → 只显示 Launcher
- [x] Vault 被遮挡时点击 Dock → 显示 Vault 在 Launcher 之上
- [x] 多个 vault 窗口部分可见 → 只显示可见的
- [x] 所有窗口关闭 → 创建 Launcher
- [x] Vault 窗口获得焦点
- [x] 窗口层级正确

## 用户体验

✅ **符合预期**
- 关闭窗口后不会自动重新打开
- 只显示用户实际打开的窗口

✅ **正确的窗口管理**
- 检查窗口可见性，不仅仅是存在性
- 尊重用户的窗口关闭操作

✅ **流畅的工作流**
- 有 vault 时优先显示 vault
- 没有 vault 时显示 launcher
- 窗口层级始终正确
