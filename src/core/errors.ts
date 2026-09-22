/**
 * Custom Exception ของระบบ
 *
 * แนวคิด OOP: Inheritance
 * ทุก error สืบทอดจาก CafeError -> catch แบบกว้าง (CafeError) หรือเจาะจงก็ได้
 */
export abstract class CafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** สินค้าหมด หรือสั่งเกินจำนวนที่มี */
export class OutOfStockError extends CafeError {
  constructor(itemName: string, requested: number, available: number) {
    super(`"${itemName}" มีไม่พอ (ขอ ${requested} เหลือ ${available})`);
  }
}

/** จำนวนที่สั่งไม่ถูกต้อง เช่น 0 หรือติดลบ */
export class InvalidQuantityError extends CafeError {
  constructor(quantity: number) {
    super(`จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0 (ได้รับ ${quantity})`);
  }
}

/** พยายามปิดบิลที่ยังไม่มีสินค้า */
export class EmptyOrderError extends CafeError {
  constructor() {
    super('ออเดอร์ยังไม่มีรายการสินค้า');
  }
}

/** แก้บิลที่ปิดไปแล้ว */
export class OrderClosedError extends CafeError {
  constructor(action: string) {
    super(`ไม่สามารถ "${action}" ได้ เพราะบิลนี้ชำระเงินไปแล้ว`);
  }
}

/** จ่ายเงินไม่พอ หรือข้อมูลการจ่ายไม่ถูกต้อง */
export class PaymentError extends CafeError {}
