# Requirements Document

## Introduction

本文档定义了卡密系统（Card Key System）的需求规格说明。卡密系统用于控制用户访问权限，用户在注册或登录时需要绑定有效的卡密。卡密具有时效性，管理员可以在管理后台创建和管理卡密。

## Glossary

- **卡密（Card Key）**: 由管理员生成的访问凭证，用户注册或登录时需要绑定的密钥
- **卡密类型**: 卡密的有效期类型，包括1年、1季、1月、1周
- **管理员**: 拥有 owner 或 admin 角色的用户，可以创建和管理卡密
- **普通用户**: 拥有 user 角色的用户，需要绑定卡密才能使用系统
- **卡密绑定**: 用户将卡密与账户关联的操作
- **卡密过期**: 卡密的有效期已过，用户无法再访问系统
- **卡密过期提醒**: 在卡密过期前30天提醒用户重新绑定新卡密

## Requirements

### Requirement 1: 用户注册时卡密绑定

**User Story:** AS 新用户, I want 注册时绑定卡密, so that 能够访问系统的资源

#### Acceptance Criteria

1. WHEN 新用户提交注册请求, 系统 SHALL 验证卡密是否有效且未被使用
2. WHEN 卡密有效且未被使用, 系统 SHALL 创建用户账户并将卡密与该用户绑定
3. WHEN 卡密无效或已被使用, 系统 SHALL 返回错误信息并拒绝注册
4. WHEN 用户注册成功, 系统 SHALL 设置卡密的有效期作为用户账户的有效期

### Requirement 2: 卡密时效性管理

**User Story:** AS 管理员, I want 创建不同时效的卡密, so that 可以控制用户的访问时长

#### Acceptance Criteria

1. WHEN 管理员创建卡密, 系统 SHALL 支持选择卡密时效类型：1年、1季（90天）、1月（30天）、1周（7天）
2. WHEN 管理员创建卡密, 系统 SHALL 根据选择的时效类型计算过期时间戳
3. WHEN 卡密被用户绑定, 系统 SHALL 记录绑定时间和过期时间
4. WHEN 卡密过期, 系统 SHALL 标记该卡密为已过期状态

### Requirement 3: 卡密过期登录限制

**User Story:** AS 系统, I want 拒绝过期卡密用户的登录请求, so that 确保只有有效用户可以访问

#### Acceptance Criteria

1. WHEN 用户尝试登录, 系统 SHALL 检查用户账户的卡密是否过期
2. WHEN 用户卡密已过期, 系统 SHALL 拒绝登录并返回卡密过期错误信息
3. WHEN 用户卡密未过期, 系统 SHALL 允许登录并更新最后登录时间
4. WHEN 管理员角色用户登录, 系统 SHALL 跳过卡密过期检查

### Requirement 4: 卡密过期提醒

**User Story:** AS 用户, I want 在卡密过期前收到提醒, so that 可以及时续费继续使用服务

#### Acceptance Criteria

1. WHEN 用户成功登录, 系统 SHALL 检查卡密剩余有效期
2. WHEN 卡密剩余有效期小于或等于30天, 系统 SHALL 在用户界面显示过期提醒
3. WHEN 卡密剩余有效期小于或等于7天, 系统 SHALL 在用户界面显示紧迫的过期提醒
4. WHILE 用户会话保持活跃, 系统 SHALL 持续显示卡密过期提醒直到用户绑定新卡密或卡密过期

### Requirement 5: 用户重新绑定卡密

**User Story:** AS 用户, I want 在设置页面重新绑定新卡密, so that 可以延长账户有效期

#### Acceptance Criteria

1. WHEN 用户访问设置页面, 系统 SHALL 提供卡密绑定界面显示当前卡密状态和过期时间
2. WHEN 用户在设置页面提交新卡密, 系统 SHALL 验证新卡密是否有效且未被使用
3. WHEN 新卡密验证通过, 系统 SHALL 将新卡密与用户绑定并更新用户账户的过期时间
4. WHEN 新卡密验证失败, 系统 SHALL 返回错误信息并保持原有卡密状态
5. WHEN 用户绑定新卡密成功, 系统 SHALL 清除过期提醒并更新界面显示

### Requirement 6: 管理员卡密管理功能

**User Story:** AS 管理员, I want 在管理后台管理卡密, so that 可以控制用户访问和生成新的卡密

#### Acceptance Criteria

1. WHEN 管理员访问卡密管理页面, 系统 SHALL 显示所有卡密列表，包括卡密密钥、类型、状态、创建时间、绑定用户和过期时间
2. WHEN 管理员创建新卡密, 系统 SHALL 支持选择卡密类型和批量生成多个卡密
3. WHEN 管理员查看卡密详情, 系统 SHALL 显示卡密的使用历史和绑定用户信息
4. WHEN 管理员删除卡密, 系统 SHALL 仅删除未绑定的卡密，已绑定的卡密不可删除
5. WHEN 管理员导出卡密, 系统 SHALL 支持将卡密列表导出为 CSV 或 Excel 格式

### Requirement 7: 管理员权限豁免

**User Story:** AS 管理员, I want 不受卡密限制, so that 可以始终管理系统

#### Acceptance Criteria

1. WHEN 拥有 owner 或 admin 角色的用户尝试登录, 系统 SHALL 跳过卡密有效性检查
2. WHEN 拥有 owner 或 admin 角色的用户访问系统功能, 系统 SHALL 不显示卡密过期提醒
3. WHILE 拥有 owner 或 admin 角色的用户使用系统, 系统 SHALL 不执行任何卡密相关的限制
4. WHEN 用户角色从 owner 或 admin 降级为 user, 系统 SHALL 在下一次登录时要求绑定卡密

### Requirement 8: 卡密数据存储

**User Story:** AS 系统, I want 持久化卡密数据, so that 可以在系统重启后恢复卡密状态

#### Acceptance Criteria

1. WHEN 创建新卡密, 系统 SHALL 将卡密数据存储到数据库，包括卡密密钥、类型、状态、创建时间和过期时间
2. WHEN 用户绑定卡密, 系统 SHALL 更新卡密状态为已使用并记录绑定的用户名和绑定时间
3. WHEN 查询卡密, 系统 SHALL 根据卡密密钥快速检索并返回完整的卡密信息
4. WHEN 系统启动, 系统 SHALL 从数据库加载所有卡密数据到内存缓存以提升查询性能

### Requirement 9: 卡密安全性

**User Story:** AS 系统, I want 保护卡密数据安全, so that 防止卡密泄露和滥用

#### Acceptance Criteria

1. WHEN 管理员创建卡密, 系统 SHALL 生成高强度的随机字符串作为卡密密钥
2. WHEN 存储卡密数据, 系统 SHALL 使用单向哈希算法存储卡密密钥以防止数据库泄露
3. WHEN 验证卡密, 系统 SHALL 使用哈希比较验证卡密密钥的正确性
4. WHEN 卡密绑定后, 系统 SHALL 限制同一卡密只能被一个用户绑定

### Requirement 10: 卡密过期自动清理

**User Story:** AS 系统, I want 自动清理过期的未使用卡密, so that 减少数据存储占用

#### Acceptance Criteria

1. WHEN 系统执行定期清理任务, 系统 SHALL 扫描所有过期的未使用卡密
2. WHEN 发现过期的未使用卡密, 系统 SHALL 将这些卡密标记为已过期状态
3. WHEN 管理员查看卡密列表, 系统 SHALL 默认隐藏已过期的卡密，但提供选项显示
4. WHEN 管理员手动触发清理, 系统 SHALL 立即执行过期卡密清理操作
