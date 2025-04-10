import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import natural from "natural";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/config/config.service";
import { TYPES } from "@/types";

const FOOD_CATEGORIES = {
  "omelet breakfast": ["омлет", "яичница", "глазунья"],
  "pancakes with syrup": ["блины", "блинчики"],
  "bowl of porridge": ["каша", "овсянка"],
  "buttered toast": ["тост", "тосты"],
  "granola bowl": ["гранола", "мюсли"],
  "yogurt with berries": ["йогурт"],

  "italian pizza": ["пицца", "пиццу", "пиццей", "пиццерия", "пицца-итальяна"],
  "juicy burger": ["бургер", "чизбургер", "гамбургер", "бургерная"],
  "hot dog street food": ["хотдог"],

  "japanese ramen": ["рамен"],
  "udon noodles": ["удон"],
  "pho soup": ["фо-бо"],
  "tom yum soup": ["том-ям"],
  "donburi rice bowl": ["донбури"],
  "baozi buns": ["баоцзы"],
  "korean kimchi": ["кимчи"],
  "wok noodles": ["вок"],

  "sushi set": ["суши", "роллы", "сашими", "нигири", "урамаки", "гункан"],

  pelmeni: ["пельмени"],
  "borscht soup": ["борщ"],
  "olivier salad": ["оливье"],
  "vinaigrette salad": ["винегрет"],
  "okroshka soup": ["окрошка"],
  "solyanka soup": ["солянка"],
  "russian fish soup": ["уха"],
  "belarus draniki": ["драники"],

  "plov pilaf": ["плов"],

  "italian pasta": ["паста", "спагетти", "фетучини", "лазанья", "равиоли"],
  "pasta carbonara": ["карбонара"],
  "pasta bolognese": ["болоньезе"],

  "beef steak": ["стейк", "антрекот"],
  "pork chop": ["свинина", "карбонад", "ребрышки"],
  "grilled lamb": ["баранина"],
  "grilled chicken": ["курица", "курочка", "курица гриль"],
  "meat barbecue": ["шашлык", "гриль", "барбекю"],

  "grilled salmon": ["лосось"],
  "tuna fillet": ["тунец"],
  "cod fish": ["треска"],
  "shrimp dish": ["креветки"],
  "grilled squid": ["кальмары"],
  "cooked octopus": ["осьминог"],
  "fresh oysters": ["устрицы"],
  "lobster plate": ["лобстер"],
  "black caviar": ["икра"],

  "falafel plate": ["фалафель"],
  "hummus dip": ["хумус"],
  "tofu dish": ["тофу"],
  "seitan vegan": ["сейтан"],

  "fresh salad": ["салат", "цезарь", "греческий", "винегрет", "капрезе"],
  "bowl of soup": ["суп", "щи", "харчо", "крем-суп", "бульон"],

  "slice of cake": ["торт", "чизкейк", "пирожное", "тирамису", "эклер"],
  "muffin dessert": ["маффин", "кекс"],
  "glazed donut": ["пончик"],
  "ice cream scoop": ["мороженое"],
  "chocolate sweets": ["шоколад", "конфеты", "трюфель", "какао"],

  "croissant pastry": ["круассан"],
  "fruit pie": ["пирог", "пирожок"],
  "fresh bread": ["хлеб", "батон", "багет", "лаваш", "булочка"],

  "fresh fruit": [
    "яблоко",
    "банан",
    "манго",
    "ананас",
    "киви",
    "апельсин",
    "виноград",
  ],
  "fresh vegetables": [
    "помидор",
    "огурец",
    "морковь",
    "брокколи",
    "кабачок",
    "баклажан",
    "авокадо",
  ],

  "cheese plate": [
    "сыр",
    "моцарелла",
    "чеддер",
    "пармезан",
    "фета",
    "рикотта",
    "брынза",
  ],

  "fruit smoothie": ["смузи"],
  "lemonade drink": ["лимонад"],
  "milkshake with cream": ["милкшейк"],
  "fresh juice": ["фреш", "морс", "компот"],

  "cup of coffee": [
    "кофе",
    "капучино",
    "латте",
    "эспрессо",
    "мокка",
    "раф",
    "американо",
  ],
  "tea in teapot": ["чай", "мате", "пуэр", "улун", "каркаде"],

  "glass of wine": ["вино"],
  "cold beer": ["пиво"],
  "glass of whiskey": ["виски"],
  "rum cocktail": ["ром"],
  "gin tonic": ["джин"],
  "champagne celebration": ["шампанское"],
  "glass of cognac": ["коньяк"],
  vodka: ["водка"],

  "doner kebab": [
    "шаурма",
    "шаверма",
    "шаурму",
    "шавуху",
    "шавуха",
    "шаурмочка",
    "шавермочка",
    "doner",
    "донер",
    "донер кебаб",
    "донер-кебаб",
    "кебаб",
  ],
};

