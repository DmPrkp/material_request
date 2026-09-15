import { Keys } from "@/types";

const defaultKeys = {
  en: "Request. Construction Calculator. Calculation of Building Materials",
  ru: "Заявка. Строительный калькулятор. Расчет строительных материалов",
};

const routeMeta: Keys = {
  catalog: {
    key: {
      en: "Catalogs: materials, hand and power tools",
      ru: "Сборники: материалы, ручной и электроинструмент",
    },
  },
  "catalog/materials": {
    key: {
      en: "Catalogs: building materials",
      ru: "Сборники: строительные материалы",
    },
  },
  "catalog/hand_tools": {
    key: {
      en: "Catalogs: hand tools",
      ru: "Сборники: ручной инструмент",
    },
  },
  "catalog/power_tools": {
    key: {
      en: "Catalogs: power tools",
      ru: "Сборники: электроинструмент",
    },
  },
  "catalog/power_tools/corded": {
    key: {
      en: "Catalogs: corded power tools",
      ru: "Сборники: сетевой электроинструмент",
    },
  },
  "catalog/power_tools/cordless": {
    key: {
      en: "Catalogs: cordless power tools",
      ru: "Сборники: аккумуляторный электроинструмент",
    },
  },
  "catalog/systems": {
    key: {
      en: "Catalogs: work technologies and stages",
      ru: "Сборники: технологии и этапы работ",
    },
  },
  "catalog/systems/facade": {
    key: {
      en: "Catalogs: facade work technologies",
      ru: "Сборники: технологии фасадных работ",
    },
  },
  "catalog/systems/roof": {
    key: {
      en: "Catalogs: roofing technologies",
      ru: "Сборники: технологии кровельных работ",
    },
  },
  "catalog/systems/interior": {
    key: {
      en: "Catalogs: interior finishing technologies",
      ru: "Сборники: технологии внутренней отделки",
    },
  },
  about: {
    key: {
      en: "About the Project",
      ru: "О проекте",
    },
  },
  "main/facade": {
    key: {
      en: "Facade Material Calculation",
      ru: "Расчет материалов для фасада",
    },
  },
  "main/facade/EIFS": {
    key: {
      en: "EIFS Material Calculation",
      ru: "Расчет материалов для мокрого фасада",
    },
  },
  "main/facade/frame_scaffold": {
    key: {
      en: "frame scaffold Calculation",
      ru: "Расчет рамных лесов",
    },
  },
};

export { routeMeta, defaultKeys };
