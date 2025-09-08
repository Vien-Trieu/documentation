import { useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * LV RIR Breaker using an E-MAX Circuit Breaker – Production Testing Form
 * - Save to PDF via the browser print dialog (Ctrl/Cmd+P).
 * - Resume from PDF: upload a PDF saved from this app to continue editing.
 * - Apparatus Type dropdown (no free-typing)
 * - Device Serial # and Customer Order # required
 * - ABB branding and Document No. + Revision
 *
 * Payload embed method:
 * - Invisible zero-width characters (no visible "DATA:: ... ::END").
 * - Import supports both zero-width payloads AND the older DATA::...::END base64.
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

// ---------- UI bits ----------
const Label = ({ children, htmlFor, className }: any) => (
  <label className={`label ${className ?? ""}`} htmlFor={htmlFor}>{children}</label>
);
const TextInput = ({ id, value, onChange, placeholder, type="text", required=false, hasError=false }: any) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`input${hasError ? " input-error" : ""}`}
    type={type}
    aria-required={required}
  />
);
const NumberInput = (p: any) => <TextInput {...p} type="number" />;
const TextArea = ({ id, value, onChange, rows=4, placeholder }: any) => (
  <textarea id={id} value={value} onChange={onChange} rows={rows} placeholder={placeholder} className="textarea"/>
);
const SelectInput = ({ id, value, onChange, options, required=false, hasError=false }: any) => (
  <select
    id={id}
    value={value}
    onChange={onChange}
    className={`input${hasError ? " input-error" : ""}`}
    aria-required={required}
  >
    <option value="" disabled>Select an option</option>
    {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
  </select>
);
const PFN = ({ value, onChange, name }: { value: PFNType; onChange:(v:PFNType)=>void; name:string }) => (
  <div className="pills">
    {(["PASS","FAIL","N/A"] as PFNType[]).map(opt => (
      <label key={opt} style={{display:"inline-flex",alignItems:"center",gap:8}}>
        <input type="radio" name={name} value={opt} checked={value===opt} onChange={e=>onChange(e.target.value as PFNType)} />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

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

/* ----------------- data helpers ----------------- */
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
function mergeWithDefault(loaded: any): FormData {
  return deepMerge(defaultFormData(), loaded);
}

/* ----------------- invisible (zero-width) PDF payload helpers ----------------- */
// Zero-width chars: 0 = U+200B, 1 = U+200C, sentinel = U+200D U+200D
const ZW0 = "\u200b";        // zero width space
const ZW1 = "\u200c";        // zero width non-joiner
const ZWS = "\u200d\u200d";  // sentinel (double joiner)

/** Encode JSON -> base64 -> bits -> zero-width string with sentinels */
function encodeZW(jsonStr: string): string {
  const b64 = btoa(jsonStr);
  const bits = Array.from(b64)
    .map(ch => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
  const body = bits.replace(/0/g, ZW0).replace(/1/g, ZW1);
  return ZWS + body + ZWS;
}

/** Extract zero-width payload from arbitrary text and decode to JSON string */
function decodeZWFromText(text: string): string | null {
  const zwOnly = text.replace(/[^\u200b\u200c\u200d]/g, "");
  const parts = zwOnly.split(ZWS).filter(Boolean);
  if (!parts.length) return null;
  const bits = parts[0].replace(new RegExp(ZW0, "g"), "0").replace(new RegExp(ZW1, "g"), "1");
  if (bits.length % 8 !== 0) return null;
  const b64 = bits.match(/.{8}/g)!.map(byte => String.fromCharCode(parseInt(byte, 2))).join("");
  try {
    return atob(b64);
  } catch {
    return null;
  }
}

/** Legacy fallback: support older PDFs that used DATA::...::END base64 text */
function tryLegacyDataBlock(text: string): string | null {
  const m = text.match(/DATA::([\s\S]*?)::END/);
  if (!m) return null;
  const base64 = m[1].replace(/[^A-Za-z0-9+/=]/g, "");
  try {
    return atob(base64);
  } catch {
    return null;
  }
}

export default function App() {
  const empty = useMemo(() => defaultFormData(), []);
  const [data, setData] = useState<FormData>(empty);
  const [errors, setErrors] = useState<{[k:string]: boolean}>({});
  const pdfRef = useRef<HTMLInputElement>(null);
  const serialRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);

  const update = (path: string, value: any) => {
    setData((d) => setAtPath(structuredClone(d), path, value));
    if (path === "header.deviceSerial" || path === "header.customerOrder" || path === "header.apparatusType") {
      setErrors((e) => ({ ...e, [path]: false }));
    }
  };

  // Validate required fields before printing
  const validateRequired = () => {
    const newErr: {[k:string]: boolean} = {};
    if (!data.header.apparatusType) newErr["header.apparatusType"] = true;
    if (!data.header.deviceSerial.trim()) newErr["header.deviceSerial"] = true;
    if (!data.header.customerOrder.trim()) newErr["header.customerOrder"] = true;
    setErrors(newErr);
    if (newErr["header.deviceSerial"] && serialRef.current) serialRef.current.focus();
    else if (newErr["header.customerOrder"] && orderRef.current) orderRef.current.focus();
    return Object.keys(newErr).length === 0;
  };

  // Save as PDF (browser print). Remind to disable headers/footers to hide page URL/footer.
  const saveAsPdf = () => {
    if (!validateRequired()) {
      alert("Please complete required fields (*) before saving as PDF.");
      return;
    }
    alert("Tip: In the print dialog, uncheck 'Headers and footers' so the URL/footer doesn't appear in the PDF.");
    window.print();
  };

  // Resume from a PDF saved by this app
  const handlePdfImport = async (file?: File) => {
    const f = file || pdfRef.current?.files?.[0];
    if (!f) return;

    try {
      const arrayBuf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => ("str" in it ? it.str : (it as any).toString())).join(" ");
        text += "\n";
      }

      // First try invisible zero-width payload
      let jsonStr = decodeZWFromText(text);

      // Fallback to legacy DATA::...::END if needed
      if (!jsonStr) jsonStr = tryLegacyDataBlock(text);

      if (!jsonStr) {
        alert("No embedded data found in this PDF. Ensure it was saved from this app and not 'printed as image'.");
        return;
      }

      const loaded = JSON.parse(jsonStr);
      setData(mergeWithDefault(loaded));
      alert("Form data restored from PDF.");
    } catch (err) {
      console.error(err);
      alert("Could not read data from PDF.");
    } finally {
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const reset = () => {
    setData(empty);
    setErrors({});
  };

  // Encoded invisible payload for print-only embedding
  const invisiblePayload = useMemo(() => encodeZW(JSON.stringify(data)), [data]);

  // Apparatus dropdown options (customize as needed)
  const apparatusOptions = ["Emax2", "EGG", "Eaton", "Siemens", "GE"];

  return (
    <div className="container">
      {/* Inline helpers for print-only and error styles (works even if CSS file isn't updated) */}
      <style>{`
        .input-error { border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,.12); }
        .req::after { content:" *"; color:#ef4444; }
        .print-only { display: none; }
        @media print {
          @page { margin: 12mm; } /* keeps content inside printable area */
          .print-hide { display: none !important; }
          .print-only { display: block; }
        }
      `}</style>

      {/* Header with ABB branding and document block */}
      <div className="header">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:12}}>
          {/* ABB brand */}
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <div
              aria-label="ABB"
              style={{ fontWeight: 900, fontSize: 26, color: "#e10600", letterSpacing: 1 }}
            >
              ABB
            </div>
            <div className="subtle">Low Voltage RIR Breaker – Production Testing</div>
          </div>

          {/* Document info */}
          <div style={{textAlign:"right", fontSize:13}}>
            <div><strong>Document No.:</strong> F-INSP-61-01</div>
            <div><strong>Revision:</strong> D</div>
            <div><strong>Rev Date:</strong> 2025-05-21</div>
          </div>
        </div>

        {/* Main title */}
        <h1 className="h1" style={{marginTop:10}}>Production Testing Form</h1>
        <div className="subtle">LV RIR Breaker using an E-MAX Circuit Breaker</div>

        {/* Header fields */}
        <div className="grid grid-4" style={{marginTop:10}}>
          <div>
            <Label className="req">Apparatus Type</Label>
            <SelectInput
              id="apparatusType"
              value={data.header.apparatusType}
              onChange={(e:any)=>update("header.apparatusType", e.target.value)}
              options={apparatusOptions}
              required
              hasError={!!errors["header.apparatusType"]}
            />
          </div>
          <div>
            <Label className="req">Device Serial #</Label>
            <TextInput
              id="deviceSerial"
              value={data.header.deviceSerial}
              onChange={(e:any)=>update("header.deviceSerial", e.target.value)}
              required
              hasError={!!errors["header.deviceSerial"]}
              ref={serialRef as any}
            />
          </div>
          <div>
            <Label className="req">Customer Order #</Label>
            <TextInput
              id="customerOrder"
              value={data.header.customerOrder}
              onChange={(e:any)=>update("header.customerOrder", e.target.value)}
              required
              hasError={!!errors["header.customerOrder"]}
              ref={orderRef as any}
            />
          </div>
          <div>
            <Label>Customer PO</Label>
            <TextInput
              id="customerPO"
              value={data.header.customerPO}
              onChange={(e:any)=>update("header.customerPO", e.target.value)}
            />
          </div>
        </div>

        <div style={{display:"flex", gap:8, marginTop:12}} className="print-hide">
          <button className="btn" onClick={saveAsPdf}>Save as PDF</button>
          <label className="btn" style={{cursor:"pointer"}}>
            Resume from PDF
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              style={{display:"none"}}
              onChange={(e)=>handlePdfImport(e.target.files?.[0] ?? undefined)}
            />
          </label>
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
      <div className="card" style={{marginBottom:40}}>
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

      {/* Invisible, print-only zero-width payload at end of document */}
      <div className="print-only">
        <span>{invisiblePayload}</span>
      </div>
    </div>
  );
}