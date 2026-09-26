import * as readline from 'node:readline/promises';
import { Customer, MembershipTier } from './Customer.ts';
import { Dessert } from './Dessert.ts';
import { Drink, Size, Temperature, TOPPINGS, type Topping } from './Drink.ts';
import { Food, SpiceLevel } from './Food.ts';
import { Category, type MenuItem } from './MenuItem.ts';
import { Order } from './Order.ts';
import { CashPayment, type Payment, QrPayment } from './Payment.ts';
import { CafeError, baht } from './utils.ts';

/**
 * CafeApp - หน้าจอสั่งอาหารแบบพิมพ์เลขเลือก  [คลาสที่ 12]
 *
 * คลาสนี้ทำหน้าที่ "คุยกับผู้ใช้" อย่างเดียว
 * การคิดราคา ส่วนลด และตัดเงิน อยู่ในคลาส domain ทั้งหมด
 * แยกกันแบบนี้ทำให้เปลี่ยนไปทำเป็นเว็บทีหลังได้โดยไม่ต้องแก้ตรรกะธุรกิจเลย
 */
export class CafeApp {
  private readonly rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  private readonly menu: MenuItem[] = [];
  private readonly stock = new Map<string, number>();

  private customer?: Customer;
  private order!: Order;
  private billCount = 0;
  private salesTotal = 0;

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

