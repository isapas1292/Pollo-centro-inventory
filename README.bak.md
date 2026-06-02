# Sistema de Gestión de Inventario - Pollo Centro

Sistema completo de inventario con control de proveedores, productos, órdenes de compra, ventas y producción. Incluye gestión de usuarios, roles, permisos, auditoría y reportes detallados.

## 📋 Características

### 🛡️ Seguridad y Acceso
- Sistema de autenticación con usuario y contraseña
- Roles de usuario personalizables: Admin, Gerente, Empleado
- Permisos granulares por rol para cada módulo
- Auditoría completa de acciones críticas

### 📦 Gestión de Inventario
- Productos con variantes (pollo entero, partes, etc.)
- Módulo de producción para procesamiento de aves
- Control de existencias con alertas de bajo stock
- Reportes de rotación y niveles de inventario

### 🤝 Gestión de Proveedores
- Base de datos completa de proveedores
- Historial de órdenes de compra
- Control de términos de crédito
- Evaluación de rendimiento de proveedores

### 🛒 Procesos de Negocio
- Órdenes de compra a proveedores
- Órdenes de venta a clientes
- Control de pagos a proveedores
- Sistema de facturación
- Reportes de rentabilidad por producto

### 📊 Reportes y Auditoría
- Libro mayor de transacciones
- Reportes de ventas por período
- Reportes de compras por proveedor
- Reportes de producción
- Reportes de inventario valorizado
- Registros de auditoría completos

---

## 🚀 Instalación

### Requisitos Previos
- Python 3.9+
- PostgreSQL 12+

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd Pollo-centro-inventory
   ```

2. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar base de datos**
   - Crear base de datos PostgreSQL: `CREATE DATABASE pollo_centro;`
   - Configurar variables de entorno en `.env`:
     ```env
     DATABASE_URL=postgresql://user:password@localhost:5432/pollo_centro
     SECRET_KEY=your-secret-key
     ```

4. **Migraciones de base de datos**
   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```

5. **Crear usuario administrador**
   ```bash
   flask create-admin
   ```
   (Se solicitará usuario y contraseña)

6. **Iniciar el servidor**
   ```bash
   flask run
   ```

---

## 👥 Roles de Usuario

### 👑 Admin (Superusuario)
- Acceso total a todos los módulos
- Puede crear y gestionar usuarios
- Puede editar cualquier registro
- Acceso a reportes financieros completos

### 👔 Gerente
- Gestión de proveedores
- Creación de órdenes de compra
- Gestión de productos y categorías
- Ver reportes de inventario y ventas

### 👨‍🔧 Empleado
- Registrar ventas
- Actualizar niveles de inventario
- Registrar recepción de productos
- Ver información básica del negocio

---

## 📁 Estructura del Proyecto

```
Pollo-centro-inventory/
├── app/
│   ├── models/             # Modelos de base de datos
│   ├── routes/             # Definiciones de rutas (endpoints)
│   ├── services/           # Lógica de negocio
│   ├── utils/              # Utilidades y helpers
│   ├── templates/          # Vistas HTML
│   └── static/             # Archivos estáticos
├── config.py               # Configuración de la aplicación
├── database.py             # Configuración de la base de datos
├── main.py                 # Punto de entrada de la aplicación
├── requirements.txt        # Dependencias del proyecto
└── README.md               # Documentación del proyecto
```

---

## 📋 Comandos Disponibles

### Comandos de Desarrollo
```bash
# Iniciar servidor de desarrollo
flask run

# Crear usuario administrador
flask create-admin

# Ejecutar consola interactiva
flask shell
```

### Comandos de Base de Datos
```bash
# Inicializar migraciones
flask db init

# Crear migraciones
flask db migrate

# Aplicar migraciones
flask db upgrade

# Revertir última migración
flask db downgrade
```

---

## 🔐 Seguridad

### Manejo de Contraseñas
Las contraseñas están hasheadas utilizando bcrypt para mayor seguridad.

### Control de Acceso
Se implementa protección de rutas por rol mediante decoradores.

### Registro de Auditoría
Todas las acciones críticas se registran en la tabla `audit_logs` incluyendo:
- Usuario que realizó la acción
- Fecha y hora
- Tipo de acción
- Descripción detallada

---

## 📊 Reportes

El sistema genera reportes detallados en formato PDF y CSV:

### Tipos de Reportes
1. **Reporte de Inventario** - Estado actual de existencias
2. **Reporte de Ventas** - Detalle de transacciones
3. **Reporte de Compras** - Órdenes de compra emitidas
4. **Reporte de Producción** - Conversión de materias primas
5. **Reporte de Rentabilidad** - Margen por producto
6. **Libro Mayor** - Transacciones contables completas

### Generación de Reportes
```python
from app.services.report_service import ReportService

# Generar reporte de ventas en PDF
report_service.generate_sales_report('2023-01-01', '2023-12-31', format='pdf')

# Generar reporte de inventario en CSV
report_service.generate_inventory_report(format='csv')
```

---

## 📝 Notas de Desarrollo

- Se recomienda usar un entorno virtual de Python
- El sistema utiliza Blueprints para modularizar las rutas
- Las migraciones de base de datos deben ejecutarse antes de cambiar modelos
- Todos los servicios de negocio están centralizados para fácil mantenimiento

---

## 📞 Soporte

Para problemas técnicos o sugerencias, por favor contactar a:

- **Desarrollador:** [Tu Nombre o Equipo]
- **Email:** [Tu Email]

---

## 📄 Licencia

Este proyecto es de código cerrado para uso exclusivo del negocio Pollo Centro.

---

## 🙏 Agradecimientos

- Framework Flask - Microframework Python
- Base de datos PostgreSQL - Sistema de gestión de BD relacional
- SQLAlchemy - ORM para Python
- ReportLab - Generación de PDFs
- Bcrypt - Hashing de contraseñas

---

**Desarrollado para Pollo Centro**

**¡Gracias por usar el sistema!**