require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});
const app = express();

app.use(cors());
app.use(express.json());

// Obtener todo el inventario
app.get('/api/inventory', async (req, res) => {
  try {
    const inventario = await prisma.inventario.findMany({
      orderBy: { NombreProducto: 'asc' },
      include: {
        Proveedores: true
      }
    });

    // Map to frontend Product model
    const products = inventario.map(item => {
      // Keep the category string exactly as it comes from DB, defaulting to 'Otro'
      let cat = item.Categoria ? item.Categoria : 'Otro';

      return {
        id: item.IdProducto.toString(),
        name: item.NombreProducto,
        category: cat,
        currentStock: Number(item.CantidadDisponible),
        unit: item.UnidadMedida ? item.UnidadMedida.toLowerCase() : 'unidad',
        minStock: Number(item.StockMinimo),
        currentPrice: Number(item.CostoUnitario),
        supplierId: item.IdProveedor?.toString(),
        supplierName: item.Proveedores?.NombreProveedor,
        lastUpdated: item.FechaRegistro || new Date()
      };
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
