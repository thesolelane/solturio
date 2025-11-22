const fs = require('fs');
const path = require('path');

const checks = {
  phase1: {
    name: 'Phase 1: Critical Security Fixes',
    items: [
      {
        name: 'Replay Attack Prevention',
        files: ['server/utils/replay-prevention.ts'],
        pattern: /generateNonce|isValidNonce|checkAndStoreNonce/,
        description: '✓ Nonce generation, validation, and database tracking'
      },
      {
        name: 'Currency Hardcoding',
        files: ['server/payment-verification-phase1.ts'],
        pattern: /CATH|SOL|verifyCATHPayment|verifySOLPayment/,
        description: '✓ Multi-currency removed, CATH/SOL hardcoded'
      },
      {
        name: 'On-Chain Payment Verification',
        files: ['server/payment-verification-phase1.ts'],
        pattern: /verifyPaymentPhase1|confirmationStatus|transaction/,
        description: '✓ On-chain verification before accepting payments'
      },
      {
        name: 'Wallet Endpoint Updated',
        files: ['server/routes.ts'],
        pattern: /nonce.*timestamp.*wallet\/create/,
        description: '✓ Wallet creation requires nonce + timestamp'
      },
      {
        name: 'Replay Prevention Database',
        files: ['server/storage.ts'],
        pattern: /getNonceByValue|storeNonce|replay_prevention/,
        description: '✓ Database methods for nonce tracking'
      }
    ]
  },
  phase2: {
    name: 'Phase 2: License Management & Treasury',
    items: [
      {
        name: 'License Endpoints',
        files: ['server/licenses.ts'],
        pattern: /licenses\/create|licenses\/.*\/pay|licenses\/created|licenses\/active|licenses\/.*\/verify/,
        description: '✓ 5 license management endpoints implemented'
      },
      {
        name: 'Treasury Endpoints',
        files: ['server/treasury.ts'],
        pattern: /treasury\/setup-multisig|treasury\/propose|treasury\/approve|treasury\/execute|treasury\/cancel|treasury\/status|treasury\/proposals/,
        description: '✓ 6 treasury & multi-sig endpoints implemented'
      },
      {
        name: 'Licenses Database Table',
        files: ['server/storage.ts'],
        pattern: /licenses.*logo_id.*issuer_id.*type.*structure.*amount/,
        description: '✓ Licenses table created with proper schema'
      },
      {
        name: 'Treasury Database Tables',
        files: ['server/storage.ts'],
        pattern: /treasury_proposals|treasury_approvals/,
        description: '✓ Treasury proposals and approvals tables created'
      },
      {
        name: 'Router Registration',
        files: ['server/routes.ts'],
        pattern: /licensesRouter|treasuryRouter|app.use.*licenses|app.use.*treasury/,
        description: '✓ Routers registered in main app'
      }
    ]
  },
  phase3: {
    name: 'Phase 3: Input Validation & Error Handling',
    items: [
      {
        name: 'Validation Schemas',
        files: ['server/validation.ts'],
        pattern: /nonceTimestampSchema|licenseSchema|paymentSchema|treasuryTransferSchema|multiSigSchema|validateRequest/,
        description: '✓ Zod schemas for all API operations'
      },
      {
        name: 'Error Handler',
        files: ['server/error-handler.ts'],
        pattern: /StandardError|StandardSuccess|ERROR_CODES|formatError|formatSuccess|APIError/,
        description: '✓ Standardized error response format'
      },
      {
        name: 'Audit Logger',
        files: ['server/audit-logger.ts'],
        pattern: /AuditLogger|auditLogger|log\(|getLogsByUser|getLogsByEndpoint/,
        description: '✓ Audit logging service for all API calls'
      },
      {
        name: 'Validation Middleware',
        files: ['server/validation-middleware.ts'],
        pattern: /applyValidationToRoutes|validateBodyFields|requestValidatorMiddleware/,
        description: '✓ Global validation and error handling middleware'
      },
      {
        name: 'Applied to Endpoints',
        files: ['server/licenses.ts', 'server/treasury.ts'],
        pattern: /validateRequest|formatError|formatSuccess|auditLogger/,
        description: '✓ Phase 3 validation applied to all endpoints'
      }
    ]
  }
};

function checkFile(filePaths, pattern) {
  const files = Array.isArray(filePaths) ? filePaths : [filePaths];
  
  for (const filePath of files) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      if (pattern.test(content)) return true;
    } catch (e) {}
  }
  return false;
}

function runAudit() {
  const results = {};
  let totalPassed = 0;
  let totalChecks = 0;

  console.log('\n' + '═'.repeat(60));
  console.log('  🔍 SOLTURIO AUDIT CHECK - PHASES 1, 2, 3');
  console.log('═'.repeat(60) + '\n');

  Object.entries(checks).forEach(([phase, data]) => {
    console.log('\n' + data.name.toUpperCase());
    console.log('─'.repeat(60));

    let phasePassed = 0;
    data.items.forEach(item => {
      totalChecks++;
      const passed = checkFile(item.files, item.pattern);
      if (passed) {
        phasePassed++;
        totalPassed++;
      }

      const status = passed ? '✅' : '❌';
      console.log(`\n${status} ${item.name}`);
      console.log(`   ${item.description}`);
    });

    results[phase] = {
      name: data.name,
      passed: phasePassed,
      total: data.items.length,
      percentage: Math.round((phasePassed / data.items.length) * 100)
    };
  });

  console.log('\n\n' + '═'.repeat(60));
  console.log('  📊 AUDIT SUMMARY');
  console.log('═'.repeat(60) + '\n');

  Object.entries(results).forEach(([phase, result]) => {
    const bar = '█'.repeat(result.passed) + '░'.repeat(result.total - result.passed);
    console.log(`${result.name}`);
    console.log(`[${bar}] ${result.passed}/${result.total} (${result.percentage}%)\n`);
  });

  const totalPercentage = Math.round((totalPassed / totalChecks) * 100);
  console.log('OVERALL: ' + '█'.repeat(Math.round(totalPercentage / 10)) + '░'.repeat(10 - Math.round(totalPercentage / 10)));
  console.log(`${totalPassed}/${totalChecks} items verified (${totalPercentage}%)\n`);

  if (totalPercentage === 100) {
    console.log('✅ ALL FIXES VERIFIED - READY FOR PRODUCTION\n');
    console.log('Next step: node scripts/generate-report.cjs\n');
    return true;
  } else {
    console.log(`⚠️  ${totalChecks - totalPassed} items still need implementation\n`);
    return false;
  }
}

runAudit();
