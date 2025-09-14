module.exports = {
  eslint: {
    enable: false,
    mode: 'extends',
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(@solana|rpc-websockets|bigint-buffer)/)'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    },
  },
  webpack: {
    alias: {
      '@': require('path').resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        util: require.resolve('util'),
        assert: require.resolve('assert'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        fs: false,
        path: require.resolve('path-browserify'),
      };
      
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new (require('webpack')).ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ];
      
      return webpackConfig;
    },
  },
};
