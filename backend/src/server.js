const express = require('express');
const cors = require('cors');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const { startWhatsApp, isReady: isWhatsAppReady, sendOtpWhatsApp, sendQrImageWhatsApp, sendTextWhatsApp } = require('./whatsapp');

const app = express();

app.use(cors());
app.use(express.json());

// Start WhatsApp client asynchronously so server stays up if it fails (e.g. puppeteer error).
setImmediate(() => {
  if (String(process.env.DISABLE_WHATSAPP || '').trim() === '1') {
    // eslint-disable-next-line no-console
    console.log('[WhatsApp] Disabled via DISABLE_WHATSAPP=1');
    return;
  }
  try {
    startWhatsApp();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WhatsApp] Start failed:', err.message || err);
  }
});

const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const fuelQuotaPath = path.join(__dirname, '..', 'data', 'fuelQuota.json');
const transactionsPath = path.join(__dirname, '..', 'data', 'transactions.json');
const specialVehiclesPath = path.join(__dirname, '..', 'data', 'special.json');
const stationsPath = path.join(__dirname, '..', 'data', 'stations.json');
const customersPath = path.join(__dirname, '..', 'data', 'customers.json');
const deliveriesPath = path.join(__dirname, '..', 'data', 'deliveries.json');

async function readUsers() {
  const raw = await fs.readFile(usersPath, 'utf-8');
  const users = JSON.parse(raw);
  if (!Array.isArray(users)) throw new Error('users.json must be an array');
  return users;
}

async function writeUsers(users) {
  if (!Array.isArray(users)) throw new Error('users must be an array');
  await fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf-8');
}

async function readFuelQuotas() {
  const raw = await fs.readFile(fuelQuotaPath, 'utf-8');
  const quotas = JSON.parse(raw);
  if (!Array.isArray(quotas)) throw new Error('fuelQuota.json must be an array');
  return quotas;
}

async function writeFuelQuotas(quotas) {
  if (!Array.isArray(quotas)) throw new Error('quotas must be an array');
  await fs.writeFile(fuelQuotaPath, JSON.stringify(quotas, null, 2), 'utf-8');
}

async function readTransactions() {
  const raw = await fs.readFile(transactionsPath, 'utf-8');
  const tx = JSON.parse(raw);
  if (!Array.isArray(tx)) throw new Error('transactions.json must be an array');
  return tx;
}

async function writeTransactions(tx) {
  if (!Array.isArray(tx)) throw new Error('transactions must be an array');
  await fs.writeFile(transactionsPath, JSON.stringify(tx, null, 2), 'utf-8');
}

