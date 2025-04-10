import natural from "natural";
import { injectable } from "inversify";
import prisma from "@/prisma/client";

@injectable()
export class FoodService {
  private stemmer = natural.PorterStemmerRu;
  private stemToCategoryMap: Map<string, string> = new Map();

  constructor() {}

  async initializeStemMap() {
    const triggers = await prisma.foodTrigger.findMany({
      include: { category: true },
    });

    this.stemToCategoryMap.clear();

    for (const { trigger, category } of triggers) {
      const stem = this.stemmer.stem(trigger.toLowerCase());
      if (!this.stemToCategoryMap.has(stem)) {
        this.stemToCategoryMap.set(stem, category.query);
      }
    }
  }

  detectCategoryFromText(
    text: string,
  ): { stem: string; category: string } | null {
    const tokens = new natural.WordTokenizer().tokenize(text.toLowerCase());
    const stems = tokens.map((t) => this.stemmer.stem(t));

    for (const stem of stems) {
      const category = this.stemToCategoryMap.get(stem);
      if (category) return { stem, category };
    }

    return null;
  }
}
