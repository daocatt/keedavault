#!/bin/bash

# 清理 KeedaVault 的 Keychain 条目
# 这个脚本会删除所有 service 为 "keedavault-biometric" 的条目

SERVICE_NAME="keedavault-biometric"

echo "🔍 查找 KeedaVault 的 Keychain 条目..."
echo "Service name: $SERVICE_NAME"
echo ""

# 查找所有匹配的条目
echo "📋 当前的条目："
security find-generic-password -s "$SERVICE_NAME" 2>&1 | grep -E "(acct|svce)" || echo "  没有找到任何条目"
echo ""

# 询问是否删除
read -p "❓ 是否删除所有 $SERVICE_NAME 的条目？(y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  正在删除..."
    
    # 尝试删除所有匹配的条目
    # 注意：这个命令可能需要多次运行，因为每次只删除一个
    count=0
    while security delete-generic-password -s "$SERVICE_NAME" 2>/dev/null; do
        count=$((count + 1))
        echo "  ✅ 已删除条目 #$count"
    done
    
    if [ $count -eq 0 ]; then
        echo "  ℹ️  没有找到需要删除的条目"
    else
        echo ""
        echo "✅ 总共删除了 $count 个条目"
    fi
else
    echo "❌ 取消删除"
fi
