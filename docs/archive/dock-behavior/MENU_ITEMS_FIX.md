# Menu Items Fix - Always Show Windows

## 问题

当 vault 窗口打开时，菜单项不工作：
- About
- Settings  
- Open Database
- Create Database
- Launcher
- Password Generator

## 根本原因

### 之前的代码
```rust
if let Some(window) = app_handle.get_webview_window("main") {
    let _ = window.set_focus(); // ❌ 只聚焦，不显示
} else {
    let _window = create_main_window(...); // ❌ 创建但不显示
}
```

**问题**：
1. 如果窗口存在但隐藏 → 只调用 `set_focus()` 不会显示窗口
2. 如果窗口不存在 → 创建窗口但 `visible(false)` 且不调用 `show()`

## 解决方案

### 修复后的代码
```rust
if let Some(window) = app_handle.get_webview_window("main") {
    let _ = window.show();      // ✅ 显示窗口
    let _ = window.set_focus(); // ✅ 聚焦窗口
} else {
    let window = create_main_window(...); // ✅ 创建窗口
    let _ = window.show();                 // ✅ 显示窗口
}
```

**改进**：
1. 窗口存在 → 显示并聚焦
2. 窗口不存在 → 创建并显示

## 修复的菜单项

### 1. Open Vault (open_vault)
```rust
if let Some(window) = app_handle.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("open-file-picker", ());
} else {
    let window = create_main_window(app_handle, "/?action=browse");
    let _ = window.show();
}
```

### 2. Create Vault (create_vault)
```rust
if let Some(window) = app_handle.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("create-new-vault", ());
} else {
    let window = create_main_window(app_handle, "/?action=create");
    let _ = window.show();
}
```

### 3. Launcher (open_launcher)
```rust
if let Some(window) = app_handle.get_webview_window("main") {
    let _ = window.show();
    let _ = window.set_focus();
} else {
    let window = create_main_window(app_handle, "index.html");
    let _ = window.show();
}
```

### 4. About (about)
```rust
if let Some(window) = app_handle.get_webview_window("about") {
    let _ = window.show();
    let _ = window.set_focus();
} else {
    let window = tauri::WebviewWindowBuilder::new(...)
        .visible(false)
        .build()
        .unwrap();
    let _ = window.show();
}
```

### 5. Settings (settings)
```rust
if let Some(window) = app_handle.get_webview_window("settings") {
    let _ = window.show();
    let _ = window.set_focus();
} else {
    let window = tauri::WebviewWindowBuilder::new(...)
        .visible(false)
        .build()
        .unwrap();
    let _ = window.show();
}
```

### 6. Password Generator (password_generator)
```rust
if let Some(window) = app_handle.get_webview_window("password-generator") {
    let _ = window.show();
    let _ = window.set_focus();
} else {
    let window = tauri::WebviewWindowBuilder::new(...)
        .visible(false)
        .build()
        .unwrap();
    let _ = window.show();
}
```

## 为什么窗口初始为 visible(false)

窗口创建时设置为 `visible(false)` 是为了：
1. 避免白屏闪烁
2. 让前端代码有机会应用主题
3. 前端准备好后调用 `show()`

但菜单事件处理中，我们需要在创建后立即显示窗口。

## 测试场景

### 场景 1：窗口已打开但隐藏
```
初始状态：
- Settings 窗口存在但隐藏

用户操作：
- 点击菜单 Settings

之前：
❌ 窗口保持隐藏（只调用 set_focus）

现在：
✅ 窗口显示并获得焦点
```

### 场景 2：窗口已关闭（销毁）
```
初始状态：
- Settings 窗口不存在（已关闭）

用户操作：
- 点击菜单 Settings

之前：
❌ 创建窗口但不显示

现在：
✅ 创建窗口并显示
```

### 场景 3：Vault 窗口打开时
```
初始状态：
- Vault 窗口打开
- Launcher 窗口已关闭

用户操作：
- 点击菜单 Open Database

之前：
❌ 创建 Launcher 但不显示

现在：
✅ 创建 Launcher 并显示
✅ Launcher 在 Vault 之上（或之下，取决于窗口层级）
```

## 代码位置

- **文件**: `src-tauri/src/main.rs`
- **函数**: `app.on_menu_event()`
- **行数**: ~287-400

## 修改的菜单项

| 菜单项 | 窗口 ID | 修改 |
|--------|---------|------|
| Open Vault | main | ✅ 添加 show() |
| Create Vault | main | ✅ 添加 show() |
| Launcher | main | ✅ 添加 show() |
| About | about | ✅ 添加 show() |
| Settings | settings | ✅ 添加 show() |
| Password Generator | password-generator | ✅ 添加 show() |

## 测试清单

- [ ] 打开 vault 后点击 About → 显示 About 窗口
- [ ] 打开 vault 后点击 Settings → 显示 Settings 窗口
- [ ] 打开 vault 后点击 Open Database → 显示 Launcher
- [ ] 打开 vault 后点击 Create Database → 显示 Launcher
- [ ] 打开 vault 后点击 Launcher → 显示 Launcher
- [ ] 打开 vault 后点击 Password Generator → 显示 Password Generator
- [ ] 关闭窗口后再次点击菜单 → 重新创建并显示
- [ ] 隐藏窗口后点击菜单 → 显示窗口

## 注意事项

### 窗口层级
当多个窗口打开时，新显示的窗口可能会在其他窗口之上或之下，取决于：
1. 窗口创建顺序
2. 窗口类型
3. macOS 窗口管理

### 焦点管理
- `show()` - 显示窗口
- `set_focus()` - 聚焦窗口并将其带到前台

两者都调用确保窗口既可见又在前台。

## 相关修复

这个修复与窗口关闭行为修复相关：
- 窗口关闭时被销毁（不是隐藏）
- 菜单项需要能够重新创建并显示窗口
- 参考：`WINDOW_CLOSE_BEHAVIOR.md`
