# 数据库打开速度优化指南

## 🐌 为什么打开慢？

### 主要原因：密钥派生函数（KDF）

KDBX 数据库使用 **Argon2** 或 **AES-KDF** 来派生加密密钥。这是一个**故意设计的慢过程**，用于防止暴力破解攻击。

### KDF 参数影响

| 参数 | 影响 | 典型值 |
|------|------|--------|
| **Iterations** (迭代次数) | 越高越慢 | 1-100 |
| **Memory** (内存使用) | 越高越慢 | 64-1024 MB |
| **Parallelism** (并行度) | 影响 CPU 使用 | 1-4 |

### 典型打开时间

| KDF 设置 | 打开时间 | 安全性 |
|---------|---------|--------|
| **低** (1 iteration, 64MB) | ~0.5 秒 | ⚠️ 较低 |
| **中** (10 iterations, 128MB) | ~2-3 秒 | ✅ 适中 |
| **高** (60 iterations, 1024MB) | ~10-30 秒 | 🔒 很高 |
| **极高** (100+ iterations) | ~1 分钟+ | 🔐 极高 |

## 🔍 检查你的数据库设置

### 方法 1: 使用 KeePassXC 查看

1. 用 KeePassXC 打开数据库
2. Database → Database Settings → Security
3. 查看 "Transform rounds" 或 "Key derivation function"

### 方法 2: 在 KeedaVault 中查看（添加功能）

目前 KeedaVault 没有显示 KDF 参数的 UI，但可以在控制台查看：

```javascript
// 在浏览器控制台
const vault = /* 获取当前 vault */;
console.log('KDF:', vault.db.header.kdfParameters);
```

## ⚡ 优化建议

### 选项 1: 调整 KDF 参数（推荐）

**使用 KeePassXC**:
1. 打开数据库
2. Database → Database Settings → Security
3. 调整参数：
   - **Argon2**: 
     - Iterations: 10-20（默认）
     - Memory: 64-128 MB
     - Parallelism: 2
   - **AES-KDF**:
     - Transform rounds: 60,000-600,000

**平衡建议**:
```
个人使用: 
- Argon2: 10 iterations, 64 MB, 2 threads
- 打开时间: ~2-3 秒

高安全需求:
- Argon2: 60 iterations, 1024 MB, 4 threads
- 打开时间: ~10-30 秒
```

### 选项 2: 使用 Touch ID（已实现）

**优势**:
- 首次解锁: 正常速度（需要计算 KDF）
- 后续解锁: 几乎瞬间（使用保存的密码）

**启用方法**:
```
Settings → Security → Quick Unlock
☑ Enable Touch ID
```

### 选项 3: 保持数据库打开

**策略**:
- 不要频繁关闭数据库
- 使用自动锁定而不是关闭
- 锁定后用 Touch ID 快速解锁

## 🔬 性能分析

### KeedaVault 打开流程

```
1. 读取文件 (~10-50ms)
   ↓
2. 解析头部 (~5ms)
   ↓
3. KDF 计算 (~2-30秒) ← 最慢的部分
   ↓
4. 解密数据 (~50-200ms)
   ↓
5. 解析 XML (~100-500ms)
   ↓
6. 应用兼容性修复 (~10ms)
   ↓
7. 渲染 UI (~50ms)
```

**瓶颈**: KDF 计算占 90%+ 的时间

### 为什么 KDF 这么慢？

**设计目的**:
```
如果打开需要 3 秒:
- 合法用户: 等待 3 秒（可接受）
- 攻击者尝试 1000 个密码: 需要 3000 秒 = 50 分钟
- 攻击者尝试 100 万个密码: 需要 34 天

如果打开只需要 0.1 秒:
- 合法用户: 等待 0.1 秒（更快）
- 攻击者尝试 100 万个密码: 只需要 27 小时 ⚠️
```

**结论**: 慢是为了安全！

## 📊 不同数据库的对比

### 测试数据

| 数据库 | KDF | 参数 | 打开时间 |
|-------|-----|------|---------|
| vault-fast.kdbx | Argon2 | 1 iter, 64MB | 0.5s |
| vault-normal.kdbx | Argon2 | 10 iter, 128MB | 2-3s |
| vault-secure.kdbx | Argon2 | 60 iter, 1024MB | 10-30s |
| kpxc-test01.kdbx | Argon2 | ? iter, ? MB | ? s |

### 如何测试你的数据库

