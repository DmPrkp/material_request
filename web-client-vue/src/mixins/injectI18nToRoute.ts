import { useRoute } from 'vue-router';

export default function injectI18nToRoute(routeName: string, locale: string) {
  const route = useRoute();
  const base = route.params.locale || locale;
  const fullPath = `/${base}/${routeName}`;
  return fullPath;
}