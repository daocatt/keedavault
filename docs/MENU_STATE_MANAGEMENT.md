# 菜单状态管理更新

## 📋 问题

macOS 顶部菜单栏的 "Database" 菜单项在数据库锁定/解锁时没有正确启用/禁用。

**需求**:
- ✅ 数据库解锁时：启用所有菜单项
- ✅ 数据库锁定时：禁用大部分菜单项
- ✅ Password Generator：**始终启用**（无论锁定状态）

## 🔧 解决方案

### 1. Frontend - 发送事件

**文件**: `context/VaultContext.tsx`

#### 解锁事件
```typescript
// 在 addVault 函数中，解锁成功后
emit('vault-unlocked').catch(console.error);
addToast({ title: "Vault unlocked successfully", type: "success" });
```

#### 锁定事件
```typescript
// 在 lockVault 函数中
emit('vault-locked').catch(console.error);
```

### 2. Backend - 监听事件并更新菜单

**文件**: `src-tauri/src/main.rs`

#### 事件监听器
```rust
// 在 setup 函数中添加
let app_handle_unlock = app.handle().clone();
app.listen("vault-unlocked", move |_event| {
    set_database_menu_state(app_handle_unlock.clone(), true);
});

let app_handle_lock = app.handle().clone();
app.listen("vault-locked", move |_event| {
    set_database_menu_state(app_handle_lock.clone(), false);
});
```

#### 菜单状态更新函数
```rust
fn set_database_menu_state(app_handle: tauri::AppHandle, unlocked: bool) {
    #[cfg(target_os = "macos")]
    {
        if let Some(menu) = app_handle.menu() {
            let items = menu.items().unwrap_or_default();
            for item in items {
                if let tauri::menu::MenuItemKind::Submenu(submenu) = item {
                    let text = submenu.text().unwrap_or_default();
                    if text == "Database" {
                        // Items to enable/disable based on vault state
                        // Note: password_generator is NOT in this list
                        let db_items = [
                            "create_entry",
                            "lock_database",
                            "change_credentials",
                            "database_setting",
                        ];
                        for id in db_items {
                            if let Some(db_item) = submenu.get(id) {
                                if let tauri::menu::MenuItemKind::MenuItem(i) = db_item {
                                    let _ = i.set_enabled(unlocked);
                                }
                            }
                        }
                        return;
                    }
                }
            }
        }
    }
}
```

## 📊 菜单项状态

### Database 菜单

| 菜单项 | 锁定时 | 解锁时 |
|--------|--------|--------|
| Password Generator | ✅ 启用 | ✅ 启用 |
| Create Entry | ❌ 禁用 | ✅ 启用 |
| Lock Database | ❌ 禁用 | ✅ 启用 |
| Change Credentials | ❌ 禁用 | ✅ 启用 |
| Database Settings | ❌ 禁用 | ✅ 启用 |

### 关键设计

**Password Generator 始终启用**:
- 不在 `db_items` 数组中
- 用户可以随时生成密码
- 不需要数据库解锁

**其他菜单项根据状态切换**:
- 需要访问数据库内容
- 只在解锁时可用

## 🔄 事件流程

### 解锁流程

```
用户输入密码
    ↓
VaultContext.addVault()
    ↓
数据库解锁成功
    ↓
emit('vault-unlocked') ← Frontend 发送事件
    ↓
Rust 监听器接收事件
    ↓
set_database_menu_state(true) ← Backend 更新菜单
    ↓
启用菜单项:
  - Create Entry ✅
  - Lock Database ✅
  - Change Credentials ✅
  - Database Settings ✅
  - Password Generator ✅ (保持启用)
```

### 锁定流程

```
用户点击 Lock Database
    ↓
VaultContext.lockVault()
    ↓
emit('vault-locked') ← Frontend 发送事件
    ↓
Rust 监听器接收事件
    ↓
set_database_menu_state(false) ← Backend 更新菜单
    ↓
禁用菜单项:
  - Create Entry ❌
  - Lock Database ❌
  - Change Credentials ❌
  - Database Settings ❌
  - Password Generator ✅ (保持启用)
```

## 🧪 测试步骤

### 测试 1: 解锁状态

1. 启动应用
2. 打开数据库
3. 输入密码解锁
4. 检查菜单栏 → Database
5. **预期**: 所有菜单项都启用 ✅

### 测试 2: 锁定状态

1. 在解锁状态下
2. 点击 Database → Lock Database
3. 检查菜单栏 → Database
4. **预期**: 
   - Password Generator ✅ 启用
   - 其他菜单项 ❌ 禁用

### 测试 3: Password Generator 始终可用

1. 在锁定状态下
2. 点击 Database → Password Generator
3. **预期**: 密码生成器窗口打开 ✅

### 测试 4: 重新解锁

1. 在锁定状态下
2. 重新打开数据库
3. 输入密码解锁
4. 检查菜单栏 → Database
5. **预期**: 所有菜单项再次启用 ✅

## 🔍 调试

### 查看事件发送

在浏览器控制台：
```javascript
// 解锁时应该看到
emit('vault-unlocked')

// 锁定时应该看到
emit('vault-locked')
```

### 查看菜单更新

在 Rust 日志中（如果添加了日志）：
```rust
println!("Setting database menu state: {}", unlocked);
```

## 📝 代码位置

### Frontend
- **事件发送**: `context/VaultContext.tsx`
  - 第 577 行: `emit('vault-unlocked')`
  - 第 868 行: `emit('vault-locked')`

### Backend
- **事件监听**: `src-tauri/src/main.rs`
  - 第 730-737 行: 事件监听器
- **菜单更新**: `src-tauri/src/main.rs`
  - 第 63-91 行: `set_database_menu_state` 函数

## ✅ 总结

**已实现**:
- ✅ 数据库解锁时启用菜单项
- ✅ 数据库锁定时禁用菜单项
- ✅ Password Generator 始终启用
- ✅ 自动响应锁定/解锁状态

**用户体验**:
- 🎯 菜单状态与数据库状态同步
- 🔒 锁定时防止误操作
- 🔓 解锁时恢复所有功能
- 🔑 随时可以生成密码

**技术实现**:
- 📡 使用 Tauri 事件系统
- 🔄 实时双向通信
- 🎨 原生 macOS 菜单 API
- ⚡ 即时响应状态变化
