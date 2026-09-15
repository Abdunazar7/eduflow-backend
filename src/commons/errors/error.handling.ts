import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type ErrorBody = Record<string, unknown>;

/**
 * One error shape for the whole API: Nest's default body
 * ({ statusCode, message, error }) plus timestamp and path.
 *
 * `message` stays exactly what Nest produces, so validation failures still
 * arrive as a per-field array the frontend can display.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { status, body } = this.describe(exception);

    // Anything unexpected is logged with its stack. The client only ever sees
    // a generic message, never internals.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...body,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      return {
        status: exception.getStatus(),
        body: typeof res === 'string' ? { message: res } : (res as ErrorBody),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            body: {
              message: 'A record with this value already exists',
              error: 'Conflict',
              field: exception.meta?.target,
            },
          };
        case 'P2003':
          return {
            status: HttpStatus.BAD_REQUEST,
            body: {
              message:
                'A related record does not exist, or this record is still in use',
              error: 'Bad Request',
            },
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            body: { message: 'Record not found', error: 'Not Found' },
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'Internal server error', error: 'Internal Server Error' },
    };
  }
}
