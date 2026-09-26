/**
 * ฟังก์ชันช่วยเหลือเล็ก ๆ ที่ใช้ร่วมกันทั้งโปรเจกต์
 * (ไม่ใช่คลาส เพราะไม่ได้เก็บสถานะอะไร)
 */

/** แปลงตัวเลขเป็นข้อความราคา เช่น 1250 -> "1,250 บาท" (ทั้งระบบเป็นจำนวนเต็มบาท ไม่มีสตางค์) */
export function baht(amount: number): string {
  return `${amount.toLocaleString('en-US')} บาท`;
}

/**
 * CafeError - Custom Exception ของระบบ
 *
 * แนวคิด OOP: Inheritance
 * สืบทอดจาก Error ของ JavaScript ทำให้ใช้ throw / catch ได้ตามปกติ
 * แต่แยกแยะได้ว่าเป็น "ข้อผิดพลาดที่เราตั้งใจโยนเอง" ด้วย instanceof CafeError
 */
export class CafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CafeError';
  }
}
