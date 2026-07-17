import { HttpException, HttpStatus } from '@nestjs/common';

/** Thrown when an aggregate cannot be found; maps to HTTP 404. */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id: string) {
    super(
      {
        message: `${resource} with id ${id} not found`,
        error: 'Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
