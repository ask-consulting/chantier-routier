import { HttpException, HttpStatus } from '@nestjs/common';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export class ValidationException extends HttpException {
  constructor(public readonly errors: ValidationError[]) {
    super(
      {
        message: 'Validation failed',
        errors,
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
