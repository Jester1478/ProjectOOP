import { Money } from '../core/Money.ts';
import { Category, MenuItem } from './MenuItem.ts';

/** ค่าไอศกรีมที่เสิร์ฟคู่ (บาท) */
const ICE_CREAM_PRICE = 25;

/**
 * Dessert - ของหวาน
 *
 * ตัวอย่างคลาสลูกที่เรียบง่ายที่สุด: ราคาฐาน + ไอศกรีม (ถ้าสั่ง)
 * แต่ก็ยังใช้งานร่วมกับ Drink และ Food ได้ทุกที่ เพราะเป็น MenuItem เหมือนกัน
 */
export class Dessert extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: Money,
    readonly withIceCream: boolean = false,
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Dessert;
  }

  override get prepMinutes(): number {
    return this.withIceCream ? 3 : 2;
  }

  override calculatePrice(): Money {
    return this.withIceCream
      ? this.basePrice.plus(Money.baht(ICE_CREAM_PRICE))
      : this.basePrice;
  }

  override get fullName(): string {
    return this.withIceCream ? `${this.name} + ไอศกรีม` : this.name;
  }

  addIceCream(): Dessert {
    return new Dessert(this.id, this.name, this.basePrice, true);
  }
}
