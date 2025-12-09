# Touch ID Integration Fix

## 问题

Touch ID 按钮不显示，即使：
- Touch ID 在设置中已启用
- 设备支持生物识别
- 用户之前已经用密码解锁过（应该有保存的密码）

## 根本原因

### 代码问题
```typescript
// ❌ 错误的代码
if (path && available) {
    const hasSaved = await biometricService.hasStoredPassword(path);
    setHasSavedPassword(hasSaved); // 异步设置 state
}

// 使用旧的 state 值（还没更新）
const willShow = available && enabled && hasSavedPassword && !!path;
```

**问题**：
- `setHasSavedPassword(hasSaved)` 是异步的
- `willShow` 计算时使用的是**旧的** `hasSavedPassword` state 值
- 导致条件判断错误

## 解决方案

### 使用局部变量
```typescript
// ✅ 正确的代码
let hasSaved = false;
if (path && available) {
    hasSaved = await biometricService.hasStoredPassword(path);
    setHasSavedPassword(hasSaved); // 更新 state（用于渲染）
}

// 使用刚获取的值
const willShow = available && enabled && hasSaved && !!path;
```

**改进**：
- 使用局部变量 `hasSaved` 存储最新值
- 立即用于条件判断
- 同时更新 state 用于组件渲染

## Touch ID 工作流程

### 1. 首次解锁（保存密码）
```
用户输入密码
    ↓
解锁成功
    ↓
检查：Touch ID 启用？
    ↓
    ├─ 是 → 保存密码到 Keychain
    │         biometricService.storePassword(path, password)
    │
    └─ 否 → 不保存
```

### 2. 后续解锁（显示 Touch ID 按钮）
```
打开 VaultAuth 窗口
    ↓
useEffect 触发（path 改变）
    ↓
检查条件：
    ├─ biometricService.isAvailable() → 设备支持？
    ├─ settings.security.quickUnlockTouchId → 设置启用？
    ├─ biometricService.hasStoredPassword(path) → 有保存密码？
    └─ path 存在？
    ↓
所有条件满足 → 显示 Touch ID 按钮
```

### 3. Touch ID 解锁
```
用户点击 "Unlock with Touch ID"
    ↓
biometricService.authenticate() → 弹出 Touch ID 提示
    ↓
用户验证（指纹/Face ID）
    ↓
验证成功
    ↓
biometricService.getPassword(path) → 从 Keychain 获取密码
    ↓
addVault(path, savedPassword) → 解锁 vault
    ↓
成功！
```

## Touch ID 按钮显示条件

```typescript
{biometricAvailable && touchIdEnabled && hasSavedPassword && path && (
    <button onClick={handleTouchIdUnlock}>
        <Fingerprint size={16} />
        Unlock with Touch ID
    </button>
)}
```

**所有条件必须满足**：
1. ✅ `biometricAvailable` - 设备支持生物识别
2. ✅ `touchIdEnabled` - 设置中启用了 Touch ID
3. ✅ `hasSavedPassword` - Keychain 中有保存的密码
4. ✅ `path` - 有数据库路径

## 代码位置

### VaultAuthForm.tsx
```typescript
// 第 45-83 行：检查 Touch ID 可用性
useEffect(() => {
    const checkBiometric = async () => {
        const available = await biometricService.isAvailable();
        const enabled = settings.security?.quickUnlockTouchId ?? false;
        
        let hasSaved = false;
        if (path && available) {
            hasSaved = await biometricService.hasStoredPassword(path);
            setHasSavedPassword(hasSaved);
        }
        
        // 使用最新的 hasSaved 值
        const willShow = available && enabled && hasSaved && !!path;
    };
    checkBiometric();
}, [path]);

// 第 110-116 行：保存密码
if (touchIdEnabled && biometricAvailable && path && password) {
    await biometricService.storePassword(path, password);
}

// 第 125-163 行：Touch ID 解锁
const handleTouchIdUnlock = async () => {
    const authenticated = await biometricService.authenticate();
    if (authenticated) {
        const savedPassword = await biometricService.getPassword(path);
        await addVault(path, savedPassword);
    }
};

// 第 392-407 行：Touch ID 按钮
{biometricAvailable && touchIdEnabled && hasSavedPassword && path && (
    <button onClick={handleTouchIdUnlock}>
        Unlock with Touch ID
    </button>
)}
```

