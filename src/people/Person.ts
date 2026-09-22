import type { Money } from '../core/Money.ts';
import type { Order } from '../order/Order.ts';

/** ระดับสมาชิก - ใช้กำหนดส่วนลดใน MemberDiscount */
export enum MembershipTier {
  Regular = 'ลูกค้าทั่วไป',
  Silver = 'สมาชิกเงิน',
  Gold = 'สมาชิกทอง',
}

/** แต้มที่ต้องสะสมเพื่อเลื่อนระดับ */
const SILVER_POINTS = 200;
const GOLD_POINTS = 500;

/** ใช้จ่ายครบ 20 บาท ได้ 1 แต้ม */
const BAHT_PER_POINT = 20;

/**
 * Person - Abstract Class (คลาสแม่ของคนทุกคนในระบบ)
 *
 * แนวคิด OOP: Abstraction + Inheritance
 * ทั้งลูกค้าและพนักงานเป็น "คน" ที่มีชื่อเหมือนกัน จึงยกส่วนที่ซ้ำมาไว้ที่นี่
 */
export abstract class Person {
  protected constructor(readonly name: string) {
    if (name.trim().length === 0) {
      throw new RangeError('ชื่อว่างไม่ได้');
    }
  }

  /** คลาสลูกต้องบอกว่าตัวเองมีบทบาทอะไรในร้าน */
  abstract get role(): string;

  describe(): string {
    return `${this.name} (${this.role})`;
  }
}

/**
 * Customer - ลูกค้า
 *
 * แนวคิด OOP: Encapsulation
 * points เป็น private โค้ดข้างนอกจะ "แจกแต้มมั่ว" ไม่ได้
 * ต้องผ่าน earnPoints() ที่คำนวณจากยอดซื้อจริงเท่านั้น
 * และ tier เลื่อนระดับให้เองตามแต้ม ไม่ต้องให้ใครมาตั้งค่า
 */
export class Customer extends Person {
  private points: number;

  constructor(name: string, initialPoints = 0) {
    super(name);
    this.points = Math.max(0, Math.floor(initialPoints));
  }

  override get role(): string {
    return this.tier;
  }

  /** อ่านแต้มได้ แต่แก้ไม่ได้ (ไม่มี setter) */
  get loyaltyPoints(): number {
    return this.points;
  }

  get tier(): MembershipTier {
    if (this.points >= GOLD_POINTS) return MembershipTier.Gold;
    if (this.points >= SILVER_POINTS) return MembershipTier.Silver;
    return MembershipTier.Regular;
  }

  /** สะสมแต้มจากยอดที่จ่ายจริง คืนค่าแต้มที่ได้รับรอบนี้ */
  earnPoints(paidAmount: Money): number {
    const earned = Math.floor(paidAmount.amount / BAHT_PER_POINT);
    this.points += earned;
    return earned;
  }

  override describe(): string {
    return `${this.name} [${this.tier} - ${this.points} แต้ม]`;
  }
}

/**
 * Staff - พนักงานร้าน
 *
 * serve() เรียกแค่ order.kitchenTickets() ตัวเดียว
 * แล้วได้คำสั่งทำของทุกชนิดในบิล โดยไม่ต้องเขียน if ว่าเป็นกาแฟหรือข้าวผัด
 * เพราะ MenuItem แต่ละคลาสลูก override prepare() ของตัวเองไว้แล้ว
 */
export class Staff extends Person {
  constructor(
    name: string,
    private readonly position: string,
  ) {
    super(name);
  }

  override get role(): string {
    return this.position;
  }

  /** รับออเดอร์มาทำ คืนรายการงานที่ต้องลงมือ */
  serve(order: Order): string[] {
    return [
      `${this.name} รับออเดอร์ ${order.id}`,
      ...order.kitchenTickets().map((ticket, index) => `  ${index + 1}. ${ticket}`),
      `  เสร็จประมาณ ${order.estimatedWaitMinutes()} นาที`,
    ];
  }
}
