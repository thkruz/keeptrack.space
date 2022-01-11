// eslint-disable-next-line no-undef
module.exports = (api) => {
  const testPlugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-private-methods',
  ];

  const normPlugins = ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-private-methods'];

  return {
    env: {
      test: {
        plugins: api.env() === 'test' ? testPlugins : normPlugins,
      },
      development: {
        plugins: normPlugins,
        compact: false,
      },
      production: {
        plugins: normPlugins,
        compact: true,
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
