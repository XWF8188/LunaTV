# Requirements Document

## Introduction

本文档定义了管理员积分管理功能（Admin Points Management）的需求规格说明。该功能集成到管理面板的用户列表中，允许管理员查看所有用户的积分信息，并支持对单个用户的积分进行手动调整（增加或扣除）。该功能是对现有邀请奖励系统的扩展，为管理员提供更灵活的积分管理能力。

## Glossary

- **管理员（Admin）**: 具有系统管理权限的用户，角色为 `owner` 或 `admin`
- **积分余额（Points Balance）**: 用户当前可用的积分数量
- **累计获取（Total Earned）**: 用户通过邀请等方式累计获得的积分总数
- **累计消费（Total Redeemed）**: 用户通过兑换卡密等方式累计消费的积分总数
- **积分调整（Points Adjustment）**: 管理员手动增加或扣除用户积分的操作
- **积分历史（Points History）**: 用户积分变更的详细记录，包含时间、类型、数量和原因

## Requirements

### Requirement 1: 用户列表显示积分信息

**User Story:** AS 管理员, I want 在用户列表中看到每个用户的积分信息, so that 快速了解用户的积分情况

#### Acceptance Criteria

1. WHEN 管理员访问管理面板的用户管理区域, 系统 SHALL 在用户列表中增加积分信息列
2. WHEN 用户列表显示, 系统 SHALL 为每个用户显示当前积分余额
3. WHEN 用户列表显示, 系统 SHALL 支持按积分余额进行升序或降序排序
4. WHEN 用户没有积分记录, 系统 SHALL 显示积分余额为 0

### Requirement 2: 积分详情弹窗

**User Story:** AS 管理员, I want 点击用户积分查看详细信息和历史记录, so that 了解该用户的积分获取和消费情况

#### Acceptance Criteria

1. WHEN 管理员点击用户的积分数值或积分操作按钮, 系统 SHALL 弹出积分详情对话框
2. WHEN 积分详情对话框显示, 系统 SHALL 展示用户的积分余额、累计获取积分、累计消费积分
3. WHEN 积分详情对话框显示, 系统 SHALL 展示最近20条积分历史记录
4. WHEN 积分历史记录显示, 系统 SHALL 包含时间、类型（获取/消费/管理调整）、数量、原因
5. WHEN 积分历史记录超过20条, 系统 SHALL 支持加载更多或分页显示
6. WHEN 用户没有任何积分记录, 系统 SHALL 显示友好的空状态提示

### Requirement 3: 管理员增加用户积分

**User Story:** AS 管理员, I want 在积分详情弹窗中为用户增加积分, so that 可以进行积分补偿或奖励

#### Acceptance Criteria

1. WHEN 管理员在积分详情弹窗中点击"增加积分"按钮, 系统 SHALL 显示积分调整表单
2. WHEN 积分调整表单显示, 系统 SHALL 提示输入增加的积分数量和调整原因
3. WHEN 管理员输入积分数量, 系统 SHALL 验证数量为正整数
4. WHEN 管理员输入调整原因, 系统 SHALL 验证原因不为空且长度不超过200字符
5. WHEN 管理员确认增加积分, 系统 SHALL 更新用户的积分余额和累计获取积分
6. WHEN 积分增加成功, 系统 SHALL 记录积分历史，类型为"管理调整"，包含调整原因和操作管理员
7. WHEN 积分增加成功, 系统 SHALL 显示成功提示并刷新积分信息

### Requirement 4: 管理员扣除用户积分

**User Story:** AS 管理员, I want 在积分详情弹窗中扣除用户积分, so that 可以处理积分异常或违规情况

#### Acceptance Criteria

1. WHEN 管理员在积分详情弹窗中点击"扣除积分"按钮, 系统 SHALL 显示积分调整表单
2. WHEN 积分调整表单显示, 系统 SHALL 提示输入扣除的积分数量和调整原因
3. WHEN 管理员输入积分数量, 系统 SHALL 验证数量为正整数且不超过用户当前积分余额
4. WHEN 管理员输入调整原因, 系统 SHALL 验证原因不为空且长度不超过200字符
5. WHEN 管理员确认扣除积分, 系统 SHALL 更新用户的积分余额和累计消费积分
6. WHEN 积分扣除成功, 系统 SHALL 记录积分历史，类型为"管理调整"，包含调整原因和操作管理员
7. WHEN 积分扣除成功, 系统 SHALL 显示成功提示并刷新积分信息

### Requirement 5: 权限控制

**User Story:** AS 系统, I want 限制只有管理员可以操作积分管理功能, so that 保护用户积分数据安全

#### Acceptance Criteria

1. WHEN 非管理员用户访问积分管理API, 系统 SHALL 返回403禁止访问错误
2. WHEN 管理员执行积分调整操作, 系统 SHALL 验证管理员身份
3. WHEN 积分调整请求包含无效数据, 系统 SHALL 返回400错误并提示具体原因
4. WHEN 管理员尝试扣除超过用户余额的积分, 系统 SHALL 返回错误并提示积分余额不足

### Requirement 6: 积分调整记录审计

**User Story:** AS 管理员, I want 积分调整操作被完整记录, so that 可以追溯所有积分变更

#### Acceptance Criteria

1. WHEN 管理员执行积分调整, 系统 SHALL 在积分历史中记录操作管理员的用户名
2. WHEN 积分历史记录显示, 系统 SHALL 标注该记录为"管理调整"类型
3. WHEN 积分历史记录显示, 系统 SHALL 显示调整原因
4. WHEN 积分调整操作完成, 系统 SHALL 确保记录不可被修改或删除
