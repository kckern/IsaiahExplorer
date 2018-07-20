import React from "react";
import {SortableContainer} from "react-sortable-hoc";

export default SortableContainer(({entries}) => <div>{entries}</div>);