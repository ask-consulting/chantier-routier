import { EquipmentCategory } from '../enums/equipment.enums';

/**
 * The equipment reference list — fixed, global, the same for every
 * organization. An organization picks a type from here for each machine it
 * owns or hires, and describes the machine itself (brand, model, fleet number)
 * on its own record.
 *
 * Code, not a table: like the permission matrix, it is read by the API, the
 * web and the mobile app alike, offline included, and it changes only when we
 * change it. Labels are translations and live in `messages/*.json` under
 * `equipmentType.<code>`; this file holds what is not a translation.
 *
 * **Every category ends with an `…_other` type.** A machine the list does not
 * know is still recorded — under the closest category, with its own
 * designation — and still costs correctly, since the default lifetime comes
 * from the category. Types that keep appearing there are the ones to add.
 *
 * **Default lifetimes follow Tunisian tax rules** (décret n° 2008-492, maximum
 * straight-line rates): public-works equipment and road vehicles 20 % a year,
 * hence 60 months; general equipment and tools 15 %, hence 80 months; light
 * constructions 10 %, hence 120. A default only — each machine may override it.
 */

export interface EquipmentTypeDefinition {
  /** Stable identifier, stored on every machine. Never renamed. */
  code: string;
  category: EquipmentCategory;
  /** Straight-line depreciation period, in months. */
  defaultUsefulLifeMonths: number;
}

/** 20 % a year — public-works machines and road vehicles. */
const PUBLIC_WORKS = 60;
/** 15 % a year — general equipment and tools. */
const EQUIPMENT_AND_TOOLS = 80;
/** 10 % a year — light constructions (site huts). */
const LIGHT_CONSTRUCTION = 120;

function types(
  category: EquipmentCategory,
  months: number,
  codes: readonly string[],
): EquipmentTypeDefinition[] {
  return codes.map((code) => ({ code, category, defaultUsefulLifeMonths: months }));
}

export const EQUIPMENT_TYPES: readonly EquipmentTypeDefinition[] = [
  ...types(EquipmentCategory.EARTHMOVING, PUBLIC_WORKS, [
    'crawler_excavator',
    'wheeled_excavator',
    'mini_excavator',
    'backhoe_loader',
    'wheel_loader',
    'track_loader',
    'skid_steer_loader',
    'bulldozer',
    'motor_grader',
    'scraper',
    'articulated_dump_truck',
    'rigid_dump_truck',
    'trencher',
    'earthmoving_other',
  ]),
  ...types(EquipmentCategory.COMPACTION, PUBLIC_WORKS, [
    'single_drum_roller',
    'tandem_roller',
    'pneumatic_roller',
    'padfoot_roller',
    'combination_roller',
    'plate_compactor',
    'rammer',
    'compaction_other',
  ]),
  ...types(EquipmentCategory.PAVING, PUBLIC_WORKS, [
    'asphalt_paver',
    'cold_milling_machine',
    'bitumen_distributor',
    'chip_spreader',
    'soil_stabilizer',
    'binder_spreader',
    'asphalt_plant',
    'road_sweeper',
    'paving_other',
  ]),
  ...types(EquipmentCategory.CONCRETE, PUBLIC_WORKS, [
    'concrete_mixer_truck',
    'concrete_pump',
    'concrete_mixer',
    'slipform_paver',
    'concrete_other',
  ]),
  ...types(EquipmentCategory.TRANSPORT, PUBLIC_WORKS, [
    'dump_truck',
    'tipper_semi_trailer',
    'lowbed_trailer',
    'tractor_unit',
    'water_tanker',
    'fuel_tanker',
    'flatbed_truck',
    'transport_other',
  ]),
  ...types(EquipmentCategory.LIFTING, PUBLIC_WORKS, [
    'mobile_crane',
    'telehandler',
    'forklift',
    'aerial_platform',
    'lifting_other',
  ]),
  ...types(EquipmentCategory.DRILLING_BREAKING, PUBLIC_WORKS, [
    'hydraulic_breaker',
    'drilling_rig',
    'jackhammer',
    'floor_saw',
    'drilling_breaking_other',
  ]),
  ...types(EquipmentCategory.SIGNAGE, EQUIPMENT_AND_TOOLS, [
    'road_marking_machine',
    'arrow_board_trailer',
    'temporary_traffic_lights',
    'signage_other',
  ]),
  ...types(EquipmentCategory.SITE_EQUIPMENT, EQUIPMENT_AND_TOOLS, [
    'generator',
    'air_compressor',
    'water_pump',
    'lighting_tower',
    'welding_machine',
    'fuel_tank',
    'site_equipment_other',
  ]),
  { code: 'site_hut', category: EquipmentCategory.SITE_EQUIPMENT, defaultUsefulLifeMonths: LIGHT_CONSTRUCTION },
  ...types(EquipmentCategory.SURVEYING, EQUIPMENT_AND_TOOLS, [
    'total_station',
    'gnss_receiver',
    'laser_level',
    'surveying_other',
  ]),
  ...types(EquipmentCategory.LIGHT_VEHICLE, PUBLIC_WORKS, [
    'pickup',
    'van',
    'car',
    'light_vehicle_other',
  ]),
];

const BY_CODE: ReadonlyMap<string, EquipmentTypeDefinition> = new Map(
  EQUIPMENT_TYPES.map((type) => [type.code, type]),
);

/** Every type code — for a validator's allow-list. */
export const EQUIPMENT_TYPE_CODES: readonly string[] = EQUIPMENT_TYPES.map((type) => type.code);

/** The definition of a type, or `undefined` for a code the catalog does not know. */
export function equipmentType(code: string): EquipmentTypeDefinition | undefined {
  return BY_CODE.get(code);
}

/** The codes of one category, in catalog order — for a picker or a filter. */
export function equipmentTypesOf(category: EquipmentCategory): readonly EquipmentTypeDefinition[] {
  return EQUIPMENT_TYPES.filter((type) => type.category === category);
}
