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
      id: MaterialRequestDTO["id"]
    ): StoredMaterialRequestDTO | undefined {
      const zayavka = this.$state[id];

      if (!zayavka) return;

      return Object.assign({}, zayavka, { data: JSON.parse(zayavka.data) });
    },

    getAll(): StoredMaterialRequestDTO[] {
      const resultMatReq = Object.keys(this.$state).map((key) =>
        this.getMaterialRequest(Number(key))
      );
      return resultMatReq.filter((mr) => mr !== undefined);
    },

    define(materialsRequests: MaterialRequestDTO[]): void {
      materialsRequests.forEach(this.setMaterialRequest);
    },
  },
});
