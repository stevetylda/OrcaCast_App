import { runExplainabilityUnitTests } from "../src/features/explainability/utils.test.ts";
import { runDeltaMapUnitTests } from "../src/map/deltaMap.test.ts";

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [
  { name: "deltaMap", run: runDeltaMapUnitTests },
  { name: "explainability utils", run: runExplainabilityUnitTests },
];

let failures = 0;

for (const testCase of tests) {
  try {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
}

if (failures > 0) {
  process.exitCode = 1;
  console.error(`${failures} test suite(s) failed.`);
} else {
  console.log(`${tests.length} test suite(s) passed.`);
}
