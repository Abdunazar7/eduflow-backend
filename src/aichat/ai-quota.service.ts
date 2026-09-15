import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Usage = {
  minute: number;
  minuteCount: number;
  day: string;
  dayCount: number;
};

/**
 * Per-user limits on the AI assistant, so one person cannot spend the whole
 * Groq allowance that every user of the platform shares.
 *
 * Counts live in memory. They reset if the server restarts, which is
 * acceptable because the API runs as a single instance (see README).
 */
@Injectable()
export class AiQuotaService {
  readonly perMinute = positiveInt(process.env.AI_MINUTE_LIMIT, 5);
  readonly perDay = positiveInt(process.env.AI_DAILY_LIMIT, 30);

  private readonly usage = new Map<number, Usage>();
  private readonly dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE ?? 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  /** Counts one message, or throws 429. Returns messages left today. */
  consume(userId: number): number {
    const usage = this.current(userId);

    if (usage.dayCount >= this.perDay) {
      throw new HttpException(
        {
          message: `You have used all ${this.perDay} AI messages for today. The limit resets at midnight.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (usage.minuteCount >= this.perMinute) {
      throw new HttpException(
        {
          message: 'You are sending AI messages too quickly. Please wait a minute.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    usage.minuteCount++;
    usage.dayCount++;
    return this.perDay - usage.dayCount;
  }

  /** Gives a message back when the request failed on Groq's side. */
  refund(userId: number) {
    const usage = this.usage.get(userId);
    if (!usage) return;
    usage.minuteCount = Math.max(0, usage.minuteCount - 1);
    usage.dayCount = Math.max(0, usage.dayCount - 1);
  }

  remaining(userId: number) {
    return {
      remainingToday: this.perDay - this.current(userId).dayCount,
      dailyLimit: this.perDay,
    };
  }

  private current(userId: number): Usage {
    const now = new Date();
    const minute = Math.floor(now.getTime() / 60_000);
    const day = this.dayFormat.format(now);

    let usage = this.usage.get(userId);
    if (!usage) {
      usage = { minute, minuteCount: 0, day, dayCount: 0 };
      this.usage.set(userId, usage);
      this.forgetOtherDays(day);
    }
    if (usage.minute !== minute) {
      usage.minute = minute;
      usage.minuteCount = 0;
    }
    if (usage.day !== day) {
      usage.day = day;
      usage.dayCount = 0;
    }
    return usage;
  }

  /** Keeps the map from growing forever on a long-running server. */
  private forgetOtherDays(today: string) {
    if (this.usage.size < 10_000) return;
    for (const [id, usage] of this.usage) {
      if (usage.day !== today) this.usage.delete(id);
    }
  }
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
