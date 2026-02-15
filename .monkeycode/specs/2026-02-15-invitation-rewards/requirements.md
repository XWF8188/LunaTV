# Requirements Document

## Introduction

本文档定义了邀请奖励系统（Invitation Rewards System）的需求规格说明。邀请奖励系统鼓励用户邀请好友注册,双方均可获得积分奖励。用户可以使用积分兑换一周卡密,管理员可以在后台配置积分奖励和兑换规则。

## Glossary

- **邀请码（Invitation Code）**: 用户专属的邀请链接或代码,用于标识推荐关系
- **积分（Points）**: 用户通过邀请好友注册获得的奖励点数
- **被邀请人（Invitee）**: 通过邀请码注册的新用户
- **邀请人（Inviter）**: 发出邀请并邀请好友注册的用户
- **推荐关系（Referral Relationship）**: 邀请人与被邀请人之间的绑定关系
- **兑换（Redeem）**: 用户使用积分换取卡密的操作
- **IP地址（IP Address）**: 网络设备的唯一标识,用于判断是否为同一设备
- **我的卡密（My Card Keys）**: 用户界面中展示用户拥有的所有卡密的页面

## Requirements

### Requirement 1: 用户邀请码生成

**User Story:** AS 注册用户, I want 获得专属邀请码, so that 可以分享给好友并邀请注册

#### Acceptance Criteria

1. WHEN 用户账户创建成功, 系统 SHALL 自动为该用户生成唯一的邀请码
2. WHEN 用户访问"我的邀请"页面, 系统 SHALL 显示用户的邀请码和邀请链接
3. WHEN 邀请码生成, 系统 SHALL 确保邀请码的唯一性和不可预测性
4. WHEN 生成邀请码, 系统 SHALL 使用至少16位的随机字符串

### Requirement 2: 邀请注册流程

**User Story:** AS 新用户, I want 通过邀请码注册, so that 可以为邀请人带来积分奖励

#### Acceptance Criteria

1. WHEN 新用户通过邀请链接访问注册页面, 系统 SHALL 自动填充邀请码字段
2. WHEN 新用户手动输入邀请码注册, 系统 SHALL 验证邀请码的有效性
3. WHEN 邀请码验证通过, 系统 SHALL 建立新用户与邀请人的推荐关系
4. WHEN 邀请码验证失败, 系统 SHALL 提示用户重新输入或继续正常注册
5. WHEN 推荐关系建立, 系统 SHALL 记录注册者的IP地址用于防作弊

### Requirement 3: 积分奖励机制

**User Story:** AS 邀请人, I want 在好友成功注册后获得积分奖励, so that 可以累积积分兑换卡密

#### Acceptance Criteria

1. WHEN 被邀请人成功完成注册, 系统 SHALL 按照配置的积分数量为邀请人增加积分
2. WHEN 积分奖励发放, 系统 SHALL 记录奖励的原因、时间和相关用户信息
3. WHEN 积分增加, 系统 SHALL 在邀请人的账户中更新积分余额
4. WHEN 积分奖励发放失败, 系统 SHALL 记录错误日志供管理员排查

### Requirement 4: IP地址防作弊

**User Story:** AS 系统, I want 限制同一IP地址的重复奖励, so that 防止用户通过同一设备多次注册获取积分

#### Acceptance Criteria

1. WHEN 新用户注册, 系统 SHALL 获取用户的注册IP地址
2. WHEN 用户注册成功, 系统 SHALL 检查该IP地址是否已奖励过邀请人
3. WHEN IP地址已存在奖励记录, 系统 SHALL 拒绝发放积分奖励
4. WHEN IP地址未存在奖励记录, 系统 SHALL 发放积分奖励并记录IP地址
5. WHEN IP地址防作弊触发, 系统 SHALL 允许注册完成但不发放积分

### Requirement 5: 积分兑换卡密

**User Story:** AS 用户, I want 使用积分兑换一周卡密, so that 可以延长账户有效期

#### Acceptance Criteria

