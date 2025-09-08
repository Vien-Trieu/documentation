import React, { useMemo, useRef, useState } from "react";

/**
 * LV RIR Breaker using an E-MAX Circuit Breaker – Production Testing Form
 * Simple, portable React app that mirrors the uploaded PDF.
 * - No external UI libs; just Tailwind utility classes.
 * - Save/Load JSON locally (works offline).
 * - Print to paper or PDF via the browser (Ctrl/Cmd+P).
 * - Minimal validation; designed for shop-floor use.
 * - Single-file component for easy copy/paste into Vite (or CRA).

// ---------- Small UI helpers ----------

 * Minimal single-file version (no Tailwind, just CSS classes in index.css).
 * - Save/Load JSON locally
 * - Print from browser
 */

type PFNType = "PASS" | "FAIL" | "N/A";

type TripRowData = {
  settings: string;
  criteria: string;
  phaseA: string;
  phaseB: string;
  phaseC: string;
};

type Section2 = {
  PR1: string;
  notes: string;
  longTimePickup: TripRowData;
  longTimeDelay: TripRowData;
  shortTimePickup: TripRowData;
  shortTimeDelay: TripRowData;
  instPickup: TripRowData;
  instDelay: TripRowData;
  groundPickup: TripRowData;
  groundDelay: TripRowData;
};
type TripKey = Exclude<keyof Section2, "PR1" | "notes">;

type FormData = {
  header: {
    apparatusType: string;
    deviceSerial: string;
    customerOrder: string;
    customerPO: string;
  };
  section1: {
    vacA: number | null;
    vacB: number | null;
    vacC: number | null;
    resultA: PFNType;
    resultB: PFNType;
    resultC: PFNType;
  };
  section1_1: PFNType;
  section1_2: PFNType;
  section2: Section2;
  section3: { verify2k1: PFNType };
  section4: { manualOps: PFNType; eOpenMin: PFNType };
  section5: {
    eo2Manual: PFNType;
    eo5ChargeMin: PFNType;
    eo5CloseMin: PFNType;
    eo5OpenMin: PFNType;
    eo5ChargeMax: PFNType;
    eo5CloseMax: PFNType;
    eo5OpenMax: PFNType;
    eo2AntiPump: PFNType;
  };
  section6: { maxPickup: PFNType; maxDropout: PFNType; timeDelay: PFNType };
  section7: { rows: { label: string; a: number | null; b: number | null; c: number | null }[] };
  section8: {
    disconnectToTest: PFNType;
    testToConnect: PFNType;
    connectToTest: PFNType;
    testToDisconnect: PFNType;
    preventRemoval: PFNType;
  };
  section9: { visual: PFNType };
  section10: { diagram: string; result: PFNType };
  section11: { counter: number | null };
  comments: string;
  signoff: { inspector: string; date: string; signature: string };
};

const tripRows: { key: TripKey; label: string }[] = [
  { key: "longTimePickup", label: "Long-time Pickup (I1 = __ In)" },
  { key: "longTimeDelay", label: "Long-time Delay (I1 = __ In)" },
  { key: "shortTimePickup", label: "Short-time Pickup (I2 = __ In)" },
  { key: "shortTimeDelay", label: "Short-time Delay (I2 = __ In)" },
  { key: "instPickup", label: "Inst Pickup (I3 = __ In)" },
  { key: "instDelay", label: "Inst Delay (I3 = __ In)" },
  { key: "groundPickup", label: "Ground Pickup (I4 = __ In)" },
  { key: "groundDelay", label: "Ground Delay (I4 = __ In)" },
];

