import { prisma } from "@/lib/db";
import { getLatestProfile } from "@/lib/profileGate";
import { getActiveGoal } from "@/lib/goal";
import { evaluateEmergencyFund } from "@/lib/financial/emergencyFund";

/** Format angka Rupiah ke format Indonesia yang rapi */
function fmt(val: number): string {
  return `Rp ${Math.round(val).toLocaleString("id-ID")}`;
}

/**
 * Membangun konteks finansial pengguna terkini (Financial Twin)
 * untuk diinjeksikan langsung ke systemInstruction Gemini.
 *
 * Mengumpulkan data Profil Finansial, Tujuan Aktif, Profil Risiko,
 * Rekomendasi Investasi, dan Rencana Anggaran (Budget Planner).
 */
export async function getFinancialTwinContext(): Promise<string> {
  try {
    const profile = await getLatestProfile();
    const activeGoal = await getActiveGoal();

    const [latestRisk, latestRec, latestBudget] = await Promise.all([
      prisma.riskAssessment.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.investmentRecommendation.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.budgetPlan.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    if (!profile && !activeGoal && !latestRisk && !latestBudget) {
      return "\n\n[STATUS DATA PENGGUNA]: Pengguna belum mengisi profil keuangan atau tujuan aktif. Berikan panduan awal dan ajak pengguna memulai.";
    }

    const lines: string[] = ["\n\n--- KONTEKS DATA FINANSIAL PENGGUNA (FINANCIAL TWIN) ---"];
    lines.push("Berikut adalah data kondisi keuangan riil pengguna saat ini di TabungOne. Gunakan data ini secara langsung tanpa perlu bertanya ulang:");

    if (profile) {
      const emergency = evaluateEmergencyFund(profile.currentSavings, profile.expense);
      lines.push(`• **Profil Finansial**:`);
      lines.push(`  - Pemasukan Bulanan: ${fmt(profile.income)}`);
      lines.push(`  - Pengeluaran Bulanan: ${fmt(profile.expense)}`);
      lines.push(`  - Tabungan Saat Ini: ${fmt(profile.currentSavings)}`);
      lines.push(`  - Rasio Kesiapan Dana Darurat: ${emergency.coverageMonths} bulan pengeluaran (${emergency.tier})`);
    } else {
      lines.push(`• **Profil Finansial**: Belum diisi.`);
    }

    if (activeGoal) {
      lines.push(`• **Tujuan Aktif (Active Goal)**:`);
      lines.push(`  - Nama Tujuan: ${activeGoal.name || "Target Utama"}`);
      lines.push(`  - Target Dana: ${fmt(activeGoal.targetAmount)}`);
      lines.push(`  - Jangka Waktu: ${activeGoal.horizonMonths} bulan (~${(activeGoal.horizonMonths / 12).toFixed(1)} tahun)`);
    } else {
      lines.push(`• **Tujuan Aktif**: Belum ditetapkan.`);
    }

    if (latestRisk) {
      lines.push(`• **Profil Risiko Investasi**: ${latestRisk.profile} (Skor survei: ${latestRisk.score})`);
    }

    if (latestRec) {
      lines.push(`• **Rekomendasi Investasi Terkini**:`);
      lines.push(`  - Estimasi Return Tahunan: ${latestRec.annualReturn.toFixed(1)}%`);
      lines.push(`  - Setoran Bulanan Rekomendasi (FV Annuity): ${fmt(latestRec.monthlyContribution)}/bln`);
    }

    if (latestBudget) {
      lines.push(`• **Rencana Anggaran (Budget Planner)**:`);
      lines.push(`  - Target Tabungan: ${latestBudget.savingsTargetAmount ? fmt(latestBudget.savingsTargetAmount) : "-"}`);
      lines.push(`  - Jangka Waktu Anggaran: ${latestBudget.savingsHorizonMonths ?? "-"} bulan`);
    }

    lines.push("----------------------------------------------------------\n");
    lines.push("INSTRUKSI KHUSUS UNTUK DATA INI:");
    lines.push("- Jangan minta pengguna mengulang angka yang sudah ada di atas.");
    lines.push("- Jika pengguna bertanya hal terkait anggaran, evaluasi, atau saran, jadikan data di atas sebagai referensi utama jawabanmu.");
    lines.push("- Tetap pertahankan nada ramah, suportif, dan objektif.");

    return lines.join("\n");
  } catch (err) {
    console.error("[financialContext] Gagal menyusun konteks finansial:", err);
    return "";
  }
}
