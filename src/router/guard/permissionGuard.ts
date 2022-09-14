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

    // 点击使 userStore.setSessionTimeout(true) 的接口，使得 token 失效

    // 登录状态需要 check 是否动态添加过路由，无则添加一下；
    // 登录状态如果是去 login，有 redirect 就去 redirect，没有则去首页；
    // 未登录状态区分要去的路由是否需要登录权限，需要则去登录（让用户决定），登录成功后返回该from.fullPath
    // 正常登录完成返回当前页面，需要登录权限访问参考上面；
    // 登出后如 redirect 需要权限，则返回首页，否则直接刷新当前页
    /*
    - 是否已登录且未超时
    */
    // 如果 token 已存在并且要去登陆页
    // 则 check 登录有无超时
    if (token && to.path === LOGIN_PATH) {
      const isSessionTimeout = userStore.getSessionTimeout;
      try {
        await userStore.afterLoginAction(); //获取用户信息成功 =》if 已超时 设置为未已超时/ else 未超时去动态添加路由
        if (!isSessionTimeout) {
          // 未超时即去往之前的页面或者首页
          return (to.query?.redirect as string) || '/';
        }
        // 超时就放行去登录页
        return true;
      } catch {}
    }
    // 获取用户信息，

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
    } else {
      // 如果 token 已存在并且要去登陆页
      await userStore.afterLoginAction();
      // 则 check 登录有无超时
      if (to.path === LOGIN_PATH) {
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
    }

    // 以下情况 token 存在，且并非去登录页
    // Jump to the 404 page after processing the login
    // 如果是从登录页过来的(刚登录完成)，但要去的路由不存在，则去首页
    if (
      from.path === LOGIN_PATH &&
      to.name === PAGE_NOT_FOUND_ROUTE.name &&
      to.fullPath !== PageEnum.BASE_HOME
    ) {
      return PageEnum.BASE_HOME;
    }

    // get userinfo while last fetch time is empty
    // 从来未获取过用户信息
    if (userStore.getLastUpdateTime === 0) {
      try {
        await userStore.getUserInfoAction();
      } catch (err) {
        return true;
      }
    }

    // 已经动态添加过路由了
    if (!permissionStore.getIsDynamicAddedRoute) {
      // 如果已经登录且未超时，且没有动态添加过路由，则需要去添加下
      const routes = await permissionStore.buildRoutesAction();

      routes.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw);
      });

      router.addRoute(PAGE_NOT_FOUND_ROUTE as unknown as RouteRecordRaw);

      permissionStore.setDynamicAddedRoute(true);
    }

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
