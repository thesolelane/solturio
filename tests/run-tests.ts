import { runTests as runAccountFlowTests } from "../server/account-flow.test.ts";
import { runTests as runAdminMiddlewareTests } from "../server/admin-middleware.test.ts";
import { runTests as runUploadHelperTests } from "../server/upload-helpers.test.ts";
import { runTests as runPricingTests } from "../shared/pricing.test.ts";

const suites = [
  { name: "account-flow", run: runAccountFlowTests },
  { name: "admin-middleware", run: runAdminMiddlewareTests },
  { name: "upload-helpers", run: runUploadHelperTests },
  { name: "pricing", run: runPricingTests },
];

let failures = 0;

for (const suite of suites) {
  try {
    await suite.run();
    console.log(`PASS ${suite.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${suite.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`All ${suites.length} test suites passed.`);
}
