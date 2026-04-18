// Ejecutar una sola vez para poblar los catálogos del SAT en MongoDB:
//   npm run seed
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const catalogos = [
  // Formas de pago (SAT)
  { tipo: 'forma_pago', codigo: '01', descripcion: 'Efectivo', activo: true },
  { tipo: 'forma_pago', codigo: '02', descripcion: 'Cheque nominativo', activo: true },
  { tipo: 'forma_pago', codigo: '03', descripcion: 'Transferencia electrónica de fondos', activo: true },
  { tipo: 'forma_pago', codigo: '04', descripcion: 'Tarjeta de crédito', activo: true },
  { tipo: 'forma_pago', codigo: '28', descripcion: 'Tarjeta de débito', activo: true },
  { tipo: 'forma_pago', codigo: '99', descripcion: 'Por definir', activo: true },

  // Métodos de pago (SAT)
  { tipo: 'metodo_pago', codigo: 'PUE', descripcion: 'Pago en una sola exhibición', activo: true },
  { tipo: 'metodo_pago', codigo: 'PPD', descripcion: 'Pago en parcialidades o diferido', activo: true },

  // Usos CFDI (SAT)
  { tipo: 'uso_cfdi', codigo: 'G01', descripcion: 'Adquisición de mercancias', activo: true },
  { tipo: 'uso_cfdi', codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones', activo: true },
  { tipo: 'uso_cfdi', codigo: 'G03', descripcion: 'Gastos en general', activo: true },
  { tipo: 'uso_cfdi', codigo: 'I01', descripcion: 'Construcciones', activo: true },
  { tipo: 'uso_cfdi', codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios', activo: true },
  { tipo: 'uso_cfdi', codigo: 'D01', descripcion: 'Honorarios médicos, dentales y gastos hospitalarios', activo: true },
  { tipo: 'uso_cfdi', codigo: 'S01', descripcion: 'Sin efectos fiscales', activo: true },
  { tipo: 'uso_cfdi', codigo: 'CP01', descripcion: 'Pagos', activo: true },
];

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('order-processor');
    const col = db.collection('catalogos');

    await col.deleteMany({});
    await col.insertMany(catalogos);

    // Índice para búsquedas rápidas por tipo
    await col.createIndex({ tipo: 1, codigo: 1 });

    console.log(`✅ ${catalogos.length} catálogos insertados correctamente`);
  } finally {
    await client.close();
  }
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
