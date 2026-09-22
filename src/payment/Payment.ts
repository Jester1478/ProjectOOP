import { Money } from '../core/Money.ts';
import { PaymentError } from '../core/errors.ts';

/** ผลลัพธ์การชำระเงิน - object ที่คืนกลับไปให้ใบเสร็จใช้ */
export class PaymentResult {
  constructor(
    readonly method: string,
    readonly amountPaid: Money,
    readonly change: Money,
    readonly reference: string,
  ) {}

  describe(): string {
    const change = this.change.isZero() ? '' : ` | เงินทอน ${this.change}`;
    return `ชำระโดย ${this.method} ${this.amountPaid}${change} | อ้างอิง ${this.reference}`;
  }
}

/**
 * Payment - Abstract Class ของวิธีชำระเงินทุกแบบ
 *
 * แนวคิด OOP:
 *  - Polymorphism: order.payWith(payment) รับ Payment อะไรก็ได้
 *    เงินสดต้องทอน / QR ต้องมีเลขอ้างอิง — แต่ผู้เรียกไม่ต้องรู้
 *  - Template Method: pay() คุมลำดับ (ตรวจยอด -> ตรวจวิธีจ่าย -> ดำเนินการ)
 *  - เพิ่มวิธีจ่ายใหม่ (บัตรเครดิต, TrueMoney) = สร้างคลาสใหม่ ไม่ต้องแก้ Order
 */
export abstract class Payment {
  protected constructor(readonly method: string) {}

  /** Template Method - ขั้นตอนกลางที่ทุกวิธีชำระเงินต้องผ่าน */
  pay(amountDue: Money): PaymentResult {
    if (amountDue.isNegative()) {
      throw new PaymentError('ยอดที่ต้องชำระติดลบ');
    }
    this.validate(amountDue);
    return this.process(amountDue);
  }

  /** ตรวจความถูกต้องก่อนตัดเงิน - ถ้าไม่ผ่านให้ throw */
  protected abstract validate(amountDue: Money): void;

  /** ดำเนินการชำระเงินจริง */
  protected abstract process(amountDue: Money): PaymentResult;

  /** ตัวช่วยสร้างเลขอ้างอิงให้คลาสลูกใช้ร่วมกัน */
  protected generateReference(prefix: string): string {
    const random = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    return `${prefix}-${random}`;
  }
}

/**
 * CashPayment - จ่ายเงินสด
 * เป็นวิธีเดียวที่มีเงินทอน จึงต้องคำนวณส่วนต่างใน process()
 */
export class CashPayment extends Payment {
  constructor(private readonly cashGiven: Money) {
    super('เงินสด');
  }

  protected override validate(amountDue: Money): void {
    if (this.cashGiven.isLessThan(amountDue)) {
      throw new PaymentError(`จ่ายเงินไม่พอ (ต้องจ่าย ${amountDue} ได้รับ ${this.cashGiven})`);
    }
  }

  protected override process(amountDue: Money): PaymentResult {
    return new PaymentResult(
      this.method,
      this.cashGiven,
      this.cashGiven.minus(amountDue),
      this.generateReference('CASH'),
    );
  }
}

/**
 * QrPayment - จ่ายผ่าน QR / พร้อมเพย์
 * จ่ายพอดีเสมอ ไม่มีเงินทอน แต่ต้องมีเบอร์พร้อมเพย์ที่ถูกต้อง
 */
export class QrPayment extends Payment {
  constructor(private readonly promptPayId: string) {
    super('QR พร้อมเพย์');
  }

  protected override validate(_amountDue: Money): void {
    const digits = this.promptPayId.replace(/\D/g, '');
    if (digits.length !== 10 && digits.length !== 13) {
      throw new PaymentError('เบอร์พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก');
    }
  }

  protected override process(amountDue: Money): PaymentResult {
    return new PaymentResult(
      this.method,
      amountDue,
      Money.zero(),
      this.generateReference('QR'),
    );
  }
}
