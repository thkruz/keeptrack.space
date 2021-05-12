module.exports = (api) => {
  console.log(`Currently in ${api.env()} environment!`);
  const testPlugins = [
    [
      'istanbul',
      {
        exclude: ['node_modules/', 'src/js/lib/external/', '**/*.test.js'],
      },
    ],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
  ];

  const normPlugins = ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods'];

  return {
    env: {
      // dev: {},
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
    ],
    compact: 'auto',
  };
};
