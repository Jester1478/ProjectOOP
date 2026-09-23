import { Category, MenuItem } from './MenuItem.ts';
import { round2 } from './utils.ts';

export enum Size {
  Small = 'S',
  Medium = 'M',
  Large = 'L',
}

export enum Temperature {
  Hot = 'ร้อน',
  Iced = 'เย็น',
  Blended = 'ปั่น',
}

/** ท็อปปิ้ง - ใช้ type ธรรมดา ไม่ต้องสร้างเป็นคลาสให้เยอะเกินจำเป็น */
export type Topping = {
  readonly name: string;
  readonly price: number;
};

/** ท็อปปิ้งที่ร้านมีขาย */
export const TOPPINGS: readonly Topping[] = [
  { name: 'ไข่มุก', price: 15 },
  { name: 'วิปครีม', price: 20 },
  { name: 'เอสเพรสโซช็อตพิเศษ', price: 20 },
];

/** ตัวคูณราคาตามขนาดแก้ว - แก้ว M คือขนาดมาตรฐาน ราคาเท่าที่เขียนในเมนู */
const SIZE_MULTIPLIER: Readonly<Record<Size, number>> = {
  [Size.Small]: 0.85,
  [Size.Medium]: 1,
  [Size.Large]: 1.2,
};

/** ค่าเพิ่มตามวิธีชง (บาท) */
const TEMPERATURE_SURCHARGE: Readonly<Record<Temperature, number>> = {
  [Temperature.Hot]: 0,
  [Temperature.Iced]: 10,
  [Temperature.Blended]: 20,
};

/**
 * Drink - เครื่องดื่ม  [คลาสที่ 2]
 *
 * แนวคิด OOP:
 *  - Inheritance: ได้ id / name / basePrice / describe() มาจาก MenuItem ฟรี ๆ
 *  - Polymorphism: override calculatePrice() ให้คิด "ราคาฐาน x ขนาด + วิธีชง + ท็อปปิ้ง"
 *  - Composition: Drink "มี" ท็อปปิ้งหลายอัน (has-a)
 *  - Immutability: with...() คืนแก้วใหม่เสมอ เมนูต้นฉบับในร้านจึงไม่เพี้ยน
 *    เวลาลูกค้าสั่งแบบพิเศษ
 */
export class Drink extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: number,
    readonly size: Size = Size.Medium,
    readonly temperature: Temperature = Temperature.Hot,
    readonly toppings: readonly Topping[] = [],
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Drink;
  }

  override get prepMinutes(): number {
    const blending = this.temperature === Temperature.Blended ? 2 : 0;
    return 3 + blending + this.toppings.length;
  }

  override calculatePrice(): number {
    const sized = this.basePrice * SIZE_MULTIPLIER[this.size];
    const surcharge = TEMPERATURE_SURCHARGE[this.temperature];
    const toppings = this.toppings.reduce((sum, topping) => sum + topping.price, 0);
    return round2(sized + surcharge + toppings);
  }

  override get fullName(): string {
    const toppings =
      this.toppings.length > 0 ? ` + ${this.toppings.map((t) => t.name).join(' + ')}` : '';
    return `${this.name} (${this.temperature}, แก้ว ${this.size})${toppings}`;
  }

  /** override ให้คำสั่งของบาร์ละเอียดกว่าคลาสแม่ */
  override prepare(): string {
    const verb = this.temperature === Temperature.Blended ? 'ปั่น' : 'ชง';
    return `[บาร์] ${verb} ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  withSize(size: Size): Drink {
    return new Drink(this.id, this.name, this.basePrice, size, this.temperature, this.toppings);
  }

  withTemperature(temperature: Temperature): Drink {
    return new Drink(this.id, this.name, this.basePrice, this.size, temperature, this.toppings);
  }

  withToppings(toppings: readonly Topping[]): Drink {
    return new Drink(this.id, this.name, this.basePrice, this.size, this.temperature, [
      ...this.toppings,
      ...toppings,
    ]);
  }
}
