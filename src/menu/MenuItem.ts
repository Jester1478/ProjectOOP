import { Money } from '../core/Money.ts';

/** หมวดของสินค้าในเมนู */
export enum Category {
  Drink = 'เครื่องดื่ม',
  Food = 'อาหาร',
  Dessert = 'ของหวาน',
}

/**
 * Interface = "สัญญา" ที่บอกว่าคลาสต้องมีอะไร แต่ไม่บอกว่าทำอย่างไร
 * คลาสหนึ่ง extends ได้แค่คลาสเดียว แต่ implement interface ได้หลายอัน
 */
export interface Priceable {
  calculatePrice(): Money;
}

/** ตัวเลือกเสริมที่คิดเงินเพิ่ม เช่น ไข่มุก, ไข่ดาว, วิปครีม */
export class AddOn {
  constructor(
    readonly name: string,
    readonly price: Money,
  ) {}
}

/**
 * MenuItem - Abstract Class (คลาสแม่ของสินค้าทุกชนิด)
 *
 * แนวคิด OOP:
 *  - Abstraction: บอกว่า "สินค้าทุกชนิดต้องคิดราคาได้" แต่ไม่บอกว่าคิดยังไง
 *    เพราะกาแฟกับข้าวผัดคิดไม่เหมือนกัน / สร้าง object จากคลาสนี้ตรง ๆ ไม่ได้
 *  - Encapsulation: basePrice เป็น protected คลาสลูกใช้ได้ แต่ข้างนอกแก้ไม่ได้
 *  - Inheritance: Drink / Food / Dessert สืบทอดจากคลาสนี้
 */
export abstract class MenuItem implements Priceable {
  protected constructor(
    readonly id: string,
    readonly name: string,
    protected readonly basePrice: Money,
  ) {
    if (basePrice.isNegative()) {
      throw new RangeError(`ราคาของ "${name}" ติดลบไม่ได้`);
    }
  }

  /** คลาสลูกต้องบอกว่าตัวเองอยู่หมวดไหน */
  abstract get category(): Category;

  /** คลาสลูกต้องบอกเวลาเตรียมของตัวเอง (นาที) */
  abstract get prepMinutes(): number;

  /**
   * คลาสลูกต้องคิดราคาของตัวเอง
   * นี่คือหัวใจของ Polymorphism: เรียก item.calculatePrice() เหมือนกันหมด
   * แต่ได้ตรรกะการคิดเงินของแต่ละชนิดสินค้า
   */
  abstract calculatePrice(): Money;

  /** ชื่อแบบเต็มที่รวมตัวเลือกต่าง ๆ - คลาสลูก override เพื่อเติมรายละเอียด */
  get fullName(): string {
    return this.name;
  }

  /** คำสั่งทำของสำหรับพนักงาน - คลาสลูก override ได้ */
  prepare(): string {
    return `[${this.category}] เตรียม ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  describe(): string {
    return `${this.fullName} — ${this.calculatePrice()}`;
  }
}
