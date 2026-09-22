import * as readline from 'node:readline/promises';
import { Money } from '../core/Money.ts';
import { CafeError, OutOfStockError } from '../core/errors.ts';
import { MemberDiscount, PromoCodeDiscount } from '../discount/Discount.ts';
import { Dessert } from '../menu/Dessert.ts';
import { Drink, Size, Temperature } from '../menu/Drink.ts';
import { Food, SpiceLevel } from '../menu/Food.ts';
import { AddOn, Category, type MenuItem } from '../menu/MenuItem.ts';
import { Order } from '../order/Order.ts';
import { CashPayment, type Payment, QrPayment } from '../payment/Payment.ts';
import { Customer, Staff } from '../people/Person.ts';

/** ตัวเลือกเสริมที่ร้านมีขาย */
const TOPPINGS = [
  new AddOn('ไข่มุก', Money.baht(15)),
  new AddOn('วิปครีม', Money.baht(20)),
  new AddOn('เอสเพรสโซช็อตพิเศษ', Money.baht(20)),
] as const;

const FRIED_EGG = new AddOn('ไข่ดาว', Money.baht(10));

/** โค้ดส่วนลดที่ร้านแจก */
const PROMO_CODES: Readonly<Record<string, PromoCodeDiscount>> = {
  OPEN5: new PromoCodeDiscount('โปรเปิดร้าน 5%', 5, Money.baht(300)),
  SAVE10: new PromoCodeDiscount('โปรลด 10%', 10, Money.baht(500)),
};

/**
 * CafeApp - หน้าจอสั่งอาหารแบบพิมพ์เลขเลือก
 *
 * คลาสนี้ทำหน้าที่ "รับข้อมูลจากผู้ใช้" เท่านั้น
 * การคิดราคา ส่วนลด และตัดเงิน อยู่ในคลาสของ domain ทั้งหมด
 * แยกกันแบบนี้ทำให้เปลี่ยนไปทำเป็นเว็บทีหลังได้โดยไม่ต้องแก้ตรรกะธุรกิจเลย
 */
export class CafeApp {
  private readonly rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  private readonly menu: MenuItem[] = [];
  private readonly stock = new Map<string, number>();
  private readonly staff = new Staff('มายด์', 'บาริสต้า');

  private customer?: Customer;
  private order!: Order;
  private billCount = 0;
  private salesTotal = Money.zero();

  constructor() {
    this.seedMenu();
    // ถ้าผู้ใช้กด Ctrl+D หรือ input หมด ให้จบโปรแกรมอย่างเรียบร้อย
    this.rl.on('close', () => process.exit(0));
  }

  // ==================== เริ่มโปรแกรม ====================

  async start(): Promise<void> {
    console.log('\n☕ ยินดีต้อนรับสู่ Cafe OOP');

    await this.askCustomer();
    this.openNewOrder();

    let running = true;
    while (running) {
      running = await this.showMainMenu();
    }

    console.log(`\nปิดร้านแล้ว — ขายได้ ${this.billCount} บิล รวม ${this.salesTotal}`);
    console.log('ขอบคุณที่ใช้บริการ 🙏\n');
    this.rl.close();
  }

  /** ถามว่าใครเป็นลูกค้า - ถ้าไม่กรอกชื่อถือว่าเป็นลูกค้าทั่วไป (ไม่สะสมแต้ม) */
  private async askCustomer(): Promise<void> {
    const name = (await this.rl.question('ชื่อลูกค้า (Enter = ลูกค้าทั่วไป): ')).trim();
    if (name.length === 0) {
      console.log('-> ลูกค้าทั่วไป (ไม่สะสมแต้ม)');
      return;
    }

    const pointsInput = await this.rl.question('แต้มสะสมเดิม (Enter = 0): ');
    const points = Number.parseInt(pointsInput, 10);
    this.customer = new Customer(name, Number.isNaN(points) ? 0 : points);
    console.log(`-> ${this.customer.describe()}`);
  }

