import { ZayavkaType } from "@/types/entity/zayavka";
import BaseOrderModel from "./BaseZayavkaModel";
import { MaterialRequestDTO } from "@/types/dto";

export default class Zayavka {
  data: ZayavkaType;

  static async findAll() {
    const materialRequests =
      await BaseOrderModel.get<MaterialRequestDTO[]>("/zayavka");
    return materialRequests || [];
  }

  /** Ничьи заявки этого браузера — по id из anonymousKeys, без входа. */
  static async findByIds(ids: number[]) {
    if (!ids.length) return [];
    const materialRequests = await BaseOrderModel.get<MaterialRequestDTO[]>(
      `/zayavka?ids=${ids.join(",")}`,
    );
    return materialRequests || [];
  }

  static claim(items: { id: number; key: string }[]) {
    return BaseOrderModel.post<{ claimed: number[] }>({
      params: "/zayavka/claim",
      body: { items },
    });
  }

  /** key — для ничьей заявки, как в update(): права на удаление те же, что на правку. */
  static remove(id: number, key?: string) {
    const headers = {
      ...(BaseOrderModel.baseOpts.headers as Record<string, string>),
      ...(key ? { "X-Zayavka-Key": key } : {}),
    };
    return BaseOrderModel.delete({ params: `/zayavka/${id}`, opts: { headers } });
  }

  static async find(id: number) {
    const materialRequest = await BaseOrderModel.get<MaterialRequestDTO>(
      `/zayavka/${id}`,
    );
    return materialRequest;
  }

  constructor(data: ZayavkaType) {
    this.data = {
      // name — только если есть: у обычной заявки поля нет, и пустое писать незачем.
      ...(data.name ? { name: data.name } : {}),
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
      params: "/zayavka",
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
      ...(key ? { "X-Zayavka-Key": key } : {}),
    };
    return BaseOrderModel.put<MaterialRequestDTO>({
      params: `/zayavka/${id}`,
      body: this.data,
      opts: { ...opts, headers },
    });
  }
}
