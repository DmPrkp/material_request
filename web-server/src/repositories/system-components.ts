export default class SystemComponentsRepositories {
  systemComponents = {
    facade: {
      EIFS: [
        'base coat adhesive',
        'insulation',
        'fiberglass mesh',
        'finish coat',
        'paint layer',
      ],
    },
  };

  getComponents(system, component) {
    try {
      return this.systemComponents[system][component];
    } catch (error) {
      return error;
    }
  }

  static factory() {
    return new SystemComponentsRepositories();
  }
}
