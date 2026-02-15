/* eslint-disable no-console */

/**
 * 卡密显示问题修复测试
 *
 * 用于测试修复后的功能是否正常
 */

import { Redis } from '@upstash/redis';
import { CardKeyService } from '../src/lib/cardkey';
import { db } from '../src/lib/db';

describe('卡密显示问题修复测试', () => {
  let redis: Redis;
  let cardKeyService: CardKeyService;

  beforeAll(() => {
    // 初始化 Redis 客户端
    redis = new Redis({
      url: process.env.UPSTASH_URL || '',
      token: process.env.UPSTASH_TOKEN || '',
    });

    cardKeyService = new CardKeyService();
  });

  afterAll(async () => {
    // Upstash Redis 客户端不需要显式关闭
  });

  describe('getUserCardKey 方法测试', () => {
    const testUsername = 'test_cardkey_display';

    afterAll(async () => {
      // 清理测试数据
      await db.updateUserCardKeyInfo(testUsername, {} as any);
      await redis.del(`cardkey:user:${testUsername}`);
    });

    test('应该返回用户的卡密信息', async () => {
      // 1. 创建测试卡密
      const cardKeyResult = await cardKeyService.createCardKey('month', 1);
      const testCardKey = cardKeyResult.keys[0];

      // 2. 绑定卡密到用户
      const bindResult = await cardKeyService.bindCardKeyToUser(
        testCardKey,
        testUsername,
      );

      expect(bindResult.success).toBe(true);

      // 3. 获取用户卡密信息
      const userCardKey = await db.getUserCardKey(testUsername);

      // 4. 验证结果
      expect(userCardKey).not.toBeNull();
      expect(userCardKey?.plainKey).toBe(testCardKey);
      expect(userCardKey?.daysRemaining).toBeGreaterThan(0);
      expect(userCardKey?.isExpired).toBe(false);
    });

    test('当卡密数据丢失时应该返回 null', async () => {
      // 1. 创建测试用户卡密信息
      const userCardKeyData = {
        boundKey: 'non_existent_hash',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        boundAt: Date.now(),
      };

      await db.updateUserCardKeyInfo(testUsername, userCardKeyData);

      // 2. 获取用户卡密信息
      const userCardKey = await db.getUserCardKey(testUsername);

      // 3. 验证返回 null (因为找不到对应的卡密数据)
      expect(userCardKey).toBeNull();
    });
  });

  describe('API 路由测试', () => {
    const testUsername = 'test_api_cardkey';

    afterAll(async () => {
      // 清理测试数据
      await db.updateUserCardKeyInfo(testUsername, {} as any);
      await redis.del(`cardkey:user:${testUsername}`);
    });

    test('GET /api/user/cardkey 应该返回卡密信息', async () => {
      // 1. 创建并绑定卡密
      const cardKeyResult = await cardKeyService.createCardKey('month', 1);
      const testCardKey = cardKeyResult.keys[0];
      await cardKeyService.bindCardKeyToUser(testCardKey, testUsername);

      // 2. 调用 API (模拟请求)
      // 注意: 这里需要实际的 HTTP 客户端来测试 API
      // 这个测试示例展示测试逻辑

      // 3. 验证返回结果
      // 期望返回:
      // {
      //   hasCardKey: true,
      //   cardKeyInfo: {
      //     plainKey: testCardKey,
      //     boundKey: '...',
      //     expiresAt: ...,
      //     daysRemaining: ...,
      //     isExpiring: false,
      //     isExpired: false
      //   }
      // }

      // 清理测试数据
      await db.updateUserCardKeyInfo(testUsername, {} as any);
    });
  });

  describe('数据一致性测试', () => {
    const testUsername = 'test_consistency';

    afterAll(async () => {
      // 清理测试数据
      await db.updateUserCardKeyInfo(testUsername, {} as any);
      await redis.del(`cardkey:user:${testUsername}`);
    });

    test('用户卡密信息的 boundKey 应该存在', async () => {
      // 1. 创建并绑定卡密
      const cardKeyResult = await cardKeyService.createCardKey('month', 1);
      const testCardKey = cardKeyResult.keys[0];
      await cardKeyService.bindCardKeyToUser(testCardKey, testUsername);

      // 2. 获取用户卡密信息
      const userCardKeyInfo = await db.getUserCardKeyInfo(testUsername);

      expect(userCardKeyInfo).not.toBeNull();

      // 3. 获取卡密数据
      const cardKeyData = await db.getCardKey(userCardKeyInfo!.boundKey);

      expect(cardKeyData).not.toBeNull();
      expect(cardKeyData!.key).toBe(testCardKey);
    });

    test('删除卡密后 getUserCardKey 应该返回 null', async () => {
      // 1. 创建并绑定卡密
      const cardKeyResult = await cardKeyService.createCardKey('month', 1);
      const testCardKey = cardKeyResult.keys[0];
      await cardKeyService.bindCardKeyToUser(testCardKey, testUsername);

      // 2. 获取卡密 hash
      const userCardKeyInfo = await db.getUserCardKeyInfo(testUsername);
      const keyHash = userCardKeyInfo!.boundKey;

      // 3. 删除卡密数据 (模拟数据丢失)
      await db.deleteCardKey(keyHash);

      // 4. 获取用户卡密信息
      const userCardKey = await db.getUserCardKey(testUsername);

      // 5. 验证返回 null
      expect(userCardKey).toBeNull();
    });
  });
});
