/**
 * Every tajweed rule the site can highlight, in one registry.
 *
 * This is the single source of truth for a rule's Arabic name, its colour, its
 * one-line definition and the lesson that teaches it. The ayah cards, the
 * colour legend, the glossary and the cheat sheet all read from here, so a rule
 * can never be named one thing in a lesson and another in the summary.
 *
 * A note on the colours: colouring the Qur'an is a modern study aid, not part
 * of the revelation, and there is no single agreed colour scheme. Ours is
 * chosen for contrast in both themes, and every colour is always shown with its
 * name in words so the lesson still works without colour.
 */

/** The eight colour families defined in src/index.css. */
export type RuleColor =
  | 'ghunnah'
  | 'ikhfa'
  | 'idgham'
  | 'iqlab'
  | 'izhar'
  | 'madd'
  | 'qalqalah'
  | 'tafkheem'

export interface Rule {
  /** Used in lesson files: `rule: ikhfa`. */
  id: string
  /** The Arabic name, fully vowelled. */
  name: string
  color: RuleColor
  /** One sentence, no jargon. Shown in the legend and the glossary. */
  short: string
  /** Slug of the lesson that teaches it, for the «اقرأ الدرس» link. */
  lesson: string
}

export const RULES: readonly Rule[] = [
  // ── أحكام النون الساكنة والتنوين ───────────────────────────────────────
  {
    id: 'izhar',
    name: 'إظهار حلقيّ',
    color: 'izhar',
    short: 'تنطق النون الساكنة أو التنوين واضحةً بلا غنّةٍ زائدة، قبل حروف الحلق الستّة.',
    lesson: 'izhar-halqi',
  },
  {
    id: 'idgham-ghunnah',
    name: 'إدغام بغنّة',
    color: 'ghunnah',
    short: 'تختفي النون في الحرف الذي بعدها فيصير مشدَّدًا، مع بقاء الغنّة حركتين.',
    lesson: 'idgham-nun',
  },
  {
    id: 'idgham-no-ghunnah',
    name: 'إدغام بغير غنّة',
    color: 'idgham',
    short: 'تختفي النون في اللام أو الراء فيصير الحرف مشدَّدًا، بلا غنّة.',
    lesson: 'idgham-nun',
  },
  {
    id: 'iqlab',
    name: 'إقلاب',
    color: 'iqlab',
    short: 'تنقلب النون الساكنة أو التنوين ميمًا مخفاةً بغنّة، قبل الباء وحدها.',
    lesson: 'iqlab',
  },
  {
    id: 'ikhfa',
    name: 'إخفاء حقيقيّ',
    color: 'ikhfa',
    short: 'صوتٌ بين الإظهار والإدغام مع غنّةٍ حركتين، قبل خمسة عشر حرفًا.',
    lesson: 'ikhfa-haqiqi',
  },

  // ── أحكام الميم الساكنة ────────────────────────────────────────────────
  {
    id: 'ikhfa-shafawi',
    name: 'إخفاء شفويّ',
    color: 'ikhfa',
    short: 'ميمٌ ساكنة قبل الباء: تُخفى مع غنّةٍ حركتين والشفتان متلامستان بلا ضغط.',
    lesson: 'meem-sakinah',
  },
  {
    id: 'idgham-shafawi',
    name: 'إدغام شفويّ',
    color: 'ghunnah',
    short: 'ميمٌ ساكنة قبل ميم: تُدغم فيها فتصير ميمًا مشدَّدةً بغنّةٍ حركتين.',
    lesson: 'meem-sakinah',
  },
  {
    id: 'izhar-shafawi',
    name: 'إظهار شفويّ',
    color: 'izhar',
    short: 'ميمٌ ساكنة قبل بقيّة الحروف: تُنطق واضحةً بلا غنّةٍ زائدة.',
    lesson: 'meem-sakinah',
  },
  {
    id: 'ghunnah',
    name: 'غنّة مشدَّدة',
    color: 'ghunnah',
    short: 'كلّ نونٍ أو ميمٍ مشدَّدة تُغنّ حركتين، وهي أكمل الغنّات.',
    lesson: 'ghunnah',
  },

  // ── اللام والراء ───────────────────────────────────────────────────────
  {
    id: 'lam-shamsiyyah',
    name: 'لام شمسيّة',
    color: 'idgham',
    short: 'لام «الـ» لا تُنطق، ويُشدَّد الحرف الذي بعدها.',
    lesson: 'lam-shamsiyyah-qamariyyah',
  },
  {
    id: 'lam-qamariyyah',
    name: 'لام قمريّة',
    color: 'izhar',
    short: 'لام «الـ» تُنطق ساكنةً واضحة.',
    lesson: 'lam-shamsiyyah-qamariyyah',
  },
  {
    id: 'tafkheem',
    name: 'تفخيم',
    color: 'tafkheem',
    short: 'يمتلئ الفم بصدى الحرف فيخرج ثقيلًا مُستعليًا.',
    lesson: 'tafkheem-tarqeeq',
  },
  {
    id: 'tarqeeq',
    name: 'ترقيق',
    color: 'izhar',
    short: 'يخرج الحرف نحيفًا خفيفًا، ولا يمتلئ الفم بصداه.',
    lesson: 'tafkheem-tarqeeq',
  },

  // ── القلقلة ────────────────────────────────────────────────────────────
  {
    id: 'qalqalah',
    name: 'قلقلة',
    color: 'qalqalah',
    short: 'اهتزازٌ خفيف في حروف «قطب جد» حين تسكن، من غير حركةٍ ولا مدّ.',
    lesson: 'qalqalah',
  },

  // ── المدود ─────────────────────────────────────────────────────────────
  {
    id: 'madd-tabee3i',
    name: 'مدّ طبيعيّ',
    color: 'madd',
    short: 'حركتان، وهو أصل كلّ مدّ: لا يقوم الحرف إلّا به ولا سبب بعده.',
    lesson: 'madd-tabee3i',
  },
  {
    id: 'madd-muttasil',
    name: 'مدّ واجب متّصل',
    color: 'madd',
    short: 'حرف مدٍّ بعده همزةٌ في الكلمة نفسها: يُمدّ أربع أو خمس حركات وجوبًا.',
    lesson: 'madd-muttasil-munfasil',
  },
  {
    id: 'madd-munfasil',
    name: 'مدّ جائز منفصل',
    color: 'madd',
    short: 'حرف مدٍّ في آخر كلمة وهمزةٌ في أوّل التي بعدها: أربع أو خمس حركات.',
    lesson: 'madd-muttasil-munfasil',
  },
  {
    id: 'madd-badal',
    name: 'مدّ بدل',
    color: 'madd',
    short: 'همزةٌ قبل حرف المدّ: حركتان عند حفص.',
    lesson: 'madd-badal-iwad-silah',
  },
  {
    id: 'madd-iwad',
    name: 'مدّ عِوَض',
    color: 'madd',
    short: 'وقفٌ على تنوين الفتح: يُنطق ألفًا بحركتين.',
    lesson: 'madd-badal-iwad-silah',
  },
  {
    id: 'madd-silah-sughra',
    name: 'صلة صغرى',
    color: 'madd',
    short: 'هاء الضمير بين متحرّكين وما بعدها غير همزة: تُمدّ حركتين.',
    lesson: 'madd-badal-iwad-silah',
  },
  {
    id: 'madd-silah-kubra',
    name: 'صلة كبرى',
    color: 'madd',
    short: 'هاء الضمير بين متحرّكين وبعدها همزة قطع: تُمدّ أربع أو خمس حركات.',
    lesson: 'madd-badal-iwad-silah',
  },
  {
    id: 'madd-lazim',
    name: 'مدّ لازم',
    color: 'madd',
    short: 'سكونٌ أصليّ بعد حرف المدّ: ستّ حركاتٍ وجوبًا، وهو أطول المدود.',
    lesson: 'madd-lazim',
  },
  {
    id: 'madd-arid',
    name: 'مدّ عارض للسكون',
    color: 'madd',
    short: 'سكونٌ بسبب الوقف بعد حرف المدّ: حركتان أو أربع أو ستّ.',
    lesson: 'madd-arid-leen',
  },
  {
    id: 'madd-leen',
    name: 'مدّ لِين',
    color: 'madd',
    short: 'واوٌ أو ياءٌ ساكنة قبلها فتح، ويُوقف على ما بعدها: حركتان أو أربع أو ستّ.',
    lesson: 'madd-arid-leen',
  },

  // ── التقاء الحرفين ─────────────────────────────────────────────────────
  {
    id: 'idgham-mutamathilain',
    name: 'إدغام متماثلين',
    color: 'idgham',
    short: 'حرفان اتّفقا اسمًا ومخرجًا وصفةً: الأوّل ساكن فيُدغم في الثاني.',
    lesson: 'mutamathilain',
  },
  {
    id: 'idgham-mutajanisain',
    name: 'إدغام متجانسين',
    color: 'idgham',
    short: 'حرفان اتّحدا مخرجًا واختلفا صفةً: الأوّل ساكن فيُدغم في الثاني.',
    lesson: 'mutamathilain',
  },
  {
    id: 'idgham-mutaqaribain',
    name: 'إدغام متقاربين',
    color: 'idgham',
    short: 'حرفان تقاربا مخرجًا وصفة، ولحفصٍ فيهما نوعان فقط.',
    lesson: 'mutamathilain',
  },

  // ── مواضع خاصّة عند حفص ────────────────────────────────────────────────
  {
    id: 'sakt',
    name: 'سكت',
    color: 'qalqalah',
    short: 'قطعُ الصوت لحظةً بلا تنفّس، ثمّ متابعة القراءة. لحفصٍ أربعة مواضع.',
    lesson: 'mawadi-khassah',
  },
  {
    id: 'imalah',
    name: 'إمالة',
    color: 'tafkheem',
    short: 'نطق الفتحة بين الفتح والكسر، والألف بين الألف والياء. لحفصٍ موضعٌ واحد.',
    lesson: 'mawadi-khassah',
  },
  {
    id: 'tas-heel',
    name: 'تسهيل',
    color: 'tafkheem',
    short: 'نطق الهمزة الثانية بصوتٍ بين الهمزة والألف. لحفصٍ موضعٌ واحد.',
    lesson: 'mawadi-khassah',
  },
  {
    id: 'ishmam',
    name: 'إشمام',
    color: 'tafkheem',
    short: 'ضمُّ الشفتين إشارةً إلى الضمّة بلا صوت. لحفصٍ موضعٌ واحد وصلًا.',
    lesson: 'mawadi-khassah',
  },
]

