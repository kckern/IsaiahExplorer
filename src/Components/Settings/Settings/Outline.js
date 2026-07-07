import React, {useContext} from "react";
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {DataContext} from "../../../DataContext";

const noop = () =>{};

// dnd-kit sortable leaf (replaces react-sortable-hoc's SortableElement).
// useSortable provides the drag ref/listeners; the whole row is the drag handle.
// The ▲/▼ buttons give reorder without any drag at all (a11y belt-and-suspenders).
function OutlineSetting({dragging, option, optionKey, settings, id, index, onMove}) {
    const globalData = useContext(DataContext);
    const app = globalData.app;
    const state = globalData.state;
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});
    const style = {transform: CSS.Transform.toString(transform), transition, touchAction: 'none'};
    const stopDragCapture = {
      onPointerDown: (e) => e.stopPropagation(),
      onKeyDown: (e) => e.stopPropagation(),
    };
    var classes = ["option"];
    if (isDragging) classes.push("option--dragging");
    if (option.shortcode === state.outline) classes.push("active");
    if (optionKey === 0) classes.push("first top");
    else if (optionKey < 5) classes.push("top");
    else if (optionKey === 5) classes.push("other firstother");
    else classes.push("other");
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        title={option.title} className={classes.join(" ")}
        onMouseEnter={() => {
        // eslint-disable-next-line
          dragging
            ? noop // do not display preview while dragging. Saves a log of repaints;
            : settings.setState({preview:"outline",shortcode:option.shortcode})
        }}
      >
        <div className="rank">
          <span>{dragging ? '' : optionKey + 1}</span>
        </div>
        <div className="optionbox">
          <img alt="img" src={require('../../../img/versions/' + option.shortcode + '.jpg')} />
          <div className="outline_full_title">{option.title}</div>
        </div>
        <div className="reorder-controls" style={{userSelect: 'none'}} {...stopDragCapture}>
          <button type="button" aria-label={"Move " + option.title + " up"}
                  {...stopDragCapture}
                  onClick={() => onMove(index, index - 1)}>▲</button>
          <button type="button" aria-label={"Move " + option.title + " down"}
                  {...stopDragCapture}
                  onClick={() => onMove(index, index + 1)}>▼</button>
        </div>
      </div>
    );
}

export default OutlineSetting