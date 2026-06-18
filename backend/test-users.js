const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.roles.findMany().then(r => {
  console.log('Roles:', JSON.stringify(r, null, 2));
  p.$disconnect();
});
