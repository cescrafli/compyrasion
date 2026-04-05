/**
 * test-budget.ts
 * 
 * Unit test: Verifikasi ekstraksi budget dari query natural language.
 * Run: npx tsx app/api/compare/lib/test-budget.ts
 */
import { trainAndPredictIntent } from './ml-engine';

interface TestCase {
  input: string;
  expectedBudget: number | null;
  label: string;
}

const testCases: TestCase[] = [
  { input: "hp budget 15000000", expectedBudget: 15000000, label: "Raw number without unit" },
  { input: "laptop budget 2 juta", expectedBudget: 2000000, label: "2 juta" },
  { input: "sepatu budget 2,5 jt", expectedBudget: 2500000, label: "2,5 jt (decimal comma)" },
  { input: "tas budget 500", expectedBudget: 500000, label: "500 (assume ribu)" },
  { input: "monitor max 3 juta", expectedBudget: 3000000, label: "max 3 juta" },
  { input: "keyboard budget 200 ribu", expectedBudget: 200000, label: "200 ribu" },
  { input: "hp di bawah 5000000", expectedBudget: 5000000, label: "di bawah 5000000" },
  { input: "sepatu lari nike", expectedBudget: null, label: "No budget specified" },
];

async function runTests() {
  console.log("🧪 Running Budget Extraction Unit Tests...\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = await trainAndPredictIntent(tc.input);
    const ok = result.budget === tc.expectedBudget;

    if (ok) {
      passed++;
      console.log(`  ✅ PASS: "${tc.input}" → ${result.budget} (${tc.label})`);
    } else {
      failed++;
      console.log(`  ❌ FAIL: "${tc.input}" → got ${result.budget}, expected ${tc.expectedBudget} (${tc.label})`);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${testCases.length} total`);
  console.log(`${"=".repeat(50)}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 All tests passed!");
  }
}

runTests();
