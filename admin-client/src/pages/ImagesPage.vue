<template>
  <div class="images">
    <header class="bar">
      <h3>Фото технологий</h3>
      <span class="bar__meta">
        ionic-client/public/system · привязки в src/constants/systems/images.json — после сохранения закоммитить
      </span>
      <Button
        icon="pi pi-refresh"
        text
        size="small"
        title="Перечитать"
        :loading="loading"
        @click="load"
      />
    </header>

    <Message
      v-if="error"
      severity="error"
      class="images__note"
      closable
      @close="error = ''"
    >
      {{ error }}
    </Message>
    <Message
      v-if="state && !state.enabled"
      severity="warn"
      class="images__note"
    >
      Загрузчик работает только в dev: он пишет файлы прямо в репозиторий клиента. На прод снимки едут коммитом и
      деплоем.
    </Message>

    <div
      v-if="state?.enabled"
      class="images__body"
    >
      <!-- ------------------------------------------------------------ загрузка -->
      <section class="upload">
        <label
          class="drop"
          :class="{ 'drop--over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <input
            type="file"
            accept="image/*"
            hidden
            @change="onPick"
          />
          <template v-if="!source">
            <i class="pi pi-image" />
            <span>Перетащите фото сюда или нажмите, чтобы выбрать</span>
            <!-- heic не пишем: в сборке sharp нет HEVC (патенты) — такой файл получит «не картинка». -->
            <small>jpg, png, webp, avif — обожмётся в webp</small>
          </template>
          <template v-else>
            <span class="drop__name">{{ source.name }}</span>
            <small>нажмите или перетащите, чтобы заменить</small>
          </template>
        </label>

        <template v-if="source">
          <div class="form">
            <label class="form__field">
              <span>Технология</span>
              <Select
                v-model="title"
                :options="systemOptions"
                option-label="label"
                option-value="title"
                placeholder="Без привязки — только положить файл"
                filter
                show-clear
                fluid
              />
            </label>
            <div class="form__row">
              <label class="form__field">
                <span>Имя файла</span>
                <InputGroup>
                  <InputText
                    v-model="name"
                    :invalid="!!name && !NAME.test(name)"
                  />
                  <InputGroupAddon>.webp</InputGroupAddon>
                </InputGroup>
                <small
                  v-if="exists"
                  class="form__warn"
                >
                  такой файл уже есть — перезапишется
                </small>
              </label>
              <label class="form__field">
                <span>alt</span>
                <InputText
                  v-model="alt"
                  :placeholder="name"
                />
              </label>
            </div>
            <div class="form__row">
              <label class="form__field">
                <span>Размер</span>
                <SelectButton
                  v-model="crop"
                  :options="CROPS"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  size="small"
                />
              </label>
              <label
                v-if="crop"
                class="form__field"
              >
                <span>Что оставить при обрезке</span>
                <SelectButton
                  v-model="options.position"
                  :options="POSITIONS"
                  option-label="label"
                  option-value="value"
                  :allow-empty="false"
                  size="small"
                />
              </label>
            </div>
            <label class="form__field">
              <span>Качество: {{ options.quality }}</span>
              <Slider
                v-model="options.quality"
                :min="40"
                :max="95"
              />
            </label>
          </div>

          <div class="compare">
            <figure>
              <img
                :src="sourceUrl"
                alt="исходник"
              />
              <figcaption v-if="preview">
                было: {{ formatSize(preview.original.size) }} · {{ preview.original.width }}×{{ preview.original.height }}
                · {{ preview.original.format }}
              </figcaption>
            </figure>
            <figure>
              <img
                v-if="preview"
                :src="preview.dataUrl"
                alt="после обжатия"
              />
              <figcaption v-if="preview">
                стало: <strong>{{ formatSize(preview.result.size) }}</strong> · {{ preview.result.width }}×{{
                  preview.result.height
                }}
                · webp · −{{ saving(preview) }}%
              </figcaption>
              <figcaption v-else-if="previewing">обжимаю…</figcaption>
            </figure>
          </div>

          <footer class="upload__actions">
            <Button
              label="Сбросить"
              text
              @click="reset"
            />
            <Button
              :label="title ? `Сохранить и назначить ${title}` : 'Сохранить файл'"
              icon="pi pi-check"
              :loading="savingFile"
              :disabled="!NAME.test(name) || !preview"
              @click="save"
            />
          </footer>
        </template>
      </section>

      <!-- ------------------------------------------------------------ что лежит -->
      <section class="gallery">
        <h4>Технологии</h4>
        <div class="cards">
          <article
            v-for="item in techCards"
            :key="item.title"
            class="card"
          >
            <img
              v-if="item.file && thumbs[item.file]"
              :src="thumbs[item.file]"
              :alt="item.title"
            />
            <div
              v-else
              class="card__empty"
            >
              нет снимка
            </div>
            <div class="card__text">
              <strong>{{ item.label }}</strong>
              <small v-if="item.fileInfo">
                {{ item.file }} · {{ formatSize(item.fileInfo.size) }} · {{ item.fileInfo.width }}×{{ item.fileInfo.height }}
              </small>
              <small
                v-else-if="item.file"
                class="form__warn"
              >
                {{ item.file }} — файла нет
              </small>
            </div>
            <div class="card__actions">
              <Button
                icon="pi pi-upload"
                text
                size="small"
                title="Загрузить снимок для этой технологии"
                @click="startFor(item.title)"
              />
              <Button
                v-if="item.file"
                icon="pi pi-times"
                text
                size="small"
                severity="secondary"
                title="Снять снимок (карточка вернётся к иконке)"
                @click="unassign(item.title)"
              />
            </div>
          </article>
        </div>

        <template v-if="unused.length">
          <h4>Не назначены — уезжают в сборку зря</h4>
          <div class="cards">
            <article
              v-for="file in unused"
              :key="file.name"
              class="card"
            >
              <img
                v-if="thumbs[file.name]"
                :src="thumbs[file.name]"
                :alt="file.name"
              />
              <div class="card__text">
                <strong>{{ file.name }}</strong>
                <small>{{ formatSize(file.size) }} · {{ file.width }}×{{ file.height }} · {{ file.format }}</small>
              </div>
              <div class="card__actions">
                <Button
                  icon="pi pi-trash"
                  text
                  size="small"
                  severity="danger"
                  title="Удалить файл"
                  @click="remove(file.name)"
                />
              </div>
            </article>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import Button from 'primevue/button';
  import InputGroup from 'primevue/inputgroup';
  import InputGroupAddon from 'primevue/inputgroupaddon';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Select from 'primevue/select';
  import SelectButton from 'primevue/selectbutton';
  import Slider from 'primevue/slider';
  import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';

  import { dict, type ImageOptions, type ImagePreview, images, type ImagesState, type Page } from '@/api';
  import { formatSize } from '@/logs';

  /** Как проверяет сервер (images.service.ts). */
  const NAME = /^[a-z0-9][a-z0-9-]{0,80}$/;
  const CROPS = [
    { label: 'карточка 800×390', value: true },
    { label: 'только уменьшить до 800', value: false },
  ];
  const POSITIONS = [
    { label: 'главный объект', value: 'attention' },
    { label: 'центр', value: 'centre' },
  ];

  type System = { id: number; title: string; name: string; isActive?: boolean };

  const state = shallowRef<ImagesState>();
  const systems = ref<System[]>([]);
  const loading = ref(false);
  const error = ref('');
  const thumbs = reactive<Record<string, string>>({});

  // ------------------------------------------------------------------- загрузка
  const source = shallowRef<File>();
  const sourceUrl = ref('');
  const dragOver = ref(false);
  const title = ref<string | null>(null);
  const name = ref('');
  const alt = ref('');
  const crop = ref(true);
  const options = reactive<ImageOptions>({ width: 800, height: 390, quality: 75, position: 'attention' });
  const preview = shallowRef<ImagePreview>();
  const previewing = ref(false);
  const savingFile = ref(false);

  const systemOptions = computed(() =>
    systems.value.map((s) => ({ title: s.title, label: `${s.name} · ${s.title}${s.isActive === false ? ' (архив)' : ''}` })),
  );
  const exists = computed(() => !!state.value?.files.some((f) => f.name === `${name.value}.webp`));

  /** Карточки технологий: все из словаря плюс те, что есть только в images.json (удалённые из словаря). */
  const techCards = computed(() => {
    const map = state.value?.map ?? {};
    const titles = [...new Set([...systems.value.map((s) => s.title), ...Object.keys(map)])];
    return titles.map((t) => {
      const file = map[t]?.src.replace(/^\/system\//, '');
      const system = systems.value.find((s) => s.title === t);
      return {
        title: t,
        label: system ? `${system.name} · ${t}` : `${t} (нет в словаре)`,
        file,
        fileInfo: state.value?.files.find((f) => f.name === file),
      };
    });
  });
  const unused = computed(() => state.value?.files.filter((f) => !f.usedBy.length) ?? []);

  function slug(text: string): string {
    return text
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
    source.value = file;
    sourceUrl.value = URL.createObjectURL(file);
    // Имя — из файла, а если он по-русски («фото.jpg» даст пусто) — из кода технологии.
    if (!name.value) name.value = slug(file.name) || (title.value ? slug(title.value) : '');
  }

  function onPick(event: Event) {
    pick((event.target as HTMLInputElement).files?.[0]);
    (event.target as HTMLInputElement).value = '';
  }

  function onDrop(event: DragEvent) {
    dragOver.value = false;
    pick(event.dataTransfer?.files[0]);
  }

  /** Кнопка у карточки технологии: сразу выбрать её и открыть выбор файла. */
  function startFor(t: string) {
    title.value = t;
    const current = state.value?.map[t]?.src.replace(/^\/system\/|\.\w+$/g, '');
    name.value = current || slug(t);
    document.querySelector<HTMLInputElement>('.drop input')?.click();
  }

  watch(title, (t) => {
    if (t && !name.value) name.value = slug(t);
  });
  watch(crop, (on) => (options.height = on ? 390 : null));

  // Предпросмотр — на каждую правку файла и настроек, с задержкой: ползунок качества
  // иначе слал бы запрос на каждый шаг.
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  let previewSeq = 0;
  watch([source, options], () => {
    clearTimeout(previewTimer);
    if (!source.value) return;
    previewTimer = setTimeout(() => void runPreview(), 300);
  });

  async function runPreview() {
    if (!source.value) return;
    const seq = ++previewSeq;
    previewing.value = true;
    try {
      const result = await images.preview(source.value, { ...options });
      // Ответ на устаревшие настройки не перетирает свежий.
      if (seq === previewSeq) preview.value = result;
    } catch (e) {
      error.value = (e as Error).message;
      preview.value = undefined;
    } finally {
      if (seq === previewSeq) previewing.value = false;
    }
  }

  const saving = (p: ImagePreview) => Math.max(0, Math.round((1 - p.result.size / p.original.size) * 100));

  async function save() {
    if (!source.value) return;
    savingFile.value = true;
    error.value = '';
    try {
      const saved = await images.save(source.value, { ...options }, name.value, title.value ?? undefined, alt.value || undefined);
      delete thumbs[saved.file]; // перезаписанный файл — миниатюру перечитать
      reset();
      await load();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      savingFile.value = false;
    }
  }

  function reset() {
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
    source.value = undefined;
    sourceUrl.value = '';
    preview.value = undefined;
    title.value = null;
    name.value = '';
    alt.value = '';
  }

  // --------------------------------------------------------------------- список
  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const [s, page] = await Promise.all([
        images.state(),
        // Технологии — из словаря: в images.json ключ — их технический код (systems.title).
        dict.get<Page<System>>('/systems?limit=200&state=all'),
      ]);
      state.value = s;
      systems.value = page.items;
      await Promise.all(
        s.files
          .filter((f) => !thumbs[f.name])
          .map(async (f) => {
            thumbs[f.name] = await images.blobUrl(f.name);
          }),
      );
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function unassign(t: string) {
    try {
      await images.assign(t, null);
      await load();
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function remove(file: string) {
    if (!confirm(`Удалить ${file} из public/system?`)) return;
    try {
      await images.remove(file);
      URL.revokeObjectURL(thumbs[file]);
      delete thumbs[file];
      await load();
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  onBeforeUnmount(() => {
    clearTimeout(previewTimer);
    Object.values(thumbs).forEach((url) => URL.revokeObjectURL(url));
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  });

  void load();
</script>

<style scoped>
  .images {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .bar {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--p-content-border-color);
  }

  .bar h3 {
    margin: 0;
  }

  .bar__meta {
    flex: 1;
    color: var(--p-text-muted-color);
    font-size: 12px;
  }

  .images__note {
    margin: 8px 12px 0;
  }

  .images__body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(520px, 1fr) minmax(420px, 1fr);
    gap: 16px;
    padding: 12px;
    overflow: auto;
  }

  .upload,
  .gallery {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 120px;
    padding: 16px;
    border: 2px dashed var(--p-content-border-color);
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
  }

  .drop--over {
    border-color: var(--p-primary-color);
    background: var(--p-highlight-background);
  }

  .drop i {
    font-size: 28px;
    color: var(--p-text-muted-color);
  }

  .drop small {
    color: var(--p-text-muted-color);
  }

  .drop__name {
    font-weight: 600;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form__row {
    display: flex;
    gap: 12px;
  }

  .form__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .form__warn {
    color: var(--p-orange-500);
  }

  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .compare figure {
    margin: 0;
  }

  .compare img {
    width: 100%;
    display: block;
    border-radius: 6px;
    background: var(--p-content-hover-background);
  }

  .compare figcaption {
    margin-top: 4px;
    font-size: 12px;
    color: var(--p-text-muted-color);
  }

  .upload__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .gallery h4 {
    margin: 4px 0 0;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }

  .card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--p-content-border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .card img,
  .card__empty {
    width: 100%;
    aspect-ratio: 800 / 390;
    object-fit: cover;
    display: block;
  }

  .card__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--p-text-muted-color);
    background: var(--p-content-hover-background);
    font-size: 12px;
  }

  .card__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px 0;
    font-size: 13px;
  }

  .card__text small {
    color: var(--p-text-muted-color);
    font-size: 11px;
    word-break: break-all;
  }

  .card__actions {
    display: flex;
    justify-content: flex-end;
    padding: 0 4px 4px;
  }
</style>
