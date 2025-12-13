# KeedaVault 重构实施计划

## 🎯 总体目标

将现有的 keedavault (React + Tauri + kdbxweb) 重构为：
- **keedavault-core**: Rust 核心库（跨平台业务逻辑）
- **keedavault-app**: 新应用（Desktop Tauri + iOS SwiftUI）

## 📅 实施阶段

### Phase 0: 准备阶段 (1-2 天)
**目标**: 搭建基础设施，确保开发环境就绪

#### Step 0.1: 创建 keedavault-core 项目 ✅ **已完成**
- [x] 创建目录 `/Users/mengdoo/codes/keedavault-core`
- [x] 初始化 Rust 项目: `cargo init --lib`
- [x] 配置 `Cargo.toml` 基础依赖（使用 keepass-rs 0.8）
- [x] 创建基本目录结构
- [x] 编写 README.md
- [x] 创建核心模块文件（vault, entry, group, error, crypto, totp, search）
- [x] 实现基础数据结构和占位符函数
- [x] 所有测试通过 (9/9)
- [x] Git 提交

**产出**: ✅ 可编译的 Rust 库，基础结构完整

**完成时间**: 2025-12-14

#### Step 0.2: 创建 keedavault-app 项目
- [ ] 创建目录 `/Users/mengdoo/codes/keedavault-app`
- [ ] 创建 Workspace `Cargo.toml`
- [ ] 创建 `desktop/` 和 `ios/` 子目录
- [ ] 编写 README.md

**产出**: Workspace 骨架

#### Step 0.3: 环境验证
- [ ] 验证 Rust 工具链: `rustc --version` (需要 1.70+)
- [ ] 验证 Tauri CLI: `cargo install tauri-cli`
- [ ] 验证 iOS 工具链: `xcodebuild -version`
- [ ] 安装 iOS 编译目标: `rustup target add aarch64-apple-ios x86_64-apple-ios`

---

### Phase 1: Core 库基础 (1 周)
**目标**: 实现 KDBX 文件的基本读写功能