  // ==================== เมนูหลัก ====================

  /** คืน false เมื่อผู้ใช้เลือกออกจากโปรแกรม */
  private async showMainMenu(): Promise<boolean> {
    console.log(`
${'='.repeat(46)}
  บิล ${this.order.id} | ${this.order.totalItems} ชิ้น | ยอด ${this.order.total}
${'='.repeat(46)}
  1) ดูเมนู
  2) สั่งของเข้าบิล
  3) ดูบิลปัจจุบัน
  4) ลบรายการในบิล
  5) ใส่โค้ดส่วนลด
  6) ชำระเงิน
  0) ปิดร้าน`);

    const choice = (await this.rl.question('\nเลือก: ')).trim();

    // ทุก action ห่อด้วย try/catch ที่จับ CafeError
    // ผู้ใช้กรอกผิดแล้วโปรแกรมไม่ตาย แค่บอกว่าผิดอะไรแล้ววนกลับมาเมนู
    try {
      switch (choice) {
        case '1':
          this.printMenu();
          break;
        case '2':
          await this.orderItem();
          break;
        case '3':
          this.printCurrentBill();
          break;
        case '4':
          await this.removeItem();
          break;
        case '5':
          await this.applyPromoCode();
          break;
        case '6':
          await this.checkout();
          break;
        case '0':
          return false;
        default:
          console.log('!! ไม่มีตัวเลือกนี้ ลองใหม่');
      }
    } catch (error) {
      if (error instanceof CafeError) {
        console.log(`\n!! ${error.name}: ${error.message}`);
      } else if (error instanceof RangeError) {
        console.log(`\n!! ข้อมูลไม่ถูกต้อง: ${error.message}`);
      } else {
        throw error;
      }
    }

    return true;
  }

  // ==================== 1) ดูเมนู ====================

  private printMenu(): void {
    for (const category of Object.values(Category)) {
      console.log(`\n[${category}]`);
      for (const item of this.menu.filter((m) => m.category === category)) {
        const left = this.stock.get(item.id) ?? 0;
        const status = left === 0 ? 'ของหมด' : `เหลือ ${left}`;
        // เรียก describe() ตัวเดียว ได้ราคาของทุกชนิดสินค้า (Polymorphism)
        console.log(`  ${item.id}  ${item.describe().padEnd(34)} ${status}`);
      }
    }
  }

  // ==================== 2) สั่งของ ====================

  private async orderItem(): Promise<void> {
    this.printMenu();

    const id = (await this.rl.question('\nรหัสสินค้า (Enter = ยกเลิก): ')).trim().toUpperCase();
    if (id.length === 0) return;

    const base = this.menu.find((item) => item.id === id);
    if (base === undefined) {
      console.log(`!! ไม่มีสินค้ารหัส "${id}" ในเมนู`);
      return;
    }

    // ถามตัวเลือกตามชนิดสินค้า - ใช้ instanceof แยกทางเดิน
    let item = base;
    if (base instanceof Drink) {
      item = await this.customizeDrink(base);
    } else if (base instanceof Food) {
      item = await this.customizeFood(base);
    } else if (base instanceof Dessert) {
      item = await this.customizeDessert(base);
    }

    const quantity = await this.askNumber('จำนวน (Enter = 1): ', 1);

    this.reserveStock(item, quantity);
    this.order.addItem(item, quantity);

    console.log(`\n>> เพิ่ม ${item.fullName} x${quantity} = ${item.calculatePrice().times(quantity)}`);
  }

