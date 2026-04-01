/**
 * Prisma Seed — AR Menu Platform
 *
 * Creates a complete test restaurant "The Golden Fork" with realistic
 * menu data across 5 categories and 13 products.
 *
 * Run:  npm run db:seed
 *
 * The seed is idempotent — running it twice won't duplicate data.
 * It uses upsert on the restaurant slug and clears existing products/categories
 * for that restaurant before re-inserting, so you always get a clean slate.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── 3D Models ─────────────────────────────────────────────────────────────────
// Free glTF sample models served from Next.js public/models/.
// Source: https://github.com/KhronosGroup/glTF-Sample-Models (MIT / CC-BY 4.0)
const BASE = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/models`
const MODEL = {
  avocado:  `${BASE}/avocado.glb`,   // Avocado — Starters / salad
  burger:   `${BASE}/burger.glb`,    // Duck    — Burgers (fun stand-in)
  pizza:    `${BASE}/pizza.glb`,     // Fox     — Pizzas (fun stand-in)
  dish:     `${BASE}/dish.glb`,      // Iridescent Dish with Olives — Pasta
  drink:    `${BASE}/drink.glb`,     // Water Bottle — Drinks
  steak:    `${BASE}/steak.glb`,     // Toy Car — Mains (fun stand-in)
  cake:     `${BASE}/cake.glb`,      // Milk Truck — Desserts (fun stand-in)
}

// ── Images ────────────────────────────────────────────────────────────────────
// High-quality Unsplash food photos (stable direct URLs).
const IMG = {
  margherita:
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop',
  pepperoni:
    'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop',
  bbqChicken:
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop',
  carbonara:
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&auto=format&fit=crop',
  alfredo:
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800&auto=format&fit=crop',
  cheeseburger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop',
  chickenBurger:
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800&auto=format&fit=crop',
  truffleFries:
    'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=800&auto=format&fit=crop',
  caesarSalad:
    'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800&auto=format&fit=crop',
  tiramisu:
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop',
  lavaCake:
    'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800&auto=format&fit=crop',
  bruschetta:
    'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&auto=format&fit=crop',
  garlicBread:
    'https://images.unsplash.com/photo-1619531040576-f9416740661e?w=800&auto=format&fit=crop',
}

// ── Seed ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding AR Menu database…\n')

  // ── Restaurant ─────────────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'golden-fork' },
    update: {
      name: 'The Golden Fork',
      theme_color: '#D4820A',
      active: true,
    },
    create: {
      name: 'The Golden Fork',
      slug: 'golden-fork',
      theme_color: '#D4820A',
      logo_url:
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&auto=format&fit=crop',
      active: true,
    },
  })
  console.log(`✅ Restaurant: ${restaurant.name} (slug: ${restaurant.slug})`)
  console.log(`   ID: ${restaurant.id}\n`)

  // ── Test admin user (bypasses Firebase — for local dev only) ───────────────
  const testUser = await prisma.user.upsert({
    where: { firebase_uid: 'test-admin-uid-golden-fork' },
    update: {},
    create: {
      firebase_uid: 'test-admin-uid-golden-fork',
      email: 'admin@goldenfork.test',
      restaurant_id: restaurant.id,
      role: 'admin',
    },
  })
  console.log(`✅ Admin user: ${testUser.email}`)
  console.log(`   (This user has a fake firebase_uid — only works for direct DB inspection)\n`)

  // ── Wipe existing categories + products for this restaurant ────────────────
  await prisma.product.deleteMany({ where: { restaurant_id: restaurant.id } })
  await prisma.category.deleteMany({ where: { restaurant_id: restaurant.id } })
  console.log('🗑  Cleared existing products and categories\n')

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryData = [
    { name: 'Starters',  order: 0 },
    { name: 'Pizzas',    order: 1 },
    { name: 'Pasta',     order: 2 },
    { name: 'Burgers',   order: 3 },
    { name: 'Desserts',  order: 4 },
  ]

  const categories: Record<string, string> = {}
  for (const cat of categoryData) {
    const created = await prisma.category.create({
      data: { ...cat, restaurant_id: restaurant.id },
    })
    categories[cat.name] = created.id
    console.log(`  📂 Category: ${cat.name}`)
  }
  console.log()

  // ── Products ───────────────────────────────────────────────────────────────
  const products = [
    // ── Starters ──────────────────────────────────────────────────────────────
    {
      name: 'Bruschetta al Pomodoro',
      description:
        'Toasted sourdough rubbed with garlic, topped with vine-ripened tomatoes, fresh basil, extra virgin olive oil, and a drizzle of aged balsamic.',
      category: 'Starters',
      image_url: IMG.bruschetta,
      model_url: MODEL.dish,
      diameter_cm: 22.0,
      height_cm: 3.0,
      sizes: [
        { label: 'Regular', cm: 22, price: 9.99 },
        { label: 'Large',   cm: 28, price: 13.99 },
      ],
      prices: { Regular: 9.99, Large: 13.99 },
    },
    {
      name: 'Garlic & Herb Flatbread',
      description:
        'Stone-baked flatbread brushed with roasted garlic butter, scattered with fresh rosemary, sea salt flakes, and melted parmesan.',
      category: 'Starters',
      image_url: IMG.garlicBread,
      model_url: null,
      diameter_cm: 30.0,
      height_cm: 2.5,
      sizes: [
        { label: 'Regular', cm: 30, price: 7.99 },
      ],
      prices: { Regular: 7.99 },
    },
    {
      name: 'Caesar Salad',
      description:
        'Crisp romaine hearts tossed in house-made Caesar dressing with shaved parmesan, house-baked croutons, and anchovies on request.',
      category: 'Starters',
      image_url: IMG.caesarSalad,
      model_url: MODEL.avocado,
      diameter_cm: 26.0,
      height_cm: 8.0,
      sizes: [
        { label: 'Half',  cm: 20, price: 10.99 },
        { label: 'Full',  cm: 26, price: 15.99 },
      ],
      prices: { Half: 10.99, Full: 15.99 },
    },
    {
      name: 'Truffle Parmesan Fries',
      description:
        'Skin-on fries fried twice for maximum crunch, tossed with white truffle oil, shaved 24-month parmesan, and fresh chives.',
      category: 'Starters',
      image_url: IMG.truffleFries,
      model_url: null,
      diameter_cm: 20.0,
      height_cm: 10.0,
      sizes: [
        { label: 'Regular', cm: 20, price: 8.99 },
        { label: 'Large',   cm: 26, price: 12.99 },
      ],
      prices: { Regular: 8.99, Large: 12.99 },
    },

    // ── Pizzas ────────────────────────────────────────────────────────────────
    {
      name: 'Margherita Classica',
      description:
        'San Marzano tomato base, fior di latte mozzarella, fresh basil leaves, finished with extra virgin olive oil. Simple, perfect.',
      category: 'Pizzas',
      image_url: IMG.margherita,
      model_url: MODEL.pizza,
      diameter_cm: 25.0,
      height_cm: 3.0,
      sizes: [
        { label: 'S', cm: 25, price: 12.99 },
        { label: 'M', cm: 30, price: 16.99 },
        { label: 'L', cm: 35, price: 21.99 },
      ],
      prices: { S: 12.99, M: 16.99, L: 21.99 },
    },
    {
      name: 'Pepperoni Supremo',
      description:
        'Layered with house-made tomato sauce, double mozzarella, premium imported pepperoni, and a drizzle of hot honey.',
      category: 'Pizzas',
      image_url: IMG.pepperoni,
      model_url: MODEL.pizza,
      diameter_cm: 25.0,
      height_cm: 3.5,
      sizes: [
        { label: 'S', cm: 25, price: 14.99 },
        { label: 'M', cm: 30, price: 18.99 },
        { label: 'L', cm: 35, price: 23.99 },
      ],
      prices: { S: 14.99, M: 18.99, L: 23.99 },
    },
    {
      name: 'Smoky BBQ Chicken',
      description:
        'Smoky chipotle BBQ base, pulled chicken thigh, caramelised red onion, roasted corn, smoked mozzarella, finished with jalapeños.',
      category: 'Pizzas',
      image_url: IMG.bbqChicken,
      model_url: null,
      diameter_cm: 25.0,
      height_cm: 3.5,
      sizes: [
        { label: 'S', cm: 25, price: 15.99 },
        { label: 'M', cm: 30, price: 19.99 },
        { label: 'L', cm: 35, price: 24.99 },
      ],
      prices: { S: 15.99, M: 19.99, L: 24.99 },
    },

    // ── Pasta ─────────────────────────────────────────────────────────────────
    {
      name: 'Spaghetti Carbonara',
      description:
        'Bronze-die spaghetti tossed tableside with guanciale, Pecorino Romano, egg yolks, and cracked black pepper. No cream.',
      category: 'Pasta',
      image_url: IMG.carbonara,
      model_url: MODEL.dish,
      diameter_cm: 24.0,
      height_cm: 6.0,
      sizes: [
        { label: 'Regular', cm: 24, price: 17.99 },
        { label: 'Large',   cm: 28, price: 22.99 },
      ],
      prices: { Regular: 17.99, Large: 22.99 },
    },
    {
      name: 'Fettuccine Alfredo',
      description:
        'Freshly made fettuccine in a velvety sauce of aged parmesan and house-churned butter. Optionally add grilled chicken or prawns.',
      category: 'Pasta',
      image_url: IMG.alfredo,
      model_url: null,
      diameter_cm: 24.0,
      height_cm: 5.0,
      sizes: [
        { label: 'Regular', cm: 24, price: 16.99 },
        { label: 'Large',   cm: 28, price: 21.99 },
      ],
      prices: { Regular: 16.99, Large: 21.99 },
    },

    // ── Burgers ───────────────────────────────────────────────────────────────
    {
      name: 'Classic Smash Burger',
      description:
        'Two 85g beef patties smashed on a screaming-hot flat-top, American cheese, shredded lettuce, pickles, diced onion, house burger sauce in a brioche bun.',
      category: 'Burgers',
      image_url: IMG.cheeseburger,
      model_url: MODEL.burger,
      diameter_cm: 12.0,
      height_cm: 11.0,
      sizes: [
        { label: 'Single', cm: 12, price: 13.99 },
        { label: 'Double', cm: 12, price: 16.99 },
        { label: 'Triple', cm: 12, price: 19.99 },
      ],
      prices: { Single: 13.99, Double: 16.99, Triple: 19.99 },
    },
    {
      name: 'Crispy Chicken Burger',
      description:
        'Free-range chicken thigh brined 24 hours, fried in seasoned buttermilk batter, topped with house slaw, sriracha mayo, bread-and-butter pickles.',
      category: 'Burgers',
      image_url: IMG.chickenBurger,
      model_url: MODEL.burger,
      diameter_cm: 12.0,
      height_cm: 11.0,
      sizes: [
        { label: 'Regular', cm: 12, price: 14.99 },
        { label: 'Spicy',   cm: 12, price: 15.49 },
      ],
      prices: { Regular: 14.99, Spicy: 15.49 },
    },

    // ── Desserts ──────────────────────────────────────────────────────────────
    {
      name: 'Tiramisu della Casa',
      description:
        'Layers of Savoiardi biscuits soaked in double-shot espresso and Marsala, separated by silky mascarpone cream, dusted with Valrhona cocoa.',
      category: 'Desserts',
      image_url: IMG.tiramisu,
      model_url: MODEL.cake,
      diameter_cm: 10.0,
      height_cm: 7.0,
      sizes: [
        { label: 'Slice',  cm: 10, price: 8.99 },
        { label: 'Share',  cm: 18, price: 19.99 },
      ],
      prices: { Slice: 8.99, Share: 19.99 },
    },
    {
      name: 'Chocolate Lava Cake',
      description:
        'Warm Valrhona 70% dark chocolate fondant with a molten centre, served with house vanilla bean ice cream and caramel tuile.',
      category: 'Desserts',
      image_url: IMG.lavaCake,
      model_url: MODEL.cake,
      diameter_cm: 9.0,
      height_cm: 6.0,
      sizes: [
        { label: 'Regular', cm: 9, price: 9.99 },
      ],
      prices: { Regular: 9.99 },
    },
  ]

  let productCount = 0
  for (const p of products) {
    await prisma.product.create({
      data: {
        restaurant_id: restaurant.id,
        category_id: categories[p.category],
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        model_url: p.model_url ?? null,
        diameter_cm: p.diameter_cm,
        height_cm: p.height_cm,
        sizes: p.sizes,
        prices: p.prices,
        active: true,
      },
    })
    console.log(`  🍽  ${p.name}  (${p.category})`)
    productCount++
  }

  console.log(`\n✅ Seeded ${productCount} products across ${categoryData.length} categories.`)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 Test restaurant details:')
  console.log(`   Name  : The Golden Fork`)
  console.log(`   Slug  : golden-fork`)
  console.log(`   Menu  : http://localhost:3000/r/golden-fork`)
  console.log(`   Admin : http://localhost:3000/admin`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  console.log('⚠️  NOTE: The admin user in the DB has a fake firebase_uid.')
  console.log('   To log into the admin panel you need a real Firebase account.')
  console.log('   Register at POST /auth/register with your Firebase token.')
  console.log('   Or use the seeded restaurant_id directly in API calls.\n')
  console.log(`   Restaurant ID: ${restaurant.id}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
