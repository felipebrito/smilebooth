import { Database } from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

const dbPath = path.join(__dirname, '../../db.sqlite');

export async function initializeDatabase(): Promise<void> {
  const db = new Database(dbPath);
  const run = promisify(db.run.bind(db));

  try {
    // Create captures table
    await run(`
      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        original_path TEXT NOT NULL,
        cropped_path TEXT,
        face_coordinates TEXT,
        confidence REAL,
        is_auto_capture INTEGER DEFAULT 0,
        metadata TEXT
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}
