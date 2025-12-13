# KeedaVault 项目结构规划

## 📁 目录结构

```
/Users/mengdoo/codes/
├── keedavault/                    # 当前项目（保留作为参考）
│   ├── src/                       # 现有 React + Tauri 代码
│   ├── src-tauri/                 # 现有 Tauri Rust 代码
│   └── docs/
│       └── refactoring/           # 📝 重构文档中心
│           ├── intro.md           # 架构方案总览
│           ├── project-structure.md  # 本文档
│           └── implementation-plan.md # 实施计划
│
├── keedavault-core/               # 🦀 Rust 核心库（新建）
│   ├── Cargo.toml                 # Workspace 配置
│   ├── src/
│   │   ├── lib.rs                 # 库入口
│   │   ├── vault.rs               # Vault 核心逻辑
│   │   ├── crypto.rs              # 加密/解密
│   │   ├── entry.rs               # Entry 数据结构
│   │   ├── group.rs               # Group 数据结构
│   │   ├── totp.rs                # TOTP 生成
│   │   ├── search.rs              # 搜索功能
│   │   └── error.rs               # 错误定义
│   ├── uniffi/                    # UniFFI 配置（iOS 专用）
│   │   └── vault.udl              # 接口定义
│   ├── tests/                     # 单元测试
│   └── benches/                   # 性能测试
│
└── keedavault-app/                # 🚀 新应用代码（新建）
    ├── Cargo.toml                 # Workspace 根配置
    ├── desktop/                   # 桌面端 (Tauri)
    │   ├── src/                   # React/TypeScript 前端
    │   │   ├── components/
    │   │   ├── stores/
    │   │   ├── pages/
    │   │   └── App.tsx
    │   ├── src-tauri/             # Tauri Rust 后端
    │   │   ├── src/
    │   │   │   ├── main.rs
    │   │   │   ├── commands/      # Tauri Commands
    │   │   │   └── state.rs       # 应用状态管理
    │   │   └── Cargo.toml         # 依赖 keedavault-core
    │   ├── package.json
    │   └── tauri.conf.json
    │
    └── ios/                       # iOS 端
        ├── Keedavault/            # Xcode 项目
        │   ├── App/               # SwiftUI 代码
        │   │   ├── Views/
        │   │   ├── ViewModels/
        │   │   └── KeedavaultApp.swift
        │   ├── Generated/         # UniFFI 生成的 Swift 代码
        │   └── Frameworks/        # keedavault-core.xcframework
        ├── Keedavault.xcodeproj
        └── scripts/
            └── build-rust.sh      # 编译 Rust -> XCFramework
```

## 🎯 各目录职责

### keedavault (现有项目)
- **保留原因**：作为参考实现和代码迁移源
- **状态**：只读，不再主动开发
- **用途**：
  - 提取可复用的 UI 组件
  - 参考业务逻辑实现
  - 对比测试新旧实现

### keedavault-core (核心库)
- **语言**：纯 Rust
- **职责**：
  - KDBX 文件解析与保存
  - 加密/解密 (Argon2, ChaCha20, AES)
  - Entry/Group CRUD 操作
  - TOTP 生成与验证
  - 搜索与过滤
  - 数据验证与错误处理
- **特点**：
  - 无 UI 依赖
  - 完全跨平台
  - 高性能、内存安全
- **对外接口**：
  - Desktop: 直接作为 Rust crate 使用
  - iOS: 通过 UniFFI 生成 Swift bindings

### keedavault-app/desktop (桌面端)
- **平台**：macOS, Windows, Ubuntu
- **技术栈**：
  - 前端：React + TypeScript (复用现有代码)
  - 后端：Tauri (Rust)
  - 通信：Tauri Commands
- **架构**：
  ```
  React UI
     ↓ invoke()
  Tauri Commands
     ↓ 直接调用
  keedavault-core
  ```

### keedavault-app/ios (iOS 端)
- **平台**：iOS, iPadOS
- **技术栈**：
  - UI：SwiftUI
  - 逻辑：keedavault-core (通过 UniFFI)
- **架构**：
  ```
  SwiftUI
     ↓ Swift API
  UniFFI Bindings
     ↓ FFI
  keedavault-core.xcframework
  ```

## 🔄 代码复用策略

### 从 keedavault 迁移到 keedavault-app

#### 可直接复用的部分
- ✅ React 组件 (UI)
- ✅ TypeScript 类型定义
- ✅ CSS/样式文件
- ✅ 图标和资源文件

#### 需要重写的部分
- ❌ KDBX 解析逻辑 (JS → Rust)
- ❌ 加密/解密代码 (kdbxweb → Rust crypto)
- ❌ 状态管理 (部分需要适配 Tauri)

#### 迁移优先级
1. **Phase 1**: UI 组件 (无业务逻辑)
2. **Phase 2**: 页面布局和路由
3. **Phase 3**: 状态管理 (适配 Tauri Commands)
4. **Phase 4**: 集成测试和优化

## 📦 依赖关系

```
keedavault-app/desktop/src-tauri
    └── depends on → keedavault-core

keedavault-app/ios
    └── depends on → keedavault-core (via UniFFI)

keedavault
    └── 独立，不依赖新项目
```

## 🛠 构建产物

### Desktop
- **macOS**: `.dmg`, `.app`
- **Windows**: `.msi`, `.exe`
- **Ubuntu**: `.deb`, `.AppImage`

### iOS
- **Development**: `.app` (模拟器/真机调试)
- **Distribution**: `.ipa` (App Store / TestFlight)

## 📝 文档组织

所有重构相关文档统一存放在 `keedavault/docs/refactoring/`:

- `intro.md` - 架构方案总览
- `project-structure.md` - 本文档，项目结构说明
- `implementation-plan.md` - 详细实施步骤
- `core-api.md` - Core 库 API 设计
- `desktop-integration.md` - Desktop 集成指南
- `ios-integration.md` - iOS 集成指南
- `migration-guide.md` - 代码迁移指南
- `testing-strategy.md` - 测试策略
