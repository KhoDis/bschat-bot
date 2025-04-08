import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { inject, injectable } from "inversify";
import natural from "natural";
import { createApi } from "unsplash-js";
import { ConfigService } from "@/config/config.service";
import { TYPES } from "@/types";

const FOOD_CATEGORIES = {
  omelet: ["омлет", "яичница", "глазунья"],
  pancakes: ["блины", "блинчики"],
  porridge: ["каша", "овсянка"],
  toast: ["тост", "тосты"],
  granola: ["гранола", "мюсли"],
  yogurt: ["йогурт"],

  pizza: ["пицца", "пиццу", "пиццей", "пиццерия", "пицца-итальяна"],
  burger: ["бургер", "чизбургер", "гамбургер", "бургерная"],
  hotdog: ["хотдог"],

  ramen: ["рамен"],
  udon: ["удон"],
  pho: ["фо-бо"],
  tomyum: ["том-ям"],
  donburi: ["донбури"],
  poke: ["поке"],
  baozi: ["баоцзы"],
  kimchi: ["кимчи"],
  wok: ["вок"],

  sushi: ["суши", "роллы", "сашими", "нигири", "урамаки", "гункан"],

  pelmeni: ["пельмени"],
  borscht: ["борщ"],
  olivier: ["оливье"],
  vinaigrette: ["винегрет"],
  okroshka: ["окрошка"],
  solyanka: ["солянка"],
  uha: ["уха"],
  draniki: ["драники"],

  plov: ["плов"],

  pasta: ["паста", "спагетти", "фетучини", "лазанья", "равиоли"],
  carbonara: ["карбонара"],
  bolognese: ["болоньезе"],

  steak: ["стейк", "антрекот"],
  porkchop: ["свинина", "карбонад", "ребрышки"],
  lambchop: ["баранина"],
  chicken: ["курица", "курочка", "курица гриль"],
  barbecue: ["шашлык", "гриль", "барбекю"],

  salmon: ["лосось"],
  tuna: ["тунец"],
  cod: ["треска"],
  shrimp: ["креветки"],
  squid: ["кальмары"],
  octopus: ["осьминог"],
  oyster: ["устрицы"],
  lobster: ["лобстер"],
  caviar: ["икра"],

  falafel: ["фалафель"],
  hummus: ["хумус"],
  tofu: ["тофу"],
  seitan: ["сейтан"],

  salad: ["салат", "цезарь", "греческий", "винегрет", "капрезе"],
  soup: ["суп", "щи", "харчо", "крем-суп", "бульон"],

  cake: ["торт", "чизкейк", "пирожное", "тирамису", "эклер"],
  muffin: ["маффин", "кекс"],
  donut: ["пончик"],
  icecream: ["мороженое"],
  chocolate: ["шоколад", "конфеты", "трюфель", "какао"],

  croissant: ["круассан"],
  pie: ["пирог", "пирожок"],
  bread: ["хлеб", "батон", "багет", "лаваш", "булочка"],

  fruit: ["яблоко", "банан", "манго", "ананас", "киви", "апельсин", "виноград"],
  vegetable: [
    "помидор",
    "огурец",
    "морковь",
    "брокколи",
    "кабачок",
    "баклажан",
    "авокадо",
  ],

  cheese: [
    "сыр",
    "моцарелла",
    "чеддер",
    "пармезан",
    "фета",
    "рикотта",
    "брынза",
  ],

  smoothie: ["смузи"],
  lemonade: ["лимонад"],
  milkshake: ["милкшейк"],
  juice: ["фреш", "морс", "компот"],

  coffee: [
    "кофе",
    "капучино",
    "латте",
    "эспрессо",
    "мокка",
    "раф",
    "американо",
  ],
  tea: ["чай", "мате", "пуэр", "улун", "каркаде"],

  wine: ["вино"],
  beer: ["пиво"],
  whiskey: ["виски"],
  rum: ["ром"],
  gin: ["джин"],
  champagne: ["шампанское"],
  cognac: ["коньяк"],
  vodka: ["водка"],

  shawarma: [
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

const FOOD_CATEGORY_QUERIES: { [key: string]: string } = {
  omelet: "omelet breakfast",
  pancakes: "pancakes with syrup",
  porridge: "bowl of porridge",
  toast: "buttered toast",
  granola: "granola bowl",
  yogurt: "yogurt with berries",

  pizza: "italian pizza",
  burger: "juicy burger",
  hotdog: "hot dog street food",
  shawarma: "shawarma wrap street food",

  ramen: "japanese ramen",
  udon: "udon noodles",
  pho: "pho soup",
  tomyum: "tom yum soup",
  donburi: "donburi rice bowl",
  poke: "poke bowl",
  baozi: "baozi buns",
  kimchi: "korean kimchi",
  wok: "wok noodles",

  sushi: "sushi set",
  borscht: "borscht soup",
  olivier: "olivier salad",
  vinaigrette: "vinaigrette salad",
  okroshka: "okroshka soup",
  solyanka: "solyanka soup",
  uha: "russian fish soup",
  draniki: "belarus draniki",

  plov: "plov pilaf",

  pasta: "italian pasta",
  carbonara: "pasta carbonara",
  bolognese: "pasta bolognese",

  steak: "beef steak",
  porkchop: "pork chop",
  lambchop: "grilled lamb",
  chicken: "grilled chicken",
  barbecue: "meat barbecue",

  salmon: "grilled salmon",
  tuna: "tuna fillet",
  cod: "cod fish",
  shrimp: "shrimp dish",
  squid: "grilled squid",
  octopus: "cooked octopus",
  oyster: "fresh oysters",
  lobster: "lobster plate",
  caviar: "black caviar",

  falafel: "falafel plate",
  hummus: "hummus dip",
  tofu: "tofu dish",
  seitan: "seitan vegan",

  salad: "fresh salad",
  soup: "bowl of soup",

  cake: "slice of cake",
  muffin: "muffin dessert",
  donut: "glazed donut",
  icecream: "ice cream scoop",
  chocolate: "chocolate sweets",

  croissant: "croissant pastry",
  pie: "fruit pie",
  bread: "fresh bread",

  fruit: "fresh fruit",
  vegetable: "fresh vegetables",

  cheese: "cheese plate",

  smoothie: "fruit smoothie",
  lemonade: "lemonade drink",
  milkshake: "milkshake with cream",
  juice: "fresh juice",

  coffee: "cup of coffee",
  tea: "tea in teapot",

  wine: "glass of wine",
  beer: "cold beer",
  whiskey: "glass of whiskey",
  rum: "rum cocktail",
  gin: "gin tonic",
  champagne: "champagne celebration",
  cognac: "glass of cognac",
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
        const baseQuery = FOOD_CATEGORY_QUERIES[category] || category;
        const fullQuery = `${baseQuery}`;

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
