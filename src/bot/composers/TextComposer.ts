import { IBotContext } from "@/context/context.interface";
import { Composer } from "telegraf";
import { injectable } from "inversify";
import path from "path";
import fs from "fs";

type ResponseParts = {
  hook: string[];
  punch: string[];
  final: string[];
};

@injectable()
export class TextComposer extends Composer<IBotContext> {
  private responses: Record<string, ResponseParts> = {};
  private triggers: { pattern: RegExp; parts: string }[] = [];

  constructor() {
    super();
    this.loadResponses();
    this.setupHandlers();
  }

  private loadResponses() {
    const responsesDir = path.join(__dirname, "responses");

    // Load all JSON files from the responses directory
    fs.readdirSync(responsesDir).forEach((file) => {
      if (file.endsWith(".json")) {
        const topic = path.basename(file, ".json");
        const data = fs.readFileSync(path.join(responsesDir, file), "utf-8");
        this.responses[topic] = JSON.parse(data);
      }
    });

    function make(parts: string, pattern: RegExp) {
      return {
        pattern,
        parts,
      };
    }

    // Define triggers with their corresponding JSON files
    this.triggers = [
      make("shashlik", /(шашлык|шашлычок|мангал|жар[ие]м мясо)/i),
      make("wedding", /(свадьб[ауеы]|женитьс[ья]|выхожу замуж|брак)/i),
      make("tired", /я\s*(так\s*)?(устал|устала)/i),
      make("bored", /(мне\s+)?скучн[оы]|нечего делать|делать нечего/i),
      make("goodMorning", /(доброе\s+(утро|утречко)|с\s+утречком)/i),
      make(
        "goodnight",
        /(спокойной\s+ночи|споки\s*ноки|(иду|я) спать|пош[ёе]л спать)/i,
      ),
      make(
        "praise",
        /(молодец|горжусь|ты\s+сможешь|умничк[ауи]|верю в тебя|гордимся)/i,
      ),
      make(
        "sad",
        /(мне\s+)?грустн[оы]|печаль|я\s+плачу|тоск[ауе]|хочется реветь|хочется плакать/i,
      ),
      make(
        "hungry",
        /(хочу (есть|жрать)|проголодал[а-я]{0,2}|поесть бы|голодн[ыаяое])/i,
      ),
      make(
        "weekend",
        /(пятниц[аы]|выходн(ой|ые)|отдыхаю|тус[аоу]ю|чиллю|релакс)/i,
      ),
    ];
  }

  private generateResponse(topic: string): string {
    const parts = this.responses[topic];
    if (!parts) return "Ой, что-то пошло не так...";

    const getRandom = (arr: string[]) =>
      arr[Math.floor(Math.random() * arr.length)];

    return [
      getRandom(parts.hook),
      getRandom(parts.punch),
      getRandom(parts.final),
    ].join("\n");
  }

  private setupHandlers() {
    this.triggers.forEach(({ pattern, parts }) => {
      this.hears(pattern, async (ctx, next) => {
        const response = this.generateResponse(parts);
        await ctx.reply(response);
        return next();
      });
    });
  }
}
