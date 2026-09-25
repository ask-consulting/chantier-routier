import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IUpdateClient } from '@chantia/shared';
import { ClientContactDto } from './client-input.dto';
import { CreateClientDto } from './create-client.dto';

/**
 * Every field optional. `contacts`, when present, is the **whole** new list:
 * an existing contact is kept by sending its `id`, and one left out is removed.
 */
export class UpdateClientDto extends PartialType(CreateClientDto) implements IUpdateClient {
  @ApiPropertyOptional({
    type: [ClientContactDto],
    description: 'The complete list. Contacts not listed are removed.',
  })
  declare contacts?: ClientContactDto[];
}
