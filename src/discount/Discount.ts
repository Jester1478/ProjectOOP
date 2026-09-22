import { Money } from '../core/Money.ts';
import type { Customer } from '../people/Person.ts';
import { MembershipTier } from '../people/Person.ts';

/**
 * ข้อมูลเท่าที่กฎส่วนลดจำเป็นต้องรู้
 * ไม่ส่ง Order ทั้งก้อนให้ เพราะกฎไม่ควรมีสิทธิ์ไปแก้บิล (least privilege)
 */
export interface DiscountContext {
  readonly subtotal: Money;
  readonly drinkCount: number;
  readonly customer?: Customer;
}

/** ผลของส่วนลดหนึ่งรายการ - เก็บไว้โชว์ในใบเสร็จ */
export class AppliedDiscount {
  constructor(
    readonly name: string,
    readonly amount: Money,
  ) {}
}

/**
 * Discount - Abstract Class ของกฎส่วนลดทุกแบบ (Strategy Pattern)
 *
 * แนวคิด OOP:
 *  - Polymorphism: Order เก็บ Discount[] แล้วเรียก applyTo() เหมือนกันหมด
 *    ไม่ต้องรู้เลยว่าเป็นส่วนลดสมาชิกหรือโปรโค้ด
 *  - Template Method: applyTo() เป็นขั้นตอนตายตัว (เช็คเงื่อนไข -> คิดเลข -> กันติดลบ)
 *    เปิดให้คลาสลูกเติมเฉพาะ 2 จุดที่ต่างกันจริง ๆ
 *  - Open/Closed: เพิ่มโปรใหม่ = สร้างคลาสใหม่ ไม่ต้องแก้ Order เลย
 */
export abstract class Discount {
  protected constructor(readonly name: string) {}

  /** Template Method - โครงที่คลาสลูกห้ามเปลี่ยน */
  applyTo(context: DiscountContext): AppliedDiscount | undefined {
    if (!this.isApplicableTo(context)) return undefined;

    const amount = this.calculate(context).clampToZero();
    return amount.isZero() ? undefined : new AppliedDiscount(this.name, amount);
  }

  /** คลาสลูกบอกเงื่อนไขว่าโปรนี้ใช้ได้เมื่อไร */
  protected abstract isApplicableTo(context: DiscountContext): boolean;

  /** คลาสลูกบอกวิธีคิดเงินส่วนลด */
  protected abstract calculate(context: DiscountContext): Money;
}

/** ส่วนลดตามระดับสมาชิก (%) */
const TIER_RATE: Readonly<Record<MembershipTier, number>> = {
  [MembershipTier.Regular]: 0,
  [MembershipTier.Silver]: 5,
  [MembershipTier.Gold]: 10,
};

/**
 * MemberDiscount - ลดตามระดับสมาชิก
 * ตัดสินใจจาก "สถานะของลูกค้า" ไม่ใช่จากยอดเงิน
 */
export class MemberDiscount extends Discount {
  constructor() {
    super('ส่วนลดสมาชิก');
  }

  protected override isApplicableTo(context: DiscountContext): boolean {
    return context.customer !== undefined && TIER_RATE[context.customer.tier] > 0;
  }

  protected override calculate(context: DiscountContext): Money {
    if (context.customer === undefined) return Money.zero();
    return context.subtotal.percent(TIER_RATE[context.customer.tier]);
  }
}

/**
 * PromoCodeDiscount - ลด % เมื่อซื้อครบยอดที่กำหนด
 * ตัดสินใจจาก "ยอดเงินในบิล" คนละเงื่อนไขกับ MemberDiscount
 * แต่ Order เรียกใช้ด้วยวิธีเดียวกันเป๊ะ
 */
export class PromoCodeDiscount extends Discount {
  constructor(
    name: string,
    private readonly rate: number,
    private readonly minSubtotal: Money = Money.zero(),
  ) {
    super(name);
    if (rate <= 0 || rate > 100) {
      throw new RangeError(`เปอร์เซ็นต์ส่วนลดต้องอยู่ระหว่าง 1-100 (ได้รับ ${rate})`);
    }
  }

  protected override isApplicableTo(context: DiscountContext): boolean {
    return !context.subtotal.isLessThan(this.minSubtotal);
  }

  protected override calculate(context: DiscountContext): Money {
    return context.subtotal.percent(this.rate);
  }
}
