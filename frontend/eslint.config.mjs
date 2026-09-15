import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// eslint-config-next 16 ships native flat config, so no FlatCompat bridge.
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '**/*.tsbuildinfo'],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // An underscore prefix marks a parameter kept to document a signature.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
]

export default config
