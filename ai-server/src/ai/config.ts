import { AI_MODEL, AI_SPEECH_MODEL } from '~/constatns';

/**
 * Настройки из окружения. Токен модели — секрет, который compose отдаёт только этому сервису.
 *
 * Без AI_TOKEN сервис **поднимается**, а чат отвечает 503: в dev токена у большинства нет, и
 * падающий из-за него контейнер ломал бы `watch` всему стеку. Это не то же, что mail-server,
 * где молчаливая почта хуже упавшего сервиса: здесь человек сразу видит «ассистент не настроен».
 */
export type AiConfig = {
  token?: string;
  /** OpenAI-совместимый шлюз (aitunnel.ru), а не api.openai.com. */
  baseUrl: string;
  model: string;
  /** Распознавание речи (транскрибация), отдельная от чата модель. */
  speechModel: string;
  /** Адреса сервисов уже с префиксом /<имя>/api/v1, без закрывающего слэша. */
  services: Record<ServiceName, string>;
};

export type ServiceName = 'order' | 'warehouse' | 'company' | 'dict';

export const AI_CONFIG = Symbol('AI_CONFIG');

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function url(value: string | undefined, fallback: string): string {
  return (trimmed(value) ?? fallback).replace(/\/+$/, '');
}

export function aiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return {
    token: trimmed(env.AI_TOKEN),
    baseUrl: trimmed(env.AI_BASE_URL) ?? 'https://api.aitunnel.ru/v1/',
    model: AI_MODEL,
    speechModel: AI_SPEECH_MODEL,
    services: {
      order: url(env.ORDER_URL, 'http://order-server:4100/order/api/v1'),
      warehouse: url(env.WAREHOUSE_URL, 'http://warehouse-server:4400/warehouse/api/v1'),
      company: url(env.COMPANY_URL, 'http://company-server:4500/company/api/v1'),
      dict: url(env.DICT_URL, 'http://dictionary-server:4300/dict/api/v1'),
    },
  };
}
