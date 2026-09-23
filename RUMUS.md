# RUMUS — Kumpulan Formula Perhitungan

Referensi seluruh rumus deterministik yang dipakai Financial Planner. Semua
perhitungan berada di modul murni (`lib/*`) tanpa I/O/UI/DB; pembulatan tampilan
dilakukan di komponen UI.

**Notasi:** `r` = estimasi return tahunan (desimal, mis. `0,065`) · `i = r / 12`
(bulanan) · `n` / `horizonMonths` = jumlah bulan · `PV` = tabungan saat ini ·
`FV` = target dana.

> Modul pada **§3 (Planner legacy)** berstatus dipensiunkan (superseded oleh
> model goal-driven) tetapi masih ada di repo dan tetap terdokumentasi.

## Daftar Isi
1. [Investasi](#1-investasi)
2. [Planner goal-driven (aktif)](#2-planner-goal-driven-aktif)
3. [Planner legacy (dipensiunkan)](#3-planner-legacy-dipensiunkan)
4. [Dana Darurat](#4-dana-darurat)
5. [Format Rupiah](#5-format-rupiah)
6. [Validasi API](#6-validasi-api)
7. [Kebijakan pembulatan](#7-kebijakan-pembulatan)

---

## 1. Investasi

### 1.1 Allocation — `lib/investment/allocation.ts`
**Bucket horizon** (`bucketHorizon`, `allocation.ts:98`), horizon dalam bulan:

| Kondisi | Bucket |
|---|---|
| `h < 24` | `"<2"` |
| `24 ≤ h ≤ 60` | `"2-5"` |
| `h > 60` | `">5"` |

`h ≤ 0` / non-finite → `throw`.

**Matriks** (`ALLOCATION_MATRIX`, `allocation.ts:27`; `getAllocation`,
`allocation.ts:135`); bucket `"<2"` mengabaikan profil risiko:

| Bucket | Profil Risiko | Komposisi | `r` |
|---|---|---|---|
| <2 | semua | 100% RDPU | 4,75% |
| 2–5 | Konservatif | 70% RDPU + 30% SBN/Deposito | 5,5% |
| 2–5 | Moderat | 50% RDPU + 50% Emas/SBN Ritel | 6,5% |
| 2–5 | Agresif | 30% RDPU + 40% SBN/RDPT + 30% Emas | 7,5% |
| >5 | Konservatif | 50% SBN/RDPT + 30% Emas + 20% Saham | 7,0% |
| >5 | Moderat | 40% Saham/Indeks + 40% SBN + 20% Emas | 9,5% |
| >5 | Agresif | 70% Saham/Indeks + 20% SBN + 10% Emas | 11,0% |

Invarian: `Σ persentase = 100`.

### 1.2 Projection (Future Value of Annuity) — `lib/investment/projection.ts`
`calculateMonthlyContribution` (`projection.ts:20`):

```
i = r / 12 ; n = horizonMonths

i = 0     → PMT = (FV − PV) / n                  (fallback linear)
i > 0     → PMT = (FV − PV·(1+i)^n) · i / ((1+i)^n − 1)

hasil     = max(0, PMT)
```

Guard: `FV ≥ 0`, `PV ≥ 0`, `r ≥ 0`, `n > 0`.

### 1.3 Risk Scoring — `lib/investment/riskScoring.ts`
`scoreRisk` (`riskScoring.ts:45`), `classify` (`riskScoring.ts:68`):

```
score = Σ answers          (tiap jawaban bobot 1..3; 5 soal → rentang 5..15)

score ≤ 8          → "Konservatif"
9 ≤ score ≤ 12     → "Moderat"
score ≥ 13         → "Agresif"
```

Konstanta: `CONSERVATIVE_MAX = 8` (`riskScoring.ts:32`),
`MODERATE_MAX = 12` (`riskScoring.ts:35`).

### 1.4 Orkestrasi — `app/api/recommendation/route.ts:94`
```
scoreRisk(answers)                          → { score, profile }
getAllocation(horizonMonths, profile)       → { composition, annualReturn }
calculateMonthlyContribution({
  futureValue: targetAmount,
  presentValue: currentSavings,
  annualReturn, horizonMonths,
})
```

---

## 2. Planner goal-driven (aktif)

### 2.1 Budget — `lib/planner/goalBudget.ts`
`computeGoalBudget` (`goalBudget.ts:39`):

```
monthsN       = horizonMonths
ditabung      = max(0, targetAmount − currentSavings) / monthsN
alreadyReached = currentSavings ≥ targetAmount
kebutuhan     = monthlyExpense > 0 ? monthlyExpense
                                    : round(0.65 · (monthlyIncome − ditabung))
keinginan     = monthlyIncome − ditabung − kebutuhan
ditabungPct   = ditabung   / monthlyIncome · 100
kebutuhanPct  = kebutuhan  / monthlyIncome · 100
keinginanPct  = keinginan  / monthlyIncome · 100
```

Feasibility:

```
impossible  iff ditabung > monthlyIncome
else        feasible   = (ditabung + kebutuhan ≤ monthlyIncome)
            severity   = "ok" iff feasible AND keinginan ≥ 0.05 · monthlyIncome
                         selain itu "tight"
```

### 2.2 Trade-off — `lib/planner/tradeoffs.ts`
`computeTradeOffs` (`tradeoffs.ts:12`):

```
Guard: monthlyIncome > 0, targetAmount > 0, horizonMonths integer > 0
netNeeded  = max(0, targetAmount − currentSavings)      (≤ 0 → [])
kebutuhanEf = kebutuhan>0 ? kebutuhan
                          : (monthlyExpense>0 ? monthlyExpense : 0.65·monthlyIncome)
buffer     = 0.05 · monthlyIncome
maxSafe    = max(0, monthlyIncome − kebutuhanEf − buffer)
```

- **EXTEND_HORIZON** (jika `maxSafe > 0`):
  `H' = ceil(netNeeded / maxSafe)`; muncul bila `H' > horizonMonths`.
  Setoran baru `= round(netNeeded / H')`.
- **REDUCE_TARGET** (jika `maxSafe > 0`):
  `raw = floor(maxSafe · horizonMonths) + currentSavings`;
  `T' = max(1.000.000, floor(raw / 500.000) · 500.000)`;
  muncul bila `T' < targetAmount` dan `T' > currentSavings`.
- **REDUCE_WANTS** (jika `kebutuhanEf > 0.5 · monthlyIncome`):
  `ditabungNow = netNeeded / horizonMonths`;
  `cap = max(0.35 · monthlyIncome, floor((monthlyIncome − ditabungNow − buffer) / 100.000) · 100.000)`;
  muncul bila `cap < kebutuhanEf` dan `cap > 0`; hemat/bln `= round(kebutuhanEf − cap)`.

---

## 3. Planner legacy (dipensiunkan)

### 3.1 Presets — `lib/planner/presets.ts`
`BUDGET_PRESETS` (`presets.ts:25`), `getPreset` (`presets.ts:65`),
`buildCustomPreset` (`presets.ts:93`).

Preset tetap: `50/30/20` (Kebutuhan 50, Keinginan 30, Tabungan 20), `70/20/10`
(Kebutuhan 70, Tabungan 20, Keinginan 10), `80/20` (Pengeluaran 80, Tabungan 20).

```
buildCustomPreset guard:
  tiap pct finite ≥ 0
  |Σpct − 100| < 1e-9
```

### 3.2 Budget — `lib/planner/budget.ts`
`computeBudgetFromPreset` (`budget.ts:33`), `savingsBucketAmount` (`budget.ts:89`),
`evaluateShortfall` (`budget.ts:105`):

```
amount              = baseAmount · pct / 100        (per kategori, tanpa pembulatan)
savingsBucketAmount = Σ amount (isSavings === true)
hasShortfall        = savingsBucketAmount < investmentContribution
gap                 = max(0, investmentContribution − savingsBucketAmount)
```

### 3.3 Savings Projection — `lib/planner/savingsProjection.ts`
`monthsToReachTarget` (`savingsProjection.ts:45`) — Arah A (Time to Goal):

```
PV ≥ targetAmount  → { reachable: true, months: 0, alreadyReached: true }

i = 0:
  monthlySaving ≤ 0 → { reachable: false, months: null }
  else              → months = ceil(max(0, targetAmount − PV) / monthlySaving)

i > 0:
  monthlySaving ≤ 0 → { reachable: false, months: null }
  else              → n = ln((targetAmount·i + monthlySaving) / (PV·i + monthlySaving))
                            / ln(1 + i)
                      months = ceil(n)
```

`requiredMonthlySaving` (`savingsProjection.ts:136`) — Arah B (Required Monthly):

```
PV ≥ targetAmount  → 0

i = 0 → PMT = (targetAmount − PV) / n
i > 0 → PMT = (targetAmount − PV·(1+i)^n) · i / ((1+i)^n − 1)

hasil = max(0, PMT)
```

---

## 4. Dana Darurat — `lib/financial/emergencyFund.ts`
`evaluateEmergencyFund` (`emergencyFund.ts:33`), `TARGET_MONTHS = 6`
(`emergencyFund.ts:14`):

```
jika expense ≤ 0 / non-finite → tier "ADEQUATE" netral,
                                 coverageMonths 0, targetAmount 0, shortfallAmount 0

savings      = (currentSavings valid & > 0) ? currentSavings : 0
coverage     = savings / expense
targetAmount = expense · 6
shortfall    = max(0, targetAmount − savings)

coverage < 3          → VULNERABLE
3 ≤ coverage ≤ 6      → ADEQUATE
coverage > 6          → STRONG
```

Pembulatan: `coverageMonths` 1 desimal; `targetAmount` & `shortfallAmount` bulat.

---

## 5. Format Rupiah — `lib/format/rupiahInput.ts`
`formatThousands` (`rupiahInput.ts:16`), `parseThousands` (`rupiahInput.ts:32`):

```
formatThousands: buang non-digit → hapus leading zero (sisakan "0") →
                 sisipkan "." tiap 3 digit dari kanan
                 regex: \B(?=(\d{3})+(?!\d))
parseThousands : buang non-digit → Number ; kosong/invalid → null
```

Tampilan Rupiah di UI: `` Rp ${Math.round(v).toLocaleString("id-ID")} ``.

---

## 6. Validasi API

| Endpoint | Aturan |
|---|---|
| `POST /api/profile` (`app/api/profile/route.ts:33`) | `income`, `expense`, `currentSavings` finite & **≥ 0** |
| `POST /api/goal` (`app/api/goal/route.ts`) | `targetAmount > 0`; `horizonMonths` integer `> 0`; `name` opsional (trim, kosong → null) |
| `POST /api/budget` (`app/api/budget/route.ts:115`) | `monthlyIncome > 0`; `monthlyExpense` opsional `≥ 0`; `targetAmount > 0`; `horizonMonths` integer `> 0` |
| `POST /api/recommendation` (`app/api/recommendation/route.ts:47`) | `targetAmount > 0`; `horizonMonths` integer `> 0`; `currentSavings ≥ 0`; `riskAnswers` array angka non-kosong |

---

## 7. Kebijakan pembulatan

- Fungsi murni **tidak membulatkan** hasil, kecuali yang eksplisit:
  `kebutuhan` fallback (`round`), `coverageMonths` (1 desimal),
  `targetAmount`/`shortfallAmount` dana darurat (bulat).
- Pembulatan Rupiah hanya di **lapisan tampilan UI**.
