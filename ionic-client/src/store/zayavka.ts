import { defineStore } from "pinia";
import { MaterialRequestDTO, StoredMaterialRequestDTO } from "@/types/dto";

export const useZayavkaStore = defineStore("materialRequests", {
  state: () => {
    return {} as Record<MaterialRequestDTO["id"], MaterialRequestDTO>;
  },
  actions: {
    setMaterialRequest(materialRequest: MaterialRequestDTO): void {
      this.$state[materialRequest.id] = materialRequest;
    },

    getMaterialRequest(
      id: MaterialRequestDTO["id"],
    ): StoredMaterialRequestDTO | undefined {
      const zayavka = this.$state[id];

      if (!zayavka) return;

      return Object.assign({}, zayavka, { data: JSON.parse(zayavka.data) });
    },

    getAll(): StoredMaterialRequestDTO[] {
      const resultMatReq = Object.keys(this.$state)
        .map((key) => this.getMaterialRequest(Number(key)))
        .reverse();
      return resultMatReq.filter((mr) => mr !== undefined);
    },

    /** Удалённые из списка — иначе страница заявки открыла бы их из кэша. */
    removeMaterialRequests(ids: MaterialRequestDTO["id"][]): void {
      ids.forEach((id) => delete this.$state[id]);
    },

    define(materialsRequests: MaterialRequestDTO[]): void {
      materialsRequests.forEach(this.setMaterialRequest);
    },
  },
});
