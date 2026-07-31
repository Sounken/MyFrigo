import { motion, useMotionValue, useTransform } from 'motion/react'
import { formatDate, relativeLabel, urgencyOf } from '~/lib/dates'
import { LOCATION_LABELS, type InventoryItem } from '~/lib/types'

/** Past this, the gesture counts — short enough for one thumb, long enough not to misfire. */
const COMMIT_DISTANCE = 96
const COMMIT_VELOCITY = 550

const URGENCY_STYLES = {
  expired: 'bg-red-500',
  today: 'bg-orange-500',
  soon: 'bg-amber-400',
  later: 'bg-emerald-500',
} as const

type Props = {
  item: InventoryItem
  onConsume: () => void
  onTrash: () => void
}

/**
 * One gesture to take something out of the fridge.
 *
 * This is the flow the whole app lives or dies by: if removing an item costs
 * more than a swipe, the inventory drifts away from reality within a fortnight
 * and everything else stops being worth the trouble.
 *
 * Left = eaten. Right = binned. Both are undoable.
 */
export default function SwipeableItem({ item, onConsume, onTrash }: Props) {
  const x = useMotionValue(0)

  /** The action tints the row as you drag, so it commits before you let go. */
  const background = useTransform(
    x,
    [-COMMIT_DISTANCE, -20, 0, 20, COMMIT_DISTANCE],
    [
      'rgba(16,185,129,0.22)',
      'rgba(16,185,129,0)',
      'rgba(0,0,0,0)',
      'rgba(239,68,68,0)',
      'rgba(239,68,68,0.22)',
    ]
  )
  const consumeOpacity = useTransform(x, [-COMMIT_DISTANCE, -24], [1, 0])
  const trashOpacity = useTransform(x, [24, COMMIT_DISTANCE], [0, 1])

  const urgency = urgencyOf(item.daysLeft)

  return (
    <div className="relative overflow-hidden">
      {/* Revealed behind the row while dragging */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 text-sm font-semibold">
        <motion.span style={{ opacity: trashOpacity }} className="text-red-400">
          🗑 Jeté
        </motion.span>
        <motion.span style={{ opacity: consumeOpacity }} className="text-emerald-400">
          Mangé ✓
        </motion.span>
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        style={{ x, background }}
        onDragEnd={(_, info) => {
          const goneLeft = info.offset.x < -COMMIT_DISTANCE || info.velocity.x < -COMMIT_VELOCITY
          const goneRight = info.offset.x > COMMIT_DISTANCE || info.velocity.x > COMMIT_VELOCITY

          if (goneLeft) onConsume()
          else if (goneRight) onTrash()
        }}
        className="no-tap-select relative flex touch-pan-y items-center gap-3 border-b border-neutral-800/70 bg-neutral-950 px-4 py-3"
      >
        <span className={`h-10 w-1 shrink-0 rounded-full ${URGENCY_STYLES[urgency]}`} aria-hidden />

        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="size-10 shrink-0 rounded-lg bg-neutral-900 object-contain"
          />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-lg">
            📦
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{item.name}</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {[item.brands, item.quantityLabel, LOCATION_LABELS[item.location]]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-sm font-semibold ${
              urgency === 'expired'
                ? 'text-red-400'
                : urgency === 'today'
                  ? 'text-orange-400'
                  : 'text-neutral-300'
            }`}
          >
            {relativeLabel(item.daysLeft)}
          </p>
          <p className="text-xs text-neutral-600">{formatDate(item.expiresAt)}</p>
        </div>
      </motion.div>
    </div>
  )
}
