import { Money } from '../core/Money.ts';
import { EmptyOrderError, InvalidQuantityError, OrderClosedError } from '../core/errors.ts';
import type { AppliedDiscount, Discount, DiscountContext } from '../discount/Discount.ts';
import { Drink } from '../menu/Drink.ts';
import type { MenuItem } from '../menu/MenuItem.ts';
import type { Payment, PaymentResult } from '../payment/Payment.ts';
import type { Customer } from '../people/Person.ts';

/** ภาษีมูลค่าเพิ่ม (%) */
const VAT_RATE = 7;

/**
 * OrderLine - หนึ่งบรรทัดในบิล (สินค้า 1 อย่าง x จำนวน)
 *
 * แนวคิด OOP: Composition
 * OrderLine "มี" MenuItem อยู่ข้างใน แต่ไม่ได้เป็น MenuItem
 * และเพราะ item เป็นชนิด MenuItem (คลาสแม่) บรรทัดเดียวกันนี้
 * จึงใส่ได้ทั้งกาแฟ ข้าวผัด และเค้ก โดยไม่ต้องเขียนโค้ดแยก
 */
export class OrderLine {
  constructor(
    readonly item: MenuItem,
    readonly quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidQuantityError(quantity);
    }
  }

  get unitPrice(): Money {
    return this.item.calculatePrice();
  }

  get subtotal(): Money {
    return this.unitPrice.times(this.quantity);
  }

  describe(): string {
    return `${this.quantity} x ${this.item.fullName}`;
  }
}

/**
 * Order - บิลหนึ่งใบ
 *
 * แนวคิด OOP:
 *  - Encapsulation: items / discounts / paid เป็น private
 *    ข้างนอกจะ push ของเข้า array ตรง ๆ ไม่ได้ ต้องผ่าน addItem() ที่ตรวจให้
 *    getter lines คืน "สำเนา" เพื่อไม่ให้ใครไปแก้ array จริงข้างใน
 *  - Composition: Order ประกอบด้วย OrderLine หลายอัน + Customer + Discount หลายอัน
 *  - Polymorphism: เก็บ MenuItem / Discount / Payment เป็นชนิดแม่ แล้วเรียก method เดียวกัน
 */
export class Order {
  private readonly items: OrderLine[] = [];
  private readonly discounts: Discount[] = [];
  private payment?: PaymentResult;

  constructor(
    readonly id: string,
    readonly customer?: Customer,
  ) {}

  // ---------- ข้อมูลพื้นฐาน ----------

