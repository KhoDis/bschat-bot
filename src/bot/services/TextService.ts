import i18next, { DefaultNamespace, Namespace, TFunction } from "i18next";
import I18NexFsBackend from "i18next-fs-backend";
import path from "node:path";

export interface ITextService {
  get: <Ns extends Namespace = DefaultNamespace, KPrefix = undefined>(
    ...tArgs: Parameters<TFunction<Ns, KPrefix>>
  ) => string;
}

export class TextServiceError extends Error {}

export class TextService implements ITextService {
  constructor() {
    i18next.use(I18NexFsBackend).init({
      lng: "ru",
      fallbackLng: "ru",
      backend: {
        loadPath: path.join(process.cwd(), "locales/{{lng}}.json"),
      },
      interpolation: {
        escapeValue: false,
      },
    });
  }

  public get = <Ns extends Namespace = DefaultNamespace, KPrefix = undefined>(
    ...tArgs: Parameters<TFunction<Ns, KPrefix>>
  ) => {
    let values = [];
    for (let i = 1; i < tArgs.length; i++) {
      values.push(tArgs[i]);
    }
    const value = i18next.t(tArgs[0], {
      returnObjects: true,
      postProcess: "sprintf",
      sprintf: values,
    });

    if (!value) {
      throw new TextServiceError(`Translation for ${tArgs[0]} not found`);
    }
    if (Array.isArray(value)) {
      return value[Math.floor(Math.random() * value.length)];
    } else {
      return value;
    }
  };
}
