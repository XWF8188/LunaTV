import { db } from '@/lib/db';

export interface ActivationCode {
  code: string;
  status: 'unused' | 'used';
  createdAt: string;
  usedAt?: string;
  usedBy?: string;
  createdBy: string;
}

export class ActivationCodeService {
  private static CODE_LENGTH = 32;
  private static CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  static generateCode(): string {
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      if (i > 0 && i % 8 === 0) {
        code += '-';
      }
      code += this.CHARACTERS.charAt(
        Math.floor(Math.random() * this.CHARACTERS.length),
      );
    }
    return code;
  }

  static async createCode(createdBy: string): Promise<ActivationCode> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateCode();
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('生成卡密失败，请重试');
      }
    } while (await db.getActivationCode(code));

    await db.createActivationCode(code, createdBy);
    const activationCode = await db.getActivationCode(code);
    return activationCode as ActivationCode;
  }

  static async createCodes(
    count: number,
    createdBy: string,
  ): Promise<ActivationCode[]> {
    if (count < 1 || count > 1000) {
      throw new Error('单次生成数量不能超过 1000');
    }

    const codes: ActivationCode[] = [];
    for (let i = 0; i < count; i++) {
      const code = await this.createCode(createdBy);
      codes.push(code);
    }
    return codes;
  }

  static async validateCode(code: string): Promise<boolean> {
    const activationCode = await db.getActivationCode(code);
    if (!activationCode) {
      return false;
    }
    return activationCode.status === 'unused';
  }

  static async useCode(code: string, username: string): Promise<void> {
    const activationCode = await db.getActivationCode(code);
    if (!activationCode) {
      throw new Error('无效的卡密');
    }
    if (activationCode.status === 'used') {
      throw new Error('该卡密已被使用');
    }
    await db.updateActivationCodeUsed(code, username);
  }

  static async getAllCodes(): Promise<ActivationCode[]> {
    return await db.getAllActivationCodes();
  }

  static async deleteCode(code: string): Promise<void> {
    await db.deleteActivationCode(code);
  }
}
