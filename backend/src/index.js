require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pollocentro_secret_key_123';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error']
});
const app = express();

app.use(cors());
app.use(express.json());

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const user = await prisma.usuarios.findUnique({
      where: { Correo: email },
      include: { Roles: true }
    });

    if (!user || !user.Estado) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }

    const isMatch = await bcrypt.compare(password, user.Contrasena);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.IdUsuario, role: user.Roles.NombreRol, email: user.Correo },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        uid: user.IdUsuario.toString(),
        email: user.Correo,
        displayName: `${user.Nombre} ${user.Apellido}`.trim(),
        role: user.Roles.NombreRol,
        active: user.Estado
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor al intentar iniciar sesión' });
  }
});

// --- Suppliers Routes ---
app.get('/api/suppliers', async (req, res) => {
  try {
    const proveedores = await prisma.proveedores.findMany({ orderBy: { NombreProveedor: 'asc' } });
    res.json(proveedores.map(p => ({
      id: p.IdProveedor.toString(),
      name: p.NombreProveedor,
      contactName: p.Direccion || '',
      phone: p.Telefono || '',
      email: p.Correo || '',
      active: p.Estado,
      notes: p.RNC || ''
    })));
  } catch (error) {
    res.status(500).json({ error: 'Error fetching suppliers' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const { name, contactName, phone, email, active, notes } = req.body;
  try {
    const p = await prisma.proveedores.create({
      data: {
        NombreProveedor: name,
        Direccion: contactName,
        Telefono: phone,
        Correo: email,
        Estado: active,
        RNC: notes
      }
    });
    res.json({
      id: p.IdProveedor.toString(),
      name: p.NombreProveedor,
      contactName: p.Direccion || '',
      phone: p.Telefono || '',
      email: p.Correo || '',
      active: p.Estado,
      notes: p.RNC || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating supplier' });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contactName, phone, email, active, notes } = req.body;
  try {
    const p = await prisma.proveedores.update({
      where: { IdProveedor: parseInt(id) },
      data: {
        NombreProveedor: name,
        Direccion: contactName,
        Telefono: phone,
        Correo: email,
        Estado: active,
        RNC: notes
      }
    });
    res.json({
      id: p.IdProveedor.toString(),
      name: p.NombreProveedor,
      contactName: p.Direccion || '',
      phone: p.Telefono || '',
      email: p.Correo || '',
      active: p.Estado,
      notes: p.RNC || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error updating supplier' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.proveedores.delete({ where: { IdProveedor: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting supplier' });
  }
});

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
