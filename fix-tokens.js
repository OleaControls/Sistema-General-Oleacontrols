import prisma from './api/_lib/prisma.js';

async function main() {
  const clients = await prisma.oTClient.findMany({
    where: {
      OR: [
        { portalToken: null },
        { portalToken: '' }
      ]
    }
  });

  console.log(`Encontrados ${clients.length} clientes sin token.`);

  await Promise.all(clients.map(async (client) => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await prisma.oTClient.update({
      where: { id: client.id },
      data: { portalToken: token }
    });
    console.log(`Token generado para: ${client.name}`);
  }));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
