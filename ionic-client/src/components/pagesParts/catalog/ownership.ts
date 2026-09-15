import { computed } from "vue";
import { alertController } from "@ionic/vue";
import { useAuthStore } from "@/store/auth";
import { tokenUser } from "@/store/authToken";

/**
 * Кто что правит в справочнике — зеркало dictionary-server/src/common/ownership.ts.
 *
 * Общее (сиды и заведённое админом) правит на месте и удаляет только админ. Пользователь
 * на правке чужого получает свою копию — оригинал остаётся у всех, — поэтому кнопку
 * «Удалить» ему показываем только у своего. Решает всё равно словарь (403),
 * здесь — чтобы не показывать кнопку, которая не сработает.
 */
export type OwnedRow = { createdBy: number | null; isShared?: boolean };

export function useOwnership() {
  const authStore = useAuthStore();

  const user = computed(() =>
    authStore.token ? tokenUser(authStore.token) : undefined,
  );
  const isAdmin = computed(() => user.value?.role === "ADMIN");

  function isMine(row: OwnedRow): boolean {
    return user.value !== undefined && row.createdBy === user.value.id;
  }

  /** Правка на месте и удаление; иначе правка уйдёт в копию, а удалить нельзя. */
  function canModify(row: OwnedRow): boolean {
    return isAdmin.value || isMine(row);
  }

  /** Личная позиция другого пользователя — её видит только админ. */
  function isOthersPrivate(row: OwnedRow): boolean {
    return row.isShared === false && !isMine(row);
  }

  return { user, isAdmin, isMine, canModify, isOthersPrivate };
}

/**
 * «Удалить „шпатель“?» — одно подтверждение на все формы справочника.
 * Удаление мягкое, но из интерфейса вернуть позицию пока нечем — поэтому спрашиваем.
 */
export async function confirmDelete(
  t: (key: string, named?: Record<string, unknown>) => string,
  name: string,
): Promise<boolean> {
  const alert = await alertController.create({
    header: t("pages.catalog.delete_confirm.header", { name }),
    message: t("pages.catalog.delete_confirm.message"),
    buttons: [
      { text: t("pages.catalog.delete_confirm.cancel"), role: "cancel" },
      { text: t("pages.catalog.delete_confirm.ok"), role: "destructive" },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === "destructive";
}
