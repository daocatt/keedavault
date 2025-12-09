# Touch ID 调试指南

## 检查清单

请按以下步骤检查 Touch ID 为什么不显示：

### 1. 检查浏览器控制台

打开浏览器开发者工具（Cmd+Option+I），查看控制台输出。

应该看到类似这样的日志：
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /path/to/your/database.kdbx
Touch ID Debug - Path type: string
Touch ID Debug - Available: true/false
Touch ID Debug - Enabled in settings: true/false
Touch ID Debug - Has saved password for /path/to/database.kdbx : true/false
Touch ID Debug - Button will show: true/false
Touch ID Debug - Conditions: {
  available: true/false,
  enabled: true/false,
  hasSavedPassword: true/false,
  hasPath: true/false
}
=== Touch ID Debug End ===
```

### 2. 检查每个条件

Touch ID 按钮需要**所有**条件都为 `true`：

#### 条件 1: `available` - 设备支持
```
Touch ID Debug - Available: true
```

**如果为 false**：
- 你的 Mac 不支持 Touch ID
- 或者 LocalAuthentication 框架不可用

**解决方法**：
- 确认你的 Mac 有 Touch ID
- 或者配对了 Apple Watch

#### 条件 2: `enabled` - 设置启用
```
Touch ID Debug - Enabled in settings: true
```

**如果为 false**：
- Touch ID 在设置中未启用

**解决方法**：
1. 打开 Settings 窗口（菜单 → Settings）
2. 找到 "Quick Unlock (Touch ID)"
3. 打开开关

#### 条件 3: `hasSavedPassword` - 有保存的密码
```
Touch ID Debug - Has saved password for /path/to/database.kdbx : true
```

**如果为 false**：
- 这个数据库从未用密码解锁过
- 或者上次解锁时 Touch ID 未启用

**解决方法**：
1. 确保 Touch ID 在设置中已启用
2. 用密码解锁数据库一次
3. 密码会自动保存到 Keychain
4. 下次打开就会显示 Touch ID 按钮

#### 条件 4: `hasPath` - 有文件路径
```
Touch ID Debug - Path value: /path/to/database.kdbx
```

**如果为 null 或 undefined**：
- 数据库文件没有路径（可能是浏览器模式）

**解决方法**：
- 使用 Tauri 文件选择器打开数据库
- 不要使用浏览器的文件输入

### 3. 常见问题

#### 问题：所有条件都是 true，但按钮还是不显示

**检查**：
```typescript
// 在 VaultAuthForm.tsx 第 392 行
{biometricAvailable && touchIdEnabled && hasSavedPassword && path && (
    <button>Unlock with Touch ID</button>
)}
```

**可能原因**：
- React 状态没有更新
- 组件没有重新渲染

**解决方法**：
- 重启开发服务器
- 刷新页面

#### 问题：第一次解锁后密码没有保存

**检查控制台**：
```
Failed to save password for Touch ID: ...
```

**可能原因**：
- Keychain 访问被拒绝
- Rust 命令失败

**解决方法**：
- 检查 macOS 系统设置 → 隐私与安全性
- 允许应用访问 Keychain

#### 问题：Touch ID 验证失败

**检查控制台**：
```
Touch ID: Authentication failed or cancelled
```

**可能原因**：
- 用户取消了验证
- 指纹识别失败
- Touch ID 被禁用

**解决方法**：
- 重试
- 检查系统设置 → Touch ID

### 4. 手动测试步骤

#### 测试 1：检查设备支持
```javascript
// 在浏览器控制台运行
const { invoke } = window.__TAURI__.core;
invoke('check_biometric_available').then(console.log);
// 应该返回 true
```

#### 测试 2：检查设置
```javascript
// 在浏览器控制台运行
const { getUISettings } = await import('./services/uiSettingsService');
const settings = await getUISettings();
console.log(settings.security?.quickUnlockTouchId);
// 应该返回 true
```

#### 测试 3：检查保存的密码
```javascript
// 在浏览器控制台运行
const { invoke } = window.__TAURI__.core;
const path = '/path/to/your/database.kdbx'; // 替换为实际路径
invoke('secure_has_password', { vaultPath: path }).then(console.log);
// 应该返回 true（如果之前保存过）
```

#### 测试 4：手动保存密码
```javascript
// 在浏览器控制台运行
const { invoke } = window.__TAURI__.core;
const path = '/path/to/your/database.kdbx';
const password = 'your-password';
await invoke('secure_store_password', { vaultPath: path, password });
console.log('Password saved!');
```

### 5. 完整的工作流程

#### 首次设置 Touch ID
```
1. 打开 Settings
2. 启用 "Quick Unlock (Touch ID)"
3. 关闭 Settings
4. 打开数据库
5. 输入密码
6. 点击 "Unlock Vault"
   → 密码自动保存到 Keychain
