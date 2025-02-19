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
    try {
      return i18next.t(...tArgs);
    } catch (e) {
      throw new TextServiceError(`Translation for ${tArgs[0]} not found`);
    }
  };
}
