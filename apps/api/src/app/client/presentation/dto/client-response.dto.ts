import { ApiProperty } from '@nestjs/swagger';
import { ClientType, IBillingAddress, IClient, IClientContact } from '@chantia/shared';
import { Client } from '../../domain/entities/client.entity';

export class BillingAddressResponseDto implements IBillingAddress {
  @ApiProperty({ nullable: true }) line1: string | null;
  @ApiProperty({ nullable: true }) line2: string | null;
  @ApiProperty({ nullable: true }) postalCode: string | null;
  @ApiProperty({ nullable: true }) city: string | null;
  @ApiProperty({ example: 'TN' }) country: string;
}

export class ClientContactResponseDto implements IClientContact {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) firstName: string | null;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) position: string | null;
  @ApiProperty({ nullable: true }) mobilePhone: string | null;
  @ApiProperty({ nullable: true }) landlinePhone: string | null;
  @ApiProperty({ nullable: true }) email: string | null;
  @ApiProperty() isPrimary: boolean;
}

export class ClientResponseDto implements IClient {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty({ enum: ClientType }) type: ClientType;
  @ApiProperty({ nullable: true }) firstName: string | null;
  @ApiProperty({ nullable: true }) lastName: string | null;
  @ApiProperty({ nullable: true }) legalName: string | null;
  @ApiProperty() displayName: string;
  @ApiProperty({ type: BillingAddressResponseDto }) billingAddress: BillingAddressResponseDto;
  @ApiProperty({ type: [ClientContactResponseDto], description: 'Primary contact first.' })
  contacts: ClientContactResponseDto[];
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  static fromDomain(client: Client): ClientResponseDto {
    const dto = new ClientResponseDto();
    dto.id = client.id;
    dto.organizationId = client.organizationId;
    dto.type = client.type;
    dto.firstName = client.firstName;
    dto.lastName = client.lastName;
    dto.legalName = client.legalName;
    dto.displayName = client.displayName;
    dto.billingAddress = { ...client.billingAddress };
    dto.contacts = client.contacts.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      position: contact.position,
      mobilePhone: contact.mobilePhone,
      landlinePhone: contact.landlinePhone,
      email: contact.email,
      isPrimary: contact.isPrimary,
    }));
    dto.createdAt = client.createdAt?.toISOString();
    dto.updatedAt = client.updatedAt?.toISOString();
    return dto;
  }
}
