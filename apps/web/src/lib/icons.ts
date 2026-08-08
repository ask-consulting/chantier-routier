import { createLucideIcon } from 'lucide-react';

/**
 * Every icon the product uses, named for what it *means* here.
 *
 * Two reasons for the indirection, both the same reason as
 * `domain-display.ts`:
 *
 *   1. Changing the icon for "worksite" is one line, not a hunt through every
 *      screen that happens to render one.
 *   2. The list is the inventory. Anyone can see at a glance which icons the
 *      product already has — which is what stops a twelfth icon being imported
 *      to say something the eleventh already says.
 *
 * Lucide's own icons are re-exported; the two the library lacks are drawn to its
 * rules, so nothing in a sidebar looks borrowed.
 */

export {
  // --- Domain ---------------------------------------------------------------
  HardHat as WorksiteIcon,
  Users as WorkerIcon,
  Clock as TimesheetIcon,
  Receipt as ExpenseIcon,
  Wallet as BudgetIcon,
  Building2 as OrganizationIcon,
  UserCog as AccountIcon,

  // --- Actions --------------------------------------------------------------
  Plus as CreateIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
  Search as SearchIcon,
  SlidersHorizontal as FilterIcon,
  Download as ExportIcon,
  RefreshCw as RefreshIcon,

  // --- Navigation -----------------------------------------------------------
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ArrowLeft as BackIcon,
  Menu as MenuIcon,
  X as CloseIcon,

  // --- Feedback -------------------------------------------------------------
  TriangleAlert as WarningIcon,
  CircleAlert as ErrorIcon,
  CircleCheck as SuccessIcon,
  Info as InfoIcon,
  LoaderCircle as SpinnerIcon,

  // --- Session --------------------------------------------------------------
  LogIn as LoginIcon,
  LogOut as LogoutIcon,
  Sun as ThemeLightIcon,
  Moon as ThemeDarkIcon,
  Monitor as ThemeSystemIcon,
} from 'lucide-react';

/**
 * Road roller — the machine most specific to road building, and one Lucide has
 * no equivalent for: it stops at the tractor and the forklift.
 *
 * Drawn to Lucide's rules so it does not look borrowed: 24 canvas, 1 unit of
 * padding, 2-wide centred strokes, round caps and joins, no fill. The oversized
 * drum carries the recognition — a roller is never identified by its cab.
 */
export const RollerIcon = createLucideIcon('Roller', [
  ['circle', { cx: '7', cy: '15', r: '5', key: 'drum' }],
  ['circle', { cx: '18', cy: '17', r: '3', key: 'wheel' }],
  ['path', { d: 'M12 12h6a3 3 0 0 1 3 3', key: 'chassis' }],
  ['path', { d: 'M13 12V8a1 1 0 0 1 1-1h3', key: 'cab' }],
]);

/**
 * Works barrier — the striped panel on trestles. Tabler has one, Lucide does
 * not, and installing 5 130 icons for a single shape is not a trade worth
 * making.
 */
export const BarrierIcon = createLucideIcon('Barrier', [
  ['rect', { x: '2', y: '6', width: '20', height: '7', rx: '1', key: 'panel' }],
  ['path', { d: 'm7 6-3 7', key: 'stripe1' }],
  ['path', { d: 'm13 6-3 7', key: 'stripe2' }],
  ['path', { d: 'm19 6-3 7', key: 'stripe3' }],
  ['path', { d: 'm6 13-1 8', key: 'leg1' }],
  ['path', { d: 'm18 13 1 8', key: 'leg2' }],
]);
