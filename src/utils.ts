/**
 * ฟังก์ชันช่วยเหลือเล็ก ๆ ที่ใช้ร่วมกันทั้งโปรเจกต์
 * (ไม่ใช่คลาส เพราะไม่ได้เก็บสถานะอะไร)
 */

/** ปัดเศษให้เหลือ 2 ตำแหน่ง - กันปัญหาทศนิยมของ JavaScript เช่น 55 * 1.2 = 66.00000000000001 */
export function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** แปลงตัวเลขเป็นข้อความราคา เช่น 96 -> "96.00 บาท" */
export function baht(amount: number): string {
  return `${amount.toFixed(2)} บาท`;
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
