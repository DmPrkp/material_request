import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import Zaiavka from "@/models/zaiavka";
import { HttpError } from "@/models/BaseModel";
import { addKey, findKey } from "@/models/zaiavka/anonymousKeys";
import { claimAnonymous } from "@/models/zaiavka/claimAnonymous";
import { useAuthStore } from "@/store/auth";
import { useZaiavkaStore } from "@/store/zaiavka";
import { MaterialRequestDTO } from "@/types/dto";
import { ZaiavkaType } from "@/types/entity/zaiavka";

/** Правки копятся и уходят пачкой: на каждое нажатие +/− запрос не шлём. */
const LAZY_SAVE_INTERVAL = 10_000;

/**
 * Автосохранение заявки на странице расчёта.
 *
 * Первая запись — сразу, как только списки собрали данные: заявка появляется в «Заявках»,
 * даже если человек ничего не трогал. Дальше — раз в 10 секунд, если что-то поменялось,
 * и при уходе со страницы. «Поменялось» — по снимку JSON, а не по флагу: списки
 * пересылают данные и без правок, флаг сохранял бы впустую.
 *
 * Уход ловим тремя путями: onBeforeRouteLeave (Ionic держит страницу смонтированной,
 * когда уходят на другую вкладку), onBeforeUnmount (назад к форме расчёта) и
 * visibilitychange — на телефоне вкладку чаще сворачивают, чем закрывают, и после
 * этого браузер может её выгрузить без всяких событий. keepalive — чтобы запрос
 * пережил закрытие страницы.
 *
 * Без входа заявка на сервере ничья, а браузер помнит её ключ правки (anonymousKeys.ts);
 * после входа claimAnonymous забирает её автору, и правка идёт уже по токену.
 */
export function useZaiavkaAutosave(
  source: () => ZaiavkaType | undefined,
  { initialId, onCreated }: { initialId?: number; onCreated?: (id: number) => void } = {},
) {
  const authStore = useAuthStore();
  const store = useZaiavkaStore();

  const id = ref<number | undefined>(initialId);
  let savedSnapshot: string | undefined;
  let queue: Promise<void> = Promise.resolve();

  function isEmpty(data: ZaiavkaType) {
    return !data.materials.length && !data.hand_tools.length && !data.power_tools.length;
  }

  /** Новая заявка; заведённая без входа приходит с ключом правки — запоминаем его. */
  async function create(data: ZaiavkaType, opts?: RequestInit) {
    const { key, ...res } = await new Zaiavka(data).create(opts);
    if (key) addKey(res.id, key);
    return res;
  }

  async function write(data: ZaiavkaType, opts?: RequestInit): Promise<MaterialRequestDTO | undefined> {
    const current = id.value;
    if (current === undefined) return create(data, opts);

    // Вошли, пока страница открыта: сначала забираем ничьи себе, дальше правим как автор.
    if (authStore.isAuthenticated) await claimAnonymous();

    const key = findKey(current);
    // Своя серверная без входа (токен протух на странице) — править нечем. Ждём входа:
    // снимок остаётся «несохранённым», следующий тик попробует снова.
    if (!authStore.isAuthenticated && !key) return;

    try {
      return await new Zaiavka(data).update(current, { ...opts, key });
    } catch (error) {
      // Заявку удалила чистка или она чужая (id пришёл из чужой ссылки) — заводим свою.
      if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
        return create(data, opts);
      }
      throw error;
    }
  }

  async function saveNow(opts?: RequestInit) {
    const data = source();
    if (!data || isEmpty(data)) return;

    const snapshot = JSON.stringify(data);
    if (snapshot === savedSnapshot) return;

    const previousId = id.value;
    const res = await write(data, opts);
    if (!res) return;

    id.value = res.id;
    savedSnapshot = snapshot;
    store.setMaterialRequest(res);
    if (res.id !== previousId) onCreated?.(res.id);
  }

  /** Записи идут строго по очереди: иначе медленный POST и быстрый тик завели бы две заявки. */
  function flush(opts?: RequestInit): Promise<void> {
    queue = queue
      .then(() => saveNow(opts))
      .catch((error) => console.error("Не удалось сохранить заявку", error));
    return queue;
  }

  const flushOnLeave = () => void flush({ keepalive: true });

  // Первая запись: списки отдают данные по одному, поэтому ждём, пока все три отработают.
  let firstSaveTimer: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => source(),
    () => {
      if (savedSnapshot !== undefined) return;
      clearTimeout(firstSaveTimer);
      firstSaveTimer = setTimeout(() => void flush(), 300);
    },
    { deep: true },
  );

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") flushOnLeave();
  }

  let interval: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    interval = setInterval(() => void flush(), LAZY_SAVE_INTERVAL);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushOnLeave);
  });

  onBeforeRouteLeave(() => {
    flushOnLeave();
  });

  onBeforeUnmount(() => {
    clearTimeout(firstSaveTimer);
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", flushOnLeave);
    flushOnLeave();
  });

  /** Для «Поделиться»: ссылке нужна уже записанная заявка. */
  async function ensureSaved(): Promise<number | undefined> {
    await flush();
    return id.value;
  }

  return { id, flush, ensureSaved };
}
