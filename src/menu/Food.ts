import { Money } from '../core/Money.ts';
import { AddOn, Category, MenuItem } from './MenuItem.ts';

export enum SpiceLevel {
  None = 'ไม่เผ็ด',
  Mild = 'เผ็ดน้อย',
  Hot = 'เผ็ดมาก',
}

/**
 * Food - อาหาร
 *
 * คิดราคาต่างจากเครื่องดื่ม: ไม่มีขนาดแก้ว ไม่มีร้อน/เย็น
 * แต่มีของเพิ่ม (ไข่ดาว, ชีส) และระดับความเผ็ดที่ไม่คิดเงิน
 * นี่คือเหตุผลที่ calculatePrice() ต้องเป็น abstract ในคลาสแม่
 */
export class Food extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: Money,
    private readonly cookMinutes: number = 8,
    readonly spiceLevel: SpiceLevel = SpiceLevel.None,
    readonly addOns: readonly AddOn[] = [],
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Food;
  }

  override get prepMinutes(): number {
    return this.cookMinutes;
  }

  override calculatePrice(): Money {
    return this.basePrice.plus(Money.sum(this.addOns.map((a) => a.price)));
  }

  override get fullName(): string {
    const spice = this.spiceLevel === SpiceLevel.None ? '' : ` (${this.spiceLevel})`;
    const addOns = this.addOns.length > 0 ? ` + ${this.addOns.map((a) => a.name).join(' + ')}` : '';
    return `${this.name}${spice}${addOns}`;
  }

  override prepare(): string {
    return `[ครัว] ทำ ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  withSpiceLevel(level: SpiceLevel): Food {
    return new Food(this.id, this.name, this.basePrice, this.cookMinutes, level, this.addOns);
  }

  withAddOns(...addOns: AddOn[]): Food {
    return new Food(this.id, this.name, this.basePrice, this.cookMinutes, this.spiceLevel, [
      ...this.addOns,
      ...addOns,
    ]);
  }
}
