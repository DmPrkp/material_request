import { defineStore } from "pinia";
import { MaterialRequestDTO } from "@/types/dto";

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
    ): MaterialRequestDTO | undefined {
      return this.$state[id];
    },
    getAll(): MaterialRequestDTO[] {
      return Object.values(this.$state);
    },
    define(materialsRequests: MaterialRequestDTO[]): void {
      this.$state = materialsRequests;
    },
  },
});
