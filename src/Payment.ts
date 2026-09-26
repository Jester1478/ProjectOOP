import { CafeError, baht } from './utils.ts';

/**
 * Payment - Abstract Class ของวิธีชำระเงิน  [คลาสที่ 6]
 *
 * แนวคิด OOP:
 *  - Polymorphism: order.payWith(payment) รับ Payment อะไรก็ได้
 *    เงินสดต้องทอน / QR ต้องเช็คเบอร์พร้อมเพย์ — แต่ผู้เรียกไม่ต้องรู้เลย
 *  - Template Method: pay() คุมลำดับขั้นตอน (ตรวจข้อมูล -> ตัดเงิน -> คืนเงินทอน)
 *    คลาสลูกเติมแค่ 2 จุดที่ต่างกันจริง ๆ
 *  - Open/Closed: อยากเพิ่มบัตรเครดิต = สร้างคลาสใหม่ ไม่ต้องแก้ Order เลย
 */
export abstract class Payment {
  protected constructor(readonly method: string) {}

  /**
   * Template Method - ขั้นตอนกลางที่ทุกวิธีชำระเงินต้องผ่าน
   * คืนค่า "เงินทอน" (วิธีที่ไม่มีเงินทอนจะคืน 0)
   */
  pay(amountDue: number): number {
    if (amountDue <= 0) {
      throw new CafeError('ยอดที่ต้องชำระต้องมากกว่า 0');
    }
    this.validate(amountDue);
    return this.process(amountDue);
  }

  /** ตรวจความถูกต้องก่อนตัดเงิน - ถ้าไม่ผ่านให้ throw */
  protected abstract validate(amountDue: number): void;

  /** ตัดเงินจริง แล้วคืนเงินทอน */
  protected abstract process(amountDue: number): number;
}

/**
 * CashPayment - จ่ายเงินสด  [คลาสที่ 7]
 * เป็นวิธีเดียวที่มีเงินทอน
 */
export class CashPayment extends Payment {
  constructor(private readonly cashGiven: number) {
    super('เงินสด');
  }

  protected override validate(amountDue: number): void {
    if (!Number.isInteger(this.cashGiven)) {
      throw new CafeError('รับเงินเป็นจำนวนเต็มบาทเท่านั้น (ร้านไม่รับสตางค์)');
    }
    if (this.cashGiven < amountDue) {
      throw new CafeError(`จ่ายเงินไม่พอ (ต้องจ่าย ${baht(amountDue)} ได้รับ ${baht(this.cashGiven)})`);
    }
  }

  protected override process(amountDue: number): number {
    return this.cashGiven - amountDue;
  }
}

/**
 * QrPayment - จ่ายผ่าน QR พร้อมเพย์  [คลาสที่ 8]
 * จ่ายพอดีเสมอ ไม่มีเงินทอน แต่ต้องมีเบอร์พร้อมเพย์ที่ถูกต้อง
 */
export class QrPayment extends Payment {
  constructor(private readonly promptPayId: string) {
    super('QR พร้อมเพย์');
  }

  protected override validate(_amountDue: number): void {
    const digits = this.promptPayId.replace(/\D/g, '');
    if (digits.length !== 10 && digits.length !== 13) {
      throw new CafeError('เบอร์พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตรประชาชน 13 หลัก');
    }
  }

  protected override process(_amountDue: number): number {
    return 0; // จ่ายพอดี ไม่มีเงินทอน
  }
}
