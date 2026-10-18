const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function setupDatabase() {
  const envPath = path.resolve(__dirname, '../.env');
  let dbUrl = process.env.DATABASE_URL;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) {
      dbUrl = match[1];
    }
  }

  const isPostgres = dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));
  const schemaPath = path.resolve(__dirname, 'schema.prisma');
  const sqliteSchemaPath = path.resolve(__dirname, 'schema.sqlite.prisma');

  console.log('🔄 HealthSync Database Initialization...');
  console.log(`Database target URL: ${dbUrl ? (dbUrl.includes('@') ? dbUrl.split('@')[1] : dbUrl) : 'Not specified'}`);

  let useSqlite = false;
  if (!isPostgres || process.env.USE_SQLITE === 'true') {
    useSqlite = true;
  } else {
    // Check if Postgres server is actually listening
    try {
      const net = require('net');
      const url = new URL(dbUrl);
      const port = parseInt(url.port || '5432', 10);
      const host = url.hostname || 'localhost';
      
      const socket = new net.Socket();
      socket.setTimeout(1500);
      
      let connected = false;
      socket.on('connect', () => {
        connected = true;
        socket.destroy();
      });
      socket.on('error', () => {
        socket.destroy();
      });
      socket.on('timeout', () => {
        socket.destroy();
      });
      
      socket.connect(port, host);
    } catch (e) {
      console.log('⚠️ Could not connect to PostgreSQL. Falling back to local standalone SQLite.');
      useSqlite = true;
    }
  }

  if (useSqlite) {
    console.log('📦 Activating standalone zero-dependency SQLite storage (dev.db)...');
    if (fs.existsSync(sqliteSchemaPath)) {
      fs.copyFileSync(sqliteSchemaPath, schemaPath);
    }
    process.env.DATABASE_URL = 'file:./dev.db';
  } else {
    console.log('🐘 Activating PostgreSQL storage layer...');
  }

  try {
    console.log('⚙️ Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('📦 Synchronizing schema tables...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db' } });
    console.log('🌱 Seeding synthetic healthcare data...');
    execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db' } });
    console.log('✅ Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    process.exit(1);
  }
}

setupDatabase();
