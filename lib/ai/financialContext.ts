import { prisma } from "@/lib/db";
import { getLatestProfile } from "@/lib/profileGate";
import { listGoals } from "@/lib/goal";
import { aggregateGoals } from "@/lib/investment/multiGoal";
import { getCurrentUserId } from "@/lib/auth/session";
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
    const userId = await getCurrentUserId();
    if (!userId) {
      return "\n\n[STATUS DATA PENGGUNA]: Pengguna belum login. Berikan panduan umum tanpa mengasumsikan data keuangan tertentu.";
    }

    const profile = await getLatestProfile(userId);
    const allGoals = await listGoals(userId);
    const activeGoal = allGoals[0] ?? null;

    const [latestRisk, latestRec, latestBudget] = await Promise.all([
      prisma.riskAssessment.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.investmentRecommendation.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.budgetPlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    ]);

    if (!profile && !activeGoal && !latestRisk && !latestBudget) {
      return "\n\n[STATUS DATA PENGGUNA]: Pengguna belum mengisi profil keuangan atau tujuan aktif. Berikan panduan awal dan ajak pengguna memulai.";
    }

    const lines: string[] = ["\n\n--- KONTEKS DATA FINANSIAL PENGGUNA (FINANCIAL TWIN) ---"];
    lines.push("Berikut adalah data kondisi keuangan riil pengguna saat ini di Tabungin. Gunakan data ini secara langsung tanpa perlu bertanya ulang:");

    if (profile) {
      const emergency = evaluateEmergencyFund(profile.currentSavings, profile.expense);
      lines.push(`• **Profil Finansial**:`);
      lines.push(`  - Pemasukan Bulanan: ${fmt(profile.income)}`);
      lines.push(`  - Pengeluaran Bulanan: ${fmt(profile.expense)}`);
      lines.push(`  - Tabungan Saat Ini: ${fmt(profile.currentSavings)}`);
      lines.push(`  - Rasio Kesiapan Dana Darurat: ${emergency.coverageMonths} bulan pengeluaran (${emergency.tier})`);
      if (emergency.targetAmount > 0) {
        lines.push(
          `    Target ideal ${emergency.targetMonths} bulan = ${fmt(emergency.targetAmount)}${emergency.shortfallAmount > 0 ? ` (kekurangan ${fmt(emergency.shortfallAmount)})` : " (sudah terpenuhi)"}`,
        );
      }
    } else {
      lines.push(`• **Profil Finansial**: Belum diisi.`);
    }

    if (allGoals.length > 0) {
      if (allGoals.length === 1) {
        const g = allGoals[0];
        lines.push(`• **Tujuan Keuangan**:`);
        lines.push(`  - Nama Tujuan: ${g.name || "Target Utama"}`);
        lines.push(`  - Target Dana: ${fmt(g.targetAmount)}`);
        lines.push(`  - Jangka Waktu: ${g.horizonMonths} bulan (~${(g.horizonMonths / 12).toFixed(1)} tahun)`);
      } else {
        // Multi-tujuan: rangkum semua tujuan + agregat gabungan (opsi A).
        lines.push(`• **Tujuan Keuangan (${allGoals.length} tujuan)**:`);
        for (const g of allGoals) {
          lines.push(
            `  - ${g.name || "Tanpa nama"}: target ${fmt(g.targetAmount)}, jangka waktu ${g.horizonMonths} bulan (~${(g.horizonMonths / 12).toFixed(1)} tahun)`,
          );
        }
        try {
          const agg = aggregateGoals(
            allGoals.map((g) => ({ targetAmount: g.targetAmount, horizonMonths: g.horizonMonths })),
          );
          lines.push(
            `  - Gabungan (bila semua tujuan dijalankan bersama): total target ${fmt(agg.totalTargetAmount)}, jangka waktu rata-rata tertimbang ${agg.weightedHorizonMonths} bulan.`,
          );
        } catch {
          /* abaikan bila agregasi gagal — konteks tetap berisi daftar per tujuan */
        }
      }
    } else {
      lines.push(`• **Tujuan Keuangan**: Belum ditetapkan.`);
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
