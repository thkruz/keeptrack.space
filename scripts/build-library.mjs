import webpack from 'webpack';
import { webpackLibraryConfig } from './webpack-library.mjs';

const compiler = webpack(webpackLibraryConfig);

compiler.run((err, stats) => {
  if (err) {
    console.error(err);

    return;
  }

  console.log(stats.toString({
    colors: true,
  }));
});
