import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.vue'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Two tag dimensions, every project has one of each (see AGENTS.md):
          //   scope:backend | scope:frontend | scope:shared
          //   type:app | type:lib | type:generated
          depConstraints: [
            {
              sourceTag: 'scope:backend',
              onlyDependOnLibsWithTags: ['scope:backend', 'scope:shared'],
              bannedExternalImports: [
                'vue',
                '@vue/*',
                'vue-router',
                '@ghentcdh/crouton-vue',
              ],
            },
            {
              sourceTag: 'scope:frontend',
              onlyDependOnLibsWithTags: ['scope:frontend', 'scope:shared'],
              bannedExternalImports: [
                '@nestjs/*',
                '@prisma/*',
                '@nats-io/*',
                '@ghentcdh/crouton-api',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
              bannedExternalImports: [
                'vue',
                '@vue/*',
                'vue-router',
                '@ghentcdh/crouton-vue',
                '@nestjs/*',
                '@prisma/*',
                '@nats-io/*',
                '@ghentcdh/crouton-api',
              ],
            },
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:lib', 'type:generated'],
            },
            { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
            { sourceTag: 'type:generated', onlyDependOnLibsWithTags: [] },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
