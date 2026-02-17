-- MySQL + Redis 混合存储方案 - 数据库初始化脚本
-- 版本: 1.0.0
-- 创建时间: 2025-02-17

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. 用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(128) NOT NULL COMMENT 'SHA256 哈希密码',
    role ENUM('owner', 'admin', 'user') NOT NULL DEFAULT 'user' COMMENT '角色',
    banned BOOLEAN DEFAULT FALSE COMMENT '是否封禁',
    tags JSON COMMENT '用户标签数组',
    enabled_apis JSON COMMENT '启用的 API 列表',
    oidc_sub VARCHAR(255) COMMENT 'OIDC 唯一标识',
    tvbox_token VARCHAR(255) COMMENT 'TVBox Token',
    show_adult_content BOOLEAN DEFAULT FALSE COMMENT '是否显示成人内容',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_oidc_sub (oidc_sub),
    INDEX idx_created_at (created_at),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =====================================================
-- 2. 卡密表
-- =====================================================
CREATE TABLE IF NOT EXISTS card_keys (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    key_hash VARCHAR(128) NOT NULL UNIQUE COMMENT '卡密哈希值',
    plain_key VARCHAR(64) NOT NULL COMMENT '卡密明文',
    key_type ENUM('year', 'quarter', 'month', 'week') NOT NULL COMMENT '卡密类型',
    status ENUM('unused', 'used', 'expired') NOT NULL DEFAULT 'unused' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NOT NULL COMMENT '预设过期时间',
    bound_to VARCHAR(50) COMMENT '绑定的用户名',
    bound_at TIMESTAMP NULL COMMENT '绑定时间',
    INDEX idx_key_hash (key_hash),
    INDEX idx_status (status),
    INDEX idx_bound_to (bound_to),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (bound_to) REFERENCES users(username) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡密表';

-- =====================================================
-- 3. 用户卡密关联表
-- =====================================================
CREATE TABLE IF NOT EXISTS user_card_keys (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    key_hash VARCHAR(128) NOT NULL COMMENT '卡密哈希',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    key_type ENUM('year', 'quarter', 'month', 'week') NOT NULL COMMENT '卡密类型',
    status ENUM('unused', 'used', 'expired') NOT NULL DEFAULT 'unused' COMMENT '状态',
    source ENUM('invitation', 'redeem', 'manual') NOT NULL COMMENT '来源',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    used_at TIMESTAMP NULL COMMENT '使用时间',
    used_by VARCHAR(50) COMMENT '使用人',
    notes TEXT COMMENT '备注',
    INDEX idx_username (username),
    INDEX idx_key_hash (key_hash),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户卡密关联表';

-- =====================================================
-- 4. 播放记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS play_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    title VARCHAR(500) NOT NULL COMMENT '标题',
    source_name VARCHAR(255) NOT NULL COMMENT '来源名称',
    cover VARCHAR(1000) COMMENT '封面图',
    year VARCHAR(20) COMMENT '年份',
    episode_index INT NOT NULL COMMENT '当前集数',
    total_episodes INT NOT NULL COMMENT '总集数',
    original_episodes INT COMMENT '首次观看时的原始集数',
    play_time INT NOT NULL COMMENT '播放进度(秒)',
    total_time INT NOT NULL COMMENT '总时长(秒)',
    search_title VARCHAR(500) COMMENT '搜索标题',
    remarks VARCHAR(500) COMMENT '备注',
    douban_id BIGINT COMMENT '豆瓣ID',
    content_type VARCHAR(50) COMMENT '内容类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    INDEX idx_updated_at (updated_at),
    INDEX idx_source (source),
    INDEX idx_douban_id (douban_id),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='播放记录表';

-- =====================================================
-- 5. 收藏表
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    title VARCHAR(500) NOT NULL COMMENT '标题',
    source_name VARCHAR(255) NOT NULL COMMENT '来源名称',
    cover VARCHAR(1000) COMMENT '封面图',
    year VARCHAR(20) COMMENT '年份',
    total_episodes INT COMMENT '总集数',
    search_title VARCHAR(500) COMMENT '搜索标题',
    origin ENUM('vod', 'live', 'shortdrama') COMMENT '来源类型',
    content_type VARCHAR(50) COMMENT '内容类型',
    release_date DATE COMMENT '上映日期',
    remarks VARCHAR(500) COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- =====================================================
-- 6. 剧集跳过配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS episode_skip_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    title VARCHAR(500) COMMENT '标题',
    segments JSON NOT NULL COMMENT '跳过片段配置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_user_content (username, source, content_id),
    INDEX idx_username (username),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='剧集跳过配置表';

-- =====================================================
-- 7. 积分表
-- =====================================================
CREATE TABLE IF NOT EXISTS user_points (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    invitation_code VARCHAR(20) NOT NULL UNIQUE COMMENT '专属邀请码',
    balance INT NOT NULL DEFAULT 0 COMMENT '当前积分',
    total_earned INT NOT NULL DEFAULT 0 COMMENT '累计获得',
    total_redeemed INT NOT NULL DEFAULT 0 COMMENT '累计兑换',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_invitation_code (invitation_code),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分表';

-- =====================================================
-- 8. 积分记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS points_records (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    type ENUM('earn', 'redeem', 'admin_adjust') NOT NULL COMMENT '类型',
    amount INT NOT NULL COMMENT '金额(正数)',
    reason VARCHAR(500) NOT NULL COMMENT '原因',
    related_user VARCHAR(50) COMMENT '关联用户',
    card_key_id VARCHAR(36) COMMENT '关联卡密ID',
    admin_username VARCHAR(50) COMMENT '管理员用户名',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_username (username),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分记录表';

-- =====================================================
-- 9. 邀请记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    inviter VARCHAR(50) NOT NULL COMMENT '邀请人',
    invitee VARCHAR(50) NOT NULL COMMENT '被邀请人',
    invitation_code VARCHAR(20) NOT NULL COMMENT '使用的邀请码',
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
    rewarded BOOLEAN DEFAULT FALSE COMMENT '是否已发放奖励',
    reward_time TIMESTAMP NULL COMMENT '奖励发放时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_invitee (invitee),
    INDEX idx_inviter (inviter),
    INDEX idx_invitation_code (invitation_code),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (inviter) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (invitee) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';

-- =====================================================
-- 10. IP奖励记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_reward_records (
    id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
    inviter VARCHAR(50) NOT NULL COMMENT '邀请人',
    invitee VARCHAR(50) NOT NULL COMMENT '被邀请人',
    reward_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '奖励时间',
    INDEX idx_ip_address (ip_address),
    INDEX idx_inviter (inviter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IP奖励记录表';

-- =====================================================
-- 11. 管理员配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_configs (
    id INT PRIMARY KEY DEFAULT 1,
    config_key VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键名',
    config_value JSON NOT NULL COMMENT '配置值(JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT chk_admin_config_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员配置表';

-- 初始化配置
INSERT IGNORE INTO admin_configs (id, config_key, config_value) VALUES 
(1, 'main_config', '{}');

-- =====================================================
-- 12. 用户登录统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS user_login_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    login_count INT NOT NULL DEFAULT 0 COMMENT '登录次数',
    first_login_at TIMESTAMP NULL COMMENT '首次登录时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_date DATE NULL COMMENT '最后登录日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_last_login_at (last_login_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户登录统计表';

-- =====================================================
-- 13. 内容热度统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS content_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    title VARCHAR(500) COMMENT '标题',
    source_name VARCHAR(255) COMMENT '来源名称',
    cover VARCHAR(1000) COMMENT '封面图',
    year VARCHAR(20) COMMENT '年份',
    play_count INT NOT NULL DEFAULT 0 COMMENT '播放次数',
    total_watch_time BIGINT NOT NULL DEFAULT 0 COMMENT '总观看时长(秒)',
    unique_users INT NOT NULL DEFAULT 0 COMMENT '观看用户数',
    last_played_at TIMESTAMP NULL COMMENT '最后播放时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_source_content (source, content_id),
    INDEX idx_play_count (play_count DESC),
    INDEX idx_last_played (last_played_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容热度统计表';

-- =====================================================
-- 14. 邀请配置表
-- =====================================================
CREATE TABLE IF NOT EXISTS invitation_configs (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    reward_points INT DEFAULT 100 COMMENT '邀请奖励积分',
    redeem_threshold INT DEFAULT 300 COMMENT '兑换阈值',
    card_key_type ENUM('year', 'quarter', 'month', 'week') DEFAULT 'week' COMMENT '兑换卡密类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT chk_invitation_config_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请配置表';

-- 初始化默认配置
INSERT IGNORE INTO invitation_configs (id) VALUES (1);

-- =====================================================
-- 15. 内容观看用户关联表 (用于统计唯一用户数)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_viewers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    source VARCHAR(100) NOT NULL COMMENT '资源站标识',
    content_id VARCHAR(255) NOT NULL COMMENT '内容ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    first_view_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '首次观看时间',
    last_view_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后观看时间',
    UNIQUE KEY uk_content_user (source, content_id, username),
    INDEX idx_source_content (source, content_id),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容观看用户关联表';

SET FOREIGN_KEY_CHECKS = 1;

-- 完成提示
SELECT 'Database initialization completed successfully!' AS status;
