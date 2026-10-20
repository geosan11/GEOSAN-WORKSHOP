/**
 * Design-kit presets for GEOSAN-WORKSHOP.
 *
 * A preset is a library item named by design pattern, never by client.
 * Picking one COPIES it into a project's design brief (see lib/designBrief.ts):
 * editing the project's copy never changes the preset, and changing a preset
 * never changes projects that already copied it. `presetId` on a brief is
 * provenance only and is never re-read for behaviour.
 *
 * Adding a preset means adding one entry to DESIGN_KIT_PRESETS. Nothing else
 * in the UI, lint or brief code branches on preset ids.
 */

import {
  WEIGHBRIDGE_TICKET_TEMPLATE,
  LEDGER_DEBT_LINE_TEMPLATE,
  FLIGHT_LOGBOOK_TEMPLATE,
  SENSOR_TELEMETRY_TEMPLATE
} from './designKitTemplates';

export type KitDensity = 'compact' | 'comfortable' | 'dense_rugged';

export interface DomainCopyEntry {
  noun: string;
  category: 'identifier' | 'measurement' | 'security' | 'status';
  definition: string;
  sampleString: string;
}

export interface KitReference {
  source: string;
  whatToSteal: string;
  whatToLeave: string;
}

/** The kit content that gets copied into a project. */
export interface DesignKitContent {
  signatureObject: string;
  screenGrammar: string;
  setting: string;
  references: KitReference[];
  forbidden: string[];
  typography: { display: string; text: string; mono: string };
  tokens: { accent: string; paper: string; density: KitDensity };
  sampleCopy: [string, string, string];
  copyDeck: DomainCopyEntry[];
  goldenScreen: {
    name: string;
    fields: [string, string, string, string, string];
    /** Full HTML with a `{{projectName}}` placeholder. Missing means the neutral skeleton. */
    templateHtml?: string;
  };
}

export interface DesignKitPreset {
  id: string;
  name: string;
  description: string;
  source: 'builtin' | 'saved';
  kit: DesignKitContent;
}

export const BLANK_PRESET_ID = 'blank';

/** Shared, client-neutral references used by the four built-in pattern presets. */
const OPERATIONAL_REFERENCES: KitReference[] = [
  {
    source: 'Federal Aviation/Transport Physical Waybill & Stamp Paper Archive',
    whatToSteal: 'High-density physical carbon-copy grid with indelible stamp watermark.',
    whatToLeave: 'Leave behind any glossy marketing banners or multi-level navigational menus.'
  },
  {
    source: 'Bloomberg Terminal & Reuters Forex Settlement Grid (Monochrome Layout)',
    whatToSteal: 'Monospace tabular columns with strict number alignment and zero layout shift.',
    whatToLeave: 'Leave behind pastel color gradients and playful rounded pill buttons.'
  },
  {
    source: 'Siemens Ruggedized SCADA & Telemetry Industrial Panel (EN 60947)',
    whatToSteal: 'Single-glance high-contrast status beacons with unambiguous fault indicators.',
    whatToLeave: 'Leave behind celebratory confetti, gamified progress bars, or onboarding tutorials.'
  }
];

const STANDARD_TYPE = { display: 'Outfit', text: 'Inter', mono: 'JetBrains Mono' };

