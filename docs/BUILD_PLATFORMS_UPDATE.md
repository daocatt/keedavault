# GitHub Actions 构建配置更新

## ✅ 更改内容

暂时禁用了 Windows 和 Ubuntu 的构建，只保留 macOS 构建。

## 📝 修改详情

### 之前

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
    - platform: 'macos-latest'
      args: '--target x86_64-apple-darwin'
    - platform: 'windows-latest'
      args: ''
    - platform: 'ubuntu-22.04'
      args: ''
```

### 现在

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
    - platform: 'macos-latest'
      args: '--target x86_64-apple-darwin'
    # Temporarily disabled - will re-enable later
    # - platform: 'windows-latest'
    #   args: ''
    # - platform: 'ubuntu-22.04'
    #   args: ''
```

## 🎯 当前构建目标

### 仅 macOS

- ✅ **macOS Apple Silicon** (aarch64-apple-darwin)
  - M1/M2/M3 Mac
  - 原生性能

- ✅ **macOS Intel** (x86_64-apple-darwin)
  - Intel Mac
  - 兼容性

### 暂时禁用

- ❌ **Windows** (windows-latest)
- ❌ **Ubuntu** (ubuntu-22.04)

## 📊 影响

### 构建时间

**之前**: ~30-40 分钟（4 个平台）
- macOS Apple Silicon: ~8 分钟
- macOS Intel: ~8 分钟
- Windows: ~10 分钟
- Ubuntu: ~10 分钟

**现在**: ~16 分钟（2 个平台）
- macOS Apple Silicon: ~8 分钟
- macOS Intel: ~8 分钟

**节省**: ~50% 构建时间

### GitHub Actions 配额

**之前**: 每次发布消耗 ~40 分钟
**现在**: 每次发布消耗 ~16 分钟

**节省**: ~24 分钟/次

### 发布产物

**之前**: 4 个文件
- KeedaVault_x.x.x_aarch64.dmg (macOS Apple Silicon)
- KeedaVault_x.x.x_x64.dmg (macOS Intel)
- KeedaVault_x.x.x_x64-setup.exe (Windows)
- keedavault_x.x.x_amd64.AppImage (Linux)

**现在**: 2 个文件
- KeedaVault_x.x.x_aarch64.dmg (macOS Apple Silicon)
- KeedaVault_x.x.x_x64.dmg (macOS Intel)

## 🔧 如何重新启用

### 方法 1: 取消注释

在 `.github/workflows/release.yml` 中：

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
    - platform: 'macos-latest'
      args: '--target x86_64-apple-darwin'
    # 移除这些注释即可重新启用
    - platform: 'windows-latest'
      args: ''
    - platform: 'ubuntu-22.04'
      args: ''
```

### 方法 2: Git 恢复

```bash
# 查看更改
git diff .github/workflows/release.yml

# 恢复文件
git checkout .github/workflows/release.yml
```

## 📋 测试

### 本地测试（推荐）

在重新启用前，先在本地测试构建：

#### Windows

```bash
# 在 Windows 机器上
npm install --legacy-peer-deps
npm run tauri build
```

#### Linux

```bash
# 在 Ubuntu 22.04 上
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
  libjavascriptcoregtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
npm install --legacy-peer-deps
npm run tauri build
```

### GitHub Actions 测试

可以使用 `workflow_dispatch` 手动触发测试：

1. 去 GitHub Actions 页面
2. 选择 "Release" workflow
3. 点击 "Run workflow"
4. 选择分支
5. 运行

## 💡 为什么暂时禁用？

### 原因

1. **专注 macOS 开发**
   - 主要用户群在 macOS
   - 快速迭代和测试

2. **节省资源**
   - 减少构建时间
   - 节省 GitHub Actions 配额

3. **简化发布流程**
   - 更快的发布周期
   - 更容易调试问题

### 何时重新启用？

当满足以下条件时：
- ✅ macOS 版本稳定
- ✅ 核心功能完善
- ✅ 准备好跨平台测试
- ✅ 有足够的时间处理平台特定问题

## 🎯 未来计划

### 短期（当前）

- ✅ 专注 macOS 开发
- ✅ 完善核心功能
- ✅ 优化用户体验

### 中期

- ⏳ 重新启用 Windows 构建
- ⏳ 测试 Windows 兼容性
- ⏳ 修复 Windows 特定问题

### 长期

- ⏳ 重新启用 Linux 构建
- ⏳ 测试 Linux 兼容性
- ⏳ 支持多个 Linux 发行版

## ✅ 总结

**更改**: 暂时禁用 Windows 和 Ubuntu 构建

**保留**: macOS (Apple Silicon + Intel)

**效果**:
- ✅ 构建时间减半
- ✅ 节省 GitHub Actions 配额
- ✅ 简化发布流程

**重新启用**: 取消注释即可

**文件**: `.github/workflows/release.yml`
