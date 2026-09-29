/** ระดับสมาชิกของลูกค้า */
export enum MembershipTier {
  Regular = 'ลูกค้าทั่วไป',
  Silver = 'สมาชิกเงิน',
  Gold = 'สมาชิกทอง',
}

/** ส่วนลด (%) ของแต่ละระดับสมาชิก */
const TIER_DISCOUNT: Readonly<Record<MembershipTier, number>> = {
  [MembershipTier.Regular]: 0,
  [MembershipTier.Silver]: 5,
  [MembershipTier.Gold]: 10,
};

/**
 * Customer - ลูกค้า  [คลาสที่ 5]
 *
 * แนวคิด OOP:
 *  - Encapsulation: tier เป็น readonly ตั้งค่าได้ครั้งเดียวตอนสร้าง
 *    หลังจากนั้นโค้ดข้างนอกเปลี่ยนไม่ได้เลย จะอัปเกรดตัวเองเป็นสมาชิกทองไม่ได้
 *  - Computed property: discountRate ไม่ได้เก็บเป็นตัวแปร แต่คำนวณจาก tier ทุกครั้ง
 *    จึงไม่มีทางเกิดสถานะเพี้ยนแบบ "เป็นลูกค้าทั่วไป แต่ได้ส่วนลด 10%"
 */
export class Customer {
  constructor(readonly tier: MembershipTier = MembershipTier.Regular) {}

  /** ส่วนลด (%) ที่ลูกค้าคนนี้ได้รับ */
  get discountRate(): number {
    return TIER_DISCOUNT[this.tier];
  }

  describe(): string {
    return this.tier;
  }
}
