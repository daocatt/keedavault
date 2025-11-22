# File System Adapter 使用指南

## 概述

`fileSystemAdapter` 提供了一个统一的接口来处理文件操作，自动适配浏览器和 Tauri 环境。

## 主要特性

✅ **自动环境检测**: 自动识别运行环境（浏览器 vs Tauri）
✅ **统一API**: 相同的代码在两个环境中都能工作
✅ **类型安全**: 完整的 TypeScript 支持
✅ **降级处理**: 浏览器环境支持多种文件选择方式

## 使用方法

### 1. 打开文件

```typescript
import { fileSystem } from '../services/fileSystemAdapter';

// 打开文件选择器
const handle = await fileSystem.openFile();
if (!handle) {
    // 用户取消了选择
    return;
}

// 读取文件内容
const arrayBuffer = await fileSystem.readFile(handle);
```

### 2. 保存文件

```typescript
// 显示保存对话框并保存文件
const handle = await fileSystem.saveFileAs('database.kdbx', arrayBuffer);
if (handle) {
    console.log('File saved:', handle.name);
}
```

### 3. 写入已有文件

```typescript
// 更新现有文件
await fileSystem.writeFile(handle, newArrayBuffer);
```

### 4. 从 input 元素读取（降级方案）

```typescript
const fileContent = await fileSystem.readFileFromInput(file);
console.log(fileContent.name, fileContent.data);
```

## FileHandle 结构

```typescript
interface FileHandle {
    name: string;                      // 文件名
    path?: string;                     // Tauri 路径
    webHandle?: FileSystemFileHandle;  // 浏览器句柄
}
```

## 环境检测

```typescript
if (fileSystem.isTauriEnvironment()) {
    console.log('Running in Tauri');
} else {
    console.log('Running in browser');
}
```

## 浏览器兼容性

### 现代浏览器
- 使用 File System Access API (`showOpenFilePicker`, `showSaveFilePicker`)
- 支持直接读写文件，无需重新选择

### 旧版浏览器
- 降级到 `<input type="file">` 元素
- 保存时使用 Blob 下载

## 在 VaultContext 中的使用示例

```typescript
import { fileSystem } from '../services/fileSystemAdapter';

const addVault = async (
    fileOrPath: File | FileSystemFileHandle | string,
    password: string,
    keyFile?: File
) => {
    let arrayBuffer: ArrayBuffer;
    let filename: string;
    let handle: FileHandle | null = null;

    // 处理不同的输入类型
    if (typeof fileOrPath === 'string') {
        // Tauri 路径
        handle = { path: fileOrPath, name: fileOrPath.split('/').pop() || 'database.kdbx' };
        arrayBuffer = await fileSystem.readFile(handle);
        filename = handle.name;
    } else if (fileOrPath instanceof File) {
        // File 对象
        const content = await fileSystem.readFileFromInput(fileOrPath);
        arrayBuffer = content.data;
        filename = content.name;
    } else {
        // FileSystemFileHandle
        handle = { webHandle: fileOrPath, name: fileOrPath.name };
        arrayBuffer = await fileSystem.readFile(handle);
        filename = handle.name;
    }

    // ... 解密和处理数据库
};
```

## 优势

1. **代码简化**: 不需要在每个地方都写环境判断
2. **易于测试**: 浏览器环境可以直接测试完整功能
3. **维护性**: 文件操作逻辑集中在一个地方
4. **扩展性**: 未来添加新平台支持更容易

## 注意事项

- 浏览器的 File System Access API 需要用户交互才能触发
- Tauri 环境需要在 `tauri.conf.json` 中配置文件系统权限
- 保存文件时，浏览器可能会提示用户确认覆盖