```javascript
// 在浏览器控制台
console.time('Database Open');
// 打开数据库
console.timeEnd('Database Open');
// 输出: Database Open: 2345.67ms
```

## 🛠️ 优化步骤

### 步骤 1: 确认当前设置

用 KeePassXC 打开 `kpxc-test01.kdbx`，查看 KDF 参数。

### 步骤 2: 调整参数（如果太高）

**如果是个人使用**:
```
Argon2:
- Iterations: 10
- Memory: 64 MB
- Parallelism: 2

预期打开时间: 2-3 秒
```

**如果是团队/重要数据**:
```
Argon2:
- Iterations: 20-30
- Memory: 128-256 MB
- Parallelism: 2

预期打开时间: 5-10 秒
```

### 步骤 3: 启用 Touch ID

在 KeedaVault 中启用 Touch ID，后续解锁会快很多。

### 步骤 4: 验证改进

重新打开数据库，测量时间。

## 💡 其他优化技巧

### 1. 减少数据库大小

**大数据库影响**:
- 更多的解密时间
- 更多的 XML 解析时间
- 更多的内存使用

**优化**:
- 删除不需要的条目
- 清理历史记录
- 移除大附件

### 2. 使用 SSD

**存储速度影响**:
- HDD: 读取 ~100 MB/s
- SSD: 读取 ~500 MB/s
- NVMe: 读取 ~3000 MB/s

虽然数据库文件小，但 SSD 的随机读取性能更好。

### 3. 关闭不必要的后台程序

**CPU 密集型任务**:
- KDF 计算需要大量 CPU
- 其他程序占用 CPU 会减慢速度

### 4. 使用本地存储

**云存储影响**:
- iCloud/Dropbox 可能需要先同步
- 网络延迟增加读取时间

**建议**:
- 本地存储: 最快
- 云存储 + 本地缓存: 较快
- 纯云存储: 较慢

## 🔍 调试慢速问题

### 添加性能日志

在 `context/VaultContext.tsx` 的 `addVault` 函数中添加：

```typescript
console.time('Total Unlock Time');

console.time('1. Read File');
const arrayBuffer = await file.arrayBuffer();
console.timeEnd('1. Read File');

console.time('2. KDF + Decrypt');
const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);
console.timeEnd('2. KDF + Decrypt');

console.time('3. Apply Fixes');
applyCompatibilityFixes(db);
console.timeEnd('3. Apply Fixes');

console.time('4. Parse Structure');
const parsedStructure = parseKdbxStructure(db);
console.timeEnd('4. Parse Structure');

console.timeEnd('Total Unlock Time');
```

### 预期输出

```
1. Read File: 15.23ms
2. KDF + Decrypt: 2345.67ms  ← 最慢
3. Apply Fixes: 8.45ms
4. Parse Structure: 123.45ms
Total Unlock Time: 2492.80ms
```

## 📝 推荐设置

### 个人使用（平衡）

```yaml
KDF: Argon2
Iterations: 10
Memory: 64 MB
Parallelism: 2
Encryption: ChaCha20

预期打开时间: 2-3 秒
安全性: ✅ 足够
```

### 高安全需求

```yaml
KDF: Argon2
Iterations: 30
Memory: 256 MB
Parallelism: 2
Encryption: ChaCha20

预期打开时间: 8-12 秒
安全性: 🔒 很高
```

### 快速访问（不推荐）

```yaml
KDF: Argon2
Iterations: 1
Memory: 64 MB
Parallelism: 1
Encryption: ChaCha20

预期打开时间: 0.5-1 秒
安全性: ⚠️ 较低
```

## ✅ 总结

**为什么慢**:
- KDF 计算是故意设计的慢过程
- 用于防止暴力破解
- 这是安全性的代价

**如何优化**:
1. ✅ 调整 KDF 参数（平衡安全和速度）
2. ✅ 使用 Touch ID（后续解锁快）
3. ✅ 保持数据库打开（减少解锁次数）
4. ✅ 使用 SSD 存储
5. ✅ 减少数据库大小

**推荐方案**:
- 首次打开: 接受 2-3 秒的等待（安全）
- 后续解锁: 使用 Touch ID（几乎瞬间）
- 不要过度降低 KDF 参数（影响安全性）

**检查你的数据库**:
用 KeePassXC 查看 `kpxc-test01.kdbx` 的 KDF 参数，如果 iterations > 60 或 memory > 512MB，可以考虑降低。
