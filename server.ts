import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_PATH = path.join(__dirname, 'families.json');
const STEAM_API_KEY = process.env.STEAM_WEB_API_KEY;

// Initialize DB if not exists
async function initDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify([]));
  }
}

interface Member {
  steamId: string;
  gameIds: number[];
}

interface Family {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

async function fetchSteamGames(steamId: string): Promise<number[]> {
  if (!STEAM_API_KEY) {
    console.warn('STEAM_WEB_API_KEY not found. Returning mock game IDs.');
    // Return some mock IDs based on the steamId seed for demo purposes
    return [440, 570, 730].map(id => id + (parseInt(steamId.slice(-3)) || 0));
  }

  try {
    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/', {
      params: {
        key: STEAM_API_KEY,
        steamid: steamId,
        format: 'json',
      },
      timeout: 5000,
    });

    const games = response.data?.response?.games || [];
    return games.map((g: any) => g.appid);
  } catch (error) {
    console.error(`Error fetching games for ${steamId}:`, error);
    return [];
  }
}

async function startServer() {
  await initDB();
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/families', async (req, res) => {
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Failed to load families' });
    }
  });

  app.post('/api/families', async (req, res) => {
    const { id, name, steamIds } = req.body;
    
    if (!name || !Array.isArray(steamIds)) {
      return res.status(400).json({ error: 'Name and steamIds array are required' });
    }

    if (steamIds.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 members allowed' });
    }

    try {
      const dbData = await fs.readFile(DB_PATH, 'utf-8');
      let families: Family[] = JSON.parse(dbData);

      // Generate game IDs for each member
      const memberPromises = steamIds.filter(sid => sid.trim()).map(async (sid) => {
        const gameIds = await fetchSteamGames(sid);
        return { steamId: sid, gameIds };
      });

      const members = await Promise.all(memberPromises);

      const timestamp = new Date().toISOString();
      
      if (id) {
        // Edit existing
        const index = families.findIndex(f => f.id === id);
        if (index !== -1) {
          families[index] = {
            ...families[index],
            name,
            members,
            updatedAt: timestamp
          };
        } else {
          return res.status(404).json({ error: 'Family not found' });
        }
      } else {
        // Create new
        const newFamily: Family = {
          id: Math.random().toString(36).substring(2, 9),
          name,
          members,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        families.push(newFamily);
      }

      await fs.writeFile(DB_PATH, JSON.stringify(families, null, 2));
      res.json(families);
    } catch (error) {
      console.error('Save error:', error);
      res.status(500).json({ error: 'Failed to save family' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
