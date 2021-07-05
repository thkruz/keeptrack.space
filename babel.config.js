// eslint-disable-next-line no-undef
module.exports = (api) => {
  const testPlugins = [
    // [
    //   'istanbul',
    //   {
    //     exclude: ['node_modules/', 'src/js/lib/external/*', '**/*.test.js', '**/serviceWorker.js', 'src/js/__mocks__', 'src/js/webworker/*', 'src/js/wip/*', 'src/tle/*'],
    //   },
    // ],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
  ];

  const normPlugins = ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods'];

  return {
    env: {
      test: {
        plugins: api.env() == 'test' ? testPlugins : normPlugins,
      },
      development: {
        plugins: normPlugins,
      },
      production: {
        plugins: normPlugins,
      },
    },
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            esmodules: true,
          },
        },
      ],
      '@babel/preset-typescript',
    ],
    compact: 'auto',
  };
};
