#!/bin/bash

# 卡密信息不显示问题 - 快速诊断和修复脚本

set -e

echo "=========================================="
echo "  卡密信息不显示问题 - 快速诊断工具"
echo "=========================================="
echo ""

# 检查环境变量
if [ -z "$UPSTASH_URL" ] || [ -z "$UPSTASH_TOKEN" ]; then
    echo "错误: 缺少环境变量"
    echo "请设置 UPSTASH_URL 和 UPSTASH_TOKEN"
    echo ""
    echo "示例:"
    echo "  export UPSTASH_URL=https://your-redis-url.upstash.io"
    echo "  export UPSTASH_TOKEN=your-token"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js"
    exit 1
fi

# 显示菜单
echo "请选择操作:"
echo "1) 诊断指定用户的卡密状态"
echo "2) 扫描所有用户的卡密状态"
echo "3) 修复数据不一致"
echo "4) 查看服务器日志"
echo "5) 退出"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        echo ""
        read -p "请输入用户名: " username
        if [ -z "$username" ]; then
            echo "错误: 用户名不能为空"
            exit 1
        fi
        echo ""
        echo "正在诊断用户: $username"
        echo "----------------------------------------"
        node scripts/diagnose-user-cardkey.js "$username"
        ;;
    2)
        echo ""
        echo "正在扫描所有卡密数据..."
        echo "----------------------------------------"
        node scripts/debug-cardkeys.js
        ;;
    3)
        echo ""
        echo "警告: 此操作将修改 Redis 数据"
        echo ""
        read -p "是否继续? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "操作已取消"
            exit 0
        fi
        echo ""
        echo "正在修复数据不一致..."
        echo "----------------------------------------"
        node scripts/fix-cardkeys.js
        ;;
    4)
        echo ""
        echo "查看服务器日志 (Ctrl+C 退出)"
        echo "----------------------------------------"
        read -p "请输入日志文件路径 (默认: logs/app.log): " log_file
        log_file=${log_file:-logs/app.log}

        if [ ! -f "$log_file" ]; then
            echo "错误: 日志文件不存在: $log_file"
            exit 1
        fi

        tail -f "$log_file" | grep -E "(getFullUserCardKey|cardkey)"
        ;;
    5)
        echo "退出"
        exit 0
        ;;
    *)
        echo "错误: 无效选项"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  操作完成"
echo "=========================================="
