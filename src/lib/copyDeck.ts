/**
 * Copy Deck — Ten Domain Contract Nouns & Anti-Generic Prompt Validator
 *
 * Ensures chat and plan prompts use grounded contract nouns instead of
 * generic SaaS placeholders like "user", "item", "data", "admin".
 */

export interface DomainCopyEntry {
  noun: string;
  category: 'identifier' | 'measurement' | 'security' | 'status';
  definition: string;
  sampleString: string;
}

export const DOMAIN_COPY_DECKS: Record<string, DomainCopyEntry[]> = {
  iyanuoluwa: [
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
  ehi: [
    { noun: 'batch_id', category: 'identifier', definition: 'Weekly payor reconciliation batch code', sampleString: 'BATCH-EHI-2026-W40' },
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
  aviation: [
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
  edgepoint: [
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
  ]
};

export function getCopyDeckForKit(kitId: string): DomainCopyEntry[] {
  return DOMAIN_COPY_DECKS[kitId] || DOMAIN_COPY_DECKS.ehi;
}

const GENERIC_SLOP_NOUNS = ['user', 'item', 'product', 'dashboard', 'entity', 'thing', 'stuff', 'admin'];

export function validatePromptDomainVocabulary(
  prompt: string,
  kitId: string
): { valid: boolean; violationReason?: string } {
  const lower = prompt.toLowerCase();
  const deck = getCopyDeckForKit(kitId);
  const domainNouns = deck.map((d) => d.noun.toLowerCase());

  // Check if prompt uses generic "user" or "item" without domain nouns
  const hasGenericSlop = GENERIC_SLOP_NOUNS.some((slop) => {
    const regex = new RegExp(`\\b${slop}\\b`, 'i');
    return regex.test(lower);
  });

  const hasDomainNoun = domainNouns.some((n) => lower.includes(n.replace(/_/g, ' ')) || lower.includes(n));

  if (hasGenericSlop && !hasDomainNoun) {
    return {
      valid: false,
      violationReason: `Plan prompt rejected in Ask mode: uses generic terms ("user", "item", "dashboard") where contract requires domain nouns (${domainNouns.slice(0, 4).join(', ')}).`
    };
  }

  return { valid: true };
}
