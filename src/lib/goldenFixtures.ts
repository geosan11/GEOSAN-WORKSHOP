/**
 * Golden Screen Fixture Generator & Storage
 *
 * Renders the signature object with real contract fields (docs/CONTRACT.md)
 * without generic cards or marketing slop.
 */

import { computeFixtureHash } from './designBrief';

export interface GoldenFixtureInfo {
  project_id: string;
  project_slug: string;
  signature_object: string;
  html_content: string;
  fixture_hash: string;
  created_at: string;
}

export function generateGoldenScreenHtml(
  kitId: 'iyanuoluwa' | 'ehi' | 'aviation' | 'edgepoint',
  projectName: string
): string {
  if (kitId === 'iyanuoluwa') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Weighbridge Ticket Tape — ${projectName}</title>
  <style>
    body {
      background: #0A1420;
      color: #E2E8F0;
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .ticket-tape {
      width: 100%;
      max-width: 480px;
      background: #060D17;
      border: 2px dashed #10B981;
      padding: 24px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.8);
      font-family: 'JetBrains Mono', monospace;
    }
    .tape-header {
      border-bottom: 2px solid #10B981;
      padding-bottom: 12px;
      margin-bottom: 16px;
      text-align: center;
    }
    .ticket-id {
      font-size: 20px;
      font-weight: 800;
      color: #10B981;
      letter-spacing: 1.5px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted rgba(255,255,255,0.15);
      font-size: 13px;
    }
    .label { color: #94A3B8; text-transform: uppercase; font-size: 11px; }
    .val { font-weight: 700; color: #F8FAFC; }
    .invariant-box {
      margin-top: 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10B981;
      padding: 12px;
      text-align: center;
    }
    .net-weight {
      font-size: 24px;
      font-weight: 900;
      color: #34D399;
    }
    .stamp {
      margin-top: 20px;
      border: 3px double #10B981;
      color: #10B981;
      padding: 8px;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      transform: rotate(-1deg);
    }
  </style>
</head>
<body>
  <div class="ticket-tape">
    <div class="tape-header">
      <div style="font-size:11px; color:#94A3B8; text-transform:uppercase;">FEDERAL WEIGHBRIDGE SCALE AUTHORITY</div>
      <div class="ticket-id">WB-2026-08412</div>
      <div style="font-size:10px; color:#64748B;">CERTIFIED WEIGHT AND MEASURE ACT CAP W3 LFN</div>
    </div>

    <div class="row">
      <span class="label">TRUCK REGISTRATION:</span>
      <span class="val">KMC-842-XA (MACK TANDEM 40T)</span>
    </div>
    <div class="row">
      <span class="label">PRODUCT CODE:</span>
      <span class="val">DPK (DUAL PURPOSE KEROSENE)</span>
    </div>
    <div class="row">
      <span class="label">TIME INTAKE UTC:</span>
      <span class="val">2026-10-04T08:14:22Z</span>
    </div>
    <div class="row">
      <span class="label">GROSS WEIGHT:</span>
      <span class="val">42,800 KG</span>
    </div>
    <div class="row">
      <span class="label">TARE WEIGHT:</span>
      <span class="val">14,200 KG</span>
    </div>

    <div class="invariant-box">
      <div style="font-size:10px; color:#94A3B8; text-transform:uppercase;">VERIFIED NET INVENTORY CARGO</div>
      <div class="net-weight">28,600 KG</div>
      <div style="font-size:11px; color:#10B981; font-weight:700;">SETTLEMENT: ₦32,890,000.00</div>
    </div>

    <div class="row" style="margin-top:12px;">
      <span class="label">SCALE OPERATOR ID:</span>
      <span class="val">OP-7729-IBADAN</span>
    </div>
    <div class="row">
      <span class="label">SILO CELL ALLOCATION:</span>
      <span class="val">SILO BAY #04-WEST</span>
    </div>

    <div class="stamp">
      ★ STAMP: OFFICIAL WEIGHT CERTIFIED & SEALED ★<br/>
      HMAC-SHA256: d84f901ab9c87234f9a0c0e882
    </div>
  </div>
</body>
</html>`;
  }

  if (kitId === 'ehi') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reconciliation Ledger — ${projectName}</title>
  <style>
    body {
      background: #0D1117;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      margin: 0;
      padding: 24px;
    }
    .ledger-container {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid rgba(255,255,255,0.1);
      background: #06090F;
    }
    .ledger-top {
      padding: 16px 20px;
      background: #161B22;
      border-bottom: 2px solid #F0B230;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .batch-title { font-size: 16px; font-weight: 800; color: #F0B230; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      background: #0F141C;
      color: #8B98A8;
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      font-weight: 600;
    }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    tr.exception { background: rgba(239, 68, 68, 0.08); color: #FCA5A5; font-weight: 700; }
    .status-stamp {
      color: #F0B230;
      border: 1px solid #F0B230;
      padding: 2px 6px;
      font-size: 10px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="ledger-container">
    <div class="ledger-top">
      <div>
        <div class="batch-title">BATCH-EHI-2026-W40 · PAYOR RECONCILIATION LEDGER</div>
        <div style="font-size:11px; color:#8B98A8;">FISCAL JURISDICTION: KANO METROPOLITAN HOSPITAL TRUST</div>
      </div>
      <span class="status-stamp">AUDIT SEALED</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>DEBT LINE ID</th>
          <th>PATIENT / ACCOUNT</th>
          <th>AGING</th>
          <th>DISPUTED NGN</th>
          <th>PAYOR HMO CODE</th>
          <th>RESOLUTION</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>DL-9012-A</td>
          <td>ACC #88219 (T. BALOGUN)</td>
          <td>30 DAYS</td>
          <td>₦420,000.00</td>
          <td>HMO-AXA-01</td>
          <td style="color:#34D399;">RECONCILED</td>
        </tr>
        <tr class="exception">
          <td>DL-9012-B</td>
          <td>ACC #77104 (M. DANJUMA)</td>
          <td>&gt;90 DAYS</td>
          <td>₦4,820,000.00</td>
          <td>HMO-NHIS-99</td>
          <td style="color:#F87171;">EXCEPTION (CO-PAY MISMATCH)</td>
        </tr>
        <tr>
          <td>DL-9012-C</td>
          <td>ACC #44012 (S. OKAFOR)</td>
          <td>60 DAYS</td>
          <td>₦1,180,000.00</td>
          <td>HMO-HYGEIA-04</td>
          <td style="color:#34D399;">RECONCILED</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  if (kitId === 'aviation') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Aircraft Technical Logbook — ${projectName}</title>
  <style>
    body {
      background: #070C14;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      margin: 0;
      padding: 24px;
    }
    .logbook {
      max-width: 860px;
      margin: 0 auto;
      border: 2px solid #38BDF8;
      background: #04080F;
      padding: 20px;
    }
    .log-header {
      border-bottom: 2px solid #38BDF8;
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tail { font-size: 22px; font-weight: 900; color: #38BDF8; }
    .entry-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
      padding: 12px;
      background: rgba(56, 189, 248, 0.05);
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .cell-label { font-size: 10px; color: #94A3B8; text-transform: uppercase; }
    .cell-val { font-size: 14px; font-weight: 700; color: #F8FAFC; margin-top: 4px; }
    .defect-block {
      margin-top: 16px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.06);
      border-left: 4px solid #EF4444;
      font-size: 12px;
    }
    .signoff {
      margin-top: 16px;
      border: 1px solid #38BDF8;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="logbook">
    <div class="log-header">
      <div>
        <span class="tail">5N-AERO-04</span>
        <span style="font-size:12px; color:#94A3B8; margin-left: 12px;">EMBRAER ERJ-145LR</span>
      </div>
      <span style="font-size:11px; color:#38BDF8; font-weight:700;">PAGE 0842 · FLIGHT LEG RECORD</span>
    </div>

    <div class="entry-grid">
      <div>
        <div class="cell-label">DEPARTURE (UTC)</div>
        <div class="cell-val">DNMM (LAGOS) 06:40Z</div>
      </div>
      <div>
        <div class="cell-label">ARRIVAL (UTC)</div>
        <div class="cell-val">DNAA (ABUJA) 07:42Z</div>
      </div>
      <div>
        <div class="cell-label">HOBBS START / END</div>
        <div class="cell-val">1420.8 → 1423.4</div>
      </div>
      <div>
        <div class="cell-label">TACH HOURS</div>
        <div class="cell-val">2.6 HRS</div>
      </div>
    </div>

    <div class="defect-block">
      <div style="font-size:10px; color:#EF4444; font-weight:800; text-transform:uppercase;">PILOT DEFECT REPORT:</div>
      <div style="margin-top:4px;">NOSEWHEEL STEERING TRANSIENT SHIMMY ON TOUCHDOWN ROLLOUT RWY 18R. DAMPENER INSPECTED.</div>
    </div>

    <div class="signoff">
      <span>CAPTAIN: ATPL #88219 (CAPT. O. BELLO)</span>
      <span style="color:#38BDF8; font-weight:700;">AIRWORTHINESS RELEASE: CERTIFIED RETURN TO SERVICE</span>
    </div>
  </div>
</body>
</html>`;
  }

  // EdgePoint Sensor Node
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sensor Node Telemetry Mesh — ${projectName}</title>
  <style>
    body {
      background: #050B14;
      color: #E2E8F0;
      font-family: 'JetBrains Mono', monospace;
      margin: 0;
      padding: 24px;
    }
    .node-schematic {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid rgba(34, 211, 238, 0.4);
      background: #02060D;
      padding: 24px;
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.05);
    }
    .header {
      border-bottom: 1px solid rgba(34, 211, 238, 0.3);
      padding-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .eui { font-size: 20px; font-weight: 800; color: #22D3EE; }
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    .metric {
      background: #091220;
      border: 1px solid rgba(255,255,255,0.08);
      padding: 12px;
    }
    .m-label { font-size: 10px; color: #64748B; text-transform: uppercase; }
    .m-val { font-size: 16px; font-weight: 800; color: #F8FAFC; margin-top: 4px; }
    .packet-view {
      border: 1px dashed rgba(34, 211, 238, 0.3);
      padding: 12px;
      font-size: 11px;
      background: #060D17;
      color: #A5F3FC;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="node-schematic">
    <div class="header">
      <div>
        <div class="eui">NODE-MESH-0x7F2A</div>
        <div style="font-size:11px; color:#64748B;">LOCATION: KANO-NORTH CORRIDOR HOP #02</div>
      </div>
      <span style="color:#22D3EE; font-size:11px; font-weight:700;">RADIO: LORA 868 MHZ ACTIVE</span>
    </div>

    <div class="metrics-bar">
      <div class="metric">
        <div class="m-label">SIGNAL RSSI</div>
        <div class="m-val" style="color:#34D399;">-84 dBm</div>
      </div>
      <div class="metric">
        <div class="m-label">BATTERY VOLTAGE</div>
        <div class="m-val">3,580 mV</div>
      </div>
      <div class="metric">
        <div class="m-label">AMBIENT TEMP</div>
        <div class="m-val">38.4 °C</div>
      </div>
      <div class="metric">
        <div class="m-label">FIRMWARE REVISION</div>
        <div class="m-val">v2.4.1-STABLE</div>
      </div>
    </div>

    <div style="font-size:10px; color:#64748B; margin-bottom:6px; text-transform:uppercase;">RAW TELEMETRY FRAME:</div>
    <div class="packet-view">
      0x4E4F4445_7F2A_0DE8_41E2_F39A_8832_01_SHA256_e7f9182bb192c730491823a
    </div>
  </div>
</body>
</html>`;
}

export function getOrCreateGoldenFixture(
  projectId: string,
  projectName: string,
  kitId: 'iyanuoluwa' | 'ehi' | 'aviation' | 'edgepoint'
): GoldenFixtureInfo {
  const slug = projectId.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const html = generateGoldenScreenHtml(kitId, projectName);
  const hash = computeFixtureHash(html);

  return {
    project_id: projectId,
    project_slug: slug,
    signature_object: kitId,
    html_content: html,
    fixture_hash: hash,
    created_at: new Date().toISOString()
  };
}
