/**
 * Author: Vien Trieu
 * Date: 2024-08-31
 * Description: Main App component for the LV RIR Breaker Production Testing Form.
 * Date modified: 2025-10-03
 */

import { useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/* ---------------- Types ---------------- */

type PFNType = 'PASS' | 'FAIL' | 'N/A';
type YesNoNAType = 'YES' | 'NO' | 'N/A';
type FanPowerType = 'AC' | 'DC' | '';

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
type TripKey = Exclude<keyof Section2, 'PR1' | 'notes'>;

type FormData = {
  header: {
    apparatusType: string;
    deviceSerial: string;
    customerOrder: string;
    customerPO: string;
    revision?: string;
    revDate?: string;
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
    /* NEW FIELDS */
    eo2ndCloseMin: PFNType; // 5.9
    eo2ndCloseMax: PFNType; // 5.10
    fanApplyProgram: YesNoNAType; // 5.11 (a)
    fanType: FanPowerType; // 5.11 (b)
    fanRun60s: PFNType; // 5.11 (c)
  };
  section6: { maxPickup: PFNType; maxDropout: PFNType; timeDelay: PFNType };
  section7: {
    rows: {
      label: string;
      a: number | null;
      b: number | null;
      c: number | null;
    }[];
  };
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

/* ------------- Small UI primitives ------------- */

const Label = ({ children, htmlFor, className }: any) => (
  <label className={`label ${className ?? ''}`} htmlFor={htmlFor}>
    {children}
  </label>
);

const TextInput = ({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  hasError = false,
  inputRef,
  className, // allow custom class (e.g., cursive signature)
  style, // optional inline styles
}: any) => (
  <input
    id={id}
    ref={inputRef}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`input${hasError ? ' input-error' : ''} ${className ?? ''}`}
    type={type}
    aria-required={required}
    style={style}
  />
);

const NumberInput = (p: any) => (
  <TextInput {...p} type="number" inputMode="decimal" />
);

const TextArea = ({ id, value, onChange, rows = 4, placeholder }: any) => (
  <textarea
    id={id}
    value={value}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    className="textarea"
  />
);

const SelectInput = ({
  id,
  value,
  onChange,
  options,
  required = false,
  hasError = false,
}: any) => (
  <select
    id={id}
    value={value}
    onChange={onChange}
    className={`input${hasError ? ' input-error' : ''}`}
    aria-required={required}
  >
    <option value="" disabled>
      Select an option
    </option>
    {options.map((o: string) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const PFN = ({
  value,
  onChange,
  name,
}: {
  value: PFNType;
  onChange: (v: PFNType) => void;
  name: string;
}) => (
  <div className="pills">
    {(['PASS', 'FAIL', 'N/A'] as PFNType[]).map((opt) => (
      <label
        key={opt}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={(e) => onChange(e.target.value as PFNType)}
        />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

/* NEW small helpers */
const YesNoNAGroup = ({
  value,
  onChange,
  name,
}: {
  value: YesNoNAType;
  onChange: (v: YesNoNAType) => void;
  name: string;
}) => (
  <div className="pills">
    {(['YES', 'NO', 'N/A'] as YesNoNAType[]).map((opt) => (
      <label
        key={opt}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={(e) => onChange(e.target.value as YesNoNAType)}
        />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

const FanTypeGroup = ({
  value,
  onChange,
  name,
}: {
  value: FanPowerType;
  onChange: (v: FanPowerType) => void;
  name: string;
}) => (
  <div className="pills">
    {(['AC', 'DC'] as FanPowerType[]).map((opt) => (
      <label
        key={opt}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={(e) => onChange(e.target.value as FanPowerType)}
        />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

/* ---------------- Data helpers ---------------- */

const tripRows: { key: TripKey; label: string }[] = [
  { key: 'longTimePickup', label: 'Long-time Pickup (I1 = __ In)' },
  { key: 'longTimeDelay', label: 'Long-time Delay (I1 = __ In)' },
  { key: 'shortTimePickup', label: 'Short-time Pickup (I2 = __ In)' },
  { key: 'shortTimeDelay', label: 'Short-time Delay (I2 = __ In)' },
  { key: 'instPickup', label: 'Inst Pickup (I3 = __ In)' },
  { key: 'instDelay', label: 'Inst Delay (I3 = __ In)' },
  { key: 'groundPickup', label: 'Ground Pickup (I4 = __ In)' },
  { key: 'groundDelay', label: 'Ground Delay (I4 = __ In)' },
];

function defaultTripRow(): TripRowData {
  return { settings: '', criteria: '', phaseA: '', phaseB: '', phaseC: '' };
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultFormData(): FormData {
  return {
    header: {
      apparatusType: '',
      deviceSerial: '',
      customerOrder: '',
      customerPO: '',
      revision: 'A',
      revDate: today(),
    },
    section1: {
      vacA: null,
      vacB: null,
      vacC: null,
      resultA: 'N/A',
      resultB: 'N/A',
      resultC: 'N/A',
    },
    section1_1: 'N/A',
    section1_2: 'N/A',
    section2: {
      PR1: '',
      notes: '',
      longTimePickup: defaultTripRow(),
      longTimeDelay: defaultTripRow(),
      shortTimePickup: defaultTripRow(),
      shortTimeDelay: defaultTripRow(),
      instPickup: defaultTripRow(),
      instDelay: defaultTripRow(),
      groundPickup: defaultTripRow(),
      groundDelay: defaultTripRow(),
    },
    section3: { verify2k1: 'N/A' },
    section4: { manualOps: 'N/A', eOpenMin: 'N/A' },
    section5: {
      eo2Manual: 'N/A',
      eo5ChargeMin: 'N/A',
      eo5CloseMin: 'N/A',
      eo5OpenMin: 'N/A',
      eo5ChargeMax: 'N/A',
      eo5CloseMax: 'N/A',
      eo5OpenMax: 'N/A',
      eo2AntiPump: 'N/A',
      /* NEW defaults */
      eo2ndCloseMin: 'N/A',
      eo2ndCloseMax: 'N/A',
      fanApplyProgram: 'N/A',
      fanType: '',
      fanRun60s: 'N/A',
    },
    section6: { maxPickup: 'N/A', maxDropout: 'N/A', timeDelay: 'N/A' },
    section7: { rows: [{ label: '', a: null, b: null, c: null }] },
    section8: {
      disconnectToTest: 'N/A',
      testToConnect: 'N/A',
      connectToTest: 'N/A',
      testToDisconnect: 'N/A',
      preventRemoval: 'N/A',
    },
    section9: { visual: 'N/A' },
    section10: { diagram: '', result: 'N/A' },
    section11: { counter: null },
    comments: '',
    signoff: { inspector: '', date: '', signature: '' },
  };
}

function setAtPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
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
  if (typeof source !== 'object' || source === null) return target;
  const output = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key])) output[key] = source[key];
    else if (typeof source[key] === 'object' && source[key] !== null)
      output[key] = deepMerge(target[key] ?? {}, source[key]);
    else output[key] = source[key];
  }
  return output;
}

function mergeWithDefault(loaded: any): FormData {
  return deepMerge(defaultFormData(), loaded);
}

/* --------- Payload embed helpers --------- */

const _te = new TextEncoder();
const _td = new TextDecoder();

function b64EncodeUTF8(str: string): string {
  const bytes = _te.encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64DecodeUTF8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return _td.decode(bytes);
}

const EMBED_START = '<<<RIRDATA::';
const EMBED_END = '::RIRDATA>>>';

function checksum(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
function makeMarkerPayload(json: string) {
  const b64 = b64EncodeUTF8(json);
  const sum = checksum(b64);
  const wrapped = b64.replace(/(.{1,120})/g, '$1 ');
  return `${EMBED_START}${sum}|${wrapped}${EMBED_END}`;
}
function tryMarkerPayload(text: string): string | null {
  const re = new RegExp(
    `${EMBED_START.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([0-9a-f]+)\\|([\\s\\S]*?)${EMBED_END.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`,
  );
  const m = text.match(re);
  if (!m) return null;
  const [, sum, body] = m;
  const b64 = body.replace(/\s+/g, '');
  if (checksum(b64) !== sum) return null;
  try {
    return b64DecodeUTF8(b64);
  } catch {
    return null;
  }
}

/* zero-width fallback */
const ZW0 = '\u200b';
const ZW1 = '\u200c';
const ZWS = '\u200d\u200d';
function encodeZW(jsonStr: string): string {
  const b64 = b64EncodeUTF8(jsonStr);
  const bits = Array.from(b64)
    .map((ch) => ch.charCodeAt(0).toString(2))
    .map((b) => b.padStart(8, '0'))
    .join('');
  const body = bits.replace(/0/g, ZW0).replace(/1/g, ZW1);
  return ZWS + body + ZWS;
}
function decodeZWFromText(text: string): string | null {
  const zwOnly = text.replace(/[^\u200b\u200c\u200d]/g, '');
  const parts = zwOnly.split(ZWS).filter(Boolean);
  if (!parts.length) return null;
  const bits = parts[0]
    .replace(new RegExp(ZW0, 'g'), '0')
    .replace(new RegExp(ZW1, 'g'), '1');
  if (bits.length % 8 !== 0) return null;
  const b64 = bits
    .match(/.{8}/g)!
    .map((byte) => String.fromCharCode(parseInt(byte, 2)))
    .join('');
  try {
    return b64DecodeUTF8(b64);
  } catch {
    return null;
  }
}
/* legacy fallback */
function tryLegacyDataBlock(text: string): string | null {
  const m = text.match(/DATA::([\s\S]*?)::END/);
  if (!m) return null;
  const base64 = m[1].replace(/[^A-Za-z0-9+/=]/g, '');
  try {
    return b64DecodeUTF8(base64);
  } catch {
    return null;
  }
}

/* ---------------- Components ---------------- */

const REV_LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
);
const DOC_NUMBER = 'F-INSP-61-01';

/** Page wrapper: gives each page its own block + footer */
function PrintPage({
  children,
  footer,
  page,
  total,
}: {
  children: React.ReactNode;
  footer: { doc: string; rev: string; date: string };
  page: number;
  total: number;
}) {
  return (
    <section className="print-page">
      <div className="print-content">{children}</div>
      <div className="print-footer">
        <span>
          <strong>Document No.:</strong> {footer.doc}
        </span>
        <span>
          <strong>Revision:</strong> {footer.rev}
        </span>
        <span>
          <strong>Revision Date:</strong> {footer.date}
        </span>
        <span>
          Page {page} of {total}
        </span>
      </div>
    </section>
  );
}

/* Section 1 table with special validation for Voltage #1 (Phase A) */
function Section1Table({
  data,
  update,
  vacAInvalid,
  setVacAInvalid,
}: {
  data: FormData['section1'];
  update: (path: string, v: any) => void;
  vacAInvalid: boolean;
  setVacAInvalid: (b: boolean) => void;
}) {
  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 className="h1" style={{ fontSize: 18 }}>
          1. Dielectric Withstand Test
        </h2>
        <div className="subtle">
          Acceptance Criteria: Withstand for 1 minute.
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 260 }}>Measured</th>
              <th className="center">Phase A</th>
              <th className="center">Phase B</th>
              <th className="center">Phase C</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="muted-cell">
                <strong>VAC (60Hz) @ 2200V</strong>
              </td>
              <td className="center">
                <NumberInput
                  id="s1-vacA"
                  value={data.vacA ?? ''}
                  onChange={(e: any) => {
                    const raw = e.target.value;
                    // OPTIONAL but strictly numeric when present
                    if (raw === '') {
                      setVacAInvalid(false);
                      update('section1.vacA', null);
                    } else if (/^\s*-?\d+(\.\d+)?\s*$/.test(raw)) {
                      setVacAInvalid(false);
                      update('section1.vacA', Number(raw));
                    } else {
                      setVacAInvalid(true);
                    }
                  }}
                  hasError={vacAInvalid}
                />
                {vacAInvalid && (
                  <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 4 }}>
                    Please enter a valid number for Voltage #1 (Phase A).
                  </div>
                )}
              </td>
              <td className="center">
                <NumberInput
                  value={data.vacB ?? ''}
                  onChange={(e: any) =>
                    update('section1.vacB', toNumber(e.target.value))
                  }
                />
              </td>
              <td className="center">
                <NumberInput
                  value={data.vacC ?? ''}
                  onChange={(e: any) =>
                    update('section1.vacC', toNumber(e.target.value))
                  }
                />
              </td>
            </tr>
            <tr>
              <td className="muted-cell">
                <strong>Result (PASS / FAIL / N/A)</strong>
              </td>
              <td className="center">
                <PFN
                  value={data.resultA}
                  onChange={(v) => update('section1.resultA', v)}
                  name="s1a"
                />
              </td>
              <td className="center">
                <PFN
                  value={data.resultB}
                  onChange={(v) => update('section1.resultB', v)}
                  name="s1b"
                />
              </td>
              <td className="center">
                <PFN
                  value={data.resultC}
                  onChange={(v) => update('section1.resultC', v)}
                  name="s1c"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TripTable({
  section2,
  update,
}: {
  section2: Section2;
  update: (path: string, v: any) => void;
}) {
  return (
    <div className="card">
      <h2 className="h1" style={{ fontSize: 18 }}>
        2. Primary Current Injection Testing of Trip Devices
      </h2>

      <div className="row" style={{ margin: '8px 0' }}>
        <div>
          <Label>PR1</Label>
          <TextInput
            value={section2.PR1}
            onChange={(e: any) => update('section2.PR1', e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Notes</Label>
          <TextInput
            value={section2.notes}
            onChange={(e: any) => update('section2.notes', e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Function</th>
              <th style={{ width: 240 }}>Test Settings</th>
              <th style={{ width: 220 }}>Acceptance Criteria</th>
              <th className="center" style={{ width: 110 }}>
                A
              </th>
              <th className="center" style={{ width: 110 }}>
                B
              </th>
              <th className="center" style={{ width: 110 }}>
                C
              </th>
            </tr>
          </thead>
          <tbody>
            {tripRows.map(({ key, label }) => {
              const row = section2[key];
              return (
                <tr key={key}>
                  <td className="muted-cell">
                    <strong>{label}</strong>
                  </td>
                  <td>
                    <TextInput
                      value={row.settings}
                      onChange={(e: any) =>
                        update(`section2.${key}.settings`, e.target.value)
                      }
                      placeholder="e.g., I1 = 4.0 In, tol ±10%"
                    />
                  </td>
                  <td>
                    <TextInput
                      value={row.criteria}
                      onChange={(e: any) =>
                        update(`section2.${key}.criteria`, e.target.value)
                      }
                      placeholder="e.g., ≤ 5 sec @ I1"
                    />
                  </td>
                  <td className="center">
                    <TextInput
                      value={row.phaseA}
                      onChange={(e: any) =>
                        update(`section2.${key}.phaseA`, e.target.value)
                      }
                      placeholder="value / sec"
                    />
                  </td>
                  <td className="center">
                    <TextInput
                      value={row.phaseB}
                      onChange={(e: any) =>
                        update(`section2.${key}.phaseB`, e.target.value)
                      }
                      placeholder="value / sec"
                    />
                  </td>
                  <td className="center">
                    <TextInput
                      value={row.phaseC}
                      onChange={(e: any) =>
                        update(`section2.${key}.phaseC`, e.target.value)
                      }
                      placeholder="value / sec"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */

export default function App() {
  const empty = useMemo(() => defaultFormData(), []);
  const [data, setData] = useState<FormData>(empty);
  const [errors, setErrors] = useState<{ [k: string]: boolean }>({});
  const [vacAInvalid, setVacAInvalid] = useState<boolean>(false); // special validation flag

  const pdfRef = useRef<HTMLInputElement>(null);
  const serialRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);

  const update = (path: string, value: any) => {
    setData((d) => {
      const clone = structuredClone(d);
      setAtPath(clone, path, value);
      if (path === 'header.revision') clone.header.revDate = todayLocal();
      return clone;
    });
    if (
      path === 'header.deviceSerial' ||
      path === 'header.customerOrder' ||
      path === 'header.apparatusType'
    ) {
      setErrors((e) => ({ ...e, [path]: false }));
    }
  };

  const validateRequired = () => {
    const newErr: { [k: string]: boolean } = {};
    if (!data.header.apparatusType) newErr['header.apparatusType'] = true;
    if (!data.header.deviceSerial.trim()) newErr['header.deviceSerial'] = true;
    if (!data.header.customerOrder.trim())
      newErr['header.customerOrder'] = true;
    // VAC A is optional, but if it's present and invalid, block printing
    if (vacAInvalid) newErr['section1.vacA'] = true;

    setErrors(newErr);
    if (newErr['header.deviceSerial'] && serialRef.current)
      serialRef.current.focus();
    else if (newErr['header.customerOrder'] && orderRef.current)
      orderRef.current.focus();
    return Object.keys(newErr).length === 0;
  };

  // Save explicitly to PDF (same print dialog, but with a helpful tip)
  const onSavePdf = () => {
    if (!validateRequired()) {
      alert('Please complete required fields (*) before saving as PDF.');
      return;
    }
    alert(
      "Tip: In the print dialog, choose 'Save as PDF' and uncheck 'Headers and footers'.",
    );
    window.print();
  };

  const onPrint = () => {
    if (!validateRequired()) {
      alert('Please complete required fields (*) before printing.');
      return;
    }
    window.print();
  };

  const handlePdfImport = async (file?: File) => {
    const f = file || pdfRef.current?.files?.[0];
    if (!f) return;
    try {
      const arrayBuf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += (content.items as any[])
          .map((it: any) => ('str' in it ? it.str : (it as any).toString()))
          .join(' ');
        text += '\n';
      }
      let jsonStr =
        tryMarkerPayload(text) ||
        decodeZWFromText(text) ||
        tryLegacyDataBlock(text);
      if (!jsonStr) {
        alert(
          'No embedded data found. Make sure the PDF was saved from this app.',
        );
        return;
      }
      const loaded = JSON.parse(jsonStr);
      const merged = mergeWithDefault(loaded);
      merged.header.revDate = todayLocal();
      setData(merged);
      setVacAInvalid(false); // treat restored value as valid unless user changes it
      alert('Form data restored from PDF.');
    } catch (err) {
      console.error(err);
      alert('Could not read data from PDF.');
    } finally {
      if (pdfRef.current) pdfRef.current.value = '';
    }
  };

  const reset = () => {
    setData(empty);
    setErrors({});
    setVacAInvalid(false);
  };

  const invisiblePayload = useMemo(
    () => encodeZW(JSON.stringify(data)),
    [data],
  );
  const visibleMarkerPayload = useMemo(
    () => makeMarkerPayload(JSON.stringify(data)),
    [data],
  );

  const footer = {
    doc: DOC_NUMBER,
    rev: data.header.revision ?? '',
    date: data.header.revDate ?? '',
  };

  /* --------- Pages: regrouped to match your print layout --------- */

  // PAGE 1: Header + Section 1 (1, 1.1, 1.2)
  const page1 = (
    <>
      {/* Screen header / actions (hidden in print via .print-hide) */}
      <div className="header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              aria-label="ABB"
              style={{
                fontWeight: 900,
                fontSize: 26,
                color: '#e10600',
                letterSpacing: 1,
              }}
            >
              ABB
            </div>
            <div className="subtle">
              Low Voltage RIR Breaker – Production Testing
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div>
              <strong>Document No.:</strong> {DOC_NUMBER}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <strong>Revision:</strong>
              <SelectInput
                id="revision"
                value={data.header.revision}
                onChange={(e: any) => update('header.revision', e.target.value)}
                options={REV_LETTERS}
              />
            </div>
            <div>
              <strong>Rev Date:</strong> {data.header.revDate}
            </div>
          </div>
        </div>

        <h1 className="h1" style={{ marginTop: 10 }}>
          Emax Testing Report
        </h1>

        <div className="grid grid-4" style={{ marginTop: 10 }}>
          <div>
            <Label className="req">Apparatus Type</Label>
            <SelectInput
              id="apparatusType"
              value={data.header.apparatusType}
              onChange={(e: any) =>
                update('header.apparatusType', e.target.value)
              }
              options={['Emax2', 'EGG']}
              required
              hasError={!!errors['header.apparatusType']}
            />
          </div>
          <div>
            <Label className="req">Device Serial #</Label>
            <TextInput
              id="deviceSerial"
              value={data.header.deviceSerial}
              onChange={(e: any) =>
                update('header.deviceSerial', e.target.value)
              }
              required
              hasError={!!errors['header.deviceSerial']}
              inputRef={serialRef}
            />
          </div>
          <div>
            <Label className="req">Customer Order #</Label>
            <TextInput
              id="customerOrder"
              value={data.header.customerOrder}
              onChange={(e: any) =>
                update('header.customerOrder', e.target.value)
              }
              required
              hasError={!!errors['header.customerOrder']}
              inputRef={orderRef}
            />
          </div>
          <div>
            <Label>Customer PO</Label>
            <TextInput
              id="customerPO"
              value={data.header.customerPO}
              onChange={(e: any) => update('header.customerPO', e.target.value)}
            />
          </div>
        </div>

        <div
          className="print-hide"
          style={{ display: 'flex', gap: 8, marginTop: 12 }}
        >
          <button className="btn" onClick={onSavePdf}>
            Save as PDF
          </button>
          <button className="btn" onClick={onPrint}>
            Print
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            Resume from PDF
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) =>
                handlePdfImport(e.target.files?.[0] ?? undefined)
              }
            />
          </label>
          <button className="btn" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
      <Section1Table
        data={data.section1}
        update={update}
        vacAInvalid={vacAInvalid}
        setVacAInvalid={setVacAInvalid}
      />
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          1.1 AC Hi-Pot Testing of Secondary control wiring – 1500 VAC for 1
          minute
        </h2>
        <PFN
          value={data.section1_1}
          onChange={(v) => update('section1_1', v)}
          name="s11"
        />
      </div>
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          1.2 AC Hi-Pot Testing of charging motor – 1000 VAC for 1 minute
        </h2>
        <PFN
          value={data.section1_2}
          onChange={(v) => update('section1_2', v)}
          name="s12"
        />
      </div>
    </>
  );

  // PAGE 2: Section 2 + Section 3
  const page2 = (
    <>
      <TripTable section2={data.section2} update={update} />

      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          3. Fusible Breakers
        </h2>
        <div className="row">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>3.1 Verify 2k-1 point to point wiring</Label>
            <PFN
              value={data.section3.verify2k1}
              onChange={(v) => update('section3.verify2k1', v)}
              name="s31"
            />
          </div>
        </div>
      </div>
    </>
  );

  // PAGE 3: Section 4 + Section 5
  const page3 = (
    <>
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          4. Manually Operated (MO) Breakers
        </h2>
        <div className="row">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>4.1 5 Manual Operations</Label>
            <PFN
              value={data.section4.manualOps}
              onChange={(v) => update('section4.manualOps', v)}
              name="s41"
            />
          </div>
        </div>
        <div className="row">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>
              4.2 5 Electric Open Ops (If shunt trip installed) at Minimum
              Voltage
            </Label>
            <PFN
              value={data.section4.eOpenMin}
              onChange={(v) => update('section4.eOpenMin', v)}
              name="s42"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          5. Electrically Operated (EO) Breakers
        </h2>
        {(
          [
            ['5.1 2 Manual Ops', 'eo2Manual'],
            ['5.2 5 Charging Ops at Minimum Voltage', 'eo5ChargeMin'],
            ['5.3 5 Electric Close Ops at Minimum Voltage', 'eo5CloseMin'],
            ['5.4 5 Electric Open Ops at Minimum Voltage', 'eo5OpenMin'],
            ['5.5 5 Charging Ops at Maximum Voltage', 'eo5ChargeMax'],
            ['5.6 5 Electric Close Ops at Maximum Voltage', 'eo5CloseMax'],
            ['5.7 5 Electric Open Ops at Maximum Voltage', 'eo5OpenMax'],
            ['5.8 2 Anti-Pump Ops at Normal Op Voltage', 'eo2AntiPump'],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{ gridColumn: 'span 2' }}>
              <Label>{label}</Label>
              <PFN
                value={(data.section5 as any)[key]}
                onChange={(v) => update(`section5.${key}`, v)}
                name={`s${key}`}
              />
            </div>
          </div>
        ))}

        {/* 5.9 */}
        <div className="row">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>5.9 2nd Close Coil Operation at Minimum Voltage</Label>
            <PFN
              value={data.section5.eo2ndCloseMin}
              onChange={(v) => update('section5.eo2ndCloseMin', v)}
              name="s59"
            />
          </div>
        </div>

        {/* 5.10 */}
        <div className="row">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>5.10 2nd Close Coil Operation at Maximum Voltage</Label>
            <PFN
              value={data.section5.eo2ndCloseMax}
              onChange={(v) => update('section5.eo2ndCloseMax', v)}
              name="s510"
            />
          </div>
        </div>

        {/* 5.11 Fan Operation */}
        <div
          className="row"
          style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <h3 className="h1" style={{ fontSize: 16, margin: '4px 0 8px' }}>
              5.11 Fan Operation
            </h3>
          </div>

          {/* 5.11 (a) apply program yes/no/n/a */}
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Apply program</Label>
            <YesNoNAGroup
              value={data.section5.fanApplyProgram}
              onChange={(v) => update('section5.fanApplyProgram', v)}
              name="s511_apply"
            />
          </div>

          {/* 5.11 (b) fan AC / DC */}
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Fan power type</Label>
            <div className="subtle" style={{ marginBottom: 4 }}>
              See if fans are AC or DC
            </div>
            <FanTypeGroup
              value={data.section5.fanType}
              onChange={(v) => update('section5.fanType', v)}
              name="s511_type"
            />
          </div>

          {/* 5.11 (c) run test for 60s pass/fail/n/a */}
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Run test for 60s</Label>
            <PFN
              value={data.section5.fanRun60s}
              onChange={(v) => update('section5.fanRun60s', v)}
              name="s511_run"
            />
          </div>
        </div>
      </div>
    </>
  );

  // PAGE 4: Section 6 + Section 7 + Section 8 (8 moved up under 7)
  const page4 = (
    <>
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          6. Undervoltage Device (If equipped)
        </h2>
        {(
          [
            ['6.1 Max Pickup Voltage', 'maxPickup'],
            ['6.2 Max Drop-out Voltage', 'maxDropout'],
            ['6.3 Time Delay', 'timeDelay'],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{ gridColumn: 'span 2' }}>
              <Label>{label}</Label>
              <PFN
                value={(data.section6 as any)[key]}
                onChange={(v) => update(`section6.${key}`, v)}
                name={`s6${key}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          7. Contact Resistance Test
        </h2>
        <div style={{ overflowX: 'auto' }}>
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
                  <td>
                    <TextInput
                      value={row.label}
                      onChange={(e: any) =>
                        update(`section7.rows.${idx}.label`, e.target.value)
                      }
                      placeholder="Measurement point / notes"
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={row.a ?? ''}
                      onChange={(e: any) =>
                        update(
                          `section7.rows.${idx}.a`,
                          toNumber(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={row.b ?? ''}
                      onChange={(e: any) =>
                        update(
                          `section7.rows.${idx}.b`,
                          toNumber(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <NumberInput
                      value={row.c ?? ''}
                      onChange={(e: any) =>
                        update(
                          `section7.rows.${idx}.c`,
                          toNumber(e.target.value),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            className="btn print-hide"
            onClick={() =>
              update('section7.rows', [
                ...data.section7.rows,
                { label: '', a: null, b: null, c: null },
              ])
            }
          >
            Add Row
          </button>
          <button
            className="btn print-hide"
            onClick={() =>
              update('section7.rows', data.section7.rows.slice(0, -1))
            }
            disabled={data.section7.rows.length === 0}
          >
            Remove Row
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          <div>
            <strong>Acceptance Criteria (±10% Phase-to-Phase):</strong>
          </div>
          <ul style={{ marginTop: 4 }}>
            <li>≤ 50 µΩ @ 800A</li>
            <li>≤ 40 µΩ @ 1200A</li>
            <li>≤ 30 µΩ @ 1600/2000A</li>
            <li>≤ 20 µΩ @ 3200A/4000A</li>
          </ul>
        </div>
      </div>

      {/* 8 moved here, directly below 7 */}
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          8. Racking Operations – Position Stop Verification
        </h2>
        {(
          [
            [
              '8.1 Prevent closed breaker racking (Disconnect → Test)',
              'disconnectToTest',
            ],
            [
              '8.2 Prevent closed breaker racking (Test → Connect)',
              'testToConnect',
            ],
            [
              '8.3 Prevent closed breaker racking (Connect → Test)',
              'connectToTest',
            ],
            [
              '8.4 Prevent closed breaker racking (Test → Disconnect)',
              'testToDisconnect',
            ],
            [
              '8.5 Prevent closed breaker cell removal (in cell)',
              'preventRemoval',
            ],
          ] as const
        ).map(([label, key]) => (
          <div key={key} className="row">
            <div style={{ gridColumn: 'span 2' }}>
              <Label>{label}</Label>
              <PFN
                value={(data.section8 as any)[key]}
                onChange={(v) => update(`section8.${key}`, v)}
                name={`s8${key}`}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // PAGE 5: Sections 9 + 10 + 11 + Comments + Signoff (moved under 11)
  const page5 = (
    <>
      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          9. Visual inspection of rating interference/interlock
        </h2>
        <PFN
          value={data.section9.visual}
          onChange={(v) => update('section9.visual', v)}
          name="s9"
        />
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          10. Verify secondary wiring by continuity per breaker-specific wiring
          diagram
        </h2>
        <div className="row">
          <div>
            <Label>Wiring Diagram #</Label>
            <TextInput
              value={data.section10.diagram}
              onChange={(e: any) => update('section10.diagram', e.target.value)}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Result</Label>
            <PFN
              value={data.section10.result}
              onChange={(v) => update('section10.result', v)}
              name="s10"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: 18 }}>
          11. Outgoing Operations Counter Reading
        </h2>
        <div className="row">
          <div>
            <Label>Counter Reading</Label>
            <NumberInput
              value={data.section11.counter ?? ''}
              onChange={(e: any) =>
                update('section11.counter', toNumber(e.target.value))
              }
            />
          </div>
        </div>
      </div>

      {/* --- Comments and Signoff directly below 11 --- */}
      <div className="card" style={{ marginBottom: 40 }}>
        <h2 className="h1" style={{ fontSize: 18 }}>
          Additional Testing / Comments
        </h2>
        <TextArea
          value={data.comments}
          onChange={(e: any) => update('comments', e.target.value)}
          rows={6}
          placeholder="Add any additional testing notes, observations, or comments here."
        />
      </div>

      <div className="card" style={{ marginBottom: 40 }}>
        <h2 className="h1" style={{ fontSize: 18 }}>
          Inspector / Tester Signoff
        </h2>
        <div className="grid grid-4">
          <div style={{ gridColumn: 'span 2' }}>
            <Label>Inspector / Tester</Label>
            <TextInput
              value={data.signoff.inspector}
              onChange={(e: any) => update('signoff.inspector', e.target.value)}
            />
          </div>
          <div>
            <Label>Date</Label>
            <TextInput
              value={data.signoff.date}
              onChange={(e: any) => update('signoff.date', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <Label>Signature (type name)</Label>
            <TextInput
              className="signature-input" // cursive signature styling
              value={data.signoff.signature}
              onChange={(e: any) => update('signoff.signature', e.target.value)}
              placeholder="Sign here"
            />
          </div>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Procedure Number and Revision: {DOC_NUMBER}, REV{' '}
          {data.header.revision} ({data.header.revDate})
        </p>
      </div>
    </>
  );

  const pages = [page1, page2, page3, page4, page5];

  return (
    <div className="container">
      {/* Printable pages */}
      {pages.map((content, i) => (
        <PrintPage key={i} footer={footer} page={i + 1} total={pages.length}>
          {content}
        </PrintPage>
      ))}

      {/* Embedded payloads for PDF restore */}
      <div className="print-only">
        <span>{invisiblePayload}</span>
        <div id="rir-print-embed">{visibleMarkerPayload}</div>
      </div>
    </div>
  );
}