const Label = ({ children, htmlFor }: any) => (
  <label className="label" htmlFor={htmlFor}>{children}</label>
);
const TextInput = ({ id, value, onChange, placeholder, type="text" }: any) => (
  <input id={id} value={value} onChange={onChange} placeholder={placeholder} className="input" type={type}/>
);
const NumberInput = (p: any) => <TextInput {...p} type="number" />;
const TextArea = ({ id, value, onChange, rows=4, placeholder }: any) => (
  <textarea id={id} value={value} onChange={onChange} rows={rows} placeholder={placeholder} className="textarea"/>
);
const PFN = ({ value, onChange, name }: { value: PFNType; onChange:(v:PFNType)=>void; name:string }) => (
  <div className="pills">
    {["PASS","FAIL","N/A"].map(opt => (
      <label key={opt} style={{display:"inline-flex",alignItems:"center",gap:8}}>
        <input type="radio" name={name} value={opt} checked={value===opt} onChange={e=>onChange(e.target.value as PFNType)} />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

function TripRow({ row, data, onChange } : { row:{key:TripKey; label:string}; data:TripRowData; onChange:(v:TripRowData)=>void }) {
  const set = (k: keyof TripRowData, v: any) => onChange({ ...data, [k]: v });
  return (
    <div className="card" style={{padding:12}}>
      <div className="grid grid-4">
        <div className="grid" style={{gap:6}}>
          <Label>{row.label}</Label>
          <TextInput value={data.settings} onChange={(e:any)=>set("settings", e.target.value)} placeholder="Test Settings (e.g., I1=4.0 In, tol ±10%)"/>
        </div>
        <div className="grid" style={{gap:6}}>
          <Label>Acceptance Criteria</Label>
          <TextInput value={data.criteria} onChange={(e:any)=>set("criteria", e.target.value)} placeholder="e.g., ≤ 5 sec @ I1"/>
        </div>
        <div className="grid" style={{gap:6}}>
          <Label>Phase A Result</Label>
          <TextInput value={data.phaseA} onChange={(e:any)=>set("phaseA", e.target.value)} placeholder="e.g., 4.8 sec / 1200 A"/>
        </div>
        <div className="grid" style={{gap:6}}>
          <Label>Phase B Result</Label>
          <TextInput value={data.phaseB} onChange={(e:any)=>set("phaseB", e.target.value)} placeholder="e.g., 4.9 sec / 1190 A"/>
        </div>
        <div className="grid" style={{gap:6}}>
          <Label>Phase C Result</Label>
          <TextInput value={data.phaseC} onChange={(e:any)=>set("phaseC", e.target.value)} placeholder="e.g., 5.0 sec / 1210 A"/>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const empty = useMemo(() => defaultFormData(), []);
  const [data, setData] = useState<FormData>(empty);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (path: string, value: any) => {
    setData((d) => setAtPath(structuredClone(d), path, value));
  };

  const handleSave = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lv-rir-breaker-form_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (file?: File) => {
    const f = file || fileRef.current?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = JSON.parse(String(reader.result));
        setData(mergeWithDefault(loaded));
      } catch {
        alert("Could not read JSON file.");
      }
    };
    reader.readAsText(f);
  };

  const reset = () => setData(empty);

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1 className="h1">Production Testing Form</h1>
        <div className="subtle">LV RIR Breaker using an E-MAX Circuit Breaker</div>
        <div className="grid grid-4" style={{marginTop:10}}>
          <div>
            <Label>Apparatus Type</Label>
            <TextInput value={data.header.apparatusType} onChange={(e:any)=>update("header.apparatusType", e.target.value)} />
          </div>
          <div>
            <Label>Device Serial #</Label>
            <TextInput value={data.header.deviceSerial} onChange={(e:any)=>update("header.deviceSerial", e.target.value)} />
          </div>
          <div>
            <Label>Customer Order #</Label>
            <TextInput value={data.header.customerOrder} onChange={(e:any)=>update("header.customerOrder", e.target.value)} />
          </div>
          <div>
            <Label>Customer PO</Label>
            <TextInput value={data.header.customerPO} onChange={(e:any)=>update("header.customerPO", e.target.value)} />
          </div>
        </div>
        <div style={{display:"flex", gap:8, marginTop:12}} className="print-hide">
          <button className="btn" onClick={handleSave}>Save JSON</button>
          <label className="btn" style={{cursor:"pointer"}}>
            Load JSON
            <input ref={fileRef} type="file" accept="application/json" style={{display:"none"}} onChange={(e)=>handleLoad(e.target.files?.[0] ?? undefined)} />
          </label>
          <button className="btn" onClick={()=>window.print()}>Print / Save as PDF</button>
          <button className="btn" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* 1 */}
      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:10}}>
          <h2 className="h1" style={{fontSize:18}}>1. AC Hi-Pot Testing of each pole/each phase (2200V at 60Hz) – 60 seconds</h2>
          <span className="subtle">Dielectric Withstand Test @ Acceptance: Withstand for 1 minute.</span>
        </div>
        <div className="row">
          <div>
            <Label>Measured (VAC) – Phase A</Label>
            <NumberInput value={data.section1.vacA ?? ""} onChange={(e:any)=>update("section1.vacA", toNumber(e.target.value))}/>
          </div>
          <div>
            <Label>Measured (VAC) – Phase B</Label>
            <NumberInput value={data.section1.vacB ?? ""} onChange={(e:any)=>update("section1.vacB", toNumber(e.target.value))}/>
          </div>
          <div>
            <Label>Measured (VAC) – Phase C</Label>
            <NumberInput value={data.section1.vacC ?? ""} onChange={(e:any)=>update("section1.vacC", toNumber(e.target.value))}/>
          </div>
        </div>
        <div className="row">
          <div>
            <Label>Phase A Result</Label>
            <PFN value={data.section1.resultA} onChange={(v)=>update("section1.resultA", v)} name="s1a"/>
          </div>
          <div>
            <Label>Phase B Result</Label>
            <PFN value={data.section1.resultB} onChange={(v)=>update("section1.resultB", v)} name="s1b"/>
          </div>
          <div>
            <Label>Phase C Result</Label>
            <PFN value={data.section1.resultC} onChange={(v)=>update("section1.resultC", v)} name="s1c"/>
          </div>
        </div>
      </div>

      {/* 1.1 / 1.2 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>1.1 AC Hi-Pot Testing of Secondary control wiring – 1500 VAC for 1 minute</h2>
        <PFN value={data.section1_1} onChange={(v)=>update("section1_1", v)} name="s11"/>
      </div>
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>1.2 AC Hi-Pot Testing of charging motor – 1000 VAC for 1 minute</h2>
        <PFN value={data.section1_2} onChange={(v)=>update("section1_2", v)} name="s12"/>
      </div>

      {/* 2 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>2. Primary Current Injection Testing of Trip Devices</h2>
        <div className="grid" style={{gap:12}}>
          <div className="row">
            <div>
              <Label>PR1</Label>
              <TextInput value={data.section2.PR1} onChange={(e:any)=>update("section2.PR1", e.target.value)}/>
            </div>
            <div style={{gridColumn:"span 2"}}>
              <Label>Notes</Label>
              <TextInput value={data.section2.notes} onChange={(e:any)=>update("section2.notes", e.target.value)}/>
            </div>
          </div>
          {tripRows.map(r => (
            <TripRow key={r.key} row={r} data={data.section2[r.key]} onChange={(v)=>update(`section2.${r.key}`, v)} />
          ))}
        </div>
      </div>

      {/* 3 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>3. Fusible Breakers</h2>
        <div className="row">
          <div style={{gridColumn:"span 2"}}>
            <Label>3.1 Verify 2k-1 point to point wiring</Label>
            <PFN value={data.section3.verify2k1} onChange={(v)=>update("section3.verify2k1", v)} name="s31"/>
          </div>
        </div>
      </div>

      {/* 4 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>4. Manually Operated (MO) Breakers</h2>
        <div className="row">
          <div style={{gridColumn:"span 2"}}>
            <Label>4.1 5 Manual Operations</Label>
            <PFN value={data.section4.manualOps} onChange={(v)=>update("section4.manualOps", v)} name="s41"/>
          </div>
        </div>
        <div className="row">
          <div style={{gridColumn:"span 2"}}>
            <Label>4.2 5 Electric Open Ops (If shunt trip installed) at Minimum Voltage</Label>
            <PFN value={data.section4.eOpenMin} onChange={(v)=>update("section4.eOpenMin", v)} name="s42"/>
          </div>
        </div>
      </div>

      {/* 5 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>5. Electrically Operated (EO) Breakers</h2>
        {([
          ["5.1 2 Manual Ops","eo2Manual"],
          ["5.2 5 Charging Ops at Minimum Voltage","eo5ChargeMin"],
          ["5.3 5 Electric Close Ops at Minimum Voltage","eo5CloseMin"],
          ["5.4 5 Electric Open Ops at Minimum Voltage","eo5OpenMin"],
          ["5.5 5 Charging Ops at Maximum Voltage","eo5ChargeMax"],
          ["5.6 5 Electric Close Ops at Maximum Voltage","eo5CloseMax"],
          ["5.7 5 Electric Open Ops at Maximum Voltage","eo5OpenMax"],
          ["5.8 2 Anti-Pump Ops at Normal Op Voltage","eo2AntiPump"],
        ] as const).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{gridColumn:"span 2"}}>
              <Label>{label}</Label>
              <PFN value={(data.section5 as any)[key]} onChange={(v)=>update(`section5.${key}`, v)} name={`s${key}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 6 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>6. Undervoltage Device (If equipped)</h2>
        {([
          ["6.1 Max Pickup Voltage","maxPickup"],
          ["6.2 Max Drop-out Voltage","maxDropout"],
          ["6.3 Time Delay","timeDelay"],
        ] as const).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{gridColumn:"span 2"}}>
              <Label>{label}</Label>
              <PFN value={(data.section6 as any)[key]} onChange={(v)=>update(`section6.${key}`, v)} name={`s6${key}`}/>
            </div>
          </div>
        ))}
      </div>

      {/* 7 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>7. Contact Resistance Test</h2>
        <div style={{overflowX:"auto"}}>
          <table className="table">
            <thead>
              <tr>
                <th>Ductor Readings (µΩ)</th>
                <th>Phase A</th>
                <th>Phase B</th>
                <th>Phase C</th>
              </tr>
            </thead>
            <tbody>
              {data.section7.rows.map((row, idx) => (
                <tr key={idx}>
                  <td><TextInput value={row.label} onChange={(e:any)=>update(`section7.rows.${idx}.label`, e.target.value)} placeholder="Measurement point / notes"/></td>
                  <td><NumberInput value={row.a ?? ""} onChange={(e:any)=>update(`section7.rows.${idx}.a`, toNumber(e.target.value))}/></td>
                  <td><NumberInput value={row.b ?? ""} onChange={(e:any)=>update(`section7.rows.${idx}.b`, toNumber(e.target.value))}/></td>
                  <td><NumberInput value={row.c ?? ""} onChange={(e:any)=>update(`section7.rows.${idx}.c`, toNumber(e.target.value))}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <button className="btn" onClick={()=>update("section7.rows", [...data.section7.rows, { label:"", a:null, b:null, c:null }])}>Add Row</button>
          <button className="btn" onClick={()=>update("section7.rows", data.section7.rows.slice(0,-1))} disabled={data.section7.rows.length===0}>Remove Row</button>
        </div>
        <div className="muted" style={{marginTop:8}}>
          <div><strong>Acceptance Criteria (±10% Phase-to-Phase):</strong></div>
          <ul style={{marginTop:4}}>
            <li>≤ 50 µΩ @ 800A</li>
            <li>≤ 40 µΩ @ 1200A</li>
            <li>≤ 30 µΩ @ 1600/2000A</li>
            <li>≤ 20 µΩ @ 3200A/4000A</li>
          </ul>
        </div>
      </div>

      {/* 8 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>8. Racking Operations – Position Stop Verification</h2>
        {([
          ["8.1 Prevent closed breaker racking (Disconnect → Test)", "disconnectToTest"],
          ["8.2 Prevent closed breaker racking (Test → Connect)", "testToConnect"],
          ["8.3 Prevent closed breaker racking (Connect → Test)", "connectToTest"],
          ["8.4 Prevent closed breaker racking (Test → Disconnect)", "testToDisconnect"],
          ["8.5 Prevent closed breaker cell removal (in cell)", "preventRemoval"],
        ] as const).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{gridColumn:"span 2"}}>
              <Label>{label}</Label>
              <PFN value={(data.section8 as any)[key]} onChange={(v)=>update(`section8.${key}`, v)} name={`s8${key}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 9–11 */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>9. Visual inspection of rating interference/interlock</h2>
        <PFN value={data.section9.visual} onChange={(v)=>update("section9.visual", v)} name="s9"/>
      </div>

      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>10. Verify secondary wiring by continuity per breaker-specific wiring diagram</h2>
        <div className="row">
          <div>
            <Label>Wiring Diagram #</Label>
            <TextInput value={data.section10.diagram} onChange={(e:any)=>update("section10.diagram", e.target.value)} />
          </div>
          <div style={{gridColumn:"span 2"}}>
            <Label>Result</Label>
            <PFN value={data.section10.result} onChange={(v)=>update("section10.result", v)} name="s10"/>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>11. Outgoing Operations Counter Reading</h2>
        <div className="row">
          <div>
            <Label>Counter Reading</Label>
            <NumberInput value={data.section11.counter ?? ""} onChange={(e:any)=>update("section11.counter", toNumber(e.target.value))}/>
          </div>
        </div>
      </div>

      {/* Comments & Signoff */}
      <div className="card">
        <h2 className="h1" style={{fontSize:18}}>Additional Testing / Comments</h2>
        <TextArea value={data.comments} onChange={(e:any)=>update("comments", e.target.value)} rows={6} placeholder="Add any additional testing notes, observations, or comments here."/>
      </div>

      <div className="card" style={{marginBottom:40}}>
        <h2 className="h1" style={{fontSize:18}}>Inspector / Tester Signoff</h2>
        <div className="grid grid-4">
          <div style={{gridColumn:"span 2"}}>
            <Label>Inspector / Tester</Label>
            <TextInput value={data.signoff.inspector} onChange={(e:any)=>update("signoff.inspector", e.target.value)} />
          </div>
          <div>
            <Label>Date</Label>
            <TextInput value={data.signoff.date} onChange={(e:any)=>update("signoff.date", e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <Label>Signature (type name)</Label>
            <TextInput value={data.signoff.signature} onChange={(e:any)=>update("signoff.signature", e.target.value)} />
          </div>
        </div>
        <p className="muted" style={{marginTop:8}}>Procedure Number and Revision: F-INSP-61-01, REV D (05/21/2025)</p>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */
function defaultTripRow(): TripRowData {
  return { settings: "", criteria: "", phaseA: "", phaseB: "", phaseC: "" };
}
function defaultFormData(): FormData {
  return {
    header: { apparatusType: "", deviceSerial: "", customerOrder: "", customerPO: "" },
    section1: { vacA: null, vacB: null, vacC: null, resultA: "N/A", resultB: "N/A", resultC: "N/A" },
    section1_1: "N/A",
    section1_2: "N/A",
    section2: {
      PR1: "", notes: "",
      longTimePickup: defaultTripRow(),
      longTimeDelay: defaultTripRow(),
      shortTimePickup: defaultTripRow(),
      shortTimeDelay: defaultTripRow(),
      instPickup: defaultTripRow(),
      instDelay: defaultTripRow(),
      groundPickup: defaultTripRow(),
      groundDelay: defaultTripRow(),
    },
    section3: { verify2k1: "N/A" },
    section4: { manualOps: "N/A", eOpenMin: "N/A" },
    section5: {
      eo2Manual: "N/A", eo5ChargeMin: "N/A", eo5CloseMin: "N/A", eo5OpenMin: "N/A",
      eo5ChargeMax: "N/A", eo5CloseMax: "N/A", eo5OpenMax: "N/A", eo2AntiPump: "N/A",
    },
    section6: { maxPickup: "N/A", maxDropout: "N/A", timeDelay: "N/A" },
    section7: { rows: [{ label: "", a: null, b: null, c: null }] },
    section8: { disconnectToTest: "N/A", testToConnect: "N/A", connectToTest: "N/A", testToDisconnect: "N/A", preventRemoval: "N/A" },
    section9: { visual: "N/A" },
    section10: { diagram: "", result: "N/A" },
    section11: { counter: null },
    comments: "",
    signoff: { inspector: "", date: "", signature: "" },
  };
}
function setAtPath(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur)) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}
function toNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function mergeWithDefault(loaded: any): FormData {
  return deepMerge(defaultFormData(), loaded);
}
function deepMerge(target: any, source: any) {
  if (typeof source !== "object" || source === null) return target;
  const output = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key])) output[key] = source[key];
    else if (typeof source[key] === "object" && source[key] !== null) output[key] = deepMerge(target[key] ?? {}, source[key]);
    else output[key] = source[key];
  }
  return output;
}