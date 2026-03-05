import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      })
      return res.status(200).json(categories.map(c => c.name))
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    const { name } = req.body
    try {
      const category = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name }
      })
      const allCategories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      })
      return res.status(200).json(allCategories.map(c => c.name))
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).end()
}
