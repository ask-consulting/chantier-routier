import { Equipment as PrismaEquipment, Prisma } from '@prisma/client';
import { AcquisitionMethod, EquipmentStatus } from '@chantia/shared';
import { Equipment } from '../../domain/entities/equipment.entity';

function money(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/** A `@db.Date` comes back as midnight UTC; the domain speaks `YYYY-MM-DD`. */
function day(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}

function date(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

export class EquipmentMapper {
  static toDomain(row: PrismaEquipment): Equipment {
    return Equipment.create({
      id: row.id,
      organizationId: row.organizationId,
      typeCode: row.typeCode,
      designation: row.designation,
      fleetNumber: row.fleetNumber,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serialNumber,
      registrationNumber: row.registrationNumber,
      manufactureYear: row.manufactureYear,
      status: row.status as EquipmentStatus,
      acquisitionMethod: row.acquisitionMethod as AcquisitionMethod,
      acquisitionDate: day(row.acquisitionDate) as string,
      supplier: row.supplier,
      purchasePrice: money(row.purchasePrice),
      residualValue: money(row.residualValue),
      usefulLifeMonths: row.usefulLifeMonths,
      monthlyPayment: money(row.monthlyPayment),
      buyoutValue: money(row.buyoutValue),
      dailyRate: money(row.dailyRate),
      contractEndDate: day(row.contractEndDate),
      disposalDate: day(row.disposalDate),
      notes: row.notes,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(equipment: Equipment): Prisma.EquipmentUncheckedCreateInput {
    return {
      id: equipment.id,
      organizationId: equipment.organizationId,
      typeCode: equipment.typeCode,
      designation: equipment.designation,
      fleetNumber: equipment.fleetNumber,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      registrationNumber: equipment.registrationNumber,
      manufactureYear: equipment.manufactureYear,
      status: equipment.status,
      acquisitionMethod: equipment.acquisitionMethod,
      acquisitionDate: date(equipment.acquisitionDate) as Date,
      supplier: equipment.supplier,
      purchasePrice: equipment.purchasePrice,
      residualValue: equipment.residualValue,
      usefulLifeMonths: equipment.usefulLifeMonths,
      monthlyPayment: equipment.monthlyPayment,
      buyoutValue: equipment.buyoutValue,
      dailyRate: equipment.dailyRate,
      contractEndDate: date(equipment.contractEndDate),
      disposalDate: date(equipment.disposalDate),
      notes: equipment.notes,
      deletedAt: equipment.deletedAt,
    };
  }
}
