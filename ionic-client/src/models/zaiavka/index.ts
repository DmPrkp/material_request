import { ZaiavkaType } from "@/types/entity/zaiavka";
import BaseOrderModel from "./BaseZaiavkaModel";
import { MaterialRequestDTO } from "@/types/dto";

export default class Zaiavka {
  data: ZaiavkaType;

  static async findAll() {
    const materialRequests =
      await BaseOrderModel.get<MaterialRequestDTO[]>("/zaiavka");
    return materialRequests || [];
  }

  /** Ничьи заявки этого браузера — по id из anonymousKeys, без входа. */
  static async findByIds(ids: number[]) {
    if (!ids.length) return [];
    const materialRequests = await BaseOrderModel.get<MaterialRequestDTO[]>(
      `/zaiavka?ids=${ids.join(",")}`,
    );
    return materialRequests || [];
  }

  static claim(items: { id: number; key: string }[]) {
    return BaseOrderModel.post<{ claimed: number[] }>({
      params: "/zaiavka/claim",
      body: { items },
    });
  }

  static async find(id: number) {
    const materialRequest = await BaseOrderModel.get<MaterialRequestDTO>(
      `/zaiavka/${id}`,
    );
    return materialRequest;
  }

  constructor(data: ZaiavkaType) {
    this.data = {
      system: data.system,
      hand_tools: data.hand_tools ?? [],
      materials: data.materials ?? [],
      power_tools: data.power_tools ?? [],
    };
  }

  /** opts — для keepalive: запись при закрытии вкладки должна пережить страницу. */
  create(opts?: RequestInit) {
    // key — только у заведённой без входа: ключ правки, сервер показывает его один раз.
    return BaseOrderModel.post<MaterialRequestDTO & { key?: string }>({
      params: "/zaiavka",
      body: this.data,
      opts,
    });
  }

  generateSheetFile(format: string) {
    return BaseOrderModel.downloadFile({
      params: `/${format}-generator`,
      body: this.data,
    });
  }

  /**
   * key — для ничьей заявки. Заголовки собираем целиком: opts поверх baseOpts
   * заменяет headers, а не сливает, и без этого пропали бы Content-Type и токен.
   */
  update(id: number, { key, ...opts }: RequestInit & { key?: string } = {}) {
    const headers = {
      ...(BaseOrderModel.baseOpts.headers as Record<string, string>),
      ...(key ? { "X-Zaiavka-Key": key } : {}),
    };
    return BaseOrderModel.put<MaterialRequestDTO>({
      params: `/zaiavka/${id}`,
      body: this.data,
      opts: { ...opts, headers },
    });
  }
}
