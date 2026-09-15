/**
 * Prisma seed — AR Menu Platform
 *
 * Creates a demo restaurant with a working admin login so the stack can be
 * exercised end to end. Idempotent: re-running clears the demo restaurant's
 * products and categories and re-inserts them.
 *
 *   npm run db:seed
 *
 * The demo password comes from SEED_ADMIN_PASSWORD, or is generated and
 * printed once. Nothing here is fit for production data.
 */

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

const SLUG = 'golden-fork'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@goldenfork.test'

// Placeholder geometry served from the frontend's public/models directory.
// These are Khronos glTF sample assets, not real dishes — every one of them
// needs replacing with a scan of the actual plate before this goes near a
// customer. See docs/CONTENT.md.
const BASE = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/models`
const MODEL = {
  avocado: `${BASE}/avocado.glb`,
  burger: `${BASE}/burger.glb`,
  pizza: `${BASE}/pizza.glb`,
  dish: `${BASE}/dish.glb`,
  drink: `${BASE}/drink.glb`,
  steak: `${BASE}/steak.glb`,
  cake: `${BASE}/cake.glb`,
}

// Unsplash photography, licensed for this use. Also placeholders: they are
// not photographs of this restaurant's food.
const IMG = {
  margherita: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop',
  pepperoni: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop',
  bbqChicken: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop',
  carbonara: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&auto=format&fit=crop',
  alfredo: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&auto=format&fit=crop',
  cheeseburger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop',
  chickenBurger: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop',
  truffleFries: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800&auto=format&fit=crop',
  caesarSalad: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop',
  tiramisu: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop',
  lavaCake: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&auto=format&fit=crop',
  bruschetta: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&auto=format&fit=crop',
  garlicBread: 'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=800&auto=format&fit=crop',
}

interface SeedSize {
  label: string
  cm: number
  price: number
}

interface SeedProduct {
  category: string
  name: string
  description: string
  image_url: string
  model_url?: string
  diameter_cm: number
  height_cm: number
  sizes: SeedSize[]
}

const CATEGORIES = ['Starters', 'Pizzas', 'Pasta', 'Burgers', 'Desserts']

const PRODUCTS: SeedProduct[] = [
  {
    category: 'Starters',
    name: 'Bruschetta al Pomodoro',
    description: 'Grilled sourdough, San Marzano tomatoes, basil, aged balsamic.',
    image_url: IMG.bruschetta,
    model_url: MODEL.avocado,
    diameter_cm: 18,
    height_cm: 5,
    sizes: [{ label: 'Regular', cm: 18, price: 7.5 }],
  },
  {
    category: 'Starters',
    name: 'Garlic Focaccia',
    description: 'House focaccia, roasted garlic butter, rosemary, sea salt.',
    image_url: IMG.garlicBread,
    diameter_cm: 22,
    height_cm: 4,
    sizes: [{ label: 'Regular', cm: 22, price: 6.0 }],
  },
  {
    category: 'Starters',
    name: 'Caesar Salad',
    description: 'Baby gem, anchovy dressing, 24-month parmesan, rye croutons.',
    image_url: IMG.caesarSalad,
    diameter_cm: 24,
    height_cm: 8,
    sizes: [
      { label: 'Side', cm: 20, price: 6.5 },
      { label: 'Main', cm: 26, price: 11.5 },
    ],
  },
  {
    category: 'Starters',
    name: 'Truffle Fries',
    description: 'Triple-cooked, black truffle oil, parmesan, chives.',
    image_url: IMG.truffleFries,
    diameter_cm: 16,
    height_cm: 10,
    sizes: [{ label: 'Regular', cm: 16, price: 8.0 }],
  },
  {
    category: 'Pizzas',
    name: 'Margherita',
    description: 'Fior di latte, San Marzano, basil, 48-hour fermented base.',
    image_url: IMG.margherita,
    model_url: MODEL.pizza,
    diameter_cm: 30,
    height_cm: 3,
    sizes: [
      { label: 'S', cm: 22, price: 10.5 },
      { label: 'M', cm: 30, price: 14.0 },
      { label: 'L', cm: 38, price: 18.5 },
    ],
  },
  {
    category: 'Pizzas',
    name: 'Pepperoni',
    description: 'Double pepperoni, mozzarella, hot honey drizzle.',
    image_url: IMG.pepperoni,
    model_url: MODEL.pizza,
    diameter_cm: 30,
    height_cm: 3,
    sizes: [
      { label: 'S', cm: 22, price: 12.0 },
      { label: 'M', cm: 30, price: 16.0 },
      { label: 'L', cm: 38, price: 21.0 },
    ],
  },
  {
    category: 'Pizzas',
    name: 'BBQ Chicken',
    description: 'Smoked chicken, red onion, coriander, house barbecue base.',
    image_url: IMG.bbqChicken,
    model_url: MODEL.pizza,
    diameter_cm: 30,
    height_cm: 3,
    sizes: [
      { label: 'M', cm: 30, price: 16.5 },
      { label: 'L', cm: 38, price: 21.5 },
    ],
  },
  {
    category: 'Pasta',
    name: 'Carbonara',
    description: 'Guanciale, pecorino romano, egg yolk, cracked black pepper.',
    image_url: IMG.carbonara,
    model_url: MODEL.dish,
    diameter_cm: 26,
    height_cm: 7,
    sizes: [{ label: 'Regular', cm: 26, price: 15.0 }],
  },
  {
    category: 'Pasta',
    name: 'Fettuccine Alfredo',
    description: 'Fresh fettuccine, parmesan cream, nutmeg, parsley.',
    image_url: IMG.alfredo,
    model_url: MODEL.dish,
    diameter_cm: 26,
    height_cm: 7,
    sizes: [{ label: 'Regular', cm: 26, price: 14.0 }],
  },
  {
    category: 'Burgers',
    name: 'Double Cheeseburger',
    description: 'Two dry-aged patties, cheddar, pickles, house sauce, brioche.',
    image_url: IMG.cheeseburger,
    model_url: MODEL.burger,
    diameter_cm: 14,
    height_cm: 13,
    sizes: [{ label: 'Regular', cm: 14, price: 15.5 }],
  },
  {
    category: 'Burgers',
    name: 'Buttermilk Chicken Burger',
    description: 'Buttermilk-brined thigh, slaw, chipotle mayo, toasted bun.',
    image_url: IMG.chickenBurger,
    model_url: MODEL.steak,
    diameter_cm: 14,
    height_cm: 12,
    sizes: [{ label: 'Regular', cm: 14, price: 14.0 }],
  },
  {
    category: 'Desserts',
    name: 'Tiramisu',
    description: 'Savoiardi, espresso, mascarpone, Valrhona cocoa.',
    image_url: IMG.tiramisu,
    model_url: MODEL.cake,
    diameter_cm: 12,
    height_cm: 6,
    sizes: [{ label: 'Regular', cm: 12, price: 8.5 }],
  },
  {
    category: 'Desserts',
    name: 'Chocolate Lava Cake',
    description: '70% dark chocolate, molten centre, vanilla bean ice cream.',
    image_url: IMG.lavaCake,
    model_url: MODEL.drink,
    diameter_cm: 10,
    height_cm: 8,
    sizes: [{ label: 'Regular', cm: 10, price: 9.0 }],
  },
]

function pricesFrom(sizes: SeedSize[]): Record<string, number> {
  return Object.fromEntries(sizes.map((s) => [s.label, s.price]))
}

/**
 * Refuses to run against anything that does not look like a local database.
 *
 * DATABASE_URL now points at Neon, so a stray `npm run db:seed` would write a
 * demo restaurant and thirteen placeholder dishes straight into production.
 * Override with SEED_ALLOW_REMOTE=yes-i-mean-it when that is genuinely wanted.
 */
function assertSafeTarget(): void {
  const url = process.env.DATABASE_URL ?? ''
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error('DATABASE_URL is missing or unparseable.')
  }

  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'postgres'

  if (isLocal || process.env.SEED_ALLOW_REMOTE === 'yes-i-mean-it') return

  throw new Error(
    [
      '',
      `Refusing to seed: "${host}" is not a local database.`,
      '',
      'This seed creates a demo restaurant with placeholder dishes and 3D models.',
      'That is fine locally and wrong in production.',
      '',
      'If you really mean to seed this database, re-run with:',
      '  SEED_ALLOW_REMOTE=yes-i-mean-it npm run db:seed',
      '',
    ].join('\n')
  )
}

async function main(): Promise<void> {
  assertSafeTarget()

  const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString('base64url')
  const generated = !process.env.SEED_ADMIN_PASSWORD

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: SLUG },
    update: { name: 'The Golden Fork', active: true },
    create: { name: 'The Golden Fork', slug: SLUG, theme_color: '#D4820A' },
  })

  // Clean slate for the demo tenant only.
  await prisma.product.deleteMany({ where: { restaurant_id: restaurant.id } })
  await prisma.category.deleteMany({ where: { restaurant_id: restaurant.id } })

  const categoryIds: Record<string, string> = {}
  for (const [index, name] of CATEGORIES.entries()) {
    const category = await prisma.category.create({
      data: { restaurant_id: restaurant.id, name, order: index },
    })
    categoryIds[name] = category.id
  }

  for (const product of PRODUCTS) {
    await prisma.product.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categoryIds[product.category],
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        model_url: product.model_url ?? null,
        diameter_cm: product.diameter_cm,
        height_cm: product.height_cm,
        sizes: product.sizes,
        prices: pricesFrom(product.sizes),
        active: true,
      },
    })
  }

  const password_hash = await hashPassword(password)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password_hash, restaurant_id: restaurant.id, token_version: { increment: 1 } },
    create: {
      email: ADMIN_EMAIL,
      password_hash,
      restaurant_id: restaurant.id,
      role: 'owner',
    },
  })

  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  console.log(`\nSeeded ${PRODUCTS.length} products across ${CATEGORIES.length} categories.`)
  console.log('\nDemo restaurant')
  console.log(`  Menu   : ${frontend}/r/${SLUG}`)
  console.log(`  Admin  : ${frontend}/admin`)
  console.log(`  Email  : ${ADMIN_EMAIL}`)
  console.log(`  Password: ${password}${generated ? '   (generated — save it now)' : ''}`)
  console.log('\nThe 3D models are Khronos sample assets standing in for real dishes.')
  console.log('Replace them with scans of the actual plates before launch.\n')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