#### Step 1.1: 依赖选型与集成
- [ ] 研究 `keepass` crate (https://crates.io/crates/keepass)
- [ ] 添加核心依赖到 `Cargo.toml`:
  - `keepass` - KDBX 解析
  - `argon2` - KDF
  - `chacha20poly1305` - 加密
  - `aes` - AES 加密
  - `thiserror` - 错误处理
  - `serde` - 序列化
- [ ] 编写简单的测试验证依赖可用

**产出**: 依赖配置完成，测试通过

#### Step 1.2: 核心数据结构设计
- [ ] 定义 `Vault` 结构体
- [ ] 定义 `Entry` 结构体
- [ ] 定义 `Group` 结构体
- [ ] 定义 `VaultConfig` (KDF 参数等)
- [ ] 定义错误类型 `VaultError`

**文件**: `src/vault.rs`, `src/entry.rs`, `src/group.rs`, `src/error.rs`

**产出**: 类型系统设计完成

#### Step 1.3: 实现 Vault 基础操作
- [ ] `Vault::open(path, password)` - 打开数据库
- [ ] `Vault::create(path, password, config)` - 创建新数据库
- [ ] `Vault::save()` - 保存数据库
- [ ] `Vault::lock()` - 锁定数据库
- [ ] 编写单元测试

**产出**: 可以打开/创建/保存 KDBX 文件

#### Step 1.4: 实现 Entry/Group CRUD
- [ ] `Vault::get_entries()` - 获取所有条目
- [ ] `Vault::get_entry(id)` - 获取单个条目
- [ ] `Vault::add_entry(entry)` - 添加条目
- [ ] `Vault::update_entry(id, entry)` - 更新条目
- [ ] `Vault::delete_entry(id)` - 删除条目
- [ ] Group 相关操作
- [ ] 编写集成测试

**产出**: 完整的 CRUD 功能

#### Step 1.5: 测试与文档
- [ ] 使用现有的 `.kdbx` 文件测试兼容性
- [ ] 编写 API 文档 (`cargo doc`)
- [ ] 创建 `docs/refactoring/core-api.md`

**产出**: 稳定的 Core v0.1.0

---

### Phase 2: Desktop 集成 (1 周)
**目标**: 用 Tauri 包装 Core，实现桌面端基础功能

#### Step 2.1: 初始化 Tauri 项目
- [ ] 在 `keedavault-app/` 下创建 Tauri 项目
  ```bash
  cd /Users/mengdoo/codes/keedavault-app
  npm create tauri-app@latest desktop
  ```
- [ ] 选择: React + TypeScript
- [ ] 配置 `desktop/src-tauri/Cargo.toml` 依赖 `keedavault-core`

**产出**: 可运行的 Tauri Hello World

#### Step 2.2: 实现 Tauri Commands
- [ ] `unlock_vault(path, password)` → `VaultHandle`
- [ ] `create_vault(path, password, config)`
- [ ] `lock_vault(handle)`
- [ ] `get_entries(handle)` → `Vec<Entry>`
- [ ] `add_entry(handle, entry)`
- [ ] `update_entry(handle, id, entry)`
- [ ] `delete_entry(handle, id)`

**文件**: `desktop/src-tauri/src/commands/vault.rs`

**产出**: 前端可以通过 `invoke()` 调用 Core

#### Step 2.3: 状态管理
- [ ] 设计 `AppState` 管理多个打开的 Vault
- [ ] 实现 `VaultHandle` (UUID 或递增 ID)
- [ ] 使用 `Arc<Mutex<HashMap<VaultHandle, Vault>>>` 管理状态
- [ ] 处理并发访问

**产出**: 支持同时打开多个数据库

#### Step 2.4: 前端适配
- [ ] 从 `keedavault/src` 复制 React 组件到 `desktop/src`
- [ ] 替换 `kdbxweb` 调用为 `invoke('unlock_vault', ...)`
- [ ] 适配类型定义 (TypeScript)
- [ ] 测试基本流程: 打开 → 查看 → 编辑 → 保存

**产出**: 可用的桌面端 MVP

#### Step 2.5: 跨平台构建测试
- [ ] macOS 本地构建: `npm run tauri build`
- [ ] 配置 GitHub Actions (Windows + Ubuntu)
- [ ] 验证三平台构建产物

**产出**: Desktop v0.1.0 (Mac/Win/Linux)

---

### Phase 3: iOS 集成 (2 周)
**目标**: 通过 UniFFI 将 Core 集成到 iOS

#### Step 3.1: UniFFI 配置
- [ ] 在 `keedavault-core` 添加 `uniffi` 依赖
- [ ] 创建 `uniffi/vault.udl` 定义接口
- [ ] 配置 `Cargo.toml`:
  ```toml
  [lib]
  crate-type = ["cdylib", "staticlib"]
  
  [features]
  uniffi = ["dep:uniffi"]
  ```
- [ ] 编写构建脚本 `build-ios.sh`

**产出**: 可以生成 Swift bindings

#### Step 3.2: 编译 XCFramework
- [ ] 编译 iOS 目标:
  ```bash
  cargo build --target aarch64-apple-ios --release --features uniffi
  cargo build --target x86_64-apple-ios --release --features uniffi
  ```
- [ ] 使用 `uniffi-bindgen` 生成 Swift 代码
- [ ] 打包成 `.xcframework`

**产出**: `keedavault_core.xcframework`

#### Step 3.3: 创建 Xcode 项目
- [ ] 创建 iOS App 项目
- [ ] 导入 `.xcframework`
- [ ] 添加生成的 Swift 文件
- [ ] 配置 Build Settings

**产出**: 可编译的 iOS 项目

#### Step 3.4: SwiftUI 界面开发
- [ ] 设计 MVVM 架构
- [ ] 实现 `VaultViewModel`
- [ ] 实现主要视图:
  - `UnlockView` - 解锁界面
  - `EntryListView` - 条目列表
  - `EntryDetailView` - 条目详情
  - `SettingsView` - 设置
- [ ] 集成 Face ID / Touch ID

**产出**: iOS MVP

#### Step 3.5: iOS 特性完善
- [ ] 文件选择器 (访问 .kdbx 文件)
- [ ] Keychain 集成 (存储主密码)
- [ ] 剪贴板管理 (自动清除)
- [ ] 后台锁定
- [ ] App Store 准备

**产出**: iOS v0.1.0

---

### Phase 4: 高级功能 (2-3 周)
**目标**: 实现完整功能集

#### Step 4.1: TOTP 支持
- [ ] 在 Core 实现 TOTP 生成
- [ ] Desktop 集成
- [ ] iOS 集成
- [ ] 测试与验证

#### Step 4.2: 搜索与过滤
- [ ] 全文搜索
- [ ] 标签过滤
- [ ] 收藏夹
- [ ] 最近使用

#### Step 4.3: 云同步 (可选)
- [ ] WebDAV 客户端
- [ ] 冲突解决策略
- [ ] 自动同步

#### Step 4.4: 安全加固
- [ ] 内存擦除 (`zeroize`)
- [ ] 密码强度检测
- [ ] 安全审计日志
- [ ] 自动锁定

---

### Phase 5: 测试与发布 (1 周)
**目标**: 确保质量，准备发布

#### Step 5.1: 测试
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 安全审计

#### Step 5.2: 文档
- [ ] 用户手册
- [ ] API 文档
- [ ] 开发者指南
- [ ] 迁移指南

#### Step 5.3: 发布
- [ ] Desktop: GitHub Releases
- [ ] iOS: TestFlight → App Store
- [ ] 发布公告

---

## 🚀 第一步执行清单

### Step 0.1: 创建 keedavault-core 项目

#### 任务清单
- [x] 创建目录 `/Users/mengdoo/codes/keedavault-core`
- [x] 初始化 Rust 库项目
- [x] 配置 `Cargo.toml` 基础依赖
- [x] 创建源码目录结构
- [x] 编写 README.md
- [x] 初始化 Git 仓库
- [x] 验证编译: `cargo build`
- [x] 验证测试: `cargo test`

#### 执行命令
```bash
# 1. 创建并初始化项目
cd /Users/mengdoo/codes
cargo new keedavault-core --lib

# 2. 进入项目
cd keedavault-core

# 3. 创建目录结构
mkdir -p src/{vault,crypto,entry,group,totp,search}
mkdir -p tests
mkdir -p benches
mkdir -p uniffi

# 4. 初始化 Git
git init
git add .
git commit -m "Initial commit: keedavault-core skeleton"

# 5. 验证
cargo build
cargo test
```

#### 预期产出
- ✅ 可编译的 Rust 库
- ✅ 基础目录结构
- ✅ Git 仓库初始化
- ✅ README 文档

---

## 📊 进度跟踪

| Phase | 状态 | 进度 | 开始日期 | 完成日期 | 备注 |
|-------|------|------|----------|----------|------|
| Phase 0 | 🟡 进行中 | 33% (1/3) | 2025-12-14 | - | Step 0.1 ✅ 已完成 |
| Phase 1 | ⚪ 未开始 | 0% | - | - | |
| Phase 2 | ⚪ 未开始 | 0% | - | - | |
| Phase 3 | ⚪ 未开始 | 0% | - | - | |
| Phase 4 | ⚪ 未开始 | 0% | - | - | |
| Phase 5 | ⚪ 未开始 | 0% | - | - | |

---

## 🎯 里程碑

- **M1**: Core v0.1.0 - 基础 KDBX 读写 (Phase 1 完成)
- **M2**: Desktop v0.1.0 - 桌面端 MVP (Phase 2 完成)
- **M3**: iOS v0.1.0 - iOS MVP (Phase 3 完成)
- **M4**: v1.0.0 - 功能完整版本 (Phase 4-5 完成)

---

## 📝 注意事项

1. **渐进式开发**: 每个 Phase 都要确保可运行、可测试
2. **文档先行**: 重要决策都要记录在 `docs/refactoring/`
3. **测试驱动**: 核心功能必须有测试覆盖
4. **兼容性**: 确保能打开现有的 `.kdbx` 文件
5. **安全第一**: 涉及密码学的代码要格外小心

---

## 🔗 相关文档

- [架构方案总览](./intro.md)
- [项目结构规划](./project-structure.md)
- [Core API 设计](./core-api.md) - 待创建
- [Desktop 集成指南](./desktop-integration.md) - 待创建
- [iOS 集成指南](./ios-integration.md) - 待创建
