/**
 * Demo mode module for Groupwheel.
 *
 * Provides functionality to seed realistic demo data for showcasing
 * the application to prospective users or for development testing.
 *
 * ## Activation Methods
 *
 * 1. **URL Parameter**: Add `?demo=true` to any page URL
 *    Example: http://localhost:5173/activities?demo=true
 *
 * 2. **Browser Console**: When devtools are enabled
 *    - `window.__groupwheel_demo.seed()` - Seed demo data
 *    - `window.__groupwheel_demo.clear()` - Clear demo data
 *    - `window.__groupwheel_demo.reseed()` - Force re-seed
 *
 * 3. **Keyboard Shortcut**: Ctrl+Shift+D (when devtools enabled)
 *
 * @module infrastructure/demo
 */

export {
  generateDemoData,
  shouldActivateDemoMode,
  isDemoDataLoaded,
  markDemoDataLoaded,
  clearDemoDataMarker,
  type DemoDataSet
} from './demoData';

export {
  seedDemoData,
  clearDemoData,
  initializeDemoModeIfRequested,
  exposeDemoFunctionsToWindow,
  type SeedDemoResult
} from './demoSeeder';

export {
  exposeTestFixturesToWindow,
  printConsoleDirectory
} from './testSeeder';

export { TEST_FIXTURES, getFixtureById, type TestFixture } from './testFixtures';
