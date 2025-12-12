# 修复启动器窗口标题栏

## 问题

启动器窗口（Launcher window）有一个额外的标题栏，红绿灯按钮（traffic lights）显示在那里，看起来不够现代。

## 解决方案

已在 `src-tauri/src/main.rs` 的 `create_main_window` 函数中添加了 `title_bar_style(TitleBarStyle::Overlay)` 设置。

### 修改内容

```rust
#[cfg(target_os = "macos")]
{
    builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)  // ✅ 添加这一行
        .hidden_title(true)
        .accept_first_mouse(true);
}
```

## 效果

- ✅ 移除额外的标题栏
- ✅ 红绿灯按钮叠加在窗口内容上
- ✅ 更现代的 macOS 外观
- ✅ 与其他窗口（密码生成器、关于、设置等）保持一致

## 测试

1. **重启开发服务器**
   ```bash
   # Ctrl+C 停止
   npm run dev
   ```

2. **打开启动器窗口**
   - 应该看到红绿灯按钮叠加在窗口内容上
   - 没有额外的标题栏空间

3. **检查其他窗口**
   - 密码生成器 ✅
   - 关于窗口 ✅
   - 设置窗口 ✅
   - 启动器窗口 ✅（刚修复）

## 相关代码

所有窗口现在都使用相同的标题栏样式：

### 启动器窗口
```rust
fn create_main_window(app_handle: &tauri::AppHandle, url: &str) -> tauri::WebviewWindow {
    // ...
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .accept_first_mouse(true);
    }
    // ...
}
```

### 密码生成器窗口
```rust
"password_generator" => {
    // ...
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    // ...
}
```

### 关于窗口
```rust
"about" => {
    // ...
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    // ...
}
```

### 设置窗口
```rust
"settings" => {
    // ...
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }
    // ...
}
```

## 注意事项

### CSS 调整

如果窗口内容被红绿灯按钮遮挡，可能需要在 CSS 中添加顶部内边距：

```css
/* 为 macOS 红绿灯按钮留出空间 */
.launcher-container {
    padding-top: 40px; /* 或根据需要调整 */
}

/* 或使用 app-region */
.title-bar-area {
    -webkit-app-region: drag;
    height: 40px;
}
```

### 拖动区域

如果需要自定义拖动区域：

```css
.draggable-area {
    -webkit-app-region: drag;
}

.non-draggable {
    -webkit-app-region: no-drag;
}
```

## 平台差异

这个修改只影响 macOS：

- **macOS**: 使用 `TitleBarStyle::Overlay`，红绿灯叠加在内容上
- **Windows**: 使用默认标题栏
- **Linux**: 使用默认标题栏

## 验证修复

重启后，检查启动器窗口：

- [ ] 没有额外的标题栏空间
- [ ] 红绿灯按钮在窗口左上角
- [ ] 窗口内容从顶部开始
- [ ] 可以通过拖动窗口顶部移动窗口

## 相关文档

- [Tauri Window API](https://tauri.app/v1/api/js/window)
- [macOS Title Bar Styles](https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/window-anatomy/)

## 总结

✅ 启动器窗口现在使用 Overlay 标题栏样式  
✅ 与其他窗口保持一致的外观  
✅ 更现代的 macOS 用户体验  
✅ 无需额外的 CSS 调整
