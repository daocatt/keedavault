# Tauri 事件监听器错误修复

## 🐛 错误信息

```
Unhandled Promise Rejection: TypeError: undefined is not an object 
(evaluating 'listeners[eventId].handlerId')
```

## 🔍 原因分析

### 问题代码

```rust
// ❌ 错误：没有保存监听器 ID
app_handle.listen("vault-unlocked", move |_event| {
    set_database_menu_state(app_handle_unlock.clone(), true);
});
```

### 为什么会出错？

**Tauri 事件监听器机制**:
1. `listen()` 返回一个 `EventId`
2. 这个 ID 用于管理监听器的生命周期
3. 如果 ID 被丢弃，监听器会被自动清理
4. 但事件系统仍然保留了对它的引用
5. 当事件触发时，尝试访问已清理的监听器 → 错误

**类比**:
```
想象一个电话簿:
1. 你注册了一个电话号码 (listen)
2. 电话簿给你一个 ID
3. 你把 ID 扔掉了 (没有保存)
4. 电话簿删除了你的号码
5. 有人打电话给你 → 找不到号码 → 错误
```

## ✅ 解决方案

### 修复代码

```rust
// ✅ 正确：保存监听器 ID
let _unlock_listener = app_handle.listen("vault-unlocked", move |_event| {
    set_database_menu_state(app_handle_unlock.clone(), true);
});

let _lock_listener = app_handle.listen("vault-locked", move |_event| {
    set_database_menu_state(app_handle_lock.clone(), false);
});
```

### 为什么这样可以？

**使用 `_` 前缀的变量**:
- `_unlock_listener` 和 `_lock_listener` 保存了 ID
- `_` 前缀告诉 Rust "我知道这个变量没被使用"
- 但变量仍然存在，直到作用域结束
- 监听器保持活跃状态

**生命周期**:
```rust
fn setup() {
    let _listener = app.listen("event", handler);
    // _listener 在这里有效
    // 监听器保持活跃
} // _listener 在这里被销毁
  // 监听器被自动清理
```

## 📊 对比

### 错误方式

```rust
// ❌ 返回值被丢弃
app_handle.listen("vault-unlocked", move |_event| {
    // ...
});
// 监听器 ID 立即被丢弃
// 监听器被清理
// 事件触发时 → 错误
```

### 正确方式

```rust
// ✅ 返回值被保存
let _unlock_listener = app_handle.listen("vault-unlocked", move |_event| {
    // ...
});
// 监听器 ID 被保存
// 监听器保持活跃
// 事件触发时 → 正常工作
```

## 🔧 最佳实践

### 1. 总是保存监听器 ID

```rust
// ✅ 好
let _listener = app.listen("event", handler);

// ❌ 坏
app.listen("event", handler);
```

### 2. 使用有意义的变量名

```rust
// ✅ 清晰
let _unlock_listener = app.listen("vault-unlocked", handler);
let _lock_listener = app.listen("vault-locked", handler);

// ⚠️ 可以，但不够清晰
let _listener1 = app.listen("vault-unlocked", handler);
let _listener2 = app.listen("vault-locked", handler);
```

### 3. 如果需要取消监听

```rust
// 保存 ID（不用 _ 前缀）
let unlock_listener = app.listen("vault-unlocked", handler);

// 稍后取消监听
app.unlisten(unlock_listener);
```

### 4. 全局监听器

如果监听器需要在整个应用生命周期中存在：

```rust
// 在 setup 中注册
fn setup(app: &mut App) {
    let _unlock_listener = app.handle().listen("vault-unlocked", handler);
    let _lock_listener = app.handle().listen("vault-locked", handler);
    
    // 这些监听器会一直存在，直到应用关闭
    Ok(())
}
```

## 🎓 深入理解

### Rust 的所有权系统

**为什么需要保存 ID？**

```rust
// listen() 的简化实现
fn listen<F>(event: &str, handler: F) -> EventId 
where F: Fn(Event) + 'static 
{
    let id = generate_id();
    register_handler(id, handler);
    EventId(id)  // 返回 ID
}

// EventId 的 Drop 实现
impl Drop for EventId {
    fn drop(&mut self) {
        unregister_handler(self.0);  // 清理监听器
    }
}
```

**流程**:
```
1. listen() 创建 EventId
2. 如果不保存 → EventId 立即被 drop
3. Drop 触发 → 监听器被清理
4. 事件触发 → 找不到监听器 → 错误

1. listen() 创建 EventId
2. 保存到变量 → EventId 保持存活
3. 监听器保持注册状态
4. 事件触发 → 找到监听器 → 正常工作
```

### Tauri 事件系统

**内部结构**:
```rust
struct EventManager {
    listeners: HashMap<EventId, Box<dyn Fn(Event)>>,
}

impl EventManager {
    fn register(&mut self, id: EventId, handler: Box<dyn Fn(Event)>) {
        self.listeners.insert(id, handler);
    }
    
    fn unregister(&mut self, id: EventId) {
        self.listeners.remove(&id);
    }
    
    fn emit(&self, event: Event) {
        if let Some(handler) = self.listeners.get(&event.id) {
            handler(event);  // 如果 ID 不存在 → 错误
        }
    }
}
```

## 🧪 测试

### 验证修复

1. **重启应用**
   ```bash
   npm run tauri dev
   ```

2. **打开数据库**
   - 应该不再出现错误

3. **测试菜单状态**
   - 解锁数据库 → 菜单项启用
   - 锁定数据库 → 菜单项禁用

4. **查看控制台**
   - 应该没有错误信息

## 📝 相关错误

### 类似的错误模式

```rust
// ❌ 错误：没有保存定时器
set_interval(|| {
    println!("tick");
}, 1000);

// ✅ 正确：保存定时器
let _timer = set_interval(|| {
    println!("tick");
}, 1000);
```

```rust
// ❌ 错误：没有保存窗口监听器
window.listen("close", |_| {
    println!("closing");
});

// ✅ 正确：保存监听器
let _close_listener = window.listen("close", |_| {
    println!("closing");
});
```

## ✅ 总结

**问题**: 事件监听器 ID 被丢弃，导致监听器被清理

**原因**: Rust 的所有权系统自动清理未使用的值

**解决**: 保存监听器 ID 到变量（即使不使用）

**最佳实践**:
```rust
// ✅ 总是这样做
let _listener = app.listen("event", handler);

// ❌ 永远不要这样做
app.listen("event", handler);
```

**修改文件**:
- `src-tauri/src/main.rs` - 保存事件监听器 ID

**效果**:
- ✅ 不再出现 "undefined is not an object" 错误
- ✅ 菜单状态正常更新
- ✅ 事件系统正常工作
