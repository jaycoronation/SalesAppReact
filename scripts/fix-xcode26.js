const { execSync } = require('child_process');
const paths = [
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI',
  'node_modules/expo/node_modules/expo-modules-core/ios',
  'node_modules/expo-modules-core/ios',
];
paths.forEach(p => {
  try {
    // Step 1: Collapse any number of consecutive nonisolated(unsafe) down to one.
    // Run three times to handle 3+ repetitions (sed is not recursive).
    for (let i = 0; i < 3; i++) {
      execSync(`find ${p} -name "*.swift" -exec sed -i '' 's/nonisolated(unsafe) nonisolated(unsafe)/nonisolated(unsafe)/g' {} + 2>/dev/null || true`);
    }
    // Step 2: Fix `weak let` -> `weak var` (Xcode 26 requires weak refs to be var).
    execSync(`find ${p} -name "*.swift" -exec sed -i '' 's/weak let /weak var /g' {} + 2>/dev/null || true`);
    // Step 3: Add nonisolated(unsafe) before `weak var` ONLY when it is not already there.
    // Uses a sentinel-swap to avoid double-application on repeated runs.
    execSync(`find ${p} -name "*.swift" -exec sed -i '' \
      -e 's/nonisolated(unsafe) weak var /__NONISOLATED_WEAK_VAR__/g' \
      -e 's/weak var /__NONISOLATED_WEAK_VAR__/g' \
      -e 's/__NONISOLATED_WEAK_VAR__/nonisolated(unsafe) weak var /g' \
      {} + 2>/dev/null || true`);
    console.log('✅ Fixed ' + p);
  } catch(e) {
    console.log('⚠️  Skipped ' + p + ': ' + e.message);
  }
});
