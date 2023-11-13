import { RouteLocationNormalized } from "vue-router";

export default function injectI18nToRoute(
  routeName: string,
  locale: string,
  route: RouteLocationNormalized,
) {
  const base = route.params.locale || locale;
  const fullPath = `/${base}/${routeName}`;
  return fullPath;
}

export { injectI18nToRoute };
