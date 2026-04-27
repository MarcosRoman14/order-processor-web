import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Define la variable de entorno MONGODB_URI en .env.local');
}

let client;
let clientPromise;

function createClientPromise() {
  const mongoClient = new MongoClient(uri);

  return mongoClient.connect().catch((error) => {
    // Si falla la conexión (ej. DNS transitorio), liberamos el cache para reintentar.
    if (process.env.NODE_ENV === 'development') {
      global._mongoClientPromise = null;
    } else {
      clientPromise = null;
    }
    throw error;
  });
}

if (process.env.NODE_ENV === 'development') {
  // En desarrollo reutilizamos la conexión entre hot-reloads
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  if (!clientPromise) {
    clientPromise = createClientPromise();
  }
}

export default clientPromise;
