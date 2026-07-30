import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/format";

async function main() {
  console.log("Iniciando seed...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@queseria.test";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin1234";

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingUser) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hash,
        nombre: "Administrador",
        role: "ADMIN",
      },
    });
    console.log(`Admin creado: ${adminEmail} / ${adminPassword}`);
  }

  const cfg = await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  console.log("Configuración inicializada");

  const catsData = [
    { nombre: "Quesos frescos", slug: "quesos-frescos" },
    { nombre: "Quesos maduros", slug: "quesos-maduros" },
    { nombre: "Quesos especiales", slug: "quesos-especiales" },
    { nombre: "Lácteos", slug: "lacteos" },
  ];
  const categorias = [];
  for (const c of catsData) {
    const cat = await prisma.categoria.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categorias.push(cat);
  }
  console.log(`${categorias.length} categorías creadas`);

  const productosDemo = [
    {
      nombre: "Queso Fresco Tradicional",
      descripcion:
        "Queso fresco elaborado con leche pasteurizada de la mejor calidad. Ideal para el desayuno o la merienda. Sabor suave y textura cremosa.",
      precio: 180,
      stock: 25,
      categoria: "quesos-frescos",
      destacado: true,
      unidad: "libra",
    },
    {
      nombre: "Queso Morolique Maduro",
      descripcion:
        "Queso madurado por 60 días, con un sabor intenso y ligeramente salado. Perfecto para tablas de queso y acompañamiento.",
      precio: 320,
      stock: 15,
      categoria: "quesos-maduros",
      destacado: true,
      unidad: "libra",
    },
    {
      nombre: "Queso Ahumado de la Casa",
      descripcion:
        "Queso artesanal ahumado con leña de madera noble. Proceso lento para un sabor profundo y único.",
      precio: 380,
      stock: 10,
      categoria: "quesos-especiales",
      destacado: true,
      unidad: "libra",
    },
    {
      nombre: "Crema de Queso",
      descripcion: "Crema untable de queso fresco, perfecta para tostadas, galletas o acompañar tus platillos favoritos.",
      precio: 120,
      stock: 30,
      categoria: "lacteos",
      unidad: "pote 250g",
    },
    {
      nombre: "Cuajada Natural",
      descripcion: "Cuajada fresca del día, sin preservantes. Para comer sola, con miel o como base de postres.",
      precio: 95,
      stock: 40,
      categoria: "lacteos",
      enPromocion: true,
      descuentoPct: 15,
      unidad: "libra",
    },
    {
      nombre: "Queso Duro Rayado",
      descripcion: "Queso duro rallado fino, listo para espolvorear sobre pasta, sopas o gratinar.",
      precio: 220,
      stock: 20,
      categoria: "quesos-maduros",
      unidad: "bolsa 200g",
    },
    {
      nombre: "Queso de Hierba Buena",
      descripcion: "Queso fresco infusionado con hierbabuena fresca. Refrescante y aromático, ideal para el verano.",
      precio: 210,
      stock: 12,
      categoria: "quesos-frescos",
      unidad: "libra",
    },
    {
      nombre: "Mantequilla Artesanal",
      descripcion: "Mantequilla batida en casa, sin aditivos. Sabor auténtico de leche fresca.",
      precio: 150,
      stock: 18,
      categoria: "lacteos",
      unidad: "libra",
    },
  ];

  for (const p of productosDemo) {
    const cat = categorias.find((c) => c.slug === p.categoria);
    if (!cat) continue;
    const slug = slugify(p.nombre);
    const existing = await prisma.producto.findUnique({ where: { slug } });
    if (existing) continue;
    await prisma.producto.create({
      data: {
        slug,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio: p.precio,
        stock: p.stock,
        unidad: p.unidad,
        categoriaId: cat.id,
        destacado: p.destacado ?? false,
        enPromocion: p.enPromocion ?? false,
        descuentoPct: p.descuentoPct ?? null,
        imagenes: "[]",
      },
    });
  }
  console.log(`${productosDemo.length} productos demo creados`);

  const puntos = await prisma.puntoOrigen.count();
  if (puntos === 0) {
    await prisma.puntoOrigen.create({
      data: {
        nombre: "Quesería Central (Managua)",
        lat: 12.1364,
        lng: -86.2704,
        activo: true,
      },
    });
    console.log("Punto de origen demo creado");
  }

  const rangos = await prisma.rangoDelivery.count();
  if (rangos === 0) {
    await prisma.rangoDelivery.createMany({
      data: [
        { desdeKm: 0, hastaKm: 5, costo: 30, orden: 1 },
        { desdeKm: 5.01, hastaKm: 15, costo: 80, orden: 2 },
        { desdeKm: 15.01, hastaKm: 30, costo: 150, orden: 3 },
        { desdeKm: 30.01, hastaKm: 60, costo: 280, orden: 4 },
      ],
    });
    console.log("Rangos de delivery demo creados");
  }

  console.log("Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
