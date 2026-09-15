import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { JwtPayload, Tokens } from '../commons/types';
import { normalizePhone } from '../commons/utils/phone';
import {
  generateOtp,
  generateTempPassword,
  hashToken,
  tokenMatches,
} from '../commons/utils/secrets';
import { CreateUserByAdminDto, LoginDto, VerifyOtpDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// Compared against when the phone number is unknown, so a failed login costs
// the same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', BCRYPT_ROUNDS);

type TokenSubject = {
  id: number;
  phone: string;
  role: UserRole;
  tenantId: number | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Creates an inactive user and, if their Telegram is already linked, sends
   * an activation code.
   *
   * No password is created or returned here. The user receives one over
   * Telegram when they activate, which is the only channel that proves they
   * own the phone number.
   */
  async createUserAndSendOtp(dto: CreateUserByAdminDto, creator: JwtPayload) {
    const phone = normalizePhone(dto.phone);
    const tenantId =
      creator.role === UserRole.PLATFORM_ADMIN ? dto.tenantId : creator.tenantId;

    if (dto.role !== UserRole.PLATFORM_ADMIN && !tenantId) {
      throw new BadRequestException('tenantId is required for this role.');
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('This phone number is already registered.');
    }

    // Unusable until activation replaces it.
    const placeholderHash = await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS);

    const { user, telegramLinked } = await this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: {
            phone,
            passwordHash: placeholderHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            tenantId: tenantId ?? null,
            isActive: false,
          },
        });

        await this.createProfile(tx, user.id, user.role);

        const linked = await tx.telegramAccount.updateMany({
          where: { phone },
          data: { userId: user.id },
        });

        return { user, telegramLinked: linked.count > 0 };
      },
    );

    // Network call kept outside the transaction so a slow Telegram API does
    // not hold database locks open.
    const otp = telegramLinked
      ? await this.generateAndSendOtp(user.id, phone)
      : { sent: false };

    return {
      message: telegramLinked
        ? 'User created. An activation code was sent to their Telegram.'
        : 'User created but inactive. They must open the Telegram bot, share their contact, then activate from the website.',
      userId: user.id,
      telegramLinked,
      otpSent: otp.sent,
    };
  }

  /** Resend the activation code. */
  async requestOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) throw new BadRequestException('User not found.');
    if (user.isActive) {
      throw new BadRequestException('Account is already active.');
    }

    return this.generateAndSendOtp(user.id, phone);
  }

  /** Check the activation code, activate the account, deliver a password. */
  async verifyActivationOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) throw new BadRequestException('Invalid or expired code.');
    if (user.isActive) return { message: 'Account is already activated.' };

    const otp = await this.prisma.otp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException(
        'The code has expired. Please request a new one.',
      );
    }

    // Count the attempt before checking it, atomically, so parallel guesses
    // cannot all slip in under the limit.
    const counted = await this.prisma.otp.updateMany({
      where: { id: otp.id, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });

    if (counted.count === 0) {
      await this.prisma.otp.deleteMany({ where: { userId: user.id } });
      throw new BadRequestException(
        'Too many wrong attempts. Please request a new code.',
      );
    }

    if (!(await bcrypt.compare(dto.otp, otp.otpHash))) {
      throw new BadRequestException('Invalid code.');
    }

    const telegram = await this.prisma.telegramAccount.findUnique({
      where: { phone },
    });
    if (!telegram?.chatId) {
      throw new BadRequestException(
        'Your Telegram account is no longer linked. Open the bot and share your contact again.',
      );
    }

    // Deliver first, save second. If delivery fails the account stays
    // inactive and the code stays valid, so the user can simply retry.
    const password = generateTempPassword();
    const delivered = await this.telegramService.sendMessage(
      telegram.chatId,
      `🎉 <b>Account activated</b>\n\n` +
        `Your password is: <code>${password}</code>\n\n` +
        `Please log in and change it from your profile settings.`,
    );

    if (!delivered) {
      throw new ServiceUnavailableException(
        'Could not reach your Telegram. Make sure you have not blocked the bot, then try again.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          hashedRt: null,
        },
      }),
      this.prisma.otp.deleteMany({ where: { userId: user.id } }),
    ]);

    return {
      message:
        'Account activated. Your password has been sent to your Telegram.',
    };
  }

  /**
   * Public, so it returns the same answer whatever happens: it must not reveal
   * which phone numbers are registered, and it must never return the new
   * password — the previous version did, which made it a one-request account
   * takeover.
   */
  async forgotPassword(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    const response = {
      success: true,
      message:
        'If that number belongs to an active account linked to our Telegram bot, a new password has been sent there.',
    };

    const [user, telegram] = await Promise.all([
      this.prisma.user.findUnique({ where: { phone } }),
      this.prisma.telegramAccount.findUnique({ where: { phone } }),
    ]);

    if (!user?.isActive || !telegram?.chatId) return response;

    const password = generateTempPassword();
    const delivered = await this.telegramService.sendMessage(
      telegram.chatId,
      `🔑 <b>Password reset</b>\n\n` +
        `Your new password is: <code>${password}</code>\n\n` +
        `Please log in and change it immediately from your profile settings.\n` +
        `If you did not ask for this, contact your administrator.`,
    );

    // Only replace the password once the user can actually receive it,
    // otherwise a failed send would lock them out.
    if (!delivered) {
      this.logger.warn(`Password reset for user ${user.id} not delivered`);
      return response;
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          hashedRt: null,
        },
      }),
      this.prisma.otp.deleteMany({ where: { userId: user.id } }),
    ]);

    return response;
  }

  async login(dto: LoginDto) {
    const phone = normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { tenant: true },
      // PrismaService omits credentials by default; login is one of the few
      // places that needs the hash.
      omit: { passwordHash: false },
    });

    const passwordOk = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordOk) {
      throw new UnauthorizedException('Login yoki parol xato');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Profilingiz hali aktiv emas. Iltimos, OTP orqali tasdiqlang.',
      );
    }

    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      user.tenant &&
      !user.tenant.isActive
    ) {
      throw new ForbiddenException(
        "Sizning o'quv markazingiz faoliyati to'xtatilgan.",
      );
    }

    const tokens = await this.issueTokens(user, { lastLogin: new Date() });

    return {
      ...tokens,
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        tenantId: user.tenantId,
      },
    };
  }

  async logout(userId: number) {
    await this.prisma.user.updateMany({
      where: { id: userId, hashedRt: { not: null } },
      data: { hashedRt: null },
    });
    return { success: true };
  }

  /**
   * Rotates the pair. Only the most recently issued refresh token is accepted,
   * so a stolen token stops working the next time the real user refreshes.
   */
  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
      omit: { hashedRt: false },
    });

    if (!user?.hashedRt || !tokenMatches(refreshToken, user.hashedRt)) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive.');
    }

    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      user.tenant &&
      !user.tenant.isActive
    ) {
      throw new ForbiddenException(
        "Sizning o'quv markazingiz faoliyati to'xtatilgan.",
      );
    }

    return this.issueTokens(user);
  }

  /**
   * One-time bootstrap of the platform admin and default plans.
   *
   * Credentials come from SUPER_ADMIN_PHONE / SUPER_ADMIN_PASSWORD, never from
   * code. The route stays public because no user exists yet on a fresh
   * database, but whoever calls it first only ever creates the admin you
   * configured.
   */
  async initPlatform() {
    const phone = normalizePhone(process.env.SUPER_ADMIN_PHONE ?? '');
    const password = process.env.SUPER_ADMIN_PASSWORD ?? '';

    if (!phone || password.length < 12 || password === 'superadmin123') {
      throw new BadRequestException(
        'Set SUPER_ADMIN_PHONE and a strong SUPER_ADMIN_PASSWORD (12+ characters) in .env first.',
      );
    }

    const adminExists = await this.prisma.user.findFirst({
      where: { role: UserRole.PLATFORM_ADMIN },
    });
    if (adminExists) {
      throw new ForbiddenException('Tizim allaqachon sozlangan (initialized).');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const plans = [
      { name: 'Basic', monthlyPrice: 50, maxStudents: 100 },
      { name: 'Standard', monthlyPrice: 100, maxStudents: 500 },
      { name: 'Premium', monthlyPrice: 200, maxStudents: null },
    ];

    const superAdmin = await this.prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          firstName: 'Platform',
          lastName: 'Admin',
          phone,
          role: UserRole.PLATFORM_ADMIN,
          passwordHash,
          isActive: true,
        },
      });
      await tx.staffProfile.create({ data: { userId: admin.id } });
      await tx.subscriptionPlan.createMany({ data: plans });
      return admin;
    });

    return {
      message: 'Platforma muvaffaqiyatli sozlandi.',
      superAdmin: {
        id: superAdmin.id,
        phone: superAdmin.phone,
        role: superAdmin.role,
      },
      plansCreated: plans.length,
    };
  }

  // ===== Helpers =====

  private async generateAndSendOtp(userId: number, phone: string) {
    const telegram = await this.prisma.telegramAccount.findUnique({
      where: { phone },
    });

    if (!telegram?.chatId) {
      return {
        sent: false,
        message:
          'Please open the Telegram bot and share your contact first, then request a code.',
      };
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.prisma.$transaction([
      this.prisma.otp.deleteMany({ where: { userId } }),
      this.prisma.otp.create({
        data: { userId, otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
      }),
    ]);

    const sent = await this.telegramService.sendOtp(telegram.chatId, otp);

    return sent
      ? { sent: true, message: 'A code has been sent to your Telegram.' }
      : {
          sent: false,
          message:
            'Could not deliver the code. Make sure you have not blocked the bot, then try again.',
        };
  }

  private async createProfile(
    tx: Prisma.TransactionClient,
    userId: number,
    role: UserRole,
  ) {
    if (role === UserRole.STUDENT) {
      await tx.studentProfile.create({ data: { userId } });
    } else if (role === UserRole.TEACHER) {
      await tx.teacherProfile.create({
        data: { userId, salaryType: 'PERCENT', salaryValue: 0 },
      });
    } else {
      await tx.staffProfile.create({ data: { userId } });
    }
  }

  /** Signs a new pair and stores the refresh token's hash in one write. */
  private async issueTokens(
    user: TokenSubject,
    extra: Prisma.UserUpdateInput = {},
  ): Promise<Tokens> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId ?? 0,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.ACCESS_TOKEN_KEY,
        expiresIn: process.env.ACCESS_TOKEN_TIME as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.REFRESH_TOKEN_KEY,
        expiresIn: process.env.REFRESH_TOKEN_TIME as any,
        // Makes every refresh token unique even when two are signed in the
        // same second, so rotation can tell them apart.
        jwtid: randomUUID(),
      }),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { ...extra, hashedRt: hashToken(refreshToken) },
    });

    return { accessToken, refreshToken };
  }
}
