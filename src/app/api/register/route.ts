/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// 读取存储类型环境变量，默认 localstorage
const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

// 生成签名
async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  // 导入密钥
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // 生成签名
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // 转换为十六进制字符串
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成认证Cookie（带签名）
async function generateAuthCookie(
  username?: string,
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  includePassword = false,
): Promise<string> {
  const authData: any = { role: role || 'user' };

  // 只在需要时包含 password
  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    // 使用密码作为密钥对用户名进行签名
    const signature = await generateSignature(username, process.env.PASSWORD);
    authData.signature = signature;
    authData.timestamp = Date.now(); // 添加时间戳防重放攻击
  }

  return encodeURIComponent(JSON.stringify(authData));
}

export async function POST(req: NextRequest) {
  try {
    // localStorage 模式不支持注册
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: 'localStorage 模式不支持用户注册' },
        { status: 400 },
      );
    }

    const { username, password, confirmPassword, cardKey, invitationCode } =
      await req.json();

    // 验证卡密
    if (!cardKey || typeof cardKey !== 'string' || cardKey.trim() === '') {
      return NextResponse.json({ error: '卡密不能为空' }, { status: 400 });
    }

    // 先检查配置中是否允许注册（在验证输入之前）
    let config: any;
    try {
      config = await getConfig();
      const allowRegister = config.UserConfig?.AllowRegister !== false; // 默认允许注册

      if (!allowRegister) {
        return NextResponse.json(
          { error: '管理员已关闭用户注册功能' },
          { status: 403 },
        );
      }
    } catch (err) {
      console.error('检查注册配置失败', err);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 },
      );
    }

    // 验证输入
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: '两次输入的密码不一致' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
    }

    // 检查是否与管理员用户名冲突
    if (username === process.env.USERNAME) {
      return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
    }

    // 检查用户名格式（只允许字母数字和下划线）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线，长度3-20位' },
        { status: 400 },
      );
    }

    try {
      // 检查用户是否已存在
      const userExists = await db.checkUserExist(username);
      if (userExists) {
        return NextResponse.json(
          { error: '该用户名已被注册' },
          { status: 400 },
        );
      }

      // 清除缓存（在注册前清除，避免读到旧缓存）
      clearConfigCache();

      // 获取默认用户组
      const defaultTags =
        config.SiteConfig.DefaultUserTags &&
        config.SiteConfig.DefaultUserTags.length > 0
          ? config.SiteConfig.DefaultUserTags
          : undefined;

      // 如果有卡密或有默认用户组或邀请码，使用 V2 注册；否则使用 V1 注册（保持兼容性）
      if (cardKey || defaultTags || invitationCode) {
        // 验证邀请码
        let inviter: string | undefined;
        if (invitationCode) {
          console.log('=== 开始验证邀请码 ===');
          console.log('邀请码:', invitationCode);
          const { InvitationService } = await import('@/lib/invitation-points');
          const validation =
            await InvitationService.validateInvitationCode(invitationCode);
          console.log('邀请码验证结果:', validation);
          if (validation.valid && validation.inviter) {
            inviter = validation.inviter;
            console.log('找到邀请人:', inviter);
          } else {
            console.log('邀请码无效或未找到邀请人');
          }
          console.log('=== 邀请码验证完成 ===');
        }

        // V2 注册（支持卡密和 tags）
        await db.createUserV2(
          username,
          password,
          'user',
          defaultTags, // 默认分组
          undefined, // oidcSub
          undefined, // enabledApis
          cardKey, // 注册卡密
          inviter, // 邀请人
        );

        // 为新注册的用户生成专属邀请码
        try {
          const { InvitationService } = await import('@/lib/invitation-points');
          const userInvitationCode =
            await InvitationService.generateInvitationCode(username);
          console.log(
            `✓ 用户 ${username} 的专属邀请码已生成: ${userInvitationCode}`,
          );
        } catch (error) {
          console.error(`生成用户 ${username} 的邀请码失败:`, error);
          // 不影响注册流程
        }

        // 处理邀请奖励
        if (inviter) {
          try {
            const { InvitationService, PointsService } =
              await import('@/lib/invitation-points');

            console.log('=== 开始处理邀请奖励 ===');
            console.log('邀请人:', inviter);
            console.log('被邀请人:', username);
            console.log('邀请码:', invitationCode);

            // 获取邀请配置
            const config = await db.getInvitationConfig();
            console.log('邀请配置:', config);

            if (config?.enabled) {
              // 检查IP是否已奖励过
              const clientIp =
                req.headers.get('x-forwarded-for')?.split(',')[0] ||
                req.headers.get('x-real-ip') ||
                'unknown';
              console.log('客户端IP:', clientIp);

              const ipRewarded =
                await InvitationService.checkIPRewarded(clientIp);
              console.log('IP是否已奖励:', ipRewarded);

              if (!ipRewarded) {
                // 创建推荐关系
                await InvitationService.createReferral(
                  inviter,
                  username,
                  invitationCode,
                  clientIp,
                );
                console.log('推荐关系创建成功');

                // 发放积分奖励
                console.log('准备发放积分奖励:', config.rewardPoints);
                await PointsService.addPoints(
                  inviter,
                  config.rewardPoints,
                  '邀请好友注册',
                  username,
                );
                console.log('积分奖励发放成功');

                // 记录IP奖励
                await db.createIPRewardRecord({
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  ipAddress: clientIp,
                  inviter,
                  invitee: username,
                  rewardTime: Date.now(),
                });
                console.log('IP奖励记录创建成功');
              } else {
                console.log('IP已奖励过，跳过积分奖励');
              }
            } else {
              console.log('邀请功能未启用');
            }
            console.log('=== 邀请奖励处理完成 ===');
          } catch (error) {
            console.error('处理邀请奖励失败:', error);
            // 不影响注册流程，只记录错误
          }
        } else {
          console.log('没有邀请人，跳过邀请奖励处理');
        }
      } else {
        // V1 注册（无卡密和无tags，保持现有行为）
        await db.registerUser(username, password);

        // 为V1注册的用户也生成邀请码
        try {
          const { InvitationService } = await import('@/lib/invitation-points');
          const userInvitationCode =
            await InvitationService.generateInvitationCode(username);
          console.log(
            `✓ V1用户 ${username} 的专属邀请码已生成: ${userInvitationCode}`,
          );
        } catch (error) {
          console.error(`生成V1用户 ${username} 的邀请码失败:`, error);
          // 不影响注册流程
        }
      }

      // 清除缓存，让 configSelfCheck 从数据库同步最新用户列表（包括 tags）
      clearConfigCache();

      // 验证用户是否成功创建并包含tags（调试用）
      try {
        console.log('=== 调试：验证用户创建 ===');
        const verifyUser = await db.getUserInfoV2(username);
        console.log('数据库中的用户信息:', verifyUser);
      } catch (debugErr) {
        console.error('调试日志失败:', debugErr);
      }

      // 注册成功后自动登录
      const storageType =
        process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
      const response = NextResponse.json({
        ok: true,
        message: '注册成功，已自动登录',
        needDelay: storageType === 'upstash', // Upstash 需要延迟等待数据同步
      });

      const cookieValue = await generateAuthCookie(
        username,
        password,
        'user',
        false,
      );
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7天过期

      response.cookies.set('user_auth', cookieValue, {
        path: '/',
        expires,
        sameSite: 'lax',
        httpOnly: false,
        secure: false,
      });

      return response;
    } catch (err) {
      console.error('注册用户失败', err);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('注册接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
