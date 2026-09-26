import type { Customer } from './Customer.ts';
import type { MenuItem } from './MenuItem.ts';
import type { Payment } from './Payment.ts';
import { CafeError, baht } from './utils.ts';

/**
 * OrderLine - หนึ่งบรรทัดในบิล (สินค้า 1 อย่าง x จำนวน)  [คลาสที่ 9]
 *
 * แนวคิด OOP: Composition
 * OrderLine "มี" MenuItem อยู่ข้างใน แต่ไม่ได้ "เป็น" MenuItem
 * และเพราะ item เป็นชนิด MenuItem (คลาสแม่) บรรทัดเดียวกันนี้
 * จึงใส่ได้ทั้งกาแฟ ข้าวผัด และเค้ก โดยไม่ต้องเขียนโค้ดแยก
 */
export class OrderLine {
  constructor(
    readonly item: MenuItem,
    readonly quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new CafeError(`จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0 (ได้รับ ${quantity})`);
    }
  }

  get unitPrice(): number {
    return this.item.calculatePrice();
  }

  get subtotal(): number {
    return this.unitPrice * this.quantity;
  }

  describe(): string {
    return `${this.quantity} x ${this.item.fullName}`;
  }
}

/**
 * Order - บิลหนึ่งใบ  [คลาสที่ 10]
 *
 * แนวคิด OOP:
 *  - Encapsulation: items กับ paid เป็น private
 *    ข้างนอกจะ push ของเข้า array ตรง ๆ ไม่ได้ ต้องผ่าน addItem() ที่ตรวจให้ก่อน
 *    getter lines คืน "สำเนา" ไม่ให้ใครไปแก้ array จริงข้างใน
 *  - Composition: Order ประกอบด้วย OrderLine หลายอัน + Customer
 *  - Polymorphism: addItem() รับ MenuItem อะไรก็ได้ / payWith() รับ Payment อะไรก็ได้
 */
export class Order {
  private readonly items: OrderLine[] = [];
  private paid = false;
  private change = 0;
  private paymentMethod = '';

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
    return this.paid;
  }

  get totalItems(): number {
    return this.items.reduce((sum, line) => sum + line.quantity, 0);
  }

  // ---------- จัดการรายการสินค้า ----------

  addItem(item: MenuItem, quantity = 1): this {
    this.assertNotPaid('เพิ่มรายการ');
    this.items.push(new OrderLine(item, quantity));
    return this;
  }

  /** ลบบรรทัดตามลำดับที่แสดงในบิล (เริ่มจาก 1) */
  removeLine(lineNumber: number): OrderLine {
    this.assertNotPaid('ลบรายการ');

    const removed = this.items[lineNumber - 1];
    if (removed === undefined) {
      throw new CafeError(`ไม่มีรายการลำดับที่ ${lineNumber} ในบิลนี้`);
    }

    this.items.splice(lineNumber - 1, 1);
    return removed;
  }

  // ---------- การคิดเงิน ----------

  // ทั้งระบบเป็นจำนวนเต็มบาท: ราคาสินค้าทุกตัวเป็นจำนวนเต็ม (MenuItem บังคับไว้)
  // จุดเดียวที่อาจเกิดเศษคือส่วนลด % จึงปัดเศษทิ้งตรงนั้น
  // ราคาในเมนูรวม VAT แล้ว (แบบร้านกาแฟทั่วไป) ไม่บวก VAT เพิ่มท้ายบิล

  get subtotal(): number {
    return this.items.reduce((sum, line) => sum + line.subtotal, 0);
  }

  /** ส่วนลดสมาชิก ปัดเศษทิ้งให้เป็นจำนวนเต็มบาท - ลูกค้าทั่วไปได้ 0 */
  get discount(): number {
    const rate = this.customer?.discountRate ?? 0;
    return Math.floor((this.subtotal * rate) / 100);
  }

  /** ยอดที่ลูกค้าต้องจ่ายจริง */
  get total(): number {
    return this.subtotal - this.discount;
  }

  // ---------- ชำระเงิน ----------

  /** ชำระเงิน - รับ Payment ชนิดไหนก็ได้ (Polymorphism) */
  payWith(payment: Payment): number {
    this.assertNotPaid('ชำระเงิน');
    if (this.isEmpty) {
      throw new CafeError('บิลนี้ยังไม่มีรายการสินค้า');
    }

    // ถ้าเงินไม่พอ บรรทัดนี้จะ throw แล้วบิลจะไม่ถูกปิด
    this.change = payment.pay(this.total);
    this.paymentMethod = payment.method;
    this.paid = true;

    return this.change;
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

  // ---------- ใบเสร็จ ----------

  receipt(): string {
    const width = 44;
    const row = (label: string, value: string): string =>
      `${label}${value.padStart(Math.max(1, width - label.length))}`;

    const out = [
      '='.repeat(width),
      '        CAFE OOP - ใบเสร็จรับเงิน',
      '='.repeat(width),
      `เลขที่บิล : ${this.id}`,
      `ลูกค้า    : ${this.customer?.describe() ?? 'ลูกค้าทั่วไป'}`,
      '-'.repeat(width),
    ];

    this.items.forEach((line, index) => {
      out.push(`${index + 1}. ${line.describe()}`);
      out.push(row(`   ${baht(line.unitPrice)} x ${line.quantity}`, baht(line.subtotal)));
    });

    out.push('-'.repeat(width));
    out.push(row('ราคารวม', baht(this.subtotal)));

    if (this.discount > 0) {
      const rate = this.customer?.discountRate ?? 0;
      out.push(row(`  ส่วนลด ${this.customer?.tier ?? ''} ${rate}%`, `-${baht(this.discount)}`));
    }

    out.push('-'.repeat(width));
    out.push(row('ยอดชำระ (รวม VAT แล้ว)', baht(this.total)));

    if (this.paid) {
      out.push(`ชำระโดย ${this.paymentMethod}`);
      if (this.change > 0) {
        out.push(row('เงินทอน', baht(this.change)));
      }
    }

    out.push('='.repeat(width));
    return out.join('\n');
  }

  /** ยามเฝ้าประตู: บิลที่จ่ายเงินแล้วแก้ไม่ได้ */
  private assertNotPaid(action: string): void {
    if (this.paid) {
      throw new CafeError(`ไม่สามารถ "${action}" ได้ เพราะบิลนี้ชำระเงินไปแล้ว`);
    }
  }
}
