# Tauri 拖放问题速查卡 🚀

## 🎯 快速判断：我应该用哪种方案？

```
你的拖放场景是什么？
│
├─ 📁 从操作系统拖文件到应用
│   └─ 使用 CSDN 文章的方案
│       ├─ Windows: disable_drag_drop_handler()
│       └─ macOS: 保持启用 + 添加权限
│
└─ 🎨 在应用内拖动 UI 元素
    └─ 使用鼠标事件模拟（我们的方案）
        └─ 所有平台：onMouseDown/Move/Up
```

## ⚡ 核心概念一句话

| 概念 | 解释 |
|------|------|
| `drag_drop_handler_enabled` | Tauri 控制拖放的开关，默认 `true` |
| **Windows 问题** | Tauri 拦截了 HTML5 拖放事件 |
| **macOS 问题** | WKWebView 不传播拖放事件 |
| **文件拖放** | 从 OS 拖文件到应用（CSDN 场景） |
| **应用内拖放** | 在应用内拖 UI 元素（我们的场景） |

## 📋 CSDN 方案速查

### Windows 配置
```rust
// 方法 1: Rust 代码
#[cfg(target_os = "windows")]
{
    webview.disable_drag_drop_handler();
}

// 方法 2: tauri.conf.json
{
  "window": {
    "dragDropEnabled": false
  }
}
```

### macOS 配置
```xml
<!-- Info.plist -->
<key>NSFileHandlingUsageDescription</key>
<string>需要访问您拖放的文件以进行处理</string>
```

### 前端代码
```html
<div ondragover="event.preventDefault()" 
     ondrop="handleDrop(event)">
    拖放文件到这里
</div>

<script>
function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    // 处理文件...
}
</script>
```

## 🎮 我们的方案速查

### 拖动源
```typescript
const [isDragging, setIsDragging] = useState(false);
const [draggedItem, setDraggedItem] = useState(null);

<div
  onMouseDown={(e) => {
    setIsDragging(true);
    setDraggedItem(item);
  }}
>
  可拖动的元素
</div>
```

### 全局监听
```typescript
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // 更新拖动位置
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    // 检测拖放目标
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const dropTarget = element?.closest('[data-drop-target]');
    setCurrentDropTarget(dropTarget);
  };
  
  const handleMouseUp = () => {
    if (currentDropTarget) {
      onDrop(draggedItem, currentDropTarget);
    }
    setIsDragging(false);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isDragging, draggedItem, currentDropTarget]);
```

### 拖放目标
```typescript
<div data-drop-target="group-123">
  拖放到这里
</div>
```

## 🐛 问题诊断流程

```
拖放不工作？
│
├─ 检查：是文件拖放还是应用内拖放？
│   ├─ 文件拖放 → 检查 Tauri 配置
│   └─ 应用内拖放 → 检查事件监听
│
├─ 检查：哪些事件触发了？
│   ├─ dragstart 触发，drop 不触发 → macOS WKWebView 问题
│   ├─ 所有事件都不触发 → 检查事件绑定
│   └─ mousedown 触发，mousemove 不触发 → 检查全局监听
│
└─ 检查：平台是什么？
    ├─ Windows → 考虑禁用 drag_drop_handler
    ├─ macOS → 考虑用鼠标事件
    └─ Linux → 类似 macOS
```

## 📊 方案选择矩阵

| 场景 | Windows | macOS | 推荐方案 |
|------|---------|-------|---------|
| 拖文件到应用 | ✅ CSDN | ✅ CSDN | CSDN 方案 |
| 应用内拖 UI | ⚠️ 需配置 | ❌ 不工作 | 鼠标事件 |
| 混合场景 | 🔧 分别处理 | 🔧 分别处理 | 两种都用 |

## 🎓 记住这些关键点

1. **两种场景，两种方案**
   - 文件拖放 → CSDN 方案
   - 应用内拖放 → 鼠标事件

2. **平台差异**
   - Windows: 需要禁用 Tauri 拦截
   - macOS: WKWebView 事件传播有问题

3. **我们的选择**
   - ✅ 鼠标事件方案
   - ✅ 适用于应用内拖放
   - ✅ 跨平台一致

4. **不需要改的**
   - ❌ 不需要改 tauri.conf.json
   - ❌ 不需要改 Rust 代码
   - ❌ 不需要改 Info.plist

## 🔗 快速链接

- 📄 详细指南：`TAURI_DND_COMPATIBILITY_GUIDE.md`
- 📚 学习总结：`TAURI_DND_学习总结.md`
- 🐛 问题记录：`TAURI_DND_ISSUE.md`
- 🌐 CSDN 原文：https://blog.csdn.net/gitblog_00809/article/details/151443064
- 🐙 Tauri Issue：https://github.com/tauri-apps/tauri/issues/11605

## 💡 一句话总结

> **CSDN 解决文件拖放，我们用鼠标事件解决应用内拖放，各司其职！**