const BY_ID = new Map(RULES.map((rule) => [rule.id, rule]))

export function getRule(id: string): Rule | undefined {
  return BY_ID.get(id)
}

/**
 * Tailwind classes for a rule colour, in both themes.
 * Written out in full because Tailwind only keeps classes it can see as
 * complete strings in the source.
 */
export const RULE_TEXT_CLASS: Record<RuleColor, string> = {
  ghunnah: 'text-rule-ghunnah dark:text-rule-ghunnah-dark',
  ikhfa: 'text-rule-ikhfa dark:text-rule-ikhfa-dark',
  idgham: 'text-rule-idgham dark:text-rule-idgham-dark',
  iqlab: 'text-rule-iqlab dark:text-rule-iqlab-dark',
  izhar: 'text-rule-izhar dark:text-rule-izhar-dark',
  madd: 'text-rule-madd dark:text-rule-madd-dark',
  qalqalah: 'text-rule-qalqalah dark:text-rule-qalqalah-dark',
  tafkheem: 'text-rule-tafkheem dark:text-rule-tafkheem-dark',
}

/** A soft tinted pill behind the rule name, matching the text colour. */
export const RULE_PILL_CLASS: Record<RuleColor, string> = {
  ghunnah: 'bg-rule-ghunnah/10 text-rule-ghunnah dark:bg-rule-ghunnah-dark/15 dark:text-rule-ghunnah-dark',
  ikhfa: 'bg-rule-ikhfa/10 text-rule-ikhfa dark:bg-rule-ikhfa-dark/15 dark:text-rule-ikhfa-dark',
  idgham: 'bg-rule-idgham/10 text-rule-idgham dark:bg-rule-idgham-dark/15 dark:text-rule-idgham-dark',
  iqlab: 'bg-rule-iqlab/10 text-rule-iqlab dark:bg-rule-iqlab-dark/15 dark:text-rule-iqlab-dark',
  izhar: 'bg-rule-izhar/10 text-rule-izhar dark:bg-rule-izhar-dark/15 dark:text-rule-izhar-dark',
  madd: 'bg-rule-madd/10 text-rule-madd dark:bg-rule-madd-dark/15 dark:text-rule-madd-dark',
  qalqalah:
    'bg-rule-qalqalah/10 text-rule-qalqalah dark:bg-rule-qalqalah-dark/15 dark:text-rule-qalqalah-dark',
  tafkheem:
    'bg-rule-tafkheem/10 text-rule-tafkheem dark:bg-rule-tafkheem-dark/15 dark:text-rule-tafkheem-dark',
}