  /** คืนสำเนา เพื่อป้องกันการแก้ไขจากข้างนอก */
  get lines(): readonly OrderLine[] {
    return [...this.items];
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get isPaid(): boolean {
    return this.payment !== undefined;
  }

  get totalItems(): number {
    return this.items.reduce((sum, line) => sum + line.quantity, 0);
  }

  get paymentResult(): PaymentResult | undefined {
    return this.payment;
  }

  // ---------- จัดการรายการสินค้า ----------

  addItem(item: MenuItem, quantity = 1): this {
    this.assertOpen('เพิ่มรายการ');
    this.items.push(new OrderLine(item, quantity));
    return this;
  }

  /** ลบบรรทัดตามลำดับที่แสดงในบิล (เริ่มจาก 1) */
  removeLine(lineNumber: number): OrderLine {
    this.assertOpen('ลบรายการ');

    const removed = this.items[lineNumber - 1];
    if (removed === undefined) {
      throw new RangeError(`ไม่มีรายการลำดับที่ ${lineNumber} ในบิลนี้`);
    }

    this.items.splice(lineNumber - 1, 1);
    return removed;
  }

  // ---------- ส่วนลด ----------

  applyDiscount(discount: Discount): this {
    this.assertOpen('ใช้ส่วนลด');
    this.discounts.push(discount);
    return this;
  }

  /** ส่วนลดที่ใช้ได้จริงในบิลนี้ */
  get appliedDiscounts(): AppliedDiscount[] {
    const context = this.discountContext();
    return this.discounts
      .map((discount) => discount.applyTo(context))
      .filter((applied): applied is AppliedDiscount => applied !== undefined);
  }

  // ---------- การคิดเงิน ----------

  get subtotal(): Money {
    return Money.sum(this.items.map((line) => line.subtotal));
  }

  get discountTotal(): Money {
    return Money.sum(this.appliedDiscounts.map((discount) => discount.amount));
  }

  get afterDiscount(): Money {
    return this.subtotal.minus(this.discountTotal).clampToZero();
  }

  get vat(): Money {
    return this.afterDiscount.percent(VAT_RATE);
  }

  /** ยอดที่ลูกค้าต้องจ่ายจริง */
  get total(): Money {
    return this.afterDiscount.plus(this.vat);
  }

  // ---------- ชำระเงิน ----------

  /**
   * ชำระเงิน - รับ Payment ชนิดไหนก็ได้ (Polymorphism)
   * ถ้ามีลูกค้าผูกกับบิล จะสะสมแต้มให้อัตโนมัติ
   */
  payWith(payment: Payment): PaymentResult {
    this.assertOpen('ชำระเงิน');
    if (this.isEmpty) {
      throw new EmptyOrderError();
    }

    const result = payment.pay(this.total);
    this.payment = result;
    this.customer?.earnPoints(this.total);

    return result;
  }

  // ---------- งานครัว/บาร์ ----------

  /**
   * ใบสั่งทำสำหรับครัวและบาร์
   * จุดที่ Polymorphism เห็นผลชัดที่สุด: วนลูปเรียก item.prepare() ตัวเดียว
   * แต่ได้ข้อความของบาร์ ของครัว หรือของหวาน ตามชนิดสินค้าจริง ไม่มี if เลย
   */
  kitchenTickets(): string[] {
    return this.items.flatMap((line) =>
      Array.from({ length: line.quantity }, () => line.item.prepare()),
    );
  }

  /** เวลารอประมาณ = งานที่นานที่สุด + ครึ่งหนึ่งของงานที่เหลือ (ทำขนานกันได้บางส่วน) */
  estimatedWaitMinutes(): number {
    const minutes = this.items.flatMap((line) =>
      Array.from({ length: line.quantity }, () => line.item.prepMinutes),
    );
    if (minutes.length === 0) return 0;

    const longest = Math.max(...minutes);
    const rest = minutes.reduce((sum, m) => sum + m, 0) - longest;
    return Math.ceil(longest + rest / 2);
  }

  // ---------- การแสดงผล ----------

  /** ใบเสร็จแบบข้อความ */
  receipt(): string {
    const width = 44;
    const thick = '='.repeat(width);
    const thin = '-'.repeat(width);
    const row = (label: string, value: string): string =>
      `${label}${value.padStart(Math.max(1, width - label.length))}`;

    const out = [
      thick,
      '        CAFE OOP - ใบเสร็จรับเงิน',
      thick,
      `เลขที่บิล : ${this.id}`,
      `ลูกค้า    : ${this.customer?.describe() ?? 'ลูกค้าทั่วไป'}`,
      thin,
    ];

    this.items.forEach((line, index) => {
      out.push(`${index + 1}. ${line.describe()}`);
      out.push(row(`   ${line.unitPrice} x ${line.quantity}`, line.subtotal.toString()));
    });

    out.push(thin);
    out.push(row('ราคารวม', this.subtotal.toString()));

    for (const discount of this.appliedDiscounts) {
      out.push(row(`  ${discount.name}`, `-${discount.amount}`));
    }

    if (!this.discountTotal.isZero()) {
      out.push(row('หลังหักส่วนลด', this.afterDiscount.toString()));
    }

    out.push(row(`VAT ${VAT_RATE}%`, this.vat.toString()));
    out.push(thin);
    out.push(row('ยอดชำระ', this.total.toString()));

    if (this.payment !== undefined) {
      out.push(row(this.payment.method, this.payment.amountPaid.toString()));
      if (!this.payment.change.isZero()) {
        out.push(row('เงินทอน', this.payment.change.toString()));
      }
      out.push(`อ้างอิง: ${this.payment.reference}`);
    }

    out.push(thick);
    return out.join('\n');
  }

  // ---------- ส่วนภายในคลาส ----------

  /** ข้อมูลอ่านอย่างเดียวที่ส่งให้กฎส่วนลด */
  private discountContext(): DiscountContext {
    return {
      subtotal: this.subtotal,
      drinkCount: this.items
        .filter((line) => line.item instanceof Drink)
        .reduce((sum, line) => sum + line.quantity, 0),
      customer: this.customer,
    };
  }

  /** ยามเฝ้าประตู: บิลที่จ่ายเงินแล้วแก้ไม่ได้ */
  private assertOpen(action: string): void {
    if (this.isPaid) {
      throw new OrderClosedError(action);
    }
  }
}
