#!/bin/bash

echo "=========================================="
echo "  邀请积分功能 - 查看调试日志"
echo "=========================================="
echo ""
echo "请按以下步骤操作："
echo ""
echo "1. 在终端1运行开发服务器（如果还没运行）："
echo "   npm run dev"
echo ""
echo "2. 在另一个终端运行此脚本，它会过滤显示邀请相关的日志"
echo ""
echo "3. 执行测试（在第三个终端）："
echo "   node tests/test-invitation-points.js"
echo "   或者"
echo "   node tests/diagnose-invitation.js"
echo ""
echo "=========================================="
echo "现在开始监听日志（按 Ctrl+C 退出）..."
echo "=========================================="
echo ""

# 监听日志文件或进程
# 这里提供两种方式

# 方式1：如果使用 npm run dev，监听标准输出
# 注意：这需要在运行 npm run dev 的终端中使用管道
echo ""
echo "方式1：在运行 npm run dev 的终端中，按 Ctrl+C 停止，然后运行："
echo "npm run dev 2>&1 | grep -E '(邀请|积分|Invitation|Points)'"
echo ""

# 方式2：如果日志写入文件
echo "方式2：如果日志写入文件，使用："
echo "tail -f server.log | grep -E '(邀请|积分|Invitation|Points)'"
echo ""

# 方式3：监听所有相关日志
echo "方式3：监听所有相关日志（包括错误）："
echo "npm run dev 2>&1 | grep -E '(邀请|积分|Invitation|Points|验证|奖励|推荐|error|Error|ERROR)'"
echo ""

echo "=========================================="
echo "关键的调试日志标识："
echo "=========================================="
echo "✓ '=== 开始验证邀请码 ==='      - 开始验证邀请码"
echo "✓ '邀请码验证结果:'              - 验证结果（检查 valid 是否为 true）"
echo "✓ '找到邀请人:'                  - 邀请人用户名"
echo "✓ '=== 开始处理邀请奖励 ==='    - 开始处理积分奖励"
echo "✓ '邀请配置:'                    - 检查 enabled 是否为 true"
echo "✓ 'IP是否已奖励:'                - 检查是否为 false"
echo "✓ '推荐关系创建成功'            - 推荐关系已创建"
echo "✓ '准备发放积分奖励:'            - 积分数量"
echo "✓ '积分奖励发放成功'            - 成功！"
echo ""
echo "❌ 如果看到 '邀请码无效或未找到邀请人' - 邀请码验证失败"
echo "❌ 如果看到 '邀请功能未启用'       - 邀请配置问题"
echo "❌ 如果看到 'IP已奖励过'           - IP限制问题"
echo "❌ 如果看到 '处理邀请奖励失败'     - 其他错误"
echo ""
echo "=========================================="
