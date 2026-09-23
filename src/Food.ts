import { Category, MenuItem } from './MenuItem.ts';
import { round2 } from './utils.ts';

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
 */
export class Food extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: number,
    private readonly cookMinutes: number,
    readonly spiceLevel: SpiceLevel = SpiceLevel.None,
    readonly friedEgg: boolean = false,
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Food;
  }

  override get prepMinutes(): number {
    return this.cookMinutes;
  }

  override calculatePrice(): number {
    return round2(this.basePrice + (this.friedEgg ? FRIED_EGG_PRICE : 0));
  }

  override get fullName(): string {
    const spice = this.spiceLevel === SpiceLevel.None ? '' : ` (${this.spiceLevel})`;
    return `${this.name}${spice}${this.friedEgg ? ' + ไข่ดาว' : ''}`;
  }

  override prepare(): string {
    return `[ครัว] ทำ ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  withOptions(spiceLevel: SpiceLevel, friedEgg: boolean): Food {
    return new Food(this.id, this.name, this.basePrice, this.cookMinutes, spiceLevel, friedEgg);
  }
}
