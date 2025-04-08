import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";

import natural from "natural";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/config/config.service";
import { TYPES } from "@/types";

// Категории еды и их ключевые слова
const FOOD_CATEGORIES = {
  pizza: ["пицца", "пиццу", "пиццей", "пиццерия", "пиццайоло"],
  burger: ["бургер", "чизбургер", "бургеры", "бюргер", "гамбургер"],
  sushi: [
    "суши",
    "роллы",
    "сашими",
    "нигири",
    "урамаки",
    "филадельфия",
    "калифорния",
  ],
  dessert: [
    "торт",
    "десерт",
    "мороженое",
    "пирожное",
    "чизкейк",
    "тирамису",
    "кекс",
    "маффин",
    "эклер",
    "пончик",
  ],
  pasta: [
    "паста",
    "спагетти",
    "макароны",
    "фетучини",
    "равиоли",
    "лазанья",
    "каннеллони",
    "паста карбонара",
  ],
  salad: ["салат", "цезарь", "греческий", "оливье", "винегрет", "капрезе"],
  soup: ["суп", "борщ", "щи", "солянка", "харчо", "том ям", "куриный суп"],
  breakfast: [
    "завтрак",
    "омлет",
    "глазунья",
    "блины",
    "сырники",
    "каша",
    "гранола",
  ],
  meat: [
    "стейк",
    "мясо",
    "говядина",
    "свинина",
    "баранина",
    "антрекот",
    "ребрышки",
    "шашлык",
  ],
  seafood: [
    "морепродукты",
    "креветки",
    "мидии",
    "кальмары",
    "осьминог",
    "устрицы",
    "лобстер",
  ],
  asian: ["рамен", "удон", "том ям", "пельмени", "вок", "донбури", "сатай"],
  russian: [
    "пельмени",
    "блины",
    "борщ",
    "окрошка",
    "солянка",
    "холодец",
    "селедка под шубой",
  ],
  vegan: [
    "веган",
    "тофу",
    "фалафель",
    "хумус",
    "бургер веганский",
    "овощи гриль",
  ],
  fastfood: [
    "фастфуд",
    "картошка фри",
    "наггетсы",
    "хот дог",
    "шаурма",
    "бургер",
  ],
  bakery: [
    "хлеб",
    "булочка",
    "багет",
    "круассан",
    "пирог",
    "пирожок",
    "бублик",
  ],
  coffee: ["кофе", "капучино", "эспрессо", "латте", "мокка", "американо"],
  tea: ["чай"],
  drink: ["лимонад", "смузи", "коктейль", "милкшейк", "фреш"],
  alcohol: ["вино", "пиво", "коктейль", "виски", "ром", "джин", "шампанское"],
  fruit: ["фрукты", "яблоко", "банан", "апельсин", "киви", "манго", "ананас"],
  vegetable: ["овощи", "морковь", "помидор", "огурец", "брокколи", "авокадо"],
  cheese: ["сыр", "брынза", "моцарелла", "чеддер", "пармезан", "фета"],
  chocolate: ["шоколад", "шоколадка", "конфеты", "пралине", "трюфель"],
  bbq: ["гриль", "барбекю", "шашлык", "стейк", "курица гриль"],
};

const unsplash = createApi({
  accessKey: process.env["UNSPLASH_ACCESS_KEY"]!,
});

@injectable()
export class FoodComposer extends Composer<IBotContext> {
  private tokenizer: natural.WordTokenizer;
  private stemmer: natural.Stemmer;

  private stemToCategoryMap: Map<string, string> = new Map();

  private buildStemToCategoryMap() {
    for (const [category, keywords] of Object.entries(FOOD_CATEGORIES)) {
      for (const keyword of keywords) {
        const stem = this.stemmer.stem(keyword);
        this.stemToCategoryMap.set(stem, category);
      }
    }
  }

  constructor(@inject(TYPES.ConfigService) private config: ConfigService) {
    super();
    this.setupFoodListener();

    // Инициализация Unsplash

    // NLP для русского языка
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmerRu;
    this.buildStemToCategoryMap();
  }

  private setupFoodListener() {
    this.on("message", async (ctx, next) => {
      if (!ctx.message || !("text" in ctx.message)) return;
      const text = ctx.message.text.toLowerCase();
      const tokens = this.tokenizer.tokenize(text);
      const stems = tokens.map((token) => this.stemmer.stem(token));

      // Определяем категорию еды
      const detectedCategory = this.detectFoodCategory(stems);
      if (!detectedCategory) return;

      // Получаем фото из Unsplash
      try {
        const photoData = await this.fetchUnsplashPhoto(detectedCategory);
        const attribution = `||Photo by [${photoData.authorName}](https://unsplash.com/@${photoData.authorUsername}) on [Unsplash](https://unsplash.com)||`;
        const photoUrl = photoData.url;
        await ctx.replyWithPhoto(photoUrl, {
          caption: `Вот твоя ${detectedCategory}\\! 🍽️\n\n${attribution}`,
          parse_mode: "MarkdownV2",
        });
      } catch (error) {
        await ctx.reply(
          `Фото не найдено... Может, съешь что-то другое? 😅 \n\n${error}`,
        );
      }

      await next();
    });
  }

  private detectFoodCategory(stems: string[]): string | null {
    for (const stem of stems) {
      const category = this.stemToCategoryMap.get(stem);
      if (category) {
        return category;
      }
    }
    return null;
  }

  private async fetchUnsplashPhoto(category: string): Promise<{
    url: string;
    authorName: string;
    authorUsername: string;
  }> {
    const result = await unsplash.photos.getRandom({
      query: category,
      count: 1,
    });

    if (result.errors || !result.response) {
      throw new Error(`Unsplash error: ${result.errors}`);
    }

    const photo = Array.isArray(result.response)
      ? result.response[0]
      : result.response;

    if (
      !photo ||
      !photo.urls?.regular ||
      !photo.user?.name ||
      !photo.user?.username
    ) {
      throw new Error("No photo or author found");
    }

    return {
      url: photo.urls.regular,
      authorName: photo.user.name,
      authorUsername: photo.user.username,
    };
  }
}
