import { Category, MenuItem } from './MenuItem.ts';

/** ราคาไอศกรีมที่เสิร์ฟคู่ (บาท) */
const ICE_CREAM_PRICE = 25;

/**
 * Dessert - ของหวาน  [คลาสที่ 4]
 *
 * คลาสลูกที่ง่ายที่สุด: ราคาฐาน + ไอศกรีม (ถ้าสั่ง)
 * แต่ก็ยังใส่ลงบิลรวมกับเครื่องดื่มและอาหารได้ เพราะเป็น MenuItem เหมือนกัน
 * สังเกตว่าคลาสนี้ไม่ได้ override prepare() จึงใช้ของคลาสแม่ไปเลย
 */
export class Dessert extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: number,
    readonly withIceCream: boolean = false,
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Dessert;
  }

  override calculatePrice(): number {
    return this.basePrice + (this.withIceCream ? ICE_CREAM_PRICE : 0);
  }

  override get fullName(): string {
    return this.withIceCream ? `${this.name} + ไอศกรีม` : this.name;
  }

  addIceCream(): Dessert {
    return new Dessert(this.id, this.name, this.basePrice, true);
  }
}
