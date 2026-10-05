/**
 * Vertical Kits for GEOSAN-WORKSHOP
 * Four domain-specific kits, not a single theme with a logo swap.
 *
 * Each kit binds the look, screen grammar, signature object, default forbidden slop,
 * and contract typography for the vertical.
 */

export interface VerticalKit {
  id: 'iyanuoluwa' | 'ehi' | 'aviation' | 'edgepoint';
  verticalName: string;
  signatureObject: string;
  screenGrammar: string;
  setting: string;
  defaultForbidden: string[];
  recommendedTypography: {
    displayFace: string;
    textFace: string;
    monoFace: string;
  };
  defaultTokens: {
    accentColor: string;
    paperColor: string;
    density: 'compact' | 'comfortable' | 'dense_rugged';
  };
  sampleCopy: [string, string, string];
  contractNouns: string[];
}

export const VERTICAL_KITS: Record<string, VerticalKit> = {
  iyanuoluwa: {
    id: 'iyanuoluwa',
    verticalName: 'Bulk Materials & Weighbridge Kit',
    signatureObject: 'Weighbridge ticket WB-YYYY-XXXXX',
    screenGrammar: 'Ticket tape. Gross, tare, net, product code PMS/AGO/DPK, Naira settlement. Stamp, not a card.',
    setting: 'Weighbridge scale shack. Sunlight glare through plexiglass, diesel dust, single-hand touch or high-contrast 1080p display.',
    defaultForbidden: [
      'Hero section with marketing tagline',
      'Three equal feature cards in a row',
      'Pastel purple or indigo palette',
      'Generic "Welcome back, Operator" banner',
      'Generic "item" or "product" instead of PMS/AGO/DPK grain grade'
    ],
    recommendedTypography: {
      displayFace: 'Outfit',
      textFace: 'Inter',
      monoFace: 'JetBrains Mono'
    },
    defaultTokens: {
      accentColor: '#10B981', // emerald weighbridge green
      paperColor: '#0A1420',
      density: 'dense_rugged'
    },
    sampleCopy: [
      'WB-2026-08412 · GROSS 42,800 KG | TARE 14,200 KG | NET 28,600 KG',
      'PRODUCT: DPK (Dual Purpose Kerosene) · SILO BAY #04 INTAKE',
      'NAIRA SETTLEMENT: ₦32,890,000.00 — CERTIFIED BY SCALE OPERATOR'
    ],
    contractNouns: ['truck_plate', 'gross_weight_kg', 'tare_weight_kg', 'net_weight_kg', 'product_code', 'ticket_number', 'scale_operator_stamp', 'naira_settlement']
  },

  ehi: {
    id: 'ehi',
    verticalName: 'Reconciliation Ledger & Debt Line Kit',
    signatureObject: 'Debt line and reconciliation batch',
    screenGrammar: 'Ledger. Patient or account, aging buckets, exception row, audit stamp.',
    setting: 'Back-office accounting bullpen. Fluorescent lighting, dual 24-inch monitors, rapid keyboard tab-navigation with audit trail.',
    defaultForbidden: [
      'Wellness gradient or soft consumer illustration',
      'Three stat cards with cheerful trend arrows',
      'Illustrations on empty reconciliation tables',
      'Hiding line-item audit hash in modal overlays',
      'Generic "transaction" instead of payor debt line'
    ],
    recommendedTypography: {
      displayFace: 'Outfit',
      textFace: 'Inter',
      monoFace: 'JetBrains Mono'
    },
    defaultTokens: {
      accentColor: '#F0B230', // amber ledger highlight
      paperColor: '#0D1117',
      density: 'compact'
    },
    sampleCopy: [
      'BATCH-EHI-2026-W40 · 44 UNMATCHED HOSPITAL CLAIMS (AGING >90 DAYS)',
      'DISPUTED DEBT: ₦14,820,000.00 — HMO CO-PAY EXCEPTION FLAGGED',
      'AUDIT TRAIL: BATCH RECONCILED BY CHIEF FISCAL CONTROLLER'
    ],
    contractNouns: ['batch_id', 'debt_line_id', 'patient_account', 'aging_bucket', 'disputed_amount_ngn', 'reconciliation_status', 'hmo_code', 'audit_hash']
  },

  aviation: {
    id: 'aviation',
    verticalName: 'Technical Flight Logbook Kit',
    signatureObject: 'Log entry and flight leg',
    screenGrammar: 'Paper logbook. Hobbs meter, from-to, defect defect, sign-off. Carbon-copy rows.',
    setting: 'Flight line ramp or apron. High direct sunlight, gloved hands, rain on ruggedized Panasonic Toughbook.',
    defaultForbidden: [
      'Marketing landing page with aircraft stock photo',
      'Rounded colorful stat pill chips',
      'Hiding Hobbs decimals behind tooltips',
      'Dismissible notification banners for airworthiness defects',
      'Generic "trip" instead of flight sector leg'
    ],
    recommendedTypography: {
      displayFace: 'JetBrains Mono',
      textFace: 'Inter',
      monoFace: 'JetBrains Mono'
    },
    defaultTokens: {
      accentColor: '#38BDF8', // sky telemetry blue
      paperColor: '#070C14',
      density: 'dense_rugged'
    },
    sampleCopy: [
      '5N-AERO-04 | HOBBS 1420.8 -> 1423.4 (2.6 HRS TACH)',
      'SECTOR: DNMM (LAGOS IKEJA) -> DNAA (ABUJA NNAMDI AZIKIWE)',
      'DEFECT: NOSEWHEEL STEERING SHIMMY FLAGGED — SIGNED A&P #88219'
    ],
    contractNouns: ['aircraft_tail', 'hobbs_start', 'hobbs_end', 'flight_leg_sector', 'tach_hours', 'defect_description', 'mechanic_license', 'airworthiness_signoff']
  },

  edgepoint: {
    id: 'edgepoint',
    verticalName: 'IoT Sensor Mesh & Telemetry Kit',
    signatureObject: 'Sensor node',
    screenGrammar: 'Mesh network schematic. RSSI, voltage, firmware, last packet. Map or schematic, not a settings form.',
    setting: 'Field gateway cabinet or dark NOC display. Monitored 24/7 at 3 meters distance or tablet in generator enclosure.',
    defaultForbidden: [
      'SaaS sidebar with "Analytics" and "Marketing"',
      'Purple or indigo gradient background on topology maps',
      'Empty state saying "Get started with your first sensor"',
      'Collapsing critical voltage drops into a sub-menu',
      'Generic "device" instead of calibrated sensor node'
    ],
    recommendedTypography: {
      displayFace: 'Outfit',
      textFace: 'Inter',
      monoFace: 'JetBrains Mono'
    },
    defaultTokens: {
      accentColor: '#22D3EE', // cyber cyan
      paperColor: '#050B14',
      density: 'dense_rugged'
    },
    sampleCopy: [
      'NODE-MESH-0x7F2A · RSSI -84 dBm · VOLTAGE 3,580 mV (LITHIUM CELL)',
      'FIRMWARE: v2.4.1-STABLE · LAST PACKET: 2.4s AGO VIA HOP-02',
      'TOPOLOGY: KANO-NORTH CORRIDOR · 1,420 ACTIVE TRANSMITTERS ONLINE'
    ],
    contractNouns: ['node_eui', 'rssi_dbm', 'battery_mv', 'firmware_version', 'hop_count', 'gateway_id', 'packet_payload_hex', 'telemetry_timestamp']
  }
};
