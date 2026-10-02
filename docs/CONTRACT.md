# Data & API Contracts - GEOSAN-WORKSHOP

## 1. Overview
This document enforces strict Zod/TypeScript interface contracts between autonomous specialist agents (`CodingAgent`, `ReviewAgent`, `QAAgent`, `DeployAgent`) and external ingest endpoints.

---

## 2. Ingestion & Telemetry Contracts

### 2.1 Sensor & Telemetry Contract (`Tier 2: EdgePoint Mesh`)
```typescript
export interface SensorTelemetryPayload {
  fixture_id: string;             // Non-null UUIDv4 or formatted slug
  timestamp: string;              // ISO8601 UTC timestamp
  node_mac: string;               // EUI-48 MAC address format
  readings: {
    ambient_temp_c: number;       // Range: -40.0 to 85.0
    pressure_kpa: number;         // Range: 80.0 to 120.0
    signal_rssi_dbm: number;      // Range: -120 to 0
    voltage_mv: number;           // Range: 2800 to 4200
  };
  firmware_version: string;       // Semantic version string (e.g., "1.4.2")
  checksum_sha256: string;        // SHA256 payload integrity hash
}
```

### 2.2 Weighbridge Invoicing Contract (`Tier 1: Iyanuoluwa Oil & Gas`)
```typescript
export interface WeighbridgeTicketPayload {
  ticket_number: string;          // Format: WB-YYYY-XXXXX
  truck_plate: string;            // Standard alphanumeric vehicle registration
  gross_weight_kg: number;        // Must be > tare_weight_kg
  tare_weight_kg: number;         // Tare calibration weight
  net_weight_kg: number;          // Computed invariant: gross - tare
  product_code: 'PMS' | 'AGO' | 'DPK';
  operator_id: string;            // Non-null Operator UUID
  authorized_signature: string;   // Non-null HMAC-SHA256 signature
}
```

### 2.3 Flight Electronic Log Entry (`Tier 3: Aviation Log Entry`)
```typescript
export interface ElectronicFlightLog {
  flight_number: string;          // IATA / ICAO flight number (e.g., "GEO-402")
  aircraft_tail: string;          // Registration code (e.g., "5N-GEO")
  captain_license: string;        // Non-null ATPL license ID
  fuel_uplift_litres: number;     // Uplift volume
  departure_utc: string;          // ISO8601 timestamp
  arrival_utc: string;            // ISO8601 timestamp
}
```
