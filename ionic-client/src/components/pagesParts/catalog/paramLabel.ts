import { useI18n } from "vue-i18n";
import type { DictionaryVariantParam } from "@/types/dto";

/**
 * Подпись параметра сборки: «Ø 10 мм», «дл. 250 мм». Короткие формы вида и единицы —
 * в i18n (ui.paramsTitles.*, measure.*); нет ключа — сам код, а не «measure.xyz».
 */
export function useParamLabel() {
  const { t, te } = useI18n({ useScope: "global" });

  function translate(key: string, fallback: string): string {
    return te(key) ? t(key) : fallback;
  }

  /** '100.0000' из базы -> '100'. */
  function formatNumber(raw: string): string {
    const value = Number(raw);
    return Number.isFinite(value) ? String(value) : raw;
  }

  function paramLabel(param: DictionaryVariantParam): string {
    const number = formatNumber(param.value);
    const unit = translate(`measure.${param.unit}`, param.unit);
    const kind = param.kind
      ? translate(`ui.paramsTitles.${param.kind}`, param.kind)
      : "";

    return kind ? `${kind} ${number} ${unit}` : `${number} ${unit}`;
  }

  return { translate, formatNumber, paramLabel };
}
