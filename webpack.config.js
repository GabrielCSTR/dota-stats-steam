// webpack.config.js

module.exports = {
  entry: "./scripts/background.js",
  output: {
    filename: "background.bundle.js",
    path: "background.bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  mode: "production",
};
