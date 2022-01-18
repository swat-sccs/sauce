/* eslint-disable @typescript-eslint/no-var-requires */
const glob = require('glob');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    account: './src/js/account.js',
    admin: './src/js/admin.js',
    createAccount: './src/js/createAccount.js',
    forgot: './src/js/forgot.js',
    mailingLists: './src/js/mailingLists.js',
    resetPassword: './src/js/resetPassword.js',
    style: './src/js/style.js',
  },
  resolve: {
    modules: [path.resolve('./node_modules')],
  },
  mode: 'production',
  output: {
    path: `${__dirname}/dist/js/`,
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /datatables\.net.*?\.js/,
        loader: 'imports-loader',
        options: {
          additionalCode: 'var define = false; /* Disable AMD for misbehaving libraries */',
        },
      },
      {
        test: /\.(scss)$/,
        use: [
          {
            // inject CSS to page
            loader: 'style-loader',
          },
          {
            // translates CSS into CommonJS modules
            loader: 'css-loader',
          },
          {
            // Run postcss actions
            loader: 'postcss-loader',
            options: {
              // `postcssOptions` is needed for postcss 8.x;
              // if you use postcss 7.x skip the key
              postcssOptions: {
                // postcss plugins, can be exported to postcss.config.js
                plugins: function () {
                  return [require('autoprefixer')];
                },
              },
            },
          },
          {
            // compiles Sass to CSS
            loader: 'sass-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
};