  private async customizeDrink(drink: Drink): Promise<Drink> {
    const sizes = [Size.Small, Size.Medium, Size.Large];
    const temps = [Temperature.Hot, Temperature.Iced, Temperature.Blended];

    const sizeChoice = await this.askNumber('  ขนาด 1=S(-15%) 2=M 3=L(+20%) (Enter = 2): ', 2);
    const tempChoice = await this.askNumber('  1=ร้อน 2=เย็น(+10) 3=ปั่น(+20) (Enter = 1): ', 1);

    console.log('  ท็อปปิ้ง:');
    TOPPINGS.forEach((topping, index) => {
      console.log(`    ${index + 1}) ${topping.name} +${topping.price}`);
    });
    const toppingInput = await this.rl.question('  เลือกท็อปปิ้ง คั่นด้วย , (Enter = ไม่ใส่): ');

    const toppings = toppingInput
      .split(',')
      .map((part) => TOPPINGS[Number.parseInt(part.trim(), 10) - 1])
      .filter((topping): topping is AddOn => topping !== undefined);

    // ทุก with...() คืนแก้วใหม่ เมนูต้นฉบับในร้านไม่เปลี่ยน (Immutability)
    return drink
      .withSize(sizes[sizeChoice - 1] ?? Size.Medium)
      .withTemperature(temps[tempChoice - 1] ?? Temperature.Hot)
      .withToppings(...toppings);
  }

  private async customizeFood(food: Food): Promise<Food> {
    const levels = [SpiceLevel.None, SpiceLevel.Mild, SpiceLevel.Hot];

    const spice = await this.askNumber('  1=ไม่เผ็ด 2=เผ็ดน้อย 3=เผ็ดมาก (Enter = 1): ', 1);
    const egg = await this.askYesNo(`  เพิ่มไข่ดาว +${FRIED_EGG.price}? (y/N): `);

    const withSpice = food.withSpiceLevel(levels[spice - 1] ?? SpiceLevel.None);
    return egg ? withSpice.withAddOns(FRIED_EGG) : withSpice;
  }

  private async customizeDessert(dessert: Dessert): Promise<Dessert> {
    const iceCream = await this.askYesNo('  เพิ่มไอศกรีม +25.00 บาท? (y/N): ');
    return iceCream ? dessert.addIceCream() : dessert;
  }

  // ==================== 3) ดูบิล ====================

