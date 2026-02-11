/* eslint-disable no-console,@typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';
import { ActivationCodeService } from '@/lib/activation-code-service';
import { UserExpirationService } from '@/lib/user-expiration-service';

export const runtime = 'nodejs';

const STORAGE_TYPE =
  (process.env.NEXT_PUBLIC_STORAGE_TYPE as
    | 'localstorage'
    | 'redis'
    | 'upstash'
    | 'kvrocks'
    | undefined) || 'localstorage';

async function generateSignature(
  data: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateAuthCookie(
  username?: string,
  password?: string,
  role?: 'owner' | 'admin' | 'user',
  includePassword = false,
): Promise<string> {
  const authData: any = { role: role || 'user' };

  if (includePassword && password) {
    authData.password = password;
  }

  if (username && process.env.PASSWORD) {
    authData.username = username;
    const signature = await generateSignature(username, process.env.PASSWORD);
    authData.signature = signature;
    authData.timestamp = Date.now();
  }

  return encodeURIComponent(JSON.stringify(authData));
}

export async function POST(req: NextRequest) {
  try {
    if (STORAGE_TYPE === 'localstorage') {
      return NextResponse.json(
        { error: 'localStorage 模式不支持用户注册' },
        { status: 400 },
      );
    }

    const { username, password, confirmPassword, activationCode } =
      await req.json();

    let config: any;
    try {
      config = await getConfig();
      const allowRegister = config.UserConfig?.AllowRegister !== false;

      if (!allowRegister) {
        return NextResponse.json(
          { error: '管理员已关闭用户注册功能' },
          { status: 403 },
        );
      }

      const activationCodeConfig = config.ActivationCodeConfig;
      const isActivationCodeEnabled = activationCodeConfig?.enabled === true;

      if (isActivationCodeEnabled && !activationCode) {
        return NextResponse.json({ error: '请输入卡密' }, { status: 400 });
      }
    } catch (err) {
      console.error('检查注册配置失败', err);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 },
      );
    }

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

    if (username === process.env.USERNAME) {
      return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: '用户名只能包含字母、数字和下划线，长度3-20位' },
        { status: 400 },
      );
    }

    try {
      const activationCodeConfig = config.ActivationCodeConfig;
      const isActivationCodeEnabled = activationCodeConfig?.enabled === true;

      if (isActivationCodeEnabled) {
        const isValidCode =
          await ActivationCodeService.validateCode(activationCode);
        if (!isValidCode) {
          return NextResponse.json({ error: '无效的卡密' }, { status: 400 });
        }
      }

      const userExists = await db.checkUserExist(username);
      if (userExists) {
        return NextResponse.json(
          { error: '该用户名已被注册' },
          { status: 400 },
        );
      }

      clearConfigCache();

      const defaultTags =
        config.SiteConfig.DefaultUserTags &&
        config.SiteConfig.DefaultUserTags.length > 0
          ? config.SiteConfig.DefaultUserTags
          : undefined;

      if (defaultTags) {
        await db.createUserV2(
          username,
          password,
          'user',
          defaultTags,
          undefined,
          undefined,
        );
      } else {
        await db.registerUser(username, password);
      }

      if (isActivationCodeEnabled) {
        await ActivationCodeService.useCode(activationCode, username);
        const validityDays = activationCodeConfig?.defaultValidityDays || 365;
        await UserExpirationService.setExpirationDate(username, validityDays);
      }

      clearConfigCache();

      try {
        console.log('=== 调试：验证用户创建 ===');
        const verifyUser = await db.getUserInfoV2(username);
        console.log('数据库中的用户信息:', verifyUser);
      } catch (debugErr) {
        console.error('调试日志失败:', debugErr);
      }

      const storageType =
        process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
      const response = NextResponse.json({
        ok: true,
        message: '注册成功，已自动登录',
        needDelay: storageType === 'upstash',
      });

      const cookieValue = await generateAuthCookie(
        username,
        password,
        'user',
        false,
      );
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

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
      const errorMessage =
        err instanceof Error ? err.message : '注册失败，请稍后重试';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error('注册接口异常', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
