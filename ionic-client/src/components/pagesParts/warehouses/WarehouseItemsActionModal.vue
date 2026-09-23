<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t(`pages.warehouses.action.${mode}.title`) }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <template v-if="mode === 'move'">
      <ion-item-divider>
        <ion-label color="secondary">
          <h2>{{ $t("pages.warehouses.action.target") }}</h2>
        </ion-label>
      </ion-item-divider>
      <ion-list v-if="warehouses?.length">
        <ion-item
          v-for="warehouse in warehouses"
          :key="warehouse.id"
          :class="{ selected: target === warehouse.id }"
          button
          :detail="false"
          @click="target = warehouse.id"
        >
          <ion-label class="ion-text-wrap">{{ warehouse.name }}</ion-label>
          <ion-note
            v-if="warehouse.companyId"
            slot="end"
          >
            {{ companyName(warehouse.companyId) }}
          </ion-note>
          <IonIcon
            slot="end"
            :icon="target === warehouse.id ? radioButtonOn : radioButtonOff"
            :color="target === warehouse.id ? 'primary' : undefined"
          />
        </ion-item>
      </ion-list>
      <ion-note
        v-else
        class="hint"
      >
        {{ $t("pages.warehouses.move_empty") }}
      </ion-note>
    </template>

    <template v-if="mode === 'issue'">
      <ion-item-divider>
        <ion-label color="secondary">
          <h2>{{ $t("pages.warehouses.action.recipient") }}</h2>
        </ion-label>
      </ion-item-divider>
      <ion-list v-if="people?.length">
        <ion-item
          v-for="person in people"
          :key="person.id"
          :class="{ selected: holder === person.id }"
          button
          :detail="false"
          @click="holder = person.id"
        >
          <ion-label class="ion-text-wrap">{{ person.label }}</ion-label>
          <IonIcon
            slot="end"
            :icon="holder === person.id ? radioButtonOn : radioButtonOff"
            :color="holder === person.id ? 'primary' : undefined"
          />
        </ion-item>
      </ion-list>
      <ion-note
        v-else
        class="hint"
      >
        {{ $t("pages.warehouses.issue_empty") }}
      </ion-note>
    </template>

    <ion-item-divider>
      <ion-label color="secondary">
        <h2>{{ $t("pages.warehouses.action.quantity") }}</h2>
      </ion-label>
    </ion-item-divider>
    <ion-list>
      <ion-item
        v-for="item in items"
        :key="item.id"
      >
        <!--
          Количество — строкой под названием, а не справа: на телефоне справа оно
          отнимало половину ширины, и длинные названия рвались посреди слова.
        -->
        <div class="take">
          <ion-label class="ion-text-wrap">
            {{ item.title }}
            <p v-if="item.details">{{ item.details }}</p>
          </ion-label>
          <!-- «5 из 5 кг»: по умолчанию всё, что лежит; меньше — остаток останется на складе. -->
          <div class="qty">
            <ion-input
              class="qty-input"
              :class="{ invalid: !isValid(item) }"
              type="number"
              inputmode="decimal"
              :min="0"
              :max="item.quantity"
              :value="quantities[item.id]"
              :aria-label="item.title"
              @ionInput="setQuantity(item.id, $event)"
            />
            <ion-note class="of">
              {{
                $t("pages.warehouses.action.of", {
                  max: item.quantity,
                  unit: item.measure || $t("measure.pcs"),
                })
              }}
            </ion-note>
          </div>
        </div>
      </ion-item>
    </ion-list>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <div class="actions">
        <ion-button
          fill="clear"
          @click="cancel"
        >
          {{ $t("ui.buttons.back") }}
        </ion-button>
        <ion-button
          fill="outline"
          :color="mode === 'remove' ? 'danger' : undefined"
          :disabled="!ready"
          @click="done"
        >
          {{ $t("pages.warehouses.action.done") }}
        </ion-button>
      </div>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts" setup>
  /**
   * Одна форма на три действия со страницы склада: удалить, переместить, выдать.
   * У каждой выбранной позиции — сколько взять (по умолчанию всё), у перемещения
   * ещё и куда, у выдачи — кому. Сами действия делает страница: форма отдаёт выбор через dismiss.
   */
  import {
    IonFooter,
    IonIcon,
    IonNote,
    IonToolbar,
    modalController,
  } from "@ionic/vue";
  import { radioButtonOff, radioButtonOn } from "ionicons/icons";
  import { computed, reactive, ref } from "vue";
  import type { Company, Warehouse, WarehouseItemTake } from "@/types/dto";

  export type ItemsAction = "remove" | "move" | "issue";

  /** Строка склада, как её показывает WarehousePage. */
  export type ActionItem = {
    id: number;
    title: string;
    details: string;
    measure: string;
    quantity: number;
  };

  /** Кому можно выдать: участник компании склада и его подпись. */
  export type ActionPerson = { id: number; label: string };

  export type ItemsActionResult = {
    items: WarehouseItemTake[];
    targetWarehouseId?: number;
    /** Только для выдачи: кому на руки. */
    holderId?: number;
  };

  const props = defineProps<{
    mode: ItemsAction;
    items: ActionItem[];
    /** Только для перемещения: куда можно (та же компания, без самого склада). */
    warehouses?: Warehouse[];
    /** Для подписи склада в списке; нет — подписи просто нет. */
    companies?: Company[];
    /** Только для выдачи: участники компании склада. */
    people?: ActionPerson[];
  }>();

  const target = ref<number>();
  const holder = ref<number>();
  /** Как ввели, строкой: пустое поле — не ноль, а «ещё не ввёл». */
  const quantities = reactive<Record<number, string>>(
    Object.fromEntries(props.items.map((item) => [item.id, String(item.quantity)]))
  );

  /** numeric(14, 4) на сервере: сравниваем в десятитысячных, как он. */
  const scaled = (value: number) => Math.round(value * 10_000);

  function amount(item: ActionItem): number {
    return Number(quantities[item.id]?.replace(",", "."));
  }

  /** Больше нуля и не больше лежащего — иначе сервер откажет всей пачке. */
  function isValid(item: ActionItem): boolean {
    const value = amount(item);
    return (
      Number.isFinite(value) &&
      scaled(value) > 0 &&
      scaled(value) <= scaled(item.quantity)
    );
  }

  const ready = computed(
    () =>
      props.items.every(isValid) &&
      (props.mode !== "move" || target.value !== undefined) &&
      (props.mode !== "issue" || holder.value !== undefined)
  );

  function setQuantity(id: number, event: CustomEvent<{ value?: string | null }>) {
    quantities[id] = event.detail.value ?? "";
  }

  function companyName(id: number) {
    return props.companies?.find((company) => company.id === id)?.name ?? "";
  }

  function done() {
    if (!ready.value) return;
    const result: ItemsActionResult = {
      items: props.items.map((item) => ({ id: item.id, quantity: amount(item) })),
      targetWarehouseId: target.value,
      holderId: holder.value,
    };
    modalController.dismiss(result, "confirm");
  }

  function cancel() {
    modalController.dismiss(null, "cancel");
  }
</script>

<style scoped>
  .take {
    width: 100%;
    padding: 8px 0;
  }

  .qty {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  /* Рамка — чтобы было видно, что число правится: без неё оно читалось как подпись. */
  .qty-input {
    width: 96px;
    min-height: 36px;
    text-align: end;
    border: 1px solid rgba(var(--ion-text-color-rgb, 255, 255, 255), 0.3);
    border-radius: 6px;
    --padding-start: 8px;
    --padding-end: 8px;
  }

  .qty-input.invalid {
    color: var(--ion-color-danger);
    border-color: var(--ion-color-danger);
  }

  .of {
    white-space: nowrap;
  }

  ion-item.selected {
    --background: rgba(var(--ion-color-primary-rgb), 0.12);
  }

  .hint {
    display: block;
    padding: 16px;
    text-align: center;
  }

  /* «назад» слева, «готово» справа: подтверждение — под правый большой палец. */
  .actions {
    display: flex;
    justify-content: space-between;
    padding: 0 8px;
  }
</style>
