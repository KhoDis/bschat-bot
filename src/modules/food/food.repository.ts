import { injectable } from 'inversify';
import prisma from '@/prisma/client';
import type { FoodCategory, FoodTrigger } from '@prisma/client';

@injectable()
export class FoodRepository {
  async listCategories(): Promise<FoodCategory[]> {
    return prisma.foodCategory.findMany();
  }

  async listCategoriesWithTriggers(): Promise<(FoodCategory & { triggers: FoodTrigger[] })[]> {
    return prisma.foodCategory.findMany({ include: { triggers: true } });
  }

  async findCategoryWithTriggersByQuery(
    query: string,
  ): Promise<(FoodCategory & { triggers: FoodTrigger[] }) | null> {
    return prisma.foodCategory.findFirst({ where: { query }, include: { triggers: true } });
  }
}