## 生物识别服务 API

### `biometricService.isAvailable()`
检查设备是否支持生物识别（Touch ID / Face ID）

### `biometricService.storePassword(path, password)`
将密码保存到 macOS Keychain
- `path` - 数据库文件路径（用作 Keychain 的 key）
- `password` - 要保存的密码

### `biometricService.hasStoredPassword(path)`
检查 Keychain 中是否有保存的密码

### `biometricService.authenticate(reason)`
弹出生物识别提示
- `reason` - 显示给用户的原因（如 "Unlock database.kdbx"）
- 返回 `true` 如果验证成功

### `biometricService.getPassword(path)`
从 Keychain 获取保存的密码
- 需要先通过 `authenticate()` 验证

## 设置界面

### SettingsWindow.tsx
```typescript
<SettingToggle
    label="Quick Unlock (Touch ID)"
    description="Use Touch ID or Apple Watch to unlock"
    checked={settings.security.quickUnlockTouchId}
    onChange={(v) => updateSetting('security', 'quickUnlockTouchId', v)}
/>
```

## 调试日志

代码中包含详细的调试日志：
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /path/to/database.kdbx
Touch ID Debug - Available: true
Touch ID Debug - Enabled in settings: true
Touch ID Debug - Has saved password for /path/to/database.kdbx : true
Touch ID Debug - Button will show: true
Touch ID Debug - Conditions: {
  available: true,
  enabled: true,
  hasSavedPassword: true,
  hasPath: true
}
=== Touch ID Debug End ===
```

## 测试场景

### 场景 1：首次使用 Touch ID
```
1. 启用 Touch ID（Settings）
2. 用密码解锁数据库
   → ✅ 密码保存到 Keychain
3. 关闭 vault
4. 重新打开数据库
   → ✅ Touch ID 按钮显示
5. 点击 Touch ID 按钮
   → ✅ 弹出生物识别提示
6. 验证成功
   → ✅ 自动解锁
```

### 场景 2：禁用 Touch ID
```
1. 禁用 Touch ID（Settings）
2. 打开数据库
   → ✅ Touch ID 按钮不显示
   → ✅ 只显示密码输入
```

### 场景 3：设备不支持
```
1. 在不支持生物识别的设备上
2. 打开数据库
   → ✅ Touch ID 按钮不显示
   → ✅ 只显示密码输入
```

### 场景 4：没有保存密码
```
1. 启用 Touch ID
2. 打开新数据库（从未解锁过）
   → ✅ Touch ID 按钮不显示
3. 用密码解锁
   → ✅ 密码保存
4. 下次打开
   → ✅ Touch ID 按钮显示
```

## 安全考虑

### Keychain 存储
- 密码存储在 macOS Keychain 中
- 受系统级加密保护
- 需要生物识别验证才能访问

### 双重验证
1. 系统级：macOS 生物识别验证
2. 应用级：检查 Keychain 中的密码

### 密码更新
如果用户更改数据库密码：
- 旧密码仍在 Keychain 中
- 下次 Touch ID 解锁会失败
- 用户需要用新密码解锁
- 新密码会覆盖 Keychain 中的旧密码

## 相关文件

- `components/VaultAuthForm.tsx` - Touch ID UI 和逻辑
- `services/biometricService.ts` - 生物识别服务
- `components/SettingsWindow.tsx` - Touch ID 设置
- `src-tauri/src/biometric.rs` - Rust 生物识别实现

## 注意事项

### macOS 专用
Touch ID 功能只在 macOS 上可用，需要：
- macOS 10.12.2 或更高版本
- 支持 Touch ID 的 Mac
- 或配对的 Apple Watch

### 首次解锁
用户必须至少用密码成功解锁一次，才能使用 Touch ID。

### 多个数据库
每个数据库的密码单独存储，使用文件路径作为 key。
