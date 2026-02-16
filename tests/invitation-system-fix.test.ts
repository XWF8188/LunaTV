import {
  InvitationService,
  PointsService,
  generateInvitationCode,
} from '../src/lib/invitation-points';
import { db } from '../src/lib/db';

async function testInvitationSystem() {
  console.log('=== 测试邀请系统修复 ===\n');

  try {
    // 测试1: 生成邀请码
    console.log('测试1: 生成邀请码');
    const testUsername = 'testuser' + Date.now();
    const code = await InvitationService.generateInvitationCode(testUsername);
    console.log('生成的邀请码:', code);
    console.log('邀请码长度:', code.length);
    console.log('✓ 邀请码生成成功\n');

    // 测试2: 验证邀请码
    console.log('测试2: 验证邀请码');
    const validation = await InvitationService.validateInvitationCode(code);
    console.log('验证结果:', validation);
    if (validation.valid && validation.inviter === testUsername) {
      console.log('✓ 邀请码验证成功，找到正确的邀请人\n');
    } else {
      console.log('✗ 邀请码验证失败\n');
    }

    // 测试3: 验证无效邀请码
    console.log('测试3: 验证无效邀请码');
    const invalidValidation =
      await InvitationService.validateInvitationCode('INVALID_CODE');
    console.log('无效码验证结果:', invalidValidation);
    if (!invalidValidation.valid) {
      console.log('✓ 无效邀请码验证正确\n');
    } else {
      console.log('✗ 无效邀请码验证错误\n');
    }

    // 测试4: 获取用户邀请信息
    console.log('测试4: 获取用户邀请信息');
    const inviteInfo =
      await InvitationService.getUserInvitationInfo(testUsername);
    console.log('用户邀请信息:', inviteInfo);
    if (inviteInfo.code === code) {
      console.log('✓ 用户邀请信息获取成功\n');
    } else {
      console.log('✗ 用户邀请信息获取失败\n');
    }

    console.log('=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testInvitationSystem();
