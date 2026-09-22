import { Money } from '../core/Money.ts';
import { AddOn, Category, MenuItem } from './MenuItem.ts';

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

/** ตัวคูณราคาตามขนาดแก้ว - แก้ว M คือขนาดมาตรฐาน ราคาเท่าราคาในเมนู */
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
 * Drink - เครื่องดื่ม
 *
 * แนวคิด OOP ที่ใช้:
 *  - Inheritance: สืบทอด id / name / basePrice / prepare() มาจาก MenuItem
 *  - Polymorphism: override calculatePrice() ให้คิด "ราคาฐาน x ขนาด + วิธีชง + ท็อปปิ้ง"
 *  - Composition: Drink "มี" AddOn หลายอัน (ความสัมพันธ์แบบ has-a)
 *  - Immutability: with...() ทุกตัวคืนแก้วใหม่ ไม่แก้ของเดิม
 *    ทำให้เมนูต้นฉบับในร้านไม่เพี้ยนเวลาลูกค้าสั่งแบบพิเศษ
 */
export class Drink extends MenuItem {
  constructor(
    id: string,
    name: string,
    basePrice: Money,
    readonly size: Size = Size.Medium,
    readonly temperature: Temperature = Temperature.Hot,
    readonly toppings: readonly AddOn[] = [],
  ) {
    super(id, name, basePrice);
  }

  override get category(): Category {
    return Category.Drink;
  }

  override get prepMinutes(): number {
    const blendingTime = this.temperature === Temperature.Blended ? 2 : 0;
    return 3 + blendingTime + this.toppings.length;
  }

  override calculatePrice(): Money {
    const sizedPrice = this.basePrice.times(SIZE_MULTIPLIER[this.size]);
    const surcharge = Money.baht(TEMPERATURE_SURCHARGE[this.temperature]);
    const toppingsPrice = Money.sum(this.toppings.map((t) => t.price));
    return sizedPrice.plus(surcharge).plus(toppingsPrice);
  }

  override get fullName(): string {
    const options = [this.temperature, `แก้ว ${this.size}`].join(', ');
    const toppings =
      this.toppings.length > 0 ? ` + ${this.toppings.map((t) => t.name).join(' + ')}` : '';
    return `${this.name} (${options})${toppings}`;
  }

  /** override เพื่อให้คำสั่งเตรียมของเครื่องดื่มละเอียดกว่าคลาสแม่ */
  override prepare(): string {
    const verb = this.temperature === Temperature.Blended ? 'ปั่น' : 'ชง';
    return `[บาริสต้า] ${verb} ${this.fullName} (~${this.prepMinutes} นาที)`;
  }

  withSize(size: Size): Drink {
    return new Drink(this.id, this.name, this.basePrice, size, this.temperature, this.toppings);
  }

  withTemperature(temperature: Temperature): Drink {
    return new Drink(this.id, this.name, this.basePrice, this.size, temperature, this.toppings);
  }

  withToppings(...toppings: AddOn[]): Drink {
    return new Drink(this.id, this.name, this.basePrice, this.size, this.temperature, [
      ...this.toppings,
      ...toppings,
    ]);
  }
}
