import { ApiProperty } from '@nestjs/swagger';
import { AcquisitionMethod, EquipmentStatus, IEquipment } from '@chantia/shared';
import { Equipment } from '../../domain/entities/equipment.entity';

const money = { required: false, nullable: true, description: 'Omitted without budget:read.' };

export class EquipmentResponseDto implements IEquipment {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() typeCode: string;
  @ApiProperty() designation: string;
  @ApiProperty({ nullable: true }) fleetNumber: string | null;
  @ApiProperty({ nullable: true }) brand: string | null;
  @ApiProperty({ nullable: true }) model: string | null;
  @ApiProperty({ nullable: true }) serialNumber: string | null;
  @ApiProperty({ nullable: true }) registrationNumber: string | null;
  @ApiProperty({ nullable: true }) manufactureYear: number | null;
  @ApiProperty({ enum: EquipmentStatus }) status: EquipmentStatus;
  @ApiProperty({ enum: AcquisitionMethod }) acquisitionMethod: AcquisitionMethod;
  @ApiProperty({ format: 'date' }) acquisitionDate: string;
  @ApiProperty({ nullable: true }) supplier: string | null;
  @ApiProperty({ nullable: true, format: 'date' }) contractEndDate: string | null;
  @ApiProperty({ nullable: true, format: 'date' }) disposalDate: string | null;
  @ApiProperty({ nullable: true }) notes: string | null;

  @ApiProperty(money) purchasePrice?: number | null;
  @ApiProperty(money) residualValue?: number | null;
  @ApiProperty(money) usefulLifeMonths?: number | null;
  @ApiProperty({ ...money, format: 'date' }) depreciationEndDate?: string | null;
  @ApiProperty(money) monthlyPayment?: number | null;
  @ApiProperty(money) buyoutValue?: number | null;
  @ApiProperty(money) dailyRate?: number | null;
  @ApiProperty({ ...money, description: 'Today’s cost. Omitted without budget:read.' })
  dailyCost?: number;
  @ApiProperty({ ...money, description: 'Book value today, owned machines only.' })
  netBookValue?: number | null;

  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  /**
   * @param options.includeMoney when false, every money field is **left
   *   unset**, so the key never reaches the client — the worksite budget's rule.
   *   The lifetime and the end of depreciation are money too: with the
   *   acquisition date they give away the price's order of magnitude no more
   *   than a date does, but they sit with the figures they explain.
   * @param options.today the day the computed figures are for, `YYYY-MM-DD`.
   */
  static fromDomain(
    equipment: Equipment,
    options: { includeMoney: boolean; today: string },
  ): EquipmentResponseDto {
    const dto = new EquipmentResponseDto();
    dto.id = equipment.id;
    dto.organizationId = equipment.organizationId;
    dto.typeCode = equipment.typeCode;
    dto.designation = equipment.designation;
    dto.fleetNumber = equipment.fleetNumber;
    dto.brand = equipment.brand;
    dto.model = equipment.model;
    dto.serialNumber = equipment.serialNumber;
    dto.registrationNumber = equipment.registrationNumber;
    dto.manufactureYear = equipment.manufactureYear;
    dto.status = equipment.status;
    dto.acquisitionMethod = equipment.acquisitionMethod;
    dto.acquisitionDate = equipment.acquisitionDate;
    dto.supplier = equipment.supplier;
    dto.contractEndDate = equipment.contractEndDate;
    dto.disposalDate = equipment.disposalDate;
    dto.notes = equipment.notes;

    if (options.includeMoney) {
      dto.purchasePrice = equipment.purchasePrice;
      dto.residualValue = equipment.residualValue;
      dto.usefulLifeMonths = equipment.usefulLifeMonths;
      dto.depreciationEndDate = equipment.depreciationEndDate;
      dto.monthlyPayment = equipment.monthlyPayment;
      dto.buyoutValue = equipment.buyoutValue;
      dto.dailyRate = equipment.dailyRate;
      dto.dailyCost = Math.round(equipment.dailyCostOn(options.today) * 1000) / 1000;
      dto.netBookValue = equipment.netBookValueOn(options.today);
    }

    dto.createdAt = equipment.createdAt?.toISOString();
    dto.updatedAt = equipment.updatedAt?.toISOString();
    return dto;
  }
}
