# Updated Dock Icon Click Behavior

## 新的逻辑

### 场景 1：Vault 窗口存在（即使隐藏）
**行为**：
1. 显示 Launcher（如果存在）→ 作为背景
2. 显示所有 Vault 窗口 → 在 Launcher 之上
3. 聚焦最后一个 Vault 窗口

**代码流程**：
```rust
if !vault_windows.is_empty() {
    // 1. 先显示 launcher（背景层）
    if let Some(launcher) = app_handle.get_webview_window("main") {
        let _ = launcher.show();
    }
    
    // 2. 然后显示所有 vault 窗口（前景层）
    for vault_window in vault_windows {
        let _ = vault_window.show();
        let _ = vault_window.set_focus();
    }
}
```

### 场景 2：Vault 窗口不存在（已关闭）
**行为**：
1. 显示或创建 Launcher
2. 聚焦 Launcher

**代码流程**：
```rust
else {
    // 没有 vault 窗口 - 显示 launcher
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let window = create_main_window(app_handle, "index.html");
        let _ = window.show();
    }
}
```

## 关键改进

### 1. 收集所有 Vault 窗口
```rust
let mut vault_windows = Vec::new();

for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        vault_windows.push(window);
    }
}
```
- 不再只显示第一个找到的窗口
- 收集所有 vault 相关窗口

### 2. 确保窗口层级
```rust
// 先显示 launcher（背景）
launcher.show();

// 后显示 vault 窗口（前景）
for vault_window in vault_windows {
    vault_window.show();
    vault_window.set_focus();
}
```
- Launcher 在底层
- Vault 窗口在顶层
- 正确的 Z-order

### 3. 显示所有 Vault 窗口
```rust
for vault_window in vault_windows {
    let _ = vault_window.show();
    let _ = vault_window.set_focus();
}
```
- 显示所有 vault 窗口（可能有多个）
- 每个窗口都调用 `show()` 和 `set_focus()`

## 用户场景

### 场景 A：打开了 Vault，隐藏了窗口
```
初始状态：
- vault-workspace-123 存在但隐藏
- main (launcher) 存在但隐藏

用户操作：
- 点击 Dock 图标

结果：
✅ Launcher 显示（背景）
✅ Vault Workspace 显示（前景）
✅ Vault Workspace 获得焦点
```

### 场景 B：打开了多个 Vault
```
初始状态：
- vault-workspace-123 存在但隐藏
- vault-auth-456 存在但隐藏
- main (launcher) 存在但隐藏

用户操作：
- 点击 Dock 图标

结果：
✅ Launcher 显示（背景）
✅ vault-workspace-123 显示
✅ vault-auth-456 显示并获得焦点
✅ 所有 vault 窗口在 Launcher 之上
```

### 场景 C：关闭了所有 Vault
```
初始状态：
- 没有 vault 窗口
- main (launcher) 存在但隐藏

用户操作：
- 点击 Dock 图标

结果：
✅ Launcher 显示并获得焦点
❌ 不会尝试打开 vault 窗口
```

### 场景 D：完全关闭了应用
```
初始状态：
- 没有任何窗口
- 应用在 Dock 中

用户操作：
- 点击 Dock 图标

结果：
✅ 创建新的 Launcher 窗口
✅ Launcher 显示并获得焦点
```

## 窗口层级示意图

### 有 Vault 窗口时
```
┌─────────────────────────────────┐
│  Vault Workspace (前景)         │  ← 焦点在这里
│  ┌───────────────────────────┐  │
│  │ Vault Auth (前景)         │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Launcher (背景)           │  │
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 没有 Vault 窗口时
```
┌─────────────────────────────────┐
│  Launcher (前景)                │  ← 焦点在这里
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

## 与之前的对比

### 之前的逻辑
```rust
// ❌ 只显示第一个 vault 窗口
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        window.show();
        window.set_focus();
        break; // ❌ 只处理第一个
    }
}
```

**问题**：
- 只显示第一个找到的 vault 窗口
- 其他 vault 窗口保持隐藏
- 没有确保窗口层级

### 现在的逻辑
```rust
// ✅ 收集所有 vault 窗口
let mut vault_windows = Vec::new();
for (label, window) in app_handle.webview_windows() {
    if label.starts_with("vault-") {
        vault_windows.push(window);
    }
}

// ✅ 显示所有窗口，确保层级
if !vault_windows.is_empty() {
    launcher.show(); // 背景
    for vault_window in vault_windows {
        vault_window.show(); // 前景
    }
}
```

**改进**：
- ✅ 显示所有 vault 窗口
- ✅ 确保正确的窗口层级
- ✅ Vault 窗口始终在 Launcher 之上

## 技术细节

### 窗口收集
```rust
let mut vault_windows = Vec::new();
```
- 使用 `Vec` 存储所有 vault 窗口引用
- 允许后续遍历和操作

### 窗口显示顺序
```rust
// 1. 先显示 launcher
launcher.show();

// 2. 后显示 vault 窗口
for vault_window in vault_windows {
    vault_window.show();
}
```
- 显示顺序决定 Z-order
- 后显示的窗口在上层

### 焦点管理
```rust
for vault_window in vault_windows {
    vault_window.show();
    vault_window.set_focus(); // 每个窗口都获得焦点
}
```
- 最后一个窗口会保持焦点
- 所有窗口都会被激活

## 代码位置

- **文件**: `src-tauri/src/main.rs`
- **行数**: 457-493
- **事件**: `tauri::RunEvent::Reopen`

## 测试清单

- [x] 有 vault 窗口时点击 Dock → 显示所有 vault 窗口
- [x] 有 vault 窗口时点击 Dock → Vault 在 Launcher 之上
- [x] 没有 vault 窗口时点击 Dock → 显示 Launcher
- [x] 多个 vault 窗口都被显示
- [x] 窗口层级正确
- [x] 焦点在 vault 窗口上
- [x] Launcher 作为背景显示

## 用户体验改进

✅ **更符合直觉**
- 有 vault 时，vault 窗口优先
- 没有 vault 时，显示 launcher

✅ **更好的窗口管理**
- 所有相关窗口都被显示
- 正确的窗口层级

✅ **更流畅的工作流**
- 一次点击显示所有需要的窗口
- 不需要手动切换