    console.log(`\nปิดร้านแล้ว — ขายได้ ${this.billCount} บิล รวม ${baht(this.salesTotal)}`);
    this.rl.close();
  }

  /** ถามว่าใครเป็นลูกค้า - ไม่กรอกชื่อถือว่าเป็นลูกค้าทั่วไป (ไม่มีส่วนลด) */
  private async askCustomer(): Promise<void> {
    const name = (await this.rl.question('ชื่อลูกค้า (Enter = ลูกค้าทั่วไป): ')).trim();
    if (name.length === 0) {
      console.log('-> ลูกค้าทั่วไป');
      return;
    }

    const tiers = [MembershipTier.Regular, MembershipTier.Silver, MembershipTier.Gold];
    const choice = await this.askNumber(
      'ระดับสมาชิก 1=ทั่วไป 2=เงิน(5%) 3=ทอง(10%) (Enter = 1): ',
      1,
    );

    this.customer = new Customer(name, tiers[choice - 1] ?? MembershipTier.Regular);
    console.log(`-> ${this.customer.describe()} | ส่วนลด ${this.customer.discountRate}%`);
  }

  // ==================== เมนูหลัก ====================

  /** คืน false เมื่อผู้ใช้เลือกปิดร้าน */
  private async showMainMenu(): Promise<boolean> {
    console.log(`
${'='.repeat(46)}
  บิล ${this.order.id} | ${this.order.totalItems} ชิ้น | ยอด ${baht(this.order.total)}
${'='.repeat(46)}
  1) ดูเมนู
  2) สั่งของเข้าบิล
  3) ดูบิลปัจจุบัน
  4) ลบรายการในบิล
  5) ชำระเงิน
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
          await this.checkout();
          break;
        case '0':
          return false;
        default:
          console.log('!! ไม่มีตัวเลือกนี้ ลองใหม่');
      }
    } catch (error) {
      if (error instanceof CafeError) {
        console.log(`\n!! ${error.message}`);
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
        // เรียก menuLabel() ตัวเดียว แต่เครื่องดื่มโชว์ราคา 3 ไซส์ อย่างอื่นโชว์ราคาเดียว (Polymorphism)
        console.log(
          `  ${item.id}  ${item.menuLabel().padEnd(34)} ${left === 0 ? 'ของหมด' : `เหลือ ${left}`}`,
        );
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
    console.log(`\n>> เพิ่ม ${item.fullName} x${quantity} = ${baht(item.calculatePrice() * quantity)}`);
  }

  private async customizeDrink(drink: Drink): Promise<Drink> {
    const sizes = [Size.Small, Size.Medium, Size.Large];
    const temps = [Temperature.Hot, Temperature.Iced, Temperature.Blended];

    const size = await this.askNumber(
      `  ไซส์ 1=S(${drink.priceOf(Size.Small)}) 2=M(${drink.priceOf(Size.Medium)}) 3=L(${drink.priceOf(Size.Large)}) (Enter = 2): `,
      2,
    );
    const temp = await this.askNumber('  1=ร้อน 2=เย็น(+10) 3=ปั่น(+20) (Enter = 1): ', 1);

    console.log('  ท็อปปิ้ง:');
    TOPPINGS.forEach((topping, index) => {
      console.log(`    ${index + 1}) ${topping.name} +${baht(topping.price)}`);
    });
    const input = await this.rl.question('  เลือกท็อปปิ้ง คั่นด้วย , (Enter = ไม่ใส่): ');
    const toppings = input
      .split(',')
      .map((part) => TOPPINGS[Number.parseInt(part.trim(), 10) - 1])
      .filter((topping): topping is Topping => topping !== undefined);

    // ทุก with...() คืนแก้วใหม่ เมนูต้นฉบับในร้านไม่เปลี่ยน (Immutability)
    return drink
      .withSize(sizes[size - 1] ?? Size.Medium)
      .withTemperature(temps[temp - 1] ?? Temperature.Hot)
      .withToppings(toppings);
  }

  private async customizeFood(food: Food): Promise<Food> {
    // ถามความเผ็ดเฉพาะเมนูที่เลือกเผ็ดได้ เมนูอื่นข้ามไปเลย
    let level = SpiceLevel.None;
    if (food.canBeSpicy) {
      const levels = [SpiceLevel.None, SpiceLevel.Mild, SpiceLevel.Hot];
      const spice = await this.askNumber('  1=ไม่เผ็ด 2=เผ็ดน้อย 3=เผ็ดมาก (Enter = 1): ', 1);
      level = levels[spice - 1] ?? SpiceLevel.None;
    }

    const egg = await this.askYesNo('  เพิ่มไข่ดาว +10 บาท? (y/N): ');
    return food.withOptions(level, egg);
  }

  private async customizeDessert(dessert: Dessert): Promise<Dessert> {
    const iceCream = await this.askYesNo('  เพิ่มไอศกรีม +25 บาท? (y/N): ');
    return iceCream ? dessert.addIceCream() : dessert;
  }

  // ==================== 3) ดูบิล ====================

  private printCurrentBill(): void {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการ');
      return;
    }
    console.log(`\n${this.order.receipt()}`);
  }

  // ==================== 4) ลบรายการ ====================

  private async removeItem(): Promise<void> {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการให้ลบ');
      return;
    }

    this.order.lines.forEach((line, index) => {
      console.log(`  ${index + 1}) ${line.describe()}  ${baht(line.subtotal)}`);
    });

    const lineNumber = await this.askNumber('ลบลำดับที่ (0 = ยกเลิก): ', 0);
    if (lineNumber === 0) return;

    const removed = this.order.removeLine(lineNumber);
    this.stock.set(removed.item.id, (this.stock.get(removed.item.id) ?? 0) + removed.quantity);
    console.log(`>> ลบ ${removed.describe()} แล้ว`);
  }

  // ==================== 5) ชำระเงิน ====================

  private async checkout(): Promise<void> {
    if (this.order.isEmpty) {
      console.log('\nบิลนี้ยังไม่มีรายการ สั่งของก่อนนะ');
      return;
    }

    console.log(`\nยอดที่ต้องชำระ: ${baht(this.order.total)}`);
    const method = await this.askNumber('  1=เงินสด  2=QR พร้อมเพย์  0=ยกเลิก: ', 0);
    if (method === 0) return;

    // ตัวแปรเป็นชนิด Payment (คลาสแม่) แต่เก็บ object ของคลาสลูกได้ทั้งคู่
    let payment: Payment;
    if (method === 1) {
      payment = new CashPayment(await this.askNumber('  รับเงินมา (บาท): ', 0));
    } else if (method === 2) {
      payment = new QrPayment(await this.rl.question('  เบอร์พร้อมเพย์: '));
    } else {
      console.log('!! ไม่มีวิธีชำระเงินนี้');
      return;
    }

    const change = this.order.payWith(payment);

    console.log('\n--- ใบสั่งทำ ---');
    for (const ticket of this.order.kitchenTickets()) {
      console.log(`  ${ticket}`);
    }

    console.log(`\n${this.order.receipt()}`);
    if (change > 0) {
      console.log(`\n>> เงินทอน ${baht(change)}`);
    }

    this.billCount += 1;
    this.salesTotal += this.order.total;
    this.openNewOrder();
  }

  // ==================== ตัวช่วย ====================

  private openNewOrder(): void {
    this.order = new Order(`A${(this.billCount + 1).toString().padStart(3, '0')}`, this.customer);
  }

  private reserveStock(item: MenuItem, quantity: number): void {
    const available = this.stock.get(item.id) ?? 0;
    if (available < quantity) {
      throw new CafeError(`"${item.name}" มีไม่พอ (ขอ ${quantity} เหลือ ${available})`);
    }
    this.stock.set(item.id, available - quantity);
  }

  private async askNumber(prompt: string, fallback: number): Promise<number> {
    const value = Number.parseFloat((await this.rl.question(prompt)).trim());
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

    // เครื่องดื่มกำหนดราคาแยกทุกไซส์ (บาท)
    add(new Drink('D01', 'ลาเต้', { S: 45, M: 50, L: 55 }), 20);
    add(new Drink('D02', 'อเมริกาโน่', { S: 40, M: 45, L: 50 }), 20);
    add(new Drink('D03', 'มัทฉะลาเต้', { S: 55, M: 60, L: 65 }), 10);
    add(new Drink('D04', 'ชาไทย', { S: 40, M: 45, L: 50 }), 15);
    add(new Drink('D05', 'โกโก้', { S: 50, M: 55, L: 60 }), 2);

    // new Food(รหัส, ชื่อ, ราคา, เลือกเผ็ดได้ไหม) , สต็อก
    add(new Food('F01', 'ข้าวผัดกุ้ง', 50, true), 8);
    add(new Food('F02', 'สปาเกตตีคาร์โบนารา', 99, false), 6);
    add(new Food('F03', 'แซนด์วิชแฮมชีส', 50, false), 10);
    add(new Food('F04', 'สลัดผักรวม', 60, false), 12);
    add(new Food('F05', 'ข้าวไข่ข้น', 65, false), 5);

    add(new Dessert('S01', 'บราวนี', 65), 12);
    add(new Dessert('S02', 'ชีสเค้ก', 79), 8);
    add(new Dessert('S03', 'ครัวซองต์', 45), 10);
  }
}
