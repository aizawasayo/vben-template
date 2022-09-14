import type { AppRouteRecordRaw } from '/@/router/types';

import { computed, toRaw, unref } from 'vue';

import { uniqBy } from 'lodash-es';

import { useRouter } from 'vue-router';

export function useFrameKeepAlive() {
  const router = useRouter();
  const { currentRoute } = router;
  const getFramePages = computed(() => {
    const ret = getAllFramePages(toRaw(router.getRoutes()) as unknown as AppRouteRecordRaw[]) || [];
    return ret;
  });

  function getAllFramePages(routes: AppRouteRecordRaw[]): AppRouteRecordRaw[] {
    let res: AppRouteRecordRaw[] = [];
    for (const route of routes) {
      const { meta: { frameSrc } = {}, children } = route;
      if (frameSrc) {
        res.push(route);
      }
      if (children && children.length) {
        res.push(...getAllFramePages(children));
      }
    }
    res = uniqBy(res, 'name');
    return res;
  }

  function showIframe(item: AppRouteRecordRaw) {
    return item.name === unref(currentRoute).name;
  }

  return { getFramePages, showIframe, getAllFramePages };
}