async function readSpecialVehicles() {
  const raw = await fs.readFile(specialVehiclesPath, 'utf-8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('special.json must be an array');
  return list;
}

async function writeSpecialVehicles(list) {
  if (!Array.isArray(list)) throw new Error('special vehicles must be an array');
  await fs.writeFile(specialVehiclesPath, JSON.stringify(list, null, 2), 'utf-8');
}

async function readStations() {
  const raw = await fs.readFile(stationsPath, 'utf-8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('stations.json must be an array');
  return list;
}

async function writeStations(list) {
  if (!Array.isArray(list)) throw new Error('stations must be an array');
  await fs.writeFile(stationsPath, JSON.stringify(list, null, 2), 'utf-8');
}

async function readCustomers() {
  const raw = await fs.readFile(customersPath, 'utf-8');
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('customers.json must be an array');
  return list;
}

async function writeCustomers(list) {
  if (!Array.isArray(list)) throw new Error('customers must be an array');
  await fs.writeFile(customersPath, JSON.stringify(list, null, 2), 'utf-8');
}

async function readDeliveries() {
  try {
    const raw = await fs.readFile(deliveriesPath, 'utf-8');
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list;
  } catch {
    return [];
  }
}

async function writeDeliveries(list) {
  if (!Array.isArray(list)) throw new Error('deliveries must be an array');
  const dir = path.join(__dirname, '..', 'data');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(deliveriesPath, JSON.stringify(list, null, 2), 'utf-8');
}

const otpStore = new Map(); // key => { otp, expiresAt, verifiedAt }
const OTP_TTL_MS = 5 * 60 * 1000;

function normalizePhone07(phone) {
  const p = String(phone || '').trim();
  if (!/^07\d{8}$/.test(p)) return null;
  return p;
}

function validateNic(nic) {
  return /^([0-9]{9}[VXvx]|[0-9]{12})$/.test(String(nic || '').trim());
}

function otpKey(nic, phone07) {
  return `${String(nic || '').trim().toUpperCase()}|${phone07}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Return all users from users.json for admin (no passwordHash). Used for "Filling station login credentials" in admin.
app.get('/api/admin/users', async (_req, res) => {
  try {
    const users = await readUsers();
    const safe = users.map((u) => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
    return res.json({ users: safe });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, username, password } = req.body ?? {};
    if (!role || !username || !password) {
      return res.status(400).json({ error: 'role, username, password are required' });
    }

    const users = await readUsers();
    const user = users.find((u) => u.role === role && String(u.username).toLowerCase() === String(username).toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Never return passwordHash to the client.
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Fuel quotas are stored in backend/data/fuelQuota.json as an array.
app.get('/api/admin/fuel-quotas', async (_req, res) => {
  try {
    const quotas = await readFuelQuotas();
    return res.json({ quotas });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/fuel-quotas', async (req, res) => {
  try {
    const { quotas } = req.body ?? {};
    if (!Array.isArray(quotas)) return res.status(400).json({ error: 'quotas must be an array' });
    await writeFuelQuotas(quotas);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Single station (for station dashboard – real stock from stations.json).
app.get('/api/stations/:stationId', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const stations = await readStations();
    const station = stations.find((s) => String(s.id).toUpperCase() === stationId);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    return res.json({ station });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Public stations list (used by home page fuel map). Enriches each station with bowser in-transit totals.
app.get('/api/stations', async (_req, res) => {
  try {
    const [stations, deliveries] = await Promise.all([readStations(), readDeliveries()]);
    const inTransitByStation = {};
    for (const d of deliveries) {
      if (d.status !== 'in-transit' && d.status !== 'pending') continue;
      const sid = String(d.stationId || '').toUpperCase();
      if (!sid) continue;
      if (!inTransitByStation[sid]) inTransitByStation[sid] = { petrol: 0, diesel: 0 };
      if (d.fuelType === 'petrol') inTransitByStation[sid].petrol += Number(d.liters) || 0;
      else if (d.fuelType === 'diesel') inTransitByStation[sid].diesel += Number(d.liters) || 0;
    }
    const enriched = stations.map((s) => {
      const sid = String(s.id || '').toUpperCase();
      const inTransit = inTransitByStation[sid] || { petrol: 0, diesel: 0 };
      return {
        ...s,
        inTransitPetrol: inTransit.petrol,
        inTransitDiesel: inTransit.diesel,
      };
    });
    return res.json({ stations: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Recent transactions for a vehicle (customer dashboard).
app.get('/api/transactions', async (req, res) => {
  try {
    const vehicleNumber = String(req.query.vehicleNumber || '').trim().toUpperCase();
    if (!vehicleNumber) return res.status(400).json({ error: 'vehicleNumber is required' });

    const limitRaw = req.query.limit;
    const limitNum = limitRaw === undefined ? 10 : Number(limitRaw);
    const limit = Number.isFinite(limitNum) ? Math.max(1, Math.min(50, Math.floor(limitNum))) : 10;

    const [tx, stations] = await Promise.all([readTransactions(), readStations()]);
    const stationNameById = new Map(stations.map((s) => [String(s.id).toUpperCase(), s.name]));

    const filtered = tx
      .filter((t) => String(t.vehicleNumber).toUpperCase() === vehicleNumber)
      .slice(0, limit)
      .map((t) => ({
        ...t,
        stationName: stationNameById.get(String(t.stationId).toUpperCase()) || String(t.stationId),
      }));

    return res.json({ transactions: filtered });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Vehicle fuel issue transactions (per station).
app.get('/api/stations/:stationId/transactions', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const tx = await readTransactions();
    const filtered = tx.filter((t) => String(t.stationId).toUpperCase() === stationId);
    return res.json({ transactions: filtered });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/stations/:stationId/transactions', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const { vehicleNumber, liters, fuelType, operatorId } = req.body ?? {};

    if (!vehicleNumber || !liters || !fuelType) {
      return res.status(400).json({ error: 'vehicleNumber, liters, fuelType are required' });
    }
    const litersNum = Number(liters);
    if (!Number.isFinite(litersNum) || litersNum <= 0) {
      return res.status(400).json({ error: 'liters must be a positive number' });
    }
    if (fuelType !== 'petrol' && fuelType !== 'diesel') {
      return res.status(400).json({ error: 'fuelType must be petrol or diesel' });
    }

    // Update station stock in backend/data/stations.json
    const stations = await readStations();
    const stationIndex = stations.findIndex((s) => String(s.id).toUpperCase() === stationId);
    if (stationIndex === -1) return res.status(404).json({ error: `Station ${stationId} not found` });

    const station = stations[stationIndex];
    const currentStock = fuelType === 'petrol' ? Number(station.petrolStock) : Number(station.dieselStock);
    if (!Number.isFinite(currentStock)) return res.status(500).json({ error: 'Station stock is invalid' });
    if (litersNum > currentStock) {
      return res.status(400).json({ error: `Not enough ${fuelType} stock. Available: ${currentStock}L` });
    }

    const updatedStation = { ...station };
    if (fuelType === 'petrol') updatedStation.petrolStock = currentStock - litersNum;
    else updatedStation.dieselStock = currentStock - litersNum;

    const petrolLeft = Number(updatedStation.petrolStock) || 0;
    const dieselLeft = Number(updatedStation.dieselStock) || 0;
    // After first QR dispensed at this station, switch from in-transit to dispensing (green)
    if (station.status === 'in-transit') {
      updatedStation.status = petrolLeft <= 0 && dieselLeft <= 0 ? 'empty' : 'dispensing';
    } else {
      updatedStation.status = petrolLeft <= 0 && dieselLeft <= 0 ? 'empty' : 'available';
    }

    stations[stationIndex] = updatedStation;
    await writeStations(stations);

    const tx = await readTransactions();
    const transaction = {
      id: `TX${Date.now()}`,
      stationId,
      vehicleNumber: String(vehicleNumber).toUpperCase(),
      liters: litersNum,
      fuelType,
      operatorId: operatorId ? String(operatorId).toUpperCase() : undefined,
      createdAt: new Date().toISOString(),
    };
    tx.unshift(transaction);
    await writeTransactions(tx);

    // Decrement customer remaining quota when fuel is dispensed
    const customers = await readCustomers();
    const vehicleUpper = String(vehicleNumber).toUpperCase();
    const customerIndex = customers.findIndex((c) => String(c.vehicleNumber).toUpperCase() === vehicleUpper);
    let updatedCustomer = null;
    if (customerIndex !== -1) {
      const c = customers[customerIndex];
      const petrolRemaining = Number(c.petrolRemaining);
      const dieselRemaining = Number(c.dieselRemaining);
      const updated = { ...c };
      if (fuelType === 'petrol' && Number.isFinite(petrolRemaining)) {
        updated.petrolRemaining = Math.max(0, petrolRemaining - litersNum);
      } else if (fuelType === 'diesel' && Number.isFinite(dieselRemaining)) {
        updated.dieselRemaining = Math.max(0, dieselRemaining - litersNum);
      }
      customers[customerIndex] = updated;
      updatedCustomer = updated;
      await writeCustomers(customers);
    }

    // Notify customer by WhatsApp (non-blocking; do not fail the transaction if WhatsApp errors)
    if (updatedCustomer && isWhatsAppReady()) {
      const phone07 = normalizePhone07(updatedCustomer.phone);
      if (phone07) {
        const remaining =
          fuelType === 'petrol'
            ? Number(updatedCustomer.petrolRemaining)
            : Number(updatedCustomer.dieselRemaining);
        const remainingSafe = Number.isFinite(remaining) ? Math.max(0, remaining) : null;
        const when = new Date(transaction.createdAt);
        const whenText = Number.isFinite(when.getTime()) ? when.toLocaleString('en-LK') : transaction.createdAt;
        const message =
          `Fuel dispensed\n` +
          `Vehicle: ${transaction.vehicleNumber}\n` +
          `Station: ${station.name || stationId}\n` +
          `Fuel: ${String(fuelType).toUpperCase()}\n` +
          `Quantity: ${litersNum}L\n` +
          (remainingSafe !== null ? `Remaining quota: ${remainingSafe}L\n` : '') +
          `Time: ${whenText}`;
        setImmediate(() => {
          sendTextWhatsApp(phone07, message).catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[WhatsApp] Failed to send dispense message:', err?.message || err);
          });
        });
      }
    }

    return res.json({ transaction, station: updatedStation });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Pump operators per station (station dashboard).
app.get('/api/stations/:stationId/operators', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const users = await readUsers();
    const ops = users
      .filter((u) => u.role === 'operator' && String(u.stationId || '').toUpperCase() === stationId)
      .map((u) => {
        // eslint-disable-next-line no-unused-vars
        const { passwordHash, ...safeUser } = u;
        return safeUser;
      });
    return res.json({ operators: ops });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/stations/:stationId/operators', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const { name, phone, password } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const users = await readUsers();
    const existingNums = users
      .filter((u) => u.role === 'operator')
      .map((u) => Number(String(u.username || '').replace(/\D/g, '')))
      .filter((n) => Number.isFinite(n));
    const next = (existingNums.reduce((max, n) => Math.max(max, n), 0) || 0) + 1;
    const operatorId = `OP${String(next).padStart(3, '0')}`;

    const dup = users.find((u) => u.role === 'operator' && String(u.username).toUpperCase() === operatorId);
    if (dup) return res.status(409).json({ error: 'Operator ID already exists' });

    const generatedPassword =
      typeof password === 'string' && password.trim().length >= 4
        ? password.trim()
        : (Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 6));

    const passwordHash = await bcrypt.hash(String(generatedPassword), 10);
    const operatorUser = {
      id: `u_operator_${operatorId.toLowerCase()}`,
      role: 'operator',
      username: operatorId,
      operatorId,
      stationId,
      displayName: String(name).trim(),
      phone: phone ? String(phone).trim() : undefined,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(operatorUser);
    await writeUsers(users);

    // eslint-disable-next-line no-unused-vars
    const { passwordHash: _ph, ...safeUser } = operatorUser;
    return res.json({ operator: safeUser, credentials: { operatorId, password: generatedPassword } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Stock to be received (station dashboard): pending + in-transit deliveries for this station.
app.get('/api/stations/:stationId/deliveries', async (req, res) => {
  try {
    const stationId = String(req.params.stationId || '').toUpperCase();
    const list = await readDeliveries();
    const forStation = list.filter(
      (d) => String(d.stationId).toUpperCase() === stationId && (d.status === 'pending' || d.status === 'in-transit')
    );
    return res.json({ deliveries: forStation });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list all deliveries (for bowser/dispatch UI).
app.get('/api/admin/deliveries', async (_req, res) => {
  try {
    const list = await readDeliveries();
    return res.json({ deliveries: list });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create a delivery (when "send bowser").
app.post('/api/admin/deliveries', async (req, res) => {
  try {
    const { stationId, fuelType, liters } = req.body ?? {};
    if (!stationId || !fuelType || liters === undefined || liters === null) {
      return res.status(400).json({ error: 'stationId, fuelType, liters are required' });
    }
    const litersNum = Number(liters);
    if (!Number.isFinite(litersNum) || litersNum <= 0) {
      return res.status(400).json({ error: 'liters must be a positive number' });
    }
    if (fuelType !== 'petrol' && fuelType !== 'diesel') {
      return res.status(400).json({ error: 'fuelType must be petrol or diesel' });
    }
    const stations = await readStations();
    const station = stations.find((s) => String(s.id).toUpperCase() === String(stationId).toUpperCase());
    if (!station) return res.status(404).json({ error: 'Station not found' });

    let list = await readDeliveries();
    if (!Array.isArray(list)) list = [];
    const id = `D${Date.now()}`;
    const delivery = {
      id,
      stationId: String(stationId).toUpperCase(),
      fuelType,
      liters: litersNum,
      status: 'in-transit',
      createdAt: new Date().toISOString(),
    };
    list.unshift(delivery);
    await writeDeliveries(list);

    // Add fuel to station immediately and mark as in-transit until first QR is dispensed
    const stationIndex = stations.findIndex((s) => String(s.id).toUpperCase() === String(stationId).toUpperCase());
    if (stationIndex !== -1) {
      const s = stations[stationIndex];
      if (fuelType === 'petrol') {
        s.petrolStock = Math.min(s.petrolCapacity, (Number(s.petrolStock) || 0) + litersNum);
      } else {
        s.dieselStock = Math.min(s.dieselCapacity, (Number(s.dieselStock) || 0) + litersNum);
      }
      s.status = 'in-transit';
      stations[stationIndex] = s;
      await writeStations(stations);
    }

    return res.json({ delivery });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('POST /api/admin/deliveries error:', err);
    const message = err && typeof err.message === 'string' ? err.message : 'Server error';
    return res.status(500).json({ error: message });
  }
});

// Admin: update delivery status (e.g. delivered → update station stock).
app.patch('/api/admin/deliveries/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const { status } = req.body ?? {};
    if (!status || !['pending', 'in-transit', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'status must be one of: pending, in-transit, delivered, cancelled' });
    }
    const list = await readDeliveries();
    const idx = list.findIndex((d) => String(d.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'Delivery not found' });

    const delivery = list[idx];
    const stations = await readStations();
    const stationIndex = stations.findIndex((s) => String(s.id).toUpperCase() === String(delivery.stationId).toUpperCase());

    if (status === 'delivered') {
      // Stock was already added when bowser was sent; station stays in-transit until first QR dispensed
      // No station update here
    } else if (status === 'cancelled' && stationIndex !== -1) {
      // Reverse the stock that was added when this bowser was sent
      const s = stations[stationIndex];
      if (delivery.fuelType === 'petrol') {
        s.petrolStock = Math.max(0, (Number(s.petrolStock) || 0) - delivery.liters);
      } else {
        s.dieselStock = Math.max(0, (Number(s.dieselStock) || 0) - delivery.liters);
      }
      const petrolLeft = Number(s.petrolStock) || 0;
      const dieselLeft = Number(s.dieselStock) || 0;
      s.status = petrolLeft <= 0 && dieselLeft <= 0 ? 'empty' : 'available';
      stations[stationIndex] = s;
      await writeStations(stations);
    }

    list[idx] = { ...delivery, status };
    await writeDeliveries(list);
    return res.json({ delivery: list[idx] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Special vehicles (admin).
app.get('/api/admin/special-vehicles', async (_req, res) => {
  try {
    const specialVehicles = await readSpecialVehicles();
    return res.json({ specialVehicles });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/special-vehicles', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, fuelQuota } = req.body ?? {};
    if (!vehicleNumber || !vehicleType || fuelQuota === undefined || fuelQuota === null) {
      return res.status(400).json({ error: 'vehicleNumber, vehicleType, fuelQuota are required' });
    }
    const fuelQuotaNum = Number(fuelQuota);
    if (!Number.isFinite(fuelQuotaNum) || fuelQuotaNum <= 0) {
      return res.status(400).json({ error: 'fuelQuota must be a positive number' });
    }

    const list = await readSpecialVehicles();
    const specialVehicle = {
      id: `SV${Date.now()}`,
      vehicleNumber: String(vehicleNumber).toUpperCase(),
      vehicleType: String(vehicleType),
      fuelQuota: fuelQuotaNum,
      createdAt: new Date().toISOString(),
    };
    list.unshift(specialVehicle);
    await writeSpecialVehicles(list);
    return res.json({ specialVehicle });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Stations (admin).
app.get('/api/admin/stations', async (_req, res) => {
  try {
    const stations = await readStations();
    return res.json({ stations });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/stations', async (req, res) => {
  try {
    const { name, lat, lng, province, address, phone, petrolCapacity, dieselCapacity } = req.body ?? {};
    if (!name || lat === undefined || lng === undefined || !province || !address || !phone) {
      return res.status(400).json({ error: 'name, lat, lng, province, address, phone are required' });
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    const petrolCapacityNum = Number(petrolCapacity);
    const dieselCapacityNum = Number(dieselCapacity);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return res.status(400).json({ error: 'lat/lng must be numbers' });
    if (!Number.isFinite(petrolCapacityNum) || petrolCapacityNum <= 0) return res.status(400).json({ error: 'petrolCapacity must be a positive number' });
    if (!Number.isFinite(dieselCapacityNum) || dieselCapacityNum <= 0) return res.status(400).json({ error: 'dieselCapacity must be a positive number' });

    const list = await readStations();
    const nextNumber =
      list
        .map((s) => Number(String(s.id || '').replace(/\D/g, '')))
        .filter((n) => Number.isFinite(n))
        .reduce((max, n) => Math.max(max, n), 0) + 1;
    const id = `FS${String(nextNumber).padStart(3, '0')}`;

    const station = {
      id,
      name: String(name).trim(),
      lat: latNum,
      lng: lngNum,
      petrolStock: 0,
      dieselStock: 0,
      petrolCapacity: petrolCapacityNum,
      dieselCapacity: dieselCapacityNum,
      status: 'empty',
      province: String(province),
      address: String(address).trim(),
      phone: String(phone).trim(),
    };
    list.push(station);
    await writeStations(list);

    // Auto-create station login user with generated password.
    const users = await readUsers();
    const existing = users.find((u) => u.role === 'station' && String(u.username).toUpperCase() === id);
    if (!existing) {
      const password = Math.random().toString(36).slice(2, 6).toUpperCase() + Math.random().toString(36).slice(2, 6);
      const passwordHash = await bcrypt.hash(password, 10);
      users.push({
        id: `u_station_${id.toLowerCase()}`,
        role: 'station',
        username: id,
        stationId: id,
        displayName: `${id} Manager`,
        passwordHash,
      });
      await writeUsers(users);
      return res.json({ station, credentials: { username: id, password } });
    }

    return res.json({ station, credentials: { username: id } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Customer registration + OTP (demo).
app.post('/api/customers/otp/send', async (req, res) => {
  try {
    const { nic, phone } = req.body ?? {};
    if (!validateNic(nic)) return res.status(400).json({ error: 'Invalid NIC format' });
    const phone07 = normalizePhone07(phone);
    if (!phone07) return res.status(400).json({ error: 'Phone must be in 07XXXXXXXX format' });

    const otp = generateOtp();
    const key = otpKey(nic, phone07);
    otpStore.set(key, { otp, expiresAt: Date.now() + OTP_TTL_MS, verifiedAt: null });

    if (isWhatsAppReady()) {
      await sendOtpWhatsApp(phone07, otp);
      return res.json({ ok: true });
    }

    // Fallback if WhatsApp is not connected yet (still allows demo flow).
    // eslint-disable-next-line no-console
    console.log(`[OTP] WhatsApp not ready. NIC=${String(nic).trim()} phone=${phone07} otp=${otp}`);
    return res.json({ ok: true, devOtp: otp, warning: 'WhatsApp not connected yet' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/customers/otp/verify', async (req, res) => {
  try {
    const { nic, phone, otp } = req.body ?? {};
    if (!validateNic(nic)) return res.status(400).json({ error: 'Invalid NIC format' });
    const phone07 = normalizePhone07(phone);
    if (!phone07) return res.status(400).json({ error: 'Phone must be in 07XXXXXXXX format' });
    if (!/^\d{6}$/.test(String(otp || ''))) return res.status(400).json({ error: 'OTP must be 6 digits' });

    const key = otpKey(nic, phone07);
    const entry = otpStore.get(key);
    if (!entry) return res.status(400).json({ error: 'OTP not found. Please resend.' });
    if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'OTP expired. Please resend.' });
    if (String(otp) !== entry.otp) return res.status(400).json({ error: 'Invalid OTP' });

    otpStore.set(key, { ...entry, verifiedAt: Date.now() });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Customer login: after OTP verified, find customer by NIC + phone and return (for showing QR).
app.post('/api/customers/login', async (req, res) => {
  try {
    const { nic, phone } = req.body ?? {};
    if (!validateNic(nic)) return res.status(400).json({ error: 'Invalid NIC format' });
    const phone07 = normalizePhone07(phone);
    if (!phone07) return res.status(400).json({ error: 'Phone must be in 07XXXXXXXX format' });

    const key = otpKey(nic, phone07);
    const entry = otpStore.get(key);
    if (!entry || !entry.verifiedAt || Date.now() > entry.expiresAt) {
      return res.status(401).json({ error: 'OTP not verified or expired. Please complete OTP verification first.' });
    }

    const customers = await readCustomers();
    const nicUpper = String(nic).trim().toUpperCase();
    const customer = customers.find(
      (c) => String(c.nic || '').trim().toUpperCase() === nicUpper && String(c.phone || '').trim() === phone07
    );
    if (!customer) {
      return res.status(404).json({ error: 'No account found for this NIC and contact number. Please register first.' });
    }
    return res.json({ customer });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Customer ID required' });
    const customers = await readCustomers();
    const customer = customers.find((c) => String(c.id) === id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    return res.json({ customer });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/customers/:id/qr/whatsapp', async (req, res) => {
  try {
    if (!isWhatsAppReady()) {
      return res.status(503).json({ error: 'WhatsApp client not ready. Please scan the backend WhatsApp QR first.' });
    }

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Customer ID required' });

    const customers = await readCustomers();
    const customer = customers.find((c) => String(c.id) === id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const caption =
      `Fuel quota QR\n` +
      `Vehicle: ${customer.vehicleNumber}\n` +
      `Name: ${customer.name}`;

    await sendQrImageWhatsApp(customer.phone, customer.qrCode, caption);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/customers/register', async (req, res) => {
  try {
    const {
      nic,
      phone,
      name,
      address,
      vehicleNumberPrefix,
      vehicleNumberSuffix,
      vehicleType,
      province,
      chassisNumber,
      fuelType,
    } = req.body ?? {};

    if (!validateNic(nic)) return res.status(400).json({ error: 'Invalid NIC format' });
    const phone07 = normalizePhone07(phone);
    if (!phone07) return res.status(400).json({ error: 'Phone must be in 07XXXXXXXX format' });

    const key = otpKey(nic, phone07);
    const entry = otpStore.get(key);
    if (!entry || !entry.verifiedAt || Date.now() > entry.expiresAt) {
      return res.status(400).json({ error: 'OTP not verified. Please verify OTP first.' });
    }

    const prefix = String(vehicleNumberPrefix || '').trim().toUpperCase();
    const suffix = String(vehicleNumberSuffix || '').trim();
    if (!/^[A-Z0-9]{2,3}$/.test(prefix)) return res.status(400).json({ error: 'Invalid vehicle number prefix' });
    if (!/^[0-9]{4}$/.test(suffix)) return res.status(400).json({ error: 'Invalid vehicle number suffix' });
    if (!vehicleType || !province || !chassisNumber || !fuelType) return res.status(400).json({ error: 'Missing vehicle fields' });
    if (fuelType !== 'petrol' && fuelType !== 'diesel') return res.status(400).json({ error: 'fuelType must be petrol or diesel' });
    if (!name || !address) return res.status(400).json({ error: 'Missing personal fields' });

    const customers = await readCustomers();
    const quotas = await readFuelQuotas();
    const quotaRow = quotas.find((q) => String(q.vehicleType) === String(vehicleType)) || {};
    const petrolQuota = Number(quotaRow.petrolQuota) || 0;
    const dieselQuota = Number(quotaRow.dieselQuota) || 0;

    const vehicleNumber = `${prefix}-${suffix}`;
    const id = `CUST${String(Date.now())}`;
    const customer = {
      id,
      nic: String(nic).trim().toUpperCase(),
      phone: phone07,
      name: String(name).trim(),
      address: String(address).trim(),
      vehicleNumber,
      vehicleType: String(vehicleType),
      province: String(province),
      chassisNumber: String(chassisNumber).trim().toUpperCase(),
      fuelType,
      qrCode: `${id}-${vehicleNumber}`,
      petrolRemaining: petrolQuota,
      dieselRemaining: dieselQuota,
      createdAt: new Date().toISOString(),
    };

    customers.unshift(customer);
    await writeCustomers(customers);
    return res.json({ customer });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 5051;

// Serve the built frontend (Vite) from this backend in production-like runs.
// Build output is expected at: <repoRoot>/frontend/dist
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fsSync.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback (React Router) for non-API routes.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});