  private printCurrentBill(): void {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการ');
      return;
    }
    console.log(`\n${this.order.receipt()}`);
    console.log(`รอประมาณ ${this.order.estimatedWaitMinutes()} นาที`);
  }

  // ==================== 4) ลบรายการ ====================

  private async removeItem(): Promise<void> {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการให้ลบ');
      return;
    }

    this.order.lines.forEach((line, index) => {
      console.log(`  ${index + 1}) ${line.describe()}  ${line.subtotal}`);
    });

    const lineNumber = await this.askNumber('ลบลำดับที่ (0 = ยกเลิก): ', 0);
    if (lineNumber === 0) return;

    const removed = this.order.removeLine(lineNumber);
    this.returnStock(removed.item.id, removed.quantity);
    console.log(`>> ลบ ${removed.describe()} แล้ว`);
  }

  // ==================== 5) โค้ดส่วนลด ====================

  private async applyPromoCode(): Promise<void> {
    console.log(`\nโค้ดที่ใช้ได้: ${Object.keys(PROMO_CODES).join(', ')}`);
    const code = (await this.rl.question('ใส่โค้ด (Enter = ยกเลิก): ')).trim().toUpperCase();
    if (code.length === 0) return;

    const promo = PROMO_CODES[code];
    if (promo === undefined) {
      console.log(`!! ไม่มีโค้ด "${code}"`);
      return;
    }

    this.order.applyDiscount(promo);
    console.log(`>> ใส่ "${promo.name}" แล้ว (มีผลเมื่อยอดถึงขั้นต่ำ)`);
  }

  // ==================== 6) ชำระเงิน ====================

  private async checkout(): Promise<void> {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการ สั่งของก่อนนะ');
      return;
    }

    console.log(`\nยอดที่ต้องชำระ: ${this.order.total}`);
    const method = await this.askNumber('  1=เงินสด  2=QR พร้อมเพย์  0=ยกเลิก: ', 0);
    if (method === 0) return;

    // ตัวแปรเป็นชนิด Payment (คลาสแม่) แต่เก็บ object ของคลาสลูกได้ทั้งคู่
    let payment: Payment;
    if (method === 1) {
      const cash = await this.askNumber('  รับเงินมา (บาท): ', 0);
      payment = new CashPayment(Money.baht(cash));
    } else if (method === 2) {
      const promptPayId = await this.rl.question('  เบอร์พร้อมเพย์: ');
      payment = new QrPayment(promptPayId);
    } else {
      console.log('!! ไม่มีวิธีชำระเงินนี้');
      return;
    }

    // ถ้าจ่ายไม่พอ payWith() จะ throw PaymentError แล้วบิลจะไม่ถูกปิด
    const result = this.order.payWith(payment);

    console.log('\n--- ใบสั่งทำ ---');
    for (const ticket of this.staff.serve(this.order)) {
      console.log(ticket);
    }

    console.log(`\n${this.order.receipt()}`);
    console.log(`\n${result.describe()}`);
    if (this.customer !== undefined) {
      console.log(`แต้มสะสมของ ${this.customer.name}: ${this.customer.loyaltyPoints} แต้ม`);
    }

    this.billCount += 1;
    this.salesTotal = this.salesTotal.plus(this.order.total);
    this.openNewOrder();
  }

  // ==================== ตัวช่วย ====================

  private openNewOrder(): void {
    const id = `A${(this.billCount + 1).toString().padStart(3, '0')}`;
    this.order = new Order(id, this.customer);

    // สมาชิกได้ส่วนลดอัตโนมัติทุกบิล ไม่ต้องใส่โค้ด
    if (this.customer !== undefined) {
      this.order.applyDiscount(new MemberDiscount());
    }
  }

  private reserveStock(item: MenuItem, quantity: number): void {
    const available = this.stock.get(item.id) ?? 0;
    if (available < quantity) {
      throw new OutOfStockError(item.name, quantity, available);
    }
    this.stock.set(item.id, available - quantity);
  }

  private returnStock(itemId: string, quantity: number): void {
    this.stock.set(itemId, (this.stock.get(itemId) ?? 0) + quantity);
  }

  private async askNumber(prompt: string, fallback: number): Promise<number> {
    const answer = await this.rl.question(prompt);
    const value = Number.parseFloat(answer.trim());
    return Number.isNaN(value) ? fallback : value;
  }

  private async askYesNo(prompt: string): Promise<boolean> {
    const answer = (await this.rl.question(prompt)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  }

  /** ข้อมูลเมนูตั้งต้นของร้าน */
  private seedMenu(): void {
    const add = (item: MenuItem, stock: number): void => {
      this.menu.push(item);
      this.stock.set(item.id, stock);
    };

    add(new Drink('D01', 'ลาเต้', Money.baht(55)), 20);
    add(new Drink('D02', 'อเมริกาโน่', Money.baht(45)), 20);
    add(new Drink('D03', 'มัทฉะลาเต้', Money.baht(65)), 10);
    add(new Drink('D04', 'ชาไทย', Money.baht(50)), 15);
    add(new Drink('D05', 'โกโก้', Money.baht(60)), 2);

    add(new Food('F01', 'ข้าวผัดกุ้ง', Money.baht(89), 10), 8);
    add(new Food('F02', 'สปาเกตตีคาร์โบนารา', Money.baht(129), 12), 6);
    add(new Food('F03', 'แซนด์วิชแฮมชีส', Money.baht(69), 5), 10);

    add(new Dessert('S01', 'บราวนี', Money.baht(65)), 12);
    add(new Dessert('S02', 'ชีสเค้ก', Money.baht(79)), 8);
    add(new Dessert('S03', 'ครัวซองต์', Money.baht(45)), 10);
  }
}
