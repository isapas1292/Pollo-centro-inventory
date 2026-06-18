const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Check if admin role exists
  const adminRole = await prisma.roles.findFirst({ where: { NombreRol: 'admin' } });
  if (!adminRole) {
    console.log('Error: Admin role not found. Please ensure Roles table is seeded.');
    process.exit(1);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Upsert user
  const adminUser = await prisma.usuarios.upsert({
    where: { Correo: 'admin@pollocentro.com' },
    update: {},
    create: {
      IdRol: adminRole.IdRol,
      Nombre: 'Admin',
      Apellido: 'Sistema',
      Usuario: 'admin',
      Correo: 'admin@pollocentro.com',
      Contrasena: hashedPassword,
      Telefono: '809-555-5555'
    }
  });

  console.log('Admin user seeded:', adminUser.Correo);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