7. 关闭 vault
8. 重新打开数据库
   → Touch ID 按钮应该显示
```

#### 使用 Touch ID 解锁
```
1. 打开数据库
2. 看到 Touch ID 按钮
3. 点击 "Unlock with Touch ID"
4. Touch ID 提示出现
5. 验证指纹
6. 自动解锁
```

### 6. 调试命令

如果需要重置 Touch ID 设置：

```javascript
// 删除保存的密码
const { invoke } = window.__TAURI__.core;
const path = '/path/to/your/database.kdbx';
await invoke('secure_delete_password', { vaultPath: path });

// 禁用 Touch ID
const { updateSetting } = await import('./services/uiSettingsService');
await updateSetting('security', 'quickUnlockTouchId', false);
```

### 7. 预期的日志输出

#### 成功的情况
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /Users/user/Documents/database.kdbx
Touch ID Debug - Path type: string
Touch ID Debug - Available: true
Touch ID Debug - Enabled in settings: true
Touch ID Debug - Checking for saved password...
Touch ID Debug - Has saved password for /Users/user/Documents/database.kdbx : true
Touch ID Debug - Button will show: true
Touch ID Debug - Conditions: {
  available: true,
  enabled: true,
  hasSavedPassword: true,
  hasPath: true
}
=== Touch ID Debug End ===
```

#### 失败的情况（设备不支持）
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /Users/user/Documents/database.kdbx
Touch ID Debug - Path type: string
Touch ID Debug - Available: false  ← 问题在这里
Touch ID Debug - Enabled in settings: true
Touch ID Debug - Skipping password check. Path: /Users/user/Documents/database.kdbx Available: false
Touch ID Debug - Button will show: false
Touch ID Debug - Conditions: {
  available: false,
  enabled: true,
  hasSavedPassword: false,
  hasPath: true
}
=== Touch ID Debug End ===
```

#### 失败的情况（未启用）
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /Users/user/Documents/database.kdbx
Touch ID Debug - Path type: string
Touch ID Debug - Available: true
Touch ID Debug - Enabled in settings: false  ← 问题在这里
Touch ID Debug - Checking for saved password...
Touch ID Debug - Has saved password for /Users/user/Documents/database.kdbx : true
Touch ID Debug - Button will show: false
Touch ID Debug - Conditions: {
  available: true,
  enabled: false,
  hasSavedPassword: true,
  hasPath: true
}
=== Touch ID Debug End ===
```

#### 失败的情况（无保存密码）
```
=== Touch ID Debug Start ===
Touch ID Debug - Path value: /Users/user/Documents/database.kdbx
Touch ID Debug - Path type: string
Touch ID Debug - Available: true
Touch ID Debug - Enabled in settings: true
Touch ID Debug - Checking for saved password...
Touch ID Debug - Has saved password for /Users/user/Documents/database.kdbx : false  ← 问题在这里
Touch ID Debug - Button will show: false
Touch ID Debug - Conditions: {
  available: true,
  enabled: true,
  hasSavedPassword: false,
  hasPath: true
}
=== Touch ID Debug End ===
```

## 下一步

请：
1. 打开浏览器控制台
2. 打开一个数据库
3. 复制完整的 "Touch ID Debug" 日志
4. 告诉我输出的内容

这样我可以准确知道哪个条件失败了。
