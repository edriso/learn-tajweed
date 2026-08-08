/**
 * The curriculum: eleven units, taught in this order.
 *
 * The order follows the classical teaching order of «متن تحفة الأطفال» (rules of
 * the silent nun, then the silent meem, then lam and ra, then the madd rules,
 * then the waqf), with two additions at the front (what tajweed is, how to
 * start reading) and one at the back (putting the rules together).
 *
 * A lesson says which unit it belongs to in its frontmatter (`unit: nun-sakinah`).
 * To add a unit, add an entry here; to move a unit, move it in this array.
 */

export interface Unit {
  /** Matches the `unit:` field in a lesson's frontmatter. */
  id: string
  /** Short Arabic title shown as the section heading. */
  title: string
  /** One sentence telling the reader what they will be able to do after it. */
  description: string
  emoji: string
}

export const UNITS: readonly Unit[] = [
  {
    id: 'basics',
    title: 'البداية',
    description: 'ما التجويد، ولماذا نتعلّمه، وكيف نبدأ التلاوة بشكلٍ صحيح.',
    emoji: '🌱',
  },
  {
    id: 'huruf',
    title: 'الحروف: مخارجها وصفاتها',
    description: 'من أين يخرج كلّ حرف، وما الذي يميّزه عن أخيه القريب منه.',
    emoji: '🗣️',
  },
  {
    id: 'nun-sakinah',
    title: 'أحكام النون الساكنة والتنوين',
    description: 'أشهر أحكام التجويد وأكثرها دورانًا في القرآن: الإظهار والإدغام والإقلاب والإخفاء.',
    emoji: '🅽',
  },
  {
    id: 'meem-sakinah',
    title: 'أحكام الميم الساكنة والغنّة',
    description: 'ثلاثة أحكامٍ فقط للميم الساكنة، ثمّ ضبط الغنّة التي تجري في كلّ ما سبق.',
    emoji: '🅼',
  },
  {
    id: 'lam-ra',
    title: 'أحكام اللام والراء',
    description: 'لام التعريف، ولام لفظ الجلالة، ومتى تُفخَّم الراء ومتى تُرقَّق.',
    emoji: '⚖️',
  },
  {
    id: 'qalqalah',
    title: 'القلقلة',
    description: 'خمسة حروفٍ تهتزّ عند السكون، ومراتبها الثلاث.',
    emoji: '💫',
  },
  {
    id: 'mudood',
    title: 'المدود',
    description: 'متى نمدّ الصوت، وكم حركة، ولماذا. أكبر بابٍ في التجويد وأكثره أثرًا في التلاوة.',
    emoji: '〰️',
  },
  {
    id: 'mithlain',
    title: 'المتماثلان والمتقاربان والمتجانسان',
    description: 'ما يحدث حين يلتقي حرفان ساكنٌ ومتحرّك، وكيف نعرف الحكم بينهما.',
    emoji: '🔗',
  },
  {
    id: 'waqf',
    title: 'الوقف والابتداء',
    description: 'أين نقف وأين نبتدئ، وماذا تعني رموز الوقف في المصحف.',
    emoji: '⏸️',
  },
  {
    id: 'hafs',
    title: 'مواضع خاصّة في رواية حفص',
    description: 'كلماتٌ معدودة لها حكمٌ يخالف القاعدة العامّة. قليلةٌ، لكنّ معرفتها تُتقِن التلاوة.',
    emoji: '🔎',
  },
  {
    id: 'itqan',
    title: 'التطبيق والإتقان',
    description: 'جمع الأحكام في تلاوةٍ واحدة، وتمييز المتشابهات، وتصحيح الأخطاء الشائعة.',
    emoji: '🎯',
  },
]

const UNIT_INDEX = new Map(UNITS.map((unit, index) => [unit.id, index]))

/** Position of a unit in the curriculum, used to sort lessons. */
export function unitOrder(id: string): number {
  return UNIT_INDEX.get(id) ?? Number.MAX_SAFE_INTEGER
}

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}
