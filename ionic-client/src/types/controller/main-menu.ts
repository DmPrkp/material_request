import { ImageType } from "../entity/image";

export type MainMenuItem = {
  /** Карточка с фотографией. Если её нет — рисуем icon. */
  img?: ImageType;
  /** Имя иконки из ionicons — запасной вариант для разделов без фото. */
  icon?: string;
  title: string;
  /**
   * Готовая подпись карточки. Для разделов из словаря: их название приходит
   * с сервера, и ключа в i18n у нового раздела нет. Без неё — перевод по title.
   */
  label?: string;
  description: string;
  disable?: boolean;
};
