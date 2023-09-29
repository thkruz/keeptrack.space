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
          // modules: "umd", -- THIS IS FOR DOING THE LIB VERSION OF KEEPTRACK
        },
      ],
      '@babel/preset-typescript',
    ],
    compact: 'auto',
  };
};
