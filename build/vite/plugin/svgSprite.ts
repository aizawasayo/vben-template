/**
 *  Vite Plugin for fast creating SVG sprites.
 * https://github.com/anncwb/vite-plugin-svg-icons
 */

import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import path from 'path';

export function configSvgIconsPlugin(isBuild: boolean) {
  return createSvgIconsPlugin({
    iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')], // 指定图标缓存目录
    svgoOptions: isBuild,
    // default
    symbolId: 'icon-[dir]-[name]', // 指定 symbolId 格式
  });
}
