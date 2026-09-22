/**
 * Money - Value Object
 *
 * แนวคิด OOP ที่ใช้:
 *  - Encapsulation: เก็บค่าเงินเป็น "สตางค์" (จำนวนเต็ม) ไว้ใน private field
 *    ข้างนอกแก้ไม่ได้เลย ต้องผ่าน method ที่เราเปิดให้เท่านั้น
 *  - Immutability: ทุก method ที่ "คำนวณ" จะคืน Money ก้อนใหม่ ไม่แก้ของเดิม
 *    ทำให้ไม่มีบั๊กแบบเงินถูกแก้ข้ามที่โดยไม่รู้ตัว
 */
export class Money {
  private readonly satang: number;

  private constructor(satang: number) {
    if (!Number.isFinite(satang)) {
      throw new RangeError('จำนวนเงินไม่ถูกต้อง');
    }
    this.satang = Math.round(satang);
  }

  /** สร้างจากหน่วยบาท เช่น Money.baht(45.50) */
  static baht(amount: number): Money {
    return new Money(amount * 100);
  }

  static zero(): Money {
    return new Money(0);
  }

  /** รวมเงินหลายก้อน - ใช้ตอนหาผลรวมของบิล */
  static sum(values: readonly Money[]): Money {
    return values.reduce<Money>((total, m) => total.plus(m), Money.zero());
  }

  get amount(): number {
    return this.satang / 100;
  }

  plus(other: Money): Money {
    return new Money(this.satang + other.satang);
  }

  minus(other: Money): Money {
    return new Money(this.satang - other.satang);
  }

  times(factor: number): Money {
    return new Money(this.satang * factor);
  }

  /** คิดเป็นเปอร์เซ็นต์ของจำนวนนี้ เช่น .percent(10) = 10% ของราคา */
  percent(rate: number): Money {
    return new Money((this.satang * rate) / 100);
  }

  isZero(): boolean {
    return this.satang === 0;
  }

  isNegative(): boolean {
    return this.satang < 0;
  }

  isLessThan(other: Money): boolean {
    return this.satang < other.satang;
  }

  equals(other: Money): boolean {
    return this.satang === other.satang;
  }

  /** ถ้าติดลบให้เป็น 0 - กันส่วนลดมากกว่าราคาสินค้า */
  clampToZero(): Money {
    return this.isNegative() ? Money.zero() : this;
  }

  toString(): string {
    return `${this.amount.toFixed(2)} บาท`;
  }
}