@injectable()
export class FoodComposer extends Composer<IBotContext> {
  private tokenizer: natural.WordTokenizer;
  private stemmer: natural.Stemmer;
  private stemToCategoryMap: Map<string, string> = new Map();
  private unsplash: ReturnType<typeof createApi>;

  constructor(@inject(TYPES.ConfigService) private config: ConfigService) {
    super();
    this.unsplash = createApi({
      accessKey: this.config.get("UNSPLASH_ACCESS_KEY"),
    });

    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmerRu;
    this.buildStemToCategoryMap();
    this.setupFoodListener();
  }

  private buildStemToCategoryMap() {
    for (const [category, keywords] of Object.entries(FOOD_CATEGORIES)) {
      for (const keyword of keywords) {
        const stem = this.stemmer.stem(keyword);
        if (!this.stemToCategoryMap.has(stem)) {
          this.stemToCategoryMap.set(stem, category);
        }
      }
    }
  }

  private setupFoodListener() {
    this.on("message", async (ctx, next) => {
      if (!ctx.message || !("text" in ctx.message)) return;

      const text = ctx.message.text.toLowerCase();
      const tokens = this.tokenizer.tokenize(text);
      const stems = tokens.map((token) => this.stemmer.stem(token));

      const detectedCategory = this.detectFoodCategory(stems);
      if (!detectedCategory) return;

      const { stem, category } = detectedCategory;

      try {
        const fullQuery = `${category}`;

        const photoData = await this.fetchUnsplashPhoto(fullQuery);
        const attribution = `||Фото: [${photoData.authorName}](https://unsplash.com/@${photoData.authorUsername}) / Unsplash||`;
        await ctx.replyWithPhoto(photoData.url, {
          caption: `Вот твоя ${fullQuery}\\! 🍽️\n\n${attribution}`,
          parse_mode: "MarkdownV2",
        });
      } catch (error) {
        await ctx.reply(
          `Не удалось найти фото... Попробуй другой запрос! 😅 \n\n${error}`,
        );
      }

      await next();
    });
  }

  private detectFoodCategory(
    stems: string[],
  ): { stem: string; category: string } | null {
    for (const stem of stems) {
      const category = this.stemToCategoryMap.get(stem);
      if (category) return { stem, category };
    }
    return null;
  }

  private async fetchUnsplashPhoto(
    fullQuery: string,
  ): Promise<{ url: string; authorName: string; authorUsername: string }> {
    const result = await this.unsplash.photos.getRandom({
      query: fullQuery,
      count: 1,
      orientation: "landscape",
    });

    if (result.errors || !result.response) {
      throw new Error(result.errors?.[0] || "Unknown error");
    }

    const photo = Array.isArray(result.response)
      ? result.response[0]
      : result.response;

    if (!photo || !photo.urls?.regular || !photo.user) {
      throw new Error("Invalid photo response");
    }

    return {
      url: photo.urls.regular,
      authorName: photo.user.name || "Unknown",
      authorUsername: photo.user.username || "unknown",
    };
  }
}
