import type { AppLocale } from './locale';

/** 자주 나오는 메뉴명·재료·조리법 (긴 표현 우선 매칭) */
const TERM_GLOSS: Record<string, string> = {
  꼬막비빔밥: 'Cockle bibimbap',
  꼬막비빔국수: 'Cockle spicy noodles',
  꼬막국수: 'Cockle noodles',
  멸치국수: 'Anchovy noodle soup',
  비빔국수: 'Spicy cold noodles',
  물국수: 'Noodle soup',
  칼국수: 'Knife-cut noodles',
  잔치국수: 'Banquet noodles',
  냉면: 'Cold noodles',
  비빔냉면: 'Spicy cold noodles',
  물냉면: 'Cold noodles in broth',
  비빔밥: 'Bibimbap',
  돌솥비빔밥: 'Stone-pot bibimbap',
  불고기: 'Bulgogi',
  불고기덮밥: 'Bulgogi rice bowl',
  제육볶음: 'Spicy stir-fried pork',
  제육덮밥: 'Spicy pork rice bowl',
  김치찌개: 'Kimchi stew',
  된장찌개: 'Soybean paste stew',
  순두부찌개: 'Soft tofu stew',
  부대찌개: 'Army stew',
  갈비탕: 'Short rib soup',
  설렁탕: 'Ox bone soup',
  육회: 'Beef tartare',
  육회비빔밥: 'Beef tartare bibimbap',
  한우: 'Korean beef',
  삼겹살: 'Pork belly',
  목살: 'Pork neck',
  갈비: 'Short ribs',
  닭갈비: 'Spicy chicken',
  치즈: 'Cheese',
  치즈김치전: 'Cheese kimchi pancake',
  김치전: 'Kimchi pancake',
  해물파전: 'Seafood scallion pancake',
  파전: 'Scallion pancake',
  만두: 'Dumplings',
  군만두: 'Pan-fried dumplings',
  물만두: 'Boiled dumplings',
  떡볶이: 'Spicy rice cakes',
  라면: 'Instant noodles',
  라멘: 'Ramen',
  우동: 'Udon',
  초밥: 'Sushi',
  회: 'Sashimi',
  광어: 'Flounder',
  우럭: 'Rockfish',
  전복: 'Abalone',
  꼬막: 'Cockle',
  멸치: 'Anchovy',
  국수: 'Noodles',
  비빔: 'Spicy mixed',
  볶음밥: 'Fried rice',
  덮밥: 'Rice bowl',
  정식: 'Set meal',
  코스: 'Course',
  세트: 'Set',
  추가: 'Extra',
  사이드: 'Side',
  음료: 'Drink',
  맥주: 'Beer',
  소주: 'Soju',
  커피: 'Coffee',
  아메리카노: 'Americano',
  라떼: 'Latte',
  샐러드: 'Salad',
  스테이크: 'Steak',
  파스타: 'Pasta',
  피자: 'Pizza',
  샌드위치: 'Sandwich',
  버거: 'Burger',
  디저트: 'Dessert',
  아이스크림: 'Ice cream',
  빙수: 'Shaved ice',
};

const SIZE_GLOSS: Record<string, string> = {
  보: 'Regular',
  특: 'Large',
  소: 'Small',
  중: 'Medium',
  대: 'Large',
  小: 'Small',
  中: 'Medium',
  大: 'Large',
  L: 'Large',
  M: 'Medium',
  S: 'Small',
};

const SORTED_TERMS = Object.keys(TERM_GLOSS).sort((a, b) => b.length - a.length);

const HANGUL_RE = /[\uAC00-\uD7A3]/;

export function containsHangul(text: string): boolean {
  return HANGUL_RE.test(text);
}

export function shouldShowMenuGloss(locale: AppLocale): boolean {
  return locale !== 'ko';
}

/** 한글 메뉴명 → 영문 풀이 (없으면 null) */
export function glossKoreanMenuName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || !containsHangul(trimmed)) return null;

  let main = trimmed;
  let sizeLabel: string | undefined;

  const paren = trimmed.match(/^(.*?)[\(\（]([^)\）]+)[\)\）]$/);
  if (paren) {
    main = paren[1].trim();
    const sizeKey = paren[2].trim();
    sizeLabel = SIZE_GLOSS[sizeKey] ?? sizeKey;
  }

  const parts = segmentTerms(main);
  if (parts.length === 0) return null;

  const gloss = parts.join(' ');
  if (sizeLabel) return `${gloss} (${sizeLabel})`;
  return gloss;
}

function segmentTerms(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (!HANGUL_RE.test(ch)) {
      if (ch.trim()) out.push(ch);
      i++;
      continue;
    }

    let matched = false;
    for (const term of SORTED_TERMS) {
      if (text.startsWith(term, i)) {
        out.push(TERM_GLOSS[term]);
        i += term.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    i++;
  }
  return out.filter((p) => p && !HANGUL_RE.test(p));
}
