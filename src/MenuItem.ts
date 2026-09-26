import { baht } from './utils.ts';

/** หมวดของสินค้าในเมนู */
export enum Category {
  Drink = 'เครื่องดื่ม',
  Food = 'อาหาร',
  Dessert = 'ของหวาน',
}

/**
 * MenuItem - Abstract Class (คลาสแม่ของสินค้าทุกชนิด)  [คลาสที่ 1]
 *
 * แนวคิด OOP:
 *  - Abstraction: บอกว่า "สินค้าทุกชนิดต้องคิดราคาได้" แต่ไม่บอกว่าคิดยังไง
 *    เพราะกาแฟกับข้าวผัดคิดไม่เหมือนกัน — สร้าง object จากคลาสนี้ตรง ๆ ไม่ได้
 *  - Encapsulation: basePrice เป็น protected คลาสลูกใช้ได้ แต่โค้ดข้างนอกแก้ไม่ได้
 *  - Inheritance: Drink / Food / Dessert สืบทอดจากคลาสนี้
 */
export abstract class MenuItem {
  protected constructor(
    readonly id: string,
    readonly name: string,
    protected readonly basePrice: number,
  ) {
    // ด่านเดียวที่กันสตางค์ไว้ทั้งระบบ - ราคาทุกสินค้าต้องเป็นจำนวนเต็มบาท
    if (!Number.isInteger(basePrice) || basePrice < 0) {
      throw new RangeError(`ราคาของ "${name}" ต้องเป็นจำนวนเต็มบาทและไม่ติดลบ (ได้รับ ${basePrice})`);
    }
  }

  /** คลาสลูกต้องบอกว่าตัวเองอยู่หมวดไหน */
  abstract get category(): Category;

  /** คลาสลูกต้องบอกเวลาที่ใช้ทำ (นาที) */
  abstract get prepMinutes(): number;

  /**
   * คลาสลูกต้องคิดราคาของตัวเอง
   * นี่คือหัวใจของ Polymorphism: เรียก item.calculatePrice() เหมือนกันหมด
   * แต่ได้ตรรกะการคิดเงินของแต่ละชนิดสินค้า
   */
  abstract calculatePrice(): number;

  /** ชื่อเต็มที่รวมตัวเลือกต่าง ๆ - คลาสลูก override เพื่อเติมรายละเอียด */
  get fullName(): string {
    return this.name;
  }

  /** คำสั่งทำของสำหรับพนักงาน - คลาสลูก override ได้ */
  prepare(): string {
    return `[${this.category}] เตรียม ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  /** บรรทัดที่โชว์ในหน้าเมนู - Drink override ให้โชว์ราคาครบทุกไซส์ */
  menuLabel(): string {
    return `${this.name} — ${baht(this.basePrice)}`;
  }
}
