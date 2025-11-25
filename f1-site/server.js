import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Constants
const OPENF1_MIN_YEAR = 2023; // OpenF1 API only has data from 2023 onwards
const F1_MIN_YEAR = 1950; // First F1 season
const F1_MAX_YEAR = new Date().getFullYear() + 1; // Allow next year for upcoming season

/**
 * Validates the year parameter
 * @param {string} year - Year string to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
function validateYear(year) {
  if (year === 'current') {
    return { valid: true };
  }
  
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || !/^\d{4}$/.test(year)) {
    return { valid: false, error: 'Ano inválido. Use um ano de 4 dígitos ou "current".' };
  }
  
  if (yearNum < F1_MIN_YEAR || yearNum > F1_MAX_YEAR) {
    return { valid: false, error: `Ano deve estar entre ${F1_MIN_YEAR} e ${F1_MAX_YEAR}.` };
  }
  
  return { valid: true };
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(join(__dirname, 'public')));

// API Endpoints

/**
 * Busca calendário de corridas combinando dados da Ergast API
 * @param {string} year - Ano da temporada (ou "current")
 */
app.get('/api/calendar/:year', async (req, res) => {
  const { year } = req.params;
  
  const validation = validateYear(year);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  try {
    // Buscar dados da Ergast API (gratuita, histórico completo)
    const ergastUrl = `https://ergast.com/api/f1/${encodeURIComponent(year)}.json`;
    const ergastResponse = await fetch(ergastUrl);
    
    if (!ergastResponse.ok) {
      return res.status(ergastResponse.status).json({
        error: 'Erro ao buscar dados da Ergast API',
        status: ergastResponse.status
      });
    }
    
    const ergastData = await ergastResponse.json();
    const mrData = ergastData.MRData;
    
    if (!mrData.RaceTable || !mrData.RaceTable.Races) {
      return res.status(404).json({
        error: 'Nenhuma corrida encontrada para este ano',
        year
      });
    }
    
    const races = mrData.RaceTable.Races.map(race => ({
      season: race.season,
      round: race.round,
      url: race.url,
      raceName: race.raceName,
      date: race.date,
      time: race.time || null,
      circuit: {
        circuitId: race.Circuit.circuitId,
        url: race.Circuit.url,
        circuitName: race.Circuit.circuitName,
        location: {
          lat: race.Circuit.Location.lat,
          long: race.Circuit.Location.long,
          locality: race.Circuit.Location.locality,
          country: race.Circuit.Location.country
        }
      },
      sessions: {
        firstPractice: race.FirstPractice || null,
        secondPractice: race.SecondPractice || null,
        thirdPractice: race.ThirdPractice || null,
        qualifying: race.Qualifying || null,
        sprint: race.Sprint || null
      }
    }));
    
    // Tentar buscar dados adicionais da OpenF1 (apenas para temporadas recentes)
    let openf1Data = null;
    const currentYear = new Date().getFullYear();
    const requestedYear = year === 'current' ? currentYear : parseInt(year, 10);
    
    if (requestedYear >= OPENF1_MIN_YEAR) {
      try {
        const openf1Url = `https://api.openf1.org/v1/meetings?year=${requestedYear}`;
        const openf1Response = await fetch(openf1Url, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (openf1Response.ok) {
          openf1Data = await openf1Response.json();
        }
      } catch (openf1Error) {
        // OpenF1 é opcional, continuar sem esses dados
        console.warn('OpenF1 API não disponível:', openf1Error.message);
      }
    }
    
    res.json({
      calendar: {
        requestedYear: mrData.RaceTable.season || year,
        totalRaces: races.length,
        races
      },
      openf1Data,
      sources: {
        ergast: ergastUrl,
        openf1: requestedYear >= OPENF1_MIN_YEAR ? `https://api.openf1.org/v1/meetings?year=${requestedYear}` : null
      }
    });
    
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Busca informações sobre pilotos
 * @param {string} year - Ano da temporada (ou "current")
 */
app.get('/api/drivers/:year', async (req, res) => {
  const { year } = req.params;
  
  const validation = validateYear(year);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  try {
    const ergastUrl = `https://ergast.com/api/f1/${encodeURIComponent(year)}/drivers.json`;
    const response = await fetch(ergastUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro ao buscar dados dos pilotos',
        status: response.status
      });
    }
    
    const data = await response.json();
    const drivers = data.MRData.DriverTable.Drivers.map(driver => ({
      driverId: driver.driverId,
      permanentNumber: driver.permanentNumber || null,
      code: driver.code || null,
      url: driver.url,
      givenName: driver.givenName,
      familyName: driver.familyName,
      dateOfBirth: driver.dateOfBirth,
      nationality: driver.nationality
    }));
    
    res.json({
      season: data.MRData.DriverTable.season,
      totalDrivers: drivers.length,
      drivers
    });
    
  } catch (error) {
    console.error('Erro ao buscar pilotos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Busca informações sobre construtores/equipes
 * @param {string} year - Ano da temporada (ou "current")
 */
app.get('/api/constructors/:year', async (req, res) => {
  const { year } = req.params;
  
  const validation = validateYear(year);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  try {
    const ergastUrl = `https://ergast.com/api/f1/${encodeURIComponent(year)}/constructors.json`;
    const response = await fetch(ergastUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro ao buscar dados das equipes',
        status: response.status
      });
    }
    
    const data = await response.json();
    const constructors = data.MRData.ConstructorTable.Constructors.map(c => ({
      constructorId: c.constructorId,
      url: c.url,
      name: c.name,
      nationality: c.nationality
    }));
    
    res.json({
      season: data.MRData.ConstructorTable.season,
      totalConstructors: constructors.length,
      constructors
    });
    
  } catch (error) {
    console.error('Erro ao buscar equipes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Busca classificação do campeonato de pilotos
 * @param {string} year - Ano da temporada (ou "current")
 */
app.get('/api/standings/drivers/:year', async (req, res) => {
  const { year } = req.params;
  
  const validation = validateYear(year);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  try {
    const ergastUrl = `https://ergast.com/api/f1/${encodeURIComponent(year)}/driverStandings.json`;
    const response = await fetch(ergastUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro ao buscar classificação de pilotos',
        status: response.status
      });
    }
    
    const data = await response.json();
    const standingsLists = data.MRData?.StandingsTable?.StandingsLists;
    
    if (!standingsLists || standingsLists.length === 0) {
      return res.status(404).json({
        error: 'Classificação não disponível para este ano'
      });
    }
    
    const standingsList = standingsLists[0];
    
    res.json({
      season: standingsList.season,
      round: standingsList.round,
      standings: standingsList.DriverStandings.map(s => ({
        position: s.position,
        positionText: s.positionText,
        points: s.points,
        wins: s.wins,
        driver: {
          driverId: s.Driver.driverId,
          code: s.Driver.code,
          givenName: s.Driver.givenName,
          familyName: s.Driver.familyName,
          nationality: s.Driver.nationality
        },
        constructors: s.Constructors.map(c => ({
          constructorId: c.constructorId,
          name: c.name
        }))
      }))
    });
    
  } catch (error) {
    console.error('Erro ao buscar classificação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * Busca classificação do campeonato de construtores
 * @param {string} year - Ano da temporada (ou "current")
 */
app.get('/api/standings/constructors/:year', async (req, res) => {
  const { year } = req.params;
  
  const validation = validateYear(year);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  try {
    const ergastUrl = `https://ergast.com/api/f1/${encodeURIComponent(year)}/constructorStandings.json`;
    const response = await fetch(ergastUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro ao buscar classificação de construtores',
        status: response.status
      });
    }
    
    const data = await response.json();
    const standingsLists = data.MRData?.StandingsTable?.StandingsLists;
    
    if (!standingsLists || standingsLists.length === 0) {
      return res.status(404).json({
        error: 'Classificação não disponível para este ano'
      });
    }
    
    const standingsList = standingsLists[0];
    
    res.json({
      season: standingsList.season,
      round: standingsList.round,
      standings: standingsList.ConstructorStandings.map(s => ({
        position: s.position,
        positionText: s.positionText,
        points: s.points,
        wins: s.wins,
        constructor: {
          constructorId: s.Constructor.constructorId,
          name: s.Constructor.name,
          nationality: s.Constructor.nationality
        }
      }))
    });
    
  } catch (error) {
    console.error('Erro ao buscar classificação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🏎️  F1 Calendar API rodando em http://localhost:${PORT}`);
  console.log(`📅  Calendário: GET /api/calendar/:year`);
  console.log(`👨‍✈️  Pilotos: GET /api/drivers/:year`);
  console.log(`🏗️  Equipes: GET /api/constructors/:year`);
  console.log(`🏆  Classificação Pilotos: GET /api/standings/drivers/:year`);
  console.log(`🏆  Classificação Equipes: GET /api/standings/constructors/:year`);
});