1. WHEN 用户访问积分兑换页面, 系统 SHALL 显示当前积分余额和可兑换的卡密类型
2. WHEN 用户发起兑换请求, 系统 SHALL 验证积分是否足够
3. WHEN 积分足够, 系统 SHALL 扣除相应积分并生成一周卡密
4. WHEN 积分不足, 系统 SHALL 提示用户积分不足并显示所需积分数量
5. WHEN 卡密生成成功, 系统 SHALL 将卡密添加到用户的"我的卡密"列表
6. WHEN 兑换完成, 系统 SHALL 记录兑换历史包括兑换时间、消耗积分和生成的卡密

### Requirement 6: 我的卡密管理

**User Story:** AS 用户, I want 在用户菜单中查看和复制我的卡密, so that 可以自用或分享给好友

#### Acceptance Criteria

1. WHEN 用户访问"我的卡密"页面, 系统 SHALL 显示用户拥有的所有有效卡密
2. WHEN 卡密列表显示, 系统 SHALL 包含卡密密钥、有效期、类型和状态信息
3. WHEN 用户点击复制按钮, 系统 SHALL 将卡密密钥复制到剪贴板
4. WHEN 卡密被使用, 系统 SHALL 在列表中标记卡密为已使用状态
5. WHEN 卡密过期, 系统 SHALL 在列表中标记卡密为已过期状态
6. WHEN 用户没有卡密, 系统 SHALL 显示友好的空状态提示

### Requirement 7: 管理员配置奖励规则

**User Story:** AS 管理员, I want 在后台设置积分奖励和兑换规则, so that 可以控制奖励成本和兑换门槛

#### Acceptance Criteria

1. WHEN 管理员访问奖励配置页面, 系统 SHALL 显示当前的邀请奖励积分和兑换所需积分
2. WHEN 管理员修改邀请奖励积分, 系统 SHALL 更新配置并应用于新注册的邀请关系
3. WHEN 管理员修改兑换所需积分, 系统 SHALL 更新配置并应用于新的兑换请求
4. WHEN 管理员保存配置, 系统 SHALL 验证积分值为正整数
5. WHEN 配置验证失败, 系统 SHALL 提示错误信息并保持原配置不变
6. WHEN 配置更新成功, 系统 SHALL 记录配置变更日志

### Requirement 8: 用户积分查询

**User Story:** AS 用户, I want 查看我的积分余额和历史记录, so that 了解积分的获取和消费情况

#### Acceptance Criteria

1. WHEN 用户访问个人中心或邀请页面, 系统 SHALL 显示当前积分余额
2. WHEN 用户点击积分明细, 系统 SHALL 展示积分的获取和消费历史
3. WHEN 积分历史显示, 系统 SHALL 包含时间、类型（获取/消费）、数量和描述
4. WHEN 积分历史记录, 系统 SHALL 按时间倒序排列
5. WHEN 积分明细过多, 系统 SHALL 支持分页或懒加载显示

### Requirement 9: 推荐关系数据持久化

**User Story:** AS 系统, I want 持久化存储推荐关系, so that 确保数据在系统重启后不丢失

#### Acceptance Criteria

1. WHEN 推荐关系建立, 系统 SHALL 将关系数据存储到数据库,包括邀请人、被邀请人、邀请码和注册时间
2. WHEN IP奖励记录创建, 系统 SHALL 将IP地址和相关用户信息存储到数据库
3. WHEN 积分变更, 系统 SHALL 记录积分变更的历史包括变更时间、变更数量和原因
4. WHEN 兑换历史记录, 系统 SHALL 存储兑换的用户、时间、消耗积分和生成的卡密
5. WHEN 系统启动, 系统 SHALL 从数据库加载所有积分和推荐相关数据

### Requirement 10: 积分和卡密数据一致性

**User Story:** AS 系统, I want 确保积分和卡密数据的一致性, so that 防止数据错误和重复发放

#### Acceptance Criteria

1. WHEN 积分奖励发放, 系统 SHALL 使用事务确保积分增加和IP记录的原子性
2. WHEN 积分兑换卡密, 系统 SHALL 使用事务确保积分扣除和卡密生成的原子性
3. WHEN 积分变更失败, 系统 SHALL 回滚相关操作并记录错误
4. WHEN 卡密生成失败, 系统 SHALL 回滚积分扣除并提示用户
5. WHEN 并发兑换请求, 系统 SHALL 使用乐观锁或悲观锁防止积分超支
