import { Category, MenuItem } from './MenuItem.ts';
import { CafeError } from './utils.ts';

export enum SpiceLevel {
  None = 'ไม่เผ็ด',
  Mild = 'เผ็ดน้อย',
  Hot = 'เผ็ดมาก',
}

/** ราคาไข่ดาว (บาท) */
const FRIED_EGG_PRICE = 10;

/**
 * Food - อาหาร  [คลาสที่ 3]
 *
 * คิดราคาคนละแบบกับเครื่องดื่ม: ไม่มีขนาดแก้ว ไม่มีร้อน/เย็น
 * มีแค่ไข่ดาวที่คิดเงินเพิ่ม ส่วนความเผ็ดไม่คิดเงิน
 * นี่คือเหตุผลที่ calculatePrice() ต้องเป็น abstract ในคลาสแม่
 *
 * canBeSpicy บอกว่าเมนูนี้เลือกระดับความเผ็ดได้ไหม
 * เช่น ข้าวผัดได้ แต่สลัดหรือแซนด์วิชไม่ได้
 */
export class Food extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: number,
    readonly canBeSpicy: boolean = true,
    readonly spiceLevel: SpiceLevel = SpiceLevel.None,
    readonly friedEgg: boolean = false,
  ) {
    super(id, name, basePrice);

    // กันไม่ให้เกิด object ที่ขัดแย้งในตัวเอง เช่น "สลัด (เผ็ดมาก)"
    if (!canBeSpicy && spiceLevel !== SpiceLevel.None) {
      throw new CafeError(`"${name}" เลือกระดับความเผ็ดไม่ได้`);
    }
  }

  override get category(): Category {
    return Category.Food;
  }

  override calculatePrice(): number {
    return this.basePrice + (this.friedEgg ? FRIED_EGG_PRICE : 0);
  }

  override get fullName(): string {
    const spice = this.spiceLevel === SpiceLevel.None ? '' : ` (${this.spiceLevel})`;
    return `${this.name}${spice}${this.friedEgg ? ' + ไข่ดาว' : ''}`;
  }

  override prepare(): string {
    return `[ครัว] ทำ ${this.fullName}`;
  }

  withOptions(spiceLevel: SpiceLevel, friedEgg: boolean): Food {
    return new Food(this.id, this.name, this.basePrice, this.canBeSpicy, spiceLevel, friedEgg);
  }
}
