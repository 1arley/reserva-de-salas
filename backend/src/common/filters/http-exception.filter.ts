import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      exception = this.mapPrismaError(exception);
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse
        ? (errorResponse as { message: unknown }).message
        : errorResponse;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new HttpException('Registro duplicado.', HttpStatus.CONFLICT);
    }

    if (error.code === 'P2025') {
      return new HttpException(
        'Registro não encontrado.',
        HttpStatus.NOT_FOUND,
      );
    }

    return error;
  }
}
