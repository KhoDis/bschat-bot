import { describe, it, expect, vi, beforeEach } from "vitest";
import { TextService, TextServiceError } from "./text.service";
import i18next from "i18next";
import I18NexFsBackend from "i18next-fs-backend";
import path from "node:path";

vi.mock("i18next", () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn(),
    t: vi.fn(),
  },
}));

describe("TextService", () => {
  let textService: TextService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "testing");
    textService = new TextService();
  });

  it("should initialize i18next with the correct configuration", () => {
    expect(i18next.use).toHaveBeenCalledWith(I18NexFsBackend);
    expect(i18next.init).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: "ru",
        fallbackLng: "ru",
        backend: {
          loadPath: path.join(process.cwd(), "locales/{{lng}}.json"),
        },
        interpolation: {
          escapeValue: false,
        },
        returnObjects: true,
      }),
    );
  });

  it("should return the translated text when the key exists", () => {
    const mockTranslation = "Translated Text";
    vi.mocked(i18next.t).mockReturnValue(mockTranslation);

    const key = "test.key";
    const options = { someOption: "value" };
    const result = textService.get(key, options);

    expect(i18next.t).toHaveBeenCalledWith(key, {
      ...options,
    });
    expect(result).toBe(mockTranslation);
  });

  it("should randomly select a translation with multiple options", () => {
    const key = "test.array";
    const translations = ["value1", "value2"];
    let foundFirst = false;
    let foundSecond = false;

    vi.mocked(i18next.t).mockReturnValue(translations);

    const options = { someOption: "value" };
    const result = textService.get(key, options);

    expect(i18next.t).toHaveBeenCalledWith(key, options);
    if (result === translations[0]) {
      foundFirst = true;
    } else if (result === translations[1]) {
      foundSecond = true;
    }
    expect(foundFirst || foundSecond).toBe(true);
  });

  it("should throw a TextServiceError when the key does not exist", () => {
    vi.mocked(i18next.t).mockImplementation(() => null);

    const key = "nonexistent.key";
    const options = { someOption: "value" };

    expect(() => textService.get(key, options)).toThrow(TextServiceError);
    expect(i18next.t).toHaveBeenCalledWith(key, options);
  });

  it("should return key when the key does not exist in production", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(i18next.t).mockReturnValue(null);

    const key = "nonexistent.key";
    const options = { someOption: "value" };
    const result = textService.get(key, options);

    expect(result).toBe(key);
    expect(i18next.t).toHaveBeenCalledWith(key, options);
  });
});
