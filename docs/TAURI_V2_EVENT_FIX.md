# Tauri v2 事件监听修复

## 问题

编译错误：
```
error[E0599]: no method named `listen` found for mutable reference `&mut tauri::App`
```

## 原因

在 Tauri v2 中，`listen` 方法在 `AppHandle` 上，而不是在 `App` 上。

## 解决方案

### 错误代码 ❌

```rust
// 在 setup 函数中
let app_handle_unlock = app.handle().clone();
app.listen("vault-unlocked", move |_event| {  // ❌ 错误：app 没有 listen 方法
    set_database_menu_state(app_handle_unlock.clone(), true);
});
```

### 正确代码 ✅

```rust
// 在 setup 函数中
let app_handle = app.handle().clone();  // 先获取 AppHandle
let app_handle_unlock = app_handle.clone();
app_handle.listen("vault-unlocked", move |_event| {  // ✅ 正确：使用 app_handle
    set_database_menu_state(app_handle_unlock.clone(), true);
});

let app_handle_lock = app_handle.clone();
app_handle.listen("vault-locked", move |_event| {
    set_database_menu_state(app_handle_lock.clone(), false);
});
```

## Tauri v2 API 变化

### App vs AppHandle

| 方法 | App | AppHandle |
|------|-----|-----------|
| `listen()` | ❌ | ✅ |
| `emit()` | ❌ | ✅ |
| `get_window()` | ❌ | ✅ |
| `menu()` | ❌ | ✅ |
| `handle()` | ✅ | N/A |

### 使用模式

```rust
.setup(|app| {
    // 获取 AppHandle
    let app_handle = app.handle().clone();
    
    // 使用 AppHandle 进行操作
    app_handle.listen("event-name", move |event| {
        // 处理事件
    });
    
    Ok(())
})
```

## 完整示例

```rust
.setup(|app| {
    // ... 其他设置代码 ...
    
    // 监听事件
    let app_handle = app.handle().clone();
    
    // 解锁事件
    let unlock_handle = app_handle.clone();
    app_handle.listen("vault-unlocked", move |_event| {
        set_database_menu_state(unlock_handle.clone(), true);
    });
    
    // 锁定事件
    let lock_handle = app_handle.clone();
    app_handle.listen("vault-locked", move |_event| {
        set_database_menu_state(lock_handle.clone(), false);
    });
    
    Ok(())
})
```

## 验证

编译应该成功：

```bash
cd src-tauri
cargo build
```

或者直接运行：

```bash
npm run dev
```

## 相关文档

- [Tauri v2 Event System](https://v2.tauri.app/develop/calling-rust/#events)
- [Tauri v2 Migration Guide](https://v2.tauri.app/develop/migrate/)

## 总结

✅ **已修复**：使用 `app.handle()` 获取 `AppHandle` 后调用 `listen()`  
✅ **兼容**：符合 Tauri v2 API 规范  
✅ **功能**：菜单状态管理正常工作
