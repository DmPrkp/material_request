import { defineStore } from "pinia";
import { MaterialRequestDTO } from "@/types/dto";

export const useZayavkaStore = defineStore("materialRequests", {
  state: () => {
    return {} as Record<MaterialRequestDTO["id"], MaterialRequestDTO>;
  },
  actions: {
    setMaterialRequest(materialRequest: MaterialRequestDTO): void {
      this[materialRequest.id] = materialRequest;
    },
    getMaterialRequest(id: MaterialRequestDTO["id"]) {
      return this[id];
    },
    getAll(): MaterialRequestDTO[] {
      return Object.values(this);
    },
  },
});
