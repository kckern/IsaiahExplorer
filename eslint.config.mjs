import next from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: ['build/', 'build-output/', '.next/', 'node_modules/', 'public/'],
  },
  ...next,
  {
    rules: {
      'no-debugger': 'error',
      radix: 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The Next 16 major bumps eslint-plugin-react-hooks to v6, which enables a
    // new suite of React Compiler static-analysis rules. They flag pre-existing
    // patterns in the legacy SPA under src/Components/ (refs read during render,
    // in-place mutation, setState-in-effect) that predate this ruleset. The
    // production-readiness plan retires those patterns in later, dedicated tasks
    // (render-phase timers, DOM-driven navigation, etc.), so keep them visible
    // as warnings here rather than block the Next upgrade on a legacy rewrite.
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
