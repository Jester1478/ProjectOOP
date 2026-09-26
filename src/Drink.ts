import { Category, MenuItem } from './MenuItem.ts';
import { baht } from './utils.ts';

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

/** ราคาของเครื่องดื่มแต่ละไซส์ (บาท) เช่น { S: 45, M: 50, L: 55 } */
export type SizePrices = Readonly<Record<Size, number>>;

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
 *  - Inheritance: ได้ id / name / basePrice / prepare() มาจาก MenuItem ฟรี ๆ
 *  - Polymorphism: override calculatePrice() ให้คิด "ราคาไซส์ + วิธีชง + ท็อปปิ้ง"
 *  - Composition: Drink "มี" ท็อปปิ้งหลายอัน (has-a)
 *  - Immutability: with...() คืนแก้วใหม่เสมอ เมนูต้นฉบับในร้านจึงไม่เพี้ยน
 *
 * ราคาแต่ละไซส์กำหนดตายตัวในตาราง prices ไม่ได้คูณเปอร์เซ็นต์
 * basePrice ที่ส่งให้คลาสแม่ = ราคาของไซส์ที่เลือกอยู่ตอนนี้
 */
export class Drink extends MenuItem {
  constructor(
    id: string,
    name: string,
    readonly prices: SizePrices,
    readonly size: Size = Size.Medium,
    readonly temperature: Temperature = Temperature.Hot,
    readonly toppings: readonly Topping[] = [],
  ) {
    super(id, name, prices[size]);

    // คลาสแม่ตรวจแค่ราคาไซส์ที่เลือกอยู่ ตรงนี้ตรวจให้ครบทุกไซส์
    for (const s of Object.values(Size)) {
      if (!Number.isInteger(prices[s]) || prices[s] < 0) {
        throw new RangeError(`ราคาไซส์ ${s} ของ "${name}" ต้องเป็นจำนวนเต็มบาท (ได้รับ ${prices[s]})`);
      }
    }
  }

  override get category(): Category {
    return Category.Drink;
  }

  override get prepMinutes(): number {
    const blending = this.temperature === Temperature.Blended ? 2 : 0;
    return 3 + blending + this.toppings.length;
  }

  override calculatePrice(): number {
    const surcharge = TEMPERATURE_SURCHARGE[this.temperature];
    const toppings = this.toppings.reduce((sum, topping) => sum + topping.price, 0);
    return this.basePrice + surcharge + toppings;
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

  /** override ให้หน้าเมนูโชว์ราคาครบทุกไซส์ */
  override menuLabel(): string {
    const { S, M, L } = this.prices;
    return `${this.name} — S ${S} / M ${M} / L ${L}`;
  }

  /** ราคาของไซส์ที่ระบุ - ใช้โชว์ตอนถามลูกค้าว่าจะเอาไซส์ไหน */
  priceOf(size: Size): string {
    return baht(this.prices[size]);
  }

  withSize(size: Size): Drink {
    return new Drink(this.id, this.name, this.prices, size, this.temperature, this.toppings);
  }

  withTemperature(temperature: Temperature): Drink {
    return new Drink(this.id, this.name, this.prices, this.size, temperature, this.toppings);
  }

  withToppings(toppings: readonly Topping[]): Drink {
    return new Drink(this.id, this.name, this.prices, this.size, this.temperature, [
      ...this.toppings,
      ...toppings,
    ]);
  }
}
