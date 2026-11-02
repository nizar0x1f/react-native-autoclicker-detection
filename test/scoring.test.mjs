import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_ALLOWLIST } from '../lib/module/lists.js';
import { buildReport, riskLevelForScore } from '../lib/module/scoring.js';

const CLEAN_ENVIRONMENT = {
  adbEnabled: false,
  rooted: false,
  emulator: false,
};

const service = (packageName, canPerformGestures = true, label = '') => ({
  componentName: `${packageName}/.ClickService`,
  packageName,
  label,
  canPerformGestures,
});

const environment = (overrides = {}) =>
  Object.assign({}, CLEAN_ENVIRONMENT, overrides);

const facts = (overrides = {}) =>
  Object.assign(
    {
      enabledAccessibilityServices: [],
      installedAutomationPackages: [],
      environment: CLEAN_ENVIRONMENT,
    },
    overrides
  );

describe('riskLevelForScore', () => {
  it('maps scores to the documented thresholds', () => {
    assert.equal(riskLevelForScore(0), 'none');
    assert.equal(riskLevelForScore(14), 'none');
    assert.equal(riskLevelForScore(15), 'low');
    assert.equal(riskLevelForScore(39), 'low');
    assert.equal(riskLevelForScore(40), 'medium');
    assert.equal(riskLevelForScore(69), 'medium');
    assert.equal(riskLevelForScore(70), 'high');
    assert.equal(riskLevelForScore(100), 'high');
  });
});

describe('buildReport', () => {
  it('reports a clean device as riskLevel none', () => {
    const report = buildReport(facts());

    assert.equal(report.riskLevel, 'none');
    assert.equal(report.score, 0);
    assert.deepEqual(report.reasons, []);
    assert.deepEqual(report.gestureCapablePackages, []);
    assert.deepEqual(report.enabledAccessibilityServices, []);
    assert.deepEqual(report.installedAutomationPackages, []);
    assert.deepEqual(report.environment, CLEAN_ENVIRONMENT);
  });

  it('does not flag allowlisted accessibility services that inject gestures', () => {
    const [allowlisted] = DEFAULT_ALLOWLIST;
    const report = buildReport(
      facts({ enabledAccessibilityServices: [service(allowlisted)] })
    );

    assert.equal(report.score, 0);
    assert.equal(report.riskLevel, 'none');
    assert.deepEqual(report.gestureCapablePackages, []);
    assert.equal(report.enabledAccessibilityServices[0].allowed, true);
  });

  it('does not flag services that cannot inject gestures', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [service('com.example.reader', false)],
      })
    );

    assert.equal(report.score, 0);
    assert.equal(report.riskLevel, 'none');
    assert.equal(report.enabledAccessibilityServices.length, 1);
    assert.deepEqual(report.gestureCapablePackages, []);
  });

  it('scores a single unknown gesture-capable service as high', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [
          service('com.example.clicker', true, 'Example Clicker'),
        ],
      })
    );

    assert.equal(report.score, 70);
    assert.equal(report.riskLevel, 'high');
    assert.deepEqual(report.gestureCapablePackages, ['com.example.clicker']);
    assert.equal(report.reasons.length, 1);
    assert.match(report.reasons[0], /com\.example\.clicker.*Example Clicker/);
  });

  it('caps the extra weight for additional gesture-capable packages', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [
          service('com.example.one'),
          service('com.example.two'),
          service('com.example.three'),
          service('com.example.four'),
        ],
      })
    );

    // 70 base + 10 per extra package, capped at +20.
    assert.equal(report.score, 90);
    assert.equal(report.riskLevel, 'high');
    assert.equal(report.gestureCapablePackages.length, 4);
  });

  it('counts a package once even when it exposes several services', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [
          service('com.example.clicker'),
          service('com.example.clicker'),
          service('com.example.clicker'),
        ],
      })
    );

    assert.equal(report.score, 70);
    assert.deepEqual(report.gestureCapablePackages, ['com.example.clicker']);
  });

  it('scores dedicated allowlists instead of the built-in one', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [service('com.example.clicker')],
      }),
      { allowlist: ['com.example.clicker'] }
    );

    assert.equal(report.score, 0);
    assert.equal(report.riskLevel, 'none');
    assert.deepEqual(report.gestureCapablePackages, []);
  });

  it('scores a known automation package as medium', () => {
    const report = buildReport(
      facts({ installedAutomationPackages: ['com.example.autoclicker'] })
    );

    assert.equal(report.score, 45);
    assert.equal(report.riskLevel, 'medium');
    assert.equal(report.reasons.length, 1);
    assert.match(report.reasons[0], /com\.example\.autoclicker/);
  });

  it('does not double count duplicate automation packages', () => {
    const report = buildReport(
      facts({
        installedAutomationPackages: [
          'com.example.autoclicker',
          'com.example.autoclicker',
        ],
      })
    );

    assert.equal(report.score, 45);
    assert.deepEqual(report.installedAutomationPackages, [
      'com.example.autoclicker',
    ]);
  });

  it('adds the environment weights', () => {
    const rooted = buildReport(
      facts({ environment: environment({ rooted: true }) })
    );
    assert.equal(rooted.score, 15);
    assert.equal(rooted.riskLevel, 'low');

    const emulator = buildReport(
      facts({ environment: environment({ emulator: true }) })
    );
    assert.equal(emulator.score, 10);
    assert.equal(emulator.riskLevel, 'none');

    const adb = buildReport(
      facts({ environment: environment({ adbEnabled: true }) })
    );
    assert.equal(adb.score, 5);
    assert.equal(adb.riskLevel, 'none');

    const everything = buildReport(
      facts({
        environment: { adbEnabled: true, rooted: true, emulator: true },
      })
    );
    assert.equal(everything.score, 30);
    assert.equal(everything.riskLevel, 'low');
    assert.equal(everything.reasons.length, 3);
  });

  it('clamps the score to 100 and keeps one reason per signal', () => {
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [service('com.example.clicker')],
        installedAutomationPackages: ['com.example.autoclicker'],
        environment: { adbEnabled: true, rooted: true, emulator: true },
      })
    );

    assert.equal(report.score, 100);
    assert.equal(report.riskLevel, 'high');
    assert.equal(report.reasons.length, 5);
  });

  it('exposes the allowlist decision on every enabled service', () => {
    const [allowlisted] = DEFAULT_ALLOWLIST;
    const report = buildReport(
      facts({
        enabledAccessibilityServices: [
          service(allowlisted),
          service('com.example.clicker'),
        ],
      })
    );

    assert.deepEqual(
      report.enabledAccessibilityServices.map((s) => [
        s.packageName,
        s.allowed,
      ]),
      [
        [allowlisted, true],
        ['com.example.clicker', false],
      ]
    );
  });
});
