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

  function paramLabel(
    param: Pick<DictionaryVariantParam, "value" | "unit" | "kind">
  ): string {
    const number = formatNumber(param.value);
    const unit = translate(`measure.${param.unit}`, param.unit);
    const kind = param.kind
      ? translate(`ui.paramsTitles.${param.kind}`, param.kind)
      : "";

    return kind ? `${kind} ${number} ${unit}` : `${number} ${unit}`;
  }

  /**
   * То же для параметров из расчёта (calc-server отдаёт их в своей форме:
   * param — значение, measure — единица, title — вид). Без этого в заявке
   * было «Ø 10.0000 мм».
   */
  function calcParamLabel(param: {
    param: string;
    measure: string;
    title?: string;
  }): string {
    return paramLabel({
      value: param.param,
      unit: param.measure,
      kind: param.title ?? null,
    });
  }

  return { translate, formatNumber, paramLabel, calcParamLabel };
}
