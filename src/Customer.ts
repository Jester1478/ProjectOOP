/** ระดับสมาชิก */
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

/** ส่วนลด (%) ของแต่ละระดับสมาชิก */
const TIER_DISCOUNT: Readonly<Record<MembershipTier, number>> = {
  [MembershipTier.Regular]: 0,
  [MembershipTier.Silver]: 5,
  [MembershipTier.Gold]: 10,
};

/**
 * Customer - ลูกค้า  [คลาสที่ 5]
 *
 * แนวคิด OOP: Encapsulation (ตัวอย่างที่ชัดที่สุดในโปรเจกต์)
 *  - points เป็น private โค้ดข้างนอกจะ "แจกแต้มมั่ว" ไม่ได้
 *    ต้องผ่าน earnPoints() ที่คำนวณจากยอดซื้อจริงเท่านั้น
 *  - อ่านแต้มได้ผ่าน getter แต่ไม่มี setter จึงเขียนทับไม่ได้
 *  - tier กับ discountRate คำนวณจากแต้มสด ๆ ทุกครั้ง ไม่ต้องให้ใครมาตั้งค่า
 *    จึงไม่มีทางเกิดกรณี "แต้ม 10 แต้ม แต่เป็นสมาชิกทอง"
 */
export class Customer {
  private points: number;

  constructor(
    readonly name: string,
    initialPoints = 0,
  ) {
    if (name.trim().length === 0) {
      throw new RangeError('ชื่อลูกค้าว่างไม่ได้');
    }
    this.points = Math.max(0, Math.floor(initialPoints));
  }

  get loyaltyPoints(): number {
    return this.points;
  }

  get tier(): MembershipTier {
    if (this.points >= GOLD_POINTS) return MembershipTier.Gold;
    if (this.points >= SILVER_POINTS) return MembershipTier.Silver;
    return MembershipTier.Regular;
  }

  /** ส่วนลด (%) ที่ลูกค้าคนนี้ได้รับ */
  get discountRate(): number {
    return TIER_DISCOUNT[this.tier];
  }

  /** สะสมแต้มจากยอดที่จ่ายจริง คืนค่าแต้มที่ได้รับรอบนี้ */
  earnPoints(paidAmount: number): number {
    const earned = Math.floor(paidAmount / BAHT_PER_POINT);
    this.points += earned;
    return earned;
  }

  describe(): string {
    return `${this.name} [${this.tier} - ${this.points} แต้ม]`;
  }
}
