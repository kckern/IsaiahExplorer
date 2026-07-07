import React from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// dnd-kit replacement for react-sortable-hoc's SortableContainer.
// - `items`: stable id list (shortcodes) driving SortableContext / sort order.
// - `entries`: the already-rendered children (rows + non-sortable headings).
// - `onSortEnd`/`onSortStart`: preserve the react-sortable-hoc callback shape so
//   the parent *Settings.js handlers work unchanged.
// PointerSensor + KeyboardSensor make the list reorderable by mouse AND keyboard.
export default function SortableList({items = [], entries, onSortStart, onSortEnd}) {
  const sensors = useSensors(
    // small activation distance so clicks/hover-preview still work without a drag
    useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
  );

  const handleDragStart = () => {
    if (onSortStart) onSortStart();
  };

  const handleEnd = ({active, over}) => {
    // Translate dnd-kit's {active, over} into react-sortable-hoc's {oldIndex, newIndex}.
    const oldIndex = items.indexOf(active.id);
    const newIndex = over ? items.indexOf(over.id) : oldIndex;
    // Only commit a REAL move. dnd-kit fires drag-end for drop-in-place and
    // drop-outside too; persisting those churns saved settings for no reason.
    if (onSortEnd && newIndex >= 0 && newIndex !== oldIndex) {
      onSortEnd({oldIndex, newIndex});
    } else if (onSortStart) {
      // No move — still let the parent clear its `dragging` flag.
      onSortStart(false);
    }
  };

  // Cancel (Escape mid-drag, or a pointercancel from the browser reclaiming a
  // touch-scroll) must NEVER commit the move — it would persist a reorder the
  // user explicitly abandoned. Just clear the dragging flag.
  const handleCancel = () => {
    if (onSortStart) onSortStart(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleEnd}
      onDragCancel={handleCancel}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div>{entries}</div>
      </SortableContext>
    </DndContext>
  );
}
