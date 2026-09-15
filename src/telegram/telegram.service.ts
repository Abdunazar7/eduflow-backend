import { Update, Start, On, Ctx, InjectBot } from 'nestjs-telegraf';
import { Context, Markup, Telegraf } from 'telegraf';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../commons/utils/phone';

@Update()
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private prisma: PrismaService,
    @InjectBot() private bot: Telegraf,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply(
      'Hello! Please share your phone number to connect your account to the system:',
      Markup.keyboard([Markup.button.contactRequest('📞 Share Contact')])
        .resize()
        .oneTime(),
    );
  }

  @On('contact')
  async onContact(@Ctx() ctx: any) {
    const contact = ctx.message.contact;

    // Telegram lets a user forward *someone else's* contact card. Only accept
    // the sender's own number, otherwise anyone could link their chat to a
    // stranger's account and receive that person's OTPs and passwords.
    if (contact.user_id !== ctx.from.id) {
      await ctx.reply(
        'Please share your own phone number using the button below.',
      );
      return;
    }

    const phone = normalizePhone(contact.phone_number);
    const chatId = String(ctx.from.id);
    const username = ctx.from.username || null;

    const user = await this.prisma.user.findUnique({ where: { phone } });

    await this.prisma.telegramAccount.upsert({
      where: { phone },
      update: { chatId, username, userId: user ? user.id : null },
      create: { phone, chatId, username, userId: user ? user.id : null },
    });

    if (user) {
      let msg =
        '✅ Your phone number has been successfully connected to the system!';

      if (!user.isActive) {
        msg +=
          '\n\nYour account is not yet active. Please go to the website and click "Resend OTP" to activate your account.';
      }

      await ctx.reply(msg, Markup.removeKeyboard());
    } else {
      await ctx.reply(
        'Welcome! Your contact is saved. Please ask your Administrator to complete your account creation.',
        Markup.removeKeyboard(),
      );
    }
  }

  async sendOtp(chatId: string, otp: string): Promise<boolean> {
    const message = `🔐 <b>Verification Code</b>\n\nCode: <code>${otp}</code>\n\nDo not share this code with anyone! Valid for 5 minutes.`;
    return this.sendMessage(chatId, message);
  }

  /**
   * Returns whether Telegram accepted the message. Callers must check it: a
   * user who has blocked the bot looks exactly like a successful send
   * otherwise, and the OTP flow would tell them a code is on its way.
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
      return true;
    } catch (e: any) {
      this.logger.warn(
        `Telegram delivery to chat ${chatId} failed: ${e?.response?.description ?? e?.message}`,
      );
      return false;
    }
  }
}
