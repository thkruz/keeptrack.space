// eslint-disable-next-line no-undef
module.exports = (api) => {
  const testPlugins = [];
  const normPlugins = [];

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