export const DESIGN_KIT_PRESETS: DesignKitPreset[] = [
  {
    id: 'weighbridge-ticket',
    name: 'Bulk Materials & Weighbridge Kit',
    description: 'Ticket tape for weighed loads: gross, tare, net and a settlement stamp.',
    source: 'builtin',
    kit: {
      signatureObject: 'Weighbridge ticket WB-YYYY-XXXXX',
      screenGrammar: 'Ticket tape. Gross, tare, net, product code PMS/AGO/DPK, Naira settlement. Stamp, not a card.',
      setting: 'Weighbridge scale shack. Sunlight glare through plexiglass, diesel dust, single-hand touch or high-contrast 1080p display.',
      references: OPERATIONAL_REFERENCES,
      forbidden: [
        'Hero section with marketing tagline',
        'Three equal feature cards in a row',
        'Pastel purple or indigo palette',
        'Generic "Welcome back, Operator" banner',
        'Generic "item" or "product" instead of PMS/AGO/DPK grain grade'
      ],
      typography: STANDARD_TYPE,
      tokens: { accent: '#10B981', paper: '#0A1420', density: 'dense_rugged' },
      sampleCopy: [
        'WB-2026-08412 · GROSS 42,800 KG | TARE 14,200 KG | NET 28,600 KG',
        'PRODUCT: DPK (Dual Purpose Kerosene) · SILO BAY #04 INTAKE',
        'NAIRA SETTLEMENT: ₦32,890,000.00 — CERTIFIED BY SCALE OPERATOR'
      ],
      copyDeck: [
        { noun: 'ticket_number', category: 'identifier', definition: 'Format WB-YYYY-XXXXX issued at weighbridge', sampleString: 'WB-2026-08412' },
        { noun: 'truck_plate', category: 'identifier', definition: 'Rigid or tandem vehicle registration', sampleString: 'KMC-842-XA' },
        { noun: 'gross_weight_kg', category: 'measurement', definition: 'Total scale load weight with fuel and driver', sampleString: '42,800 KG' },
        { noun: 'tare_weight_kg', category: 'measurement', definition: 'Tare calibration weight of empty vehicle', sampleString: '14,200 KG' },
        { noun: 'net_weight_kg', category: 'measurement', definition: 'Net grain or liquid fuel cargo delivered', sampleString: '28,600 KG' },
        { noun: 'product_code', category: 'status', definition: 'Certified cargo code: PMS, AGO, or DPK', sampleString: 'DPK' },
        { noun: 'naira_settlement', category: 'measurement', definition: 'Bank payable settlement ledger amount', sampleString: '₦32,890,000.00' },
        { noun: 'scale_operator_stamp', category: 'security', definition: 'Physical scale clerk approval seal', sampleString: 'STAMP: CERTIFIED #04' },
        { noun: 'silo_cell_id', category: 'identifier', definition: 'Designated physical silo storage bay', sampleString: 'BAY-04-WEST' },
        { noun: 'moisture_content_pct', category: 'measurement', definition: 'Silo crop moisture humidity index', sampleString: '12.4% RH' }
      ],
      goldenScreen: {
        name: 'Weighbridge ticket WB-YYYY-XXXXX Primary View',
        fields: ['truck_plate', 'gross_weight_kg', 'tare_weight_kg', 'net_weight_kg', 'product_code'],
        templateHtml: WEIGHBRIDGE_TICKET_TEMPLATE
      }
    }
  },
  {
    id: 'ledger-debt-line',
    name: 'Reconciliation Ledger & Debt Line Kit',
    description: 'Audit ledger: account rows, aging buckets, exception rows and an audit stamp.',
    source: 'builtin',
    kit: {
      signatureObject: 'Debt line and reconciliation batch',
      screenGrammar: 'Ledger. Patient or account, aging buckets, exception row, audit stamp.',
      setting: 'Back-office accounting bullpen. Fluorescent lighting, dual 24-inch monitors, rapid keyboard tab-navigation with audit trail.',
      references: OPERATIONAL_REFERENCES,
      forbidden: [
        'Wellness gradient or soft consumer illustration',
        'Three stat cards with cheerful trend arrows',
        'Illustrations on empty reconciliation tables',
        'Hiding line-item audit hash in modal overlays',
        'Generic "transaction" instead of payor debt line'
      ],
      typography: STANDARD_TYPE,
      tokens: { accent: '#F0B230', paper: '#0D1117', density: 'compact' },
      sampleCopy: [
        'BATCH-2026-W40 · 44 UNMATCHED HOSPITAL CLAIMS (AGING >90 DAYS)',
        'DISPUTED DEBT: ₦14,820,000.00 — HMO CO-PAY EXCEPTION FLAGGED',
        'AUDIT TRAIL: BATCH RECONCILED BY CHIEF FISCAL CONTROLLER'
      ],
      copyDeck: [
        { noun: 'batch_id', category: 'identifier', definition: 'Weekly payor reconciliation batch code', sampleString: 'BATCH-2026-W40' },
        { noun: 'debt_line_id', category: 'identifier', definition: 'Unmatched hospital claim or invoice item', sampleString: 'DL-9012-A' },
        { noun: 'patient_account', category: 'identifier', definition: 'Patient hospital folder account number', sampleString: 'ACC #88219' },
        { noun: 'aging_bucket', category: 'status', definition: 'Fiscal delinquency duration: 30, 60, >90 days', sampleString: '>90 DAYS' },
        { noun: 'disputed_amount_ngn', category: 'measurement', definition: 'Contested HMO insurance deductible', sampleString: '₦4,820,000.00' },
        { noun: 'hmo_payor_code', category: 'identifier', definition: 'Accredited health maintenance organization ID', sampleString: 'HMO-AXA-01' },
        { noun: 'audit_seal', category: 'security', definition: 'Chief fiscal controller reconciliation sign-off', sampleString: 'SEAL: FISCAL_OK' },
        { noun: 'co_pay_discrepancy', category: 'status', definition: 'Difference between billed and adjudicated sum', sampleString: '₦24,000.00' },
        { noun: 'remittance_advice_ref', category: 'identifier', definition: 'Electronic payment voucher reference', sampleString: 'E-REMIT-771' },
        { noun: 'reconciliation_status', category: 'status', definition: 'Claim state: RECONCILED, DISPUTED, ESCALATED', sampleString: 'DISPUTED' }
      ],
      goldenScreen: {
        name: 'Debt line and reconciliation batch Primary View',
        fields: ['batch_id', 'debt_line_id', 'patient_account', 'aging_bucket', 'disputed_amount_ngn'],
        templateHtml: LEDGER_DEBT_LINE_TEMPLATE
      }
    }
  },
  {
    id: 'flight-logbook',
    name: 'Technical Flight Logbook Kit',
    description: 'Paper-logbook grammar: flight legs, Hobbs readings, defects and sign-off.',
    source: 'builtin',
    kit: {
      signatureObject: 'Log entry and flight leg',
      screenGrammar: 'Paper logbook. Hobbs meter, from-to, defect defect, sign-off. Carbon-copy rows.',
      setting: 'Flight line ramp or apron. High direct sunlight, gloved hands, rain on ruggedized Panasonic Toughbook.',
      references: OPERATIONAL_REFERENCES,
      forbidden: [
        'Marketing landing page with aircraft stock photo',
        'Rounded colorful stat pill chips',
        'Hiding Hobbs decimals behind tooltips',
        'Dismissible notification banners for airworthiness defects',
        'Generic "trip" instead of flight sector leg'
      ],
      typography: { display: 'JetBrains Mono', text: 'Inter', mono: 'JetBrains Mono' },
      tokens: { accent: '#38BDF8', paper: '#070C14', density: 'dense_rugged' },
      sampleCopy: [
        '5N-AERO-04 | HOBBS 1420.8 -> 1423.4 (2.6 HRS TACH)',
        'SECTOR: DNMM (LAGOS IKEJA) -> DNAA (ABUJA NNAMDI AZIKIWE)',
        'DEFECT: NOSEWHEEL STEERING SHIMMY FLAGGED — SIGNED A&P #88219'
      ],
      copyDeck: [
        { noun: 'aircraft_tail', category: 'identifier', definition: 'Civil aviation registration identifier', sampleString: '5N-AERO-04' },
        { noun: 'hobbs_time', category: 'measurement', definition: 'Cumulative engine flight recording meter', sampleString: '1420.8 → 1423.4' },
        { noun: 'tach_hours', category: 'measurement', definition: 'Total airframe tachometer flight duration', sampleString: '2.6 HRS' },
        { noun: 'flight_leg_sector', category: 'identifier', definition: 'From-to ICAO route pair', sampleString: 'DNMM -> DNAA' },
        { noun: 'pilot_defect_report', category: 'status', definition: 'Pilot-in-command reported mechanical defect', sampleString: 'NOSEWHEEL TRANSIENT SHIMMY' },
        { noun: 'captain_atpl', category: 'security', definition: 'Airline transport pilot license number', sampleString: 'ATPL #88219' },
        { noun: 'airworthiness_signoff', category: 'security', definition: 'Licensed A&P mechanic release to service', sampleString: 'SIGN: RTS_PASS' },
        { noun: 'fuel_uplift_litres', category: 'measurement', definition: 'Ramp bowser kerosene uplift quantity', sampleString: '4,200 L' },
        { noun: 'runway_in_use', category: 'identifier', definition: 'Takeoff and landing tarmac designation', sampleString: 'RWY 18R' },
        { noun: 'altimeter_qnh', category: 'measurement', definition: 'Barometric subscale pressure setting', sampleString: '1013.2 HPA' }
      ],
      goldenScreen: {
        name: 'Log entry and flight leg Primary View',
        fields: ['aircraft_tail', 'hobbs_start', 'hobbs_end', 'flight_leg_sector', 'tach_hours'],
        templateHtml: FLIGHT_LOGBOOK_TEMPLATE
      }
    }
  },
  {
    id: 'sensor-telemetry',
    name: 'IoT Sensor Mesh & Telemetry Kit',
    description: 'Schematic grammar for field devices: RSSI, voltage, firmware, last packet.',
    source: 'builtin',
    kit: {
      signatureObject: 'Sensor node',
      screenGrammar: 'Mesh network schematic. RSSI, voltage, firmware, last packet. Map or schematic, not a settings form.',
      setting: 'Field gateway cabinet or dark NOC display. Monitored 24/7 at 3 meters distance or tablet in generator enclosure.',
      references: OPERATIONAL_REFERENCES,
      forbidden: [
        'SaaS sidebar with "Analytics" and "Marketing"',
        'Purple or indigo gradient background on topology maps',
        'Empty state saying "Get started with your first sensor"',
        'Collapsing critical voltage drops into a sub-menu',
        'Generic "device" instead of calibrated sensor node'
      ],
      typography: STANDARD_TYPE,
      tokens: { accent: '#22D3EE', paper: '#050B14', density: 'dense_rugged' },
      sampleCopy: [
        'NODE-MESH-0x7F2A · RSSI -84 dBm · VOLTAGE 3,580 mV (LITHIUM CELL)',
        'FIRMWARE: v2.4.1-STABLE · LAST PACKET: 2.4s AGO VIA HOP-02',
        'TOPOLOGY: KANO-NORTH CORRIDOR · 1,420 ACTIVE TRANSMITTERS ONLINE'
      ],
      copyDeck: [
        { noun: 'node_eui', category: 'identifier', definition: '64-bit IEEE global hardware identifier', sampleString: 'NODE-MESH-0x7F2A' },
        { noun: 'signal_rssi_dbm', category: 'measurement', definition: 'Received signal strength indicator in dBm', sampleString: '-84 dBm' },
        { noun: 'battery_voltage_mv', category: 'measurement', definition: 'Lithium thionyl chloride pack voltage', sampleString: '3,580 mV' },
        { noun: 'firmware_version', category: 'identifier', definition: 'Embedded RTOS hex release build', sampleString: 'v2.4.1-STABLE' },
        { noun: 'mesh_hop_count', category: 'measurement', definition: 'Routing relays to central edge broker', sampleString: 'HOP #02' },
        { noun: 'last_packet_utc', category: 'status', definition: 'UTC timestamp of last telemetry frame', sampleString: '2.4s AGO' },
        { noun: 'radio_band_mhz', category: 'identifier', definition: 'License-free sub-GHz ISM frequency', sampleString: '868.1 MHZ' },
        { noun: 'ambient_temperature_c', category: 'measurement', definition: 'Internal housing probe temperature', sampleString: '38.4 °C' },
        { noun: 'raw_payload_hex', category: 'security', definition: 'Encrypted binary telemetry frame buffer', sampleString: '0x4E4F4445...' },
        { noun: 'gateway_corridor', category: 'identifier', definition: 'Cellular uplink boundary router', sampleString: 'KANO-NORTH' }
      ],
      goldenScreen: {
        name: 'Sensor node Primary View',
        fields: ['node_eui', 'rssi_dbm', 'battery_mv', 'firmware_version', 'hop_count'],
        templateHtml: SENSOR_TELEMETRY_TEMPLATE
      }
    }
  },
  {
    id: BLANK_PRESET_ID,
    name: 'Blank',
    description: 'Start from nothing: neutral tokens, empty lists and a skeleton golden screen.',
    source: 'builtin',
    kit: {
      signatureObject: '',
      screenGrammar: '',
      setting: '',
      // Three empty slots so the existing editor can fill them in.
      references: [
        { source: '', whatToSteal: '', whatToLeave: '' },
        { source: '', whatToSteal: '', whatToLeave: '' },
        { source: '', whatToSteal: '', whatToLeave: '' }
      ],
      forbidden: [],
      typography: STANDARD_TYPE,
      tokens: { accent: '#64748B', paper: '#0D1117', density: 'comfortable' },
      sampleCopy: ['', '', ''],
      copyDeck: [],
      goldenScreen: {
        name: 'Primary View',
        fields: ['identifier', 'primary_metric', 'secondary_metric', 'status_flag', 'audit_timestamp']
      }
    }
  }
];

export function getDesignKitPreset(presetId?: string | null): DesignKitPreset | undefined {
  if (!presetId) return undefined;
  return DESIGN_KIT_PRESETS.find((p) => p.id === presetId);
}

export function getBlankPreset(): DesignKitPreset {
  return getDesignKitPreset(BLANK_PRESET_ID)!;
}
