import i18next, { DefaultNamespace, Namespace, TFunction } from "i18next";
import I18NextFsBackend from "i18next-fs-backend";
import path from "node:path";

export interface ITextService {
  get: <Ns extends Namespace = DefaultNamespace, KPrefix = undefined>(
    ...tArgs: Parameters<TFunction<Ns, KPrefix>>
  ) => string;
}

export class TextServiceError extends Error {}

export class TextService implements ITextService {
  constructor() {
    i18next.use(I18NextFsBackend).init({
      lng: "ru",
      fallbackLng: "ru",
      backend: {
        loadPath: path.join(process.cwd(), "locales/{{lng}}.json"),
      },
      interpolation: {
        escapeValue: false,
      },
      returnObjects: true,
    });
  }

  public get = <Ns extends Namespace = DefaultNamespace, KPrefix = undefined>(
    ...tArgs: Parameters<TFunction<Ns, KPrefix>>
  ) => {
    const key = tArgs[0];
    const options = (typeof tArgs[1] === "object" ? tArgs[1] : {}) as Record<
      string,
      unknown
    >;

    const value = i18next.t(key, {
      ...options,
    });

    if (!value) {
      if (process.env["NODE_ENV"] === "production") {
        console.error(`Translation for ${key} not found`);
        return key;
      }
      throw new TextServiceError(`Translation for ${key} not found`);
    }

    if (Array.isArray(value)) {
      return value[Math.floor(Math.random() * value.length)];
    } else {
      return value;
    }
  };
}
