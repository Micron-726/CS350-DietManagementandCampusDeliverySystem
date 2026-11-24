"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { menuComponents, menuItems, portionLevels, restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { isUuid } from "@/lib/menu";
import { MENU_WITH_PORTIONS } from "@/lib/menu-data";
import { MenuInputError, parseMenu } from "./validate";

export async function saveMenu(itemId: string | null, version: number | null, _: string | null, form: FormData) {
  const account = await requireAccount("restaurant");
  const restaurantId = account.restaurantId;
  if (!restaurantId || (itemId !== null && !isUuid(itemId))) return "연결된 가게와 메뉴를 확인해 주세요.";

  try {
    const { menu, components } = parseMenu(form);
    await db.transaction(async (tx) => {
      const [restaurant] = await tx.select({ id: restaurants.id }).from(restaurants)
        .where(and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, account.id))).for("share");
      if (!restaurant) throw new MenuInputError("이 가게의 메뉴를 수정할 수 없습니다.");

      const id = itemId ?? randomUUID();
      const menuScope = and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId));
      if (itemId) {
        const [current] = await tx.select({ updatedAt: menuItems.updatedAt }).from(menuItems).where(menuScope).for("update");
        if (!current || current.updatedAt.getTime() !== version) {
          throw new MenuInputError("메뉴가 변경되었습니다. 화면을 다시 열어 주세요.");
        }
        await tx.update(menuItems).set(menu).where(menuScope);
      } else {
        await tx.insert(menuItems).values({ ...menu, id, restaurantId, externalId: id });
      }

      const existing = await tx.query.menuItems.findFirst({ where: menuScope, with: MENU_WITH_PORTIONS });
      const oldComponents = new Map(existing?.components.map((component) => [component.id, component]));
      for (const component of components) {
        const { id: componentId, levels, ...fields } = component;
        const oldComponent = componentId ? oldComponents.get(componentId) : undefined;
        if (componentId && !oldComponent) throw new MenuInputError("재료 목록이 변경되었습니다.");
        const savedId = componentId ?? randomUUID();
        if (componentId) {
          await tx.update(menuComponents).set(fields).where(eq(menuComponents.id, componentId));
          oldComponents.delete(componentId);
        } else {
          await tx.insert(menuComponents).values({ ...fields, id: savedId, menuItemId: id });
        }

        const oldLevels = new Map(oldComponent?.levels.map((level) => [level.id, level]));
        let nextLevel = Math.max(-1, ...(oldComponent?.levels.map((level) => level.level) ?? [])) + 1;
        await tx.update(portionLevels).set({ isDefault: false }).where(and(
          eq(portionLevels.componentId, savedId), eq(portionLevels.isDefault, true),
        ));
        for (const { id: levelId, ...level } of levels) {
          if (levelId) {
            if (!oldLevels.delete(levelId)) throw new MenuInputError("옵션 목록이 변경되었습니다.");
            await tx.update(portionLevels).set(level).where(eq(portionLevels.id, levelId));
          } else {
            if (nextLevel > 32767) throw new MenuInputError("추가할 수 있는 옵션 번호를 초과했습니다.");
            await tx.insert(portionLevels).values({ ...level, componentId: savedId, level: nextLevel++ });
          }
        }
        if (oldLevels.size) await tx.delete(portionLevels).where(inArray(portionLevels.id, [...oldLevels.keys()]));
      }
      if (oldComponents.size) await tx.delete(menuComponents).where(inArray(menuComponents.id, [...oldComponents.keys()]));
    });
  } catch (error) {
    if (error instanceof MenuInputError) return error.message;
    throw error;
  }

  revalidatePath("/store/menu");
  revalidatePath(`/restaurants/${restaurantId}`);
  redirect("/store/menu");
}
