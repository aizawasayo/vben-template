import type { Router, RouteRecordRaw } from 'vue-router';

import { usePermissionStoreWithOut } from '/@/store/modules/permission';

import { PageEnum } from '/@/enums/pageEnum';
import { useUserStoreWithOut } from '/@/store/modules/user';

import { PAGE_NOT_FOUND_ROUTE } from '/@/router/routes/basic';

const LOGIN_PATH = PageEnum.BASE_LOGIN;

export function createPermissionGuard(router: Router) {
  const userStore = useUserStoreWithOut();
  const permissionStore = usePermissionStoreWithOut();
  router.beforeEach(async (to, from) => {
    const token = userStore.getToken;

    /*
    - 是否已登录且未超时
    */
    // 如果 token 已存在并且要去登陆页
    // 则 check 登录有无超时
    if (token && to.path === LOGIN_PATH) {
      const isSessionTimeout = userStore.getSessionTimeout;
      try {
        await userStore.afterLoginAction();
        if (!isSessionTimeout) {
          // 未超时即去往之前的页面或者首页
          return (to.query?.redirect as string) || '/';
        }
        // 超时就放行去登录页
        return true;
      } catch {}
    }

    // token does not exist
    if (!token) {
      // You can access without permission. except the routing meta.requireAuth is true
      // 没有设置 meta.requireAuth = true 的路由直接放行
      if (!to.meta.requireAuth) {
        return true;
      }

      // redirect login page
      // 如果是需要登录才能访问的路由
      // 添加询问是否去登录页的 confirm 框，用户确认则去登录，否则 return false
      const redirectData: { path: string; replace: boolean; query?: Recordable<string> } = {
        path: LOGIN_PATH,
        replace: true,
      };
      if (to.path) {
        redirectData.query = {
          ...redirectData.query,
          redirect: to.path,
        };
      }
      return redirectData;
    }

    // Jump to the 404 page after processing the login
    if (
      from.path === LOGIN_PATH &&
      to.name === PAGE_NOT_FOUND_ROUTE.name &&
      to.fullPath !== (userStore.getUserInfo.homePath || PageEnum.BASE_HOME)
    ) {
      return PageEnum.BASE_HOME;
    }

    // get userinfo while last fetch time is empty
    if (userStore.getLastUpdateTime === 0) {
      try {
        await userStore.getUserInfoAction();
      } catch (err) {
        return true;
      }
    }

    if (permissionStore.getIsDynamicAddedRoute) {
      return true;
    }

    const routes = await permissionStore.buildRoutesAction();

    routes.forEach((route) => {
      router.addRoute(route as unknown as RouteRecordRaw);
    });

    router.addRoute(PAGE_NOT_FOUND_ROUTE as unknown as RouteRecordRaw);

    permissionStore.setDynamicAddedRoute(true);

    if (to.name === PAGE_NOT_FOUND_ROUTE.name) {
      // 动态添加路由后，此处应当重定向到 fullPath，否则会加载404页面内容
      return { path: to.fullPath, replace: true, query: to.query };
    } else {
      const redirectPath = (from.query.redirect || to.path) as string;
      const redirect = decodeURIComponent(redirectPath);
      const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect };
      return nextData;
    }
  });
}
