import type { UserConfig, ConfigEnv } from 'vite';
import pkg from './package.json';
import moment from 'moment';
import { loadEnv } from 'vite';
import { resolve } from 'path';
import { generateModifyVars } from './build/generate/generateModifyVars';
import { createProxy } from './build/vite/proxy';
import { wrapperEnv } from './build/utils';
import { createVitePlugins } from './build/vite/plugin';
import { OUTPUT_DIR } from './build/constant';

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir);
}

const { dependencies, devDependencies, name, version } = pkg;
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: moment().format('YYYY-MM-DD HH:mm:ss'),
};

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd();

  const env = loadEnv(mode, root);

  // The boolean type read by loadEnv is a string. This function can be converted to boolean type
  const viteEnv = wrapperEnv(env);

  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_DROP_CONSOLE } = viteEnv;

  const isBuild = command === 'build';

  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
        },
        // /@/xxxx => src/xxxx
        {
          find: /\/@\//,
          replacement: pathResolve('src') + '/',
        },
        // /#/xxxx => types/xxxx
        {
          find: /\/#\//,
          replacement: pathResolve('types') + '/',
        },
      ],
    },
    server: {
      // Listening on all local IPs
      host: true, // 监听所有地址，包括局域网和公网地址
      port: VITE_PORT,
      // Load proxy configuration from .env
      proxy: createProxy(VITE_PROXY),
    },
    build: {
      target: 'es2015',
      outDir: OUTPUT_DIR,
      minify: 'esbuild',
      // terserOptions: {
      //   compress: {
      //     keep_infinity: true,
      //     // Used to delete console in production environment
      //     drop_console: VITE_DROP_CONSOLE,
      //   },
      // },
      // commonjsOptions: { include: [] }, // 如果o 配置了 ptimizeDeps.disabled: false，在此处移除 @rollup/plugin-commonjs 功能
      // Turning off brotliSize display can slightly reduce packaging time
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
    },
    define: {
      // setting vue-i18-next
      // Suppress warning
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: generateModifyVars(), // 自定义主题色
          javascriptEnabled: true,
        },
      },
    },
    // 如果不是在 React 或 Vue 中使用 JSX，自定义的 jsxFactory 和 jsxFragment 可以使用 esbuild 选项 进行配置。
    // 例如对 Preact：
    // esbuild: {
    //   jsxFactory: 'h',
    //   jsxFragment: 'Fragment',
    // },

    // The vite plugin used by the project. The quantity is large, so it is separately extracted and managed
    plugins: createVitePlugins(viteEnv, isBuild),
    optimizeDeps: {
      // 默认disabled: 'build'，即开发环境才使用 esbuild，生产环境使用 rollup，用 @rollpjs/plugin-commonjs 来处理 cjs 的依赖
      // disabled: false, 将 esbulid 预构建同时用于开发环境和生产环境
      // @iconify/iconify: The dependency is dynamically and virtually loaded by @purge-icons/generated, so it needs to be specified explicitly
      include: [
        '@iconify/iconify',
        'ant-design-vue/es/locale/zh_CN',
        'moment/dist/locale/zh-cn',
        'ant-design-vue/es/locale/en_US',
        'moment/dist/locale/eu',
      ],
      exclude: ['vue-demi', 'consolidate'],
    },
  };
};
